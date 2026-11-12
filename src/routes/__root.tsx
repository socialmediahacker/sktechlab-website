import { ResilientImages } from "@/components/resilient-images";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorRouteComponent,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { SmoothScroll } from "@/components/smooth-scroll";
import { CursorGlow } from "@/components/cursor-glow";
import { SupportPopup } from "@/components/support-popup";
import { AppInstall } from "@/components/app-install";
import { MobileTabBar } from "@/components/mobile-tabbar";
import { useRouterState } from "@tanstack/react-router";
import { hideAppChrome } from "@/lib/chrome-routes";

/** Reserves space for the mobile tab bar only on routes where it actually renders. */
function AppBody() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className={hideAppChrome(pathname) ? undefined : "pb-[4.5rem] md:pb-0"}>
      <Outlet />
    </div>
  );
}

import { AppSplash } from "@/components/app-splash";
import { hydrateImageKitConfig, setImageKitConfig } from "@/lib/images/imagekit";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-glow"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-gradient-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-glow"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SK Tech Lab (SKTECHLAB) — Website Builder India" },
      {
        name: "description",
        content:
          "SK Tech Lab (SKTECHLAB) is India's website builder — 150+ categories, premium templates, free subdomain and online shop add-on.",
      },
      { name: "author", content: "SK Tech Lab" },
      { property: "og:site_name", content: "SK Tech Lab" },
      { property: "og:title", content: "SKTECHLAB — Build a stunning website in minutes" },
      {
        property: "og:description",
        content:
          "Premium templates, drag-and-drop editor, and done-for-you digital marketing + GMB boost plans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0b0b12" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "SKTECHLAB" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/app-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Fira+Sans:wght@300;400;500;600;700;900&family=Playfair+Display:wght@500;700;900&family=Cormorant+Garamond:wght@400;600;700&family=Space+Grotesk:wght@400;500;700&family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;600;800&family=Manrope:wght@300;400;600;800&family=Bebas+Neue&family=Archivo:wght@400;600;800&family=Libre+Baskerville:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Syne:wght@500;700;800&family=Sora:wght@300;400;600;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  // Plain function component; the router only renders it with createElement, but
  // its type now expects the lazy shape.
  errorComponent: ErrorComponent as unknown as ErrorRouteComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Capture the browser's install event before React mounts, and register
            the service worker so the app stays installable. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.__pwaPrompt=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaPrompt=e;window.dispatchEvent(new Event('pwa-prompt-ready'));});if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}",
          }}
        />
      </head>

      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const authRefreshTimer = useRef<number | null>(null);
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      const nextUser = session?.user?.id ?? null;
      const changed = lastUserId.current !== undefined && lastUserId.current !== nextUser;
      lastUserId.current = nextUser;
      if (authRefreshTimer.current) window.clearTimeout(authRefreshTimer.current);
      // Only drop cached data when the account actually changes — clearing on
      // every session event cancels in-flight queries and crashes the page.
      if (changed) queryClient.clear();
      authRefreshTimer.current = window.setTimeout(() => {
        router.invalidate();
        queryClient.invalidateQueries({ type: "active" });
      }, 250);
    });
    return () => {
      if (authRefreshTimer.current) window.clearTimeout(authRefreshTimer.current);
      sub.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  // Keep the last browser errors in memory for the admin Bug Fixer report.
  useEffect(() => {
    import("@/lib/client-error-buffer").then((m) => m.installClientErrorBuffer()).catch(() => {});
  }, []);

  // Load image-CDN (ImageKit) settings once so every template serves optimised photos.
  useEffect(() => {
    hydrateImageKitConfig();
    let alive = true;
    import("@/lib/integrations.functions")
      .then(({ listIntegrations }) => listIntegrations())
      .then((rows) => {
        if (!alive) return;
        const ik = (rows ?? []).find((r: any) => r.provider === "imagekit");
        if (!ik) return;
        setImageKitConfig({ enabled: ik.enabled, ...((ik.config as Record<string, unknown>) ?? {}) });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <ResilientImages />
      <SmoothScroll />
      <CursorGlow />
      <AppSplash />
      <AppBody />
      <MobileTabBar />
      <AppInstall />
      <SupportPopup />
      <Toaster />

    </QueryClientProvider>
  );
}
