import { createFileRoute, redirect } from "@tanstack/react-router";

// Preserve old bookmarks while removing the separate visual-editor experience.
export const Route = createFileRoute("/_authenticated/dashboard/sites/$id/edit")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/dashboard/sites/$id", params: { id: params.id }, replace: true }); },
  head: () => ({ meta: [
    { title: "Website admin | SK Tech Lab" },
    { name: "description", content: "Manage your SK Tech Lab website." },
    { property: "og:title", content: "Website admin | SK Tech Lab" },
    { property: "og:description", content: "Manage your SK Tech Lab website." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});
