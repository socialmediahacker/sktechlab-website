import { WIDGETS } from "@/lib/editor/paths";
import {
  LayoutTemplate, Sparkles, Images, Briefcase, ShoppingBag, BadgeIndianRupee,
  BarChart3, Users, Quote, HelpCircle, CalendarClock, Megaphone, Mail, Layers,
} from "lucide-react";

const ICONS: Record<string, typeof LayoutTemplate> = {
  hero3d: LayoutTemplate, features: Sparkles, showcase: Layers, gallery: Images,
  portfolio: Briefcase, products: ShoppingBag, pricing: BadgeIndianRupee,
  stats: BarChart3, team: Users, testimonials: Quote, faq: HelpCircle,
  booking: CalendarClock, cta: Megaphone, contact: Mail,
};

/**
 * Elementor-style widget palette. Drag a card onto the live canvas to drop it
 * exactly where you want, or click to append it after the selected section.
 */
export function WidgetLibrary({ onAdd }: { onAdd: (type: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
        Widgets — drag onto the page
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {WIDGETS.map((w) => {
          const Icon = ICONS[w.type] ?? LayoutTemplate;
          return (
            <button
              key={w.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", w.type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onAdd(w.type)}
              className="flex cursor-grab flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-3 text-[10px] font-semibold text-neutral-300 transition hover:border-sky-400/50 hover:bg-sky-400/10 hover:text-white active:cursor-grabbing"
            >
              <Icon className="h-4 w-4" />
              {w.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
