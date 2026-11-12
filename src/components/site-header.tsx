import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function SiteHeader() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand shadow-glow">
            <Sparkles className="h-4 w-4 text-brand-foreground" />
          </span>
          <span>
            SK<span className="text-gradient">TECHLAB</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/categories" className="text-muted-foreground transition hover:text-foreground">
            Templates
          </Link>
          <Link to="/services" className="text-muted-foreground transition hover:text-foreground">
            Services
          </Link>
          <Link to="/pricing" className="text-muted-foreground transition hover:text-foreground">
            Pricing
          </Link>
          <Link to="/blog" className="text-muted-foreground transition hover:text-foreground">
            Blog
          </Link>

        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground shadow-glow">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground shadow-glow">
                <Link to="/auth" search={{ mode: "signup" } as never}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
