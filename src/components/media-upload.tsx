import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { imagekitAuthParams } from "@/lib/integrations.functions";
import { getImageKitConfig, ikUrl } from "@/lib/images/imagekit";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Upload straight to ImageKit (signed) — returns a permanent CDN URL. */
async function uploadToImageKit(file: File): Promise<string> {
  const auth = (await imagekitAuthParams()) as {
    token: string; expire: number; signature: string; publicKey: string; folder: string;
  };
  if (!auth.publicKey) throw new Error("ImageKit public key missing");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("fileName", file.name || `upload-${Date.now()}`);
  fd.append("publicKey", auth.publicKey);
  fd.append("token", auth.token);
  fd.append("expire", String(auth.expire));
  fd.append("signature", auth.signature);
  fd.append("folder", `/${auth.folder}`);
  fd.append("useUniqueFileName", "true");
  const r = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok || !j?.url) throw new Error(j?.message ?? "ImageKit upload failed");
  return ikUrl(j.url as string, { w: 1600 });
}

export async function uploadMedia(file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Please sign in to upload images");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image must be under 8 MB");

  if (getImageKitConfig().enabled) {
    try {
      return await uploadToImageKit(file);
    } catch (e) {
      console.error("ImageKit upload failed, falling back to storage", e);
    }
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  const { data, error: e2 } = await supabase.storage.from("site-media").createSignedUrl(path, TEN_YEARS);
  if (e2 || !data?.signedUrl) throw new Error(e2?.message ?? "Could not create image link");
  return data.signedUrl;
}


/** Small upload button that returns a permanent URL for the uploaded file. */
export function MediaUploadButton({
  onUploaded,
  multiple = false,
  label = "Upload",
  className = "",
  accept = "image/*",
}: {
  onUploaded: (urls: string[]) => void;
  multiple?: boolean;
  label?: string;
  className?: string;
  accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadMedia(f));
      onUploaded(urls);
      toast.success(urls.length > 1 ? `${urls.length} images uploaded` : "Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className={`inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300 transition hover:bg-sky-500/30 disabled:opacity-50 ${className}`}
      >
        {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Upload className="h-2.5 w-2.5" />} {label}
      </button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => handle(e.target.files)} />
    </>
  );
}
