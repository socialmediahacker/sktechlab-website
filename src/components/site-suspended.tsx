/** Shown instead of a customer website when an admin has suspended it. */
export function SiteSuspended({ name }: { name?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-950 px-6 text-center text-neutral-200">
      <div className="max-w-md">
        <div className="text-5xl">⏸️</div>
        <h1 className="mt-4 text-2xl font-bold">{name ? `${name} is temporarily unavailable` : "This site is temporarily unavailable"}</h1>
        <p className="mt-2 text-sm text-neutral-400">
          This website has been suspended by the administrator. If you are the owner, please contact support to restore
          it.
        </p>
        <a href="mailto:support@sktechlab.com" className="mt-6 inline-block text-sm text-neutral-300 underline">
          support@sktechlab.com
        </a>
      </div>
    </div>
  );
}
