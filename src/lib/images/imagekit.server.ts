/**
 * ImageKit upload layer (server only).
 *
 * Harvested / admin-uploaded photos are fetched once and re-uploaded to our own
 * ImageKit media library, so templates and blogs never hotlink a third-party
 * site (which frequently blocks it and shows a blank image).
 */

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

function auth(): string | null {
  const key = process.env["IMAGEKIT_PRIVATE_KEY"];
  if (!key) return null;
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export function imageKitEndpoint(): string {
  return (process.env["IMAGEKIT_URL_ENDPOINT"] || "https://ik.imagekit.io/yevm9inmx").replace(/\/+$/, "");
}

function safeName(hint: string, fallback: string): string {
  const base = (hint.split("/").pop() ?? "").split("?")[0] ?? "";
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-60);
  return clean && /\.[a-z0-9]{2,5}$/i.test(clean) ? clean : `${fallback}.jpg`;
}

async function post(form: FormData): Promise<{ url: string } | { error: string }> {
  const a = auth();
  if (!a) return { error: "ImageKit private key missing" };
  try {
    const res = await fetch(UPLOAD_URL, { method: "POST", headers: { Authorization: a }, body: form });
    const json = (await res.json()) as any;
    if (!res.ok || !json?.url) return { error: json?.message ?? `Upload failed (${res.status})` };
    return { url: String(json.url) };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

/** Download a remote photo and store it in our ImageKit library. */
export async function uploadRemoteToImageKit(
  src: string,
  opts: { folder?: string; fileName?: string } = {},
): Promise<{ url: string } | { error: string }> {
  let bytes: ArrayBuffer;
  let type = "image/jpeg";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const r = await fetch(src, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SkTechLabBot/1.0) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        Referer: new URL(src).origin,
      },
    });
    clearTimeout(t);
    if (!r.ok) return { error: `source ${r.status}` };
    type = r.headers.get("content-type") ?? type;
    if (!/^image\//i.test(type)) return { error: "not an image" };
    bytes = await r.arrayBuffer();
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 140) };
  }

  if (bytes.byteLength < 12_000) return { error: "too small" };
  if (bytes.byteLength > 24_000_000) return { error: "too large" };

  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), opts.fileName ?? safeName(src, "photo"));
  form.append("fileName", opts.fileName ?? safeName(src, "photo"));
  form.append("folder", opts.folder ?? "sktechlab/bank");
  form.append("useUniqueFileName", "true");
  return post(form);
}

/** Store an admin-uploaded file (base64 data URL or raw base64) in ImageKit. */
export async function uploadBase64ToImageKit(
  base64: string,
  fileName: string,
  folder = "sktechlab/bank",
): Promise<{ url: string } | { error: string }> {
  const payload = base64.includes(",") ? (base64.split(",")[1] ?? "") : base64;
  if (!payload) return { error: "empty file" };
  const form = new FormData();
  form.append("file", payload);
  form.append("fileName", safeName(fileName, "upload"));
  form.append("folder", folder);
  form.append("useUniqueFileName", "true");
  return post(form);
}
