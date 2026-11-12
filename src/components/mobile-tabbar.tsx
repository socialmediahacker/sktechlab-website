import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, Sparkles, Newspaper, User } from "lucide-react";
import { hideAppChrome } from "@/lib/chrome-routes";

const TABS = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/categories", label: "Templates", Icon: LayoutGrid },
  { to: "/start", label: "Build", Icon: Sparkles, primary: true },
  { to: "/blog", label: "Blog", Icon: Newspaper },
  { to: "/dashboard", label: "Account", Icon: User },
] as const;

/** App-style bottom navigation — makes the site feel like an installed app on phones. */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Full-screen work surfaces and customers' own published sites keep their own chrome.
  if (hideAppChrome(pathname)) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ to, label, Icon, ...rest }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const primary = "primary" in rest && rest.primary;
          return (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center gap-1 py-2 text-[10px] font-medium"
              >
                <span
                  className={
                    primary
                      ? "-mt-4 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-brand text-brand-foreground shadow-glow"
                      : `grid h-8 w-8 place-items-center rounded-xl transition ${
                          active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        }`
                  }
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={active && !primary ? "text-primary" : "text-muted-foreground"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
