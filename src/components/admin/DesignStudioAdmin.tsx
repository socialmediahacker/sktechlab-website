/**
 * Design Studio (admin)
 *
 * Two tools that actually earn their place:
 * 1. Category photo packs — curated, verified HD photos applied per category.
 * 2. Web harvest — collect extra category photos from real business websites.
 */
import { useState } from "react";
import { Globe, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoPacks from "./PhotoPacks";
import WebHarvest from "./WebHarvest";

export default function DesignStudioAdmin() {
  const [tab, setTab] = useState<"packs" | "harvest">("packs");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={tab === "packs" ? "default" : "outline"}
          className="gap-2"
          onClick={() => setTab("packs")}
        >
          <Images className="h-4 w-4" /> Category photo packs
        </Button>
        <Button
          variant={tab === "harvest" ? "default" : "outline"}
          className="gap-2"
          onClick={() => setTab("harvest")}
        >
          <Globe className="h-4 w-4" /> Web harvest
        </Button>
      </div>
      {tab === "packs" ? <PhotoPacks /> : <WebHarvest />}
    </div>
  );
}
