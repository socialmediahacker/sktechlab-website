import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { masterAdminLogin } from "@/lib/admin-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Master admin sign in — SKTECHLAB" },
      { name: "description", content: "Secure control-panel access for SKTECHLAB administrators." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Master admin sign in — SKTECHLAB" },
      { property: "og:description", content: "Secure control-panel access for SKTECHLAB administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const login = useServerFn(masterAdminLogin);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { email, password: otp } = await login({ data: { phone, password } });
      const { error } = await supabase.auth.signInWithPassword({ email, password: otp });
      if (error) throw error;
      toast.success("Welcome back, admin");
      await navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/70 p-7 shadow-glow backdrop-blur">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-brand-foreground">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-center text-xl font-bold">Master admin</h1>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Restricted area. Every sign-in attempt is logged.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label>Admin ID</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
              autoComplete="username"
              placeholder="Enter admin ID"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !phone || !password}
            className="w-full bg-gradient-brand text-brand-foreground shadow-glow"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Unlock control panel
          </Button>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Two-factor (WhatsApp OTP) is currently off and can be switched on from Admin → Settings.
        </p>
      </div>
    </div>
  );
}
