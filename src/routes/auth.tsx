import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteSettingsQuery } from "@/lib/queries";
import { sendLoginOtp, verifyLoginOtp } from "@/lib/auth-otp.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Phone, ShieldCheck, Mail } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SKTECHLAB" },
      { name: "description", content: "Sign in or create your SKTECHLAB account with WhatsApp OTP." },
      { property: "og:title", content: "Sign in — SKTECHLAB" },
      { property: "og:description", content: "Sign in or create your SKTECHLAB account with WhatsApp OTP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

/** After sign-in, return to a preserved same-origin `next` path (used by the MCP consent flow). */
function goAfterAuth(navigate: ReturnType<typeof useNavigate>) {
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    window.location.href = next;
    return;
  }
  navigate({ to: "/dashboard" });
}

/** Shown when the phone / email has no SKTECHLAB account yet. */
function AccountNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <h2 className="text-lg font-bold">Account not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn&apos;t find an account with these details. Build your website first — your account
        is created as part of the process.
      </p>
      <Button
        onClick={() => { window.location.href = "/start"; }}
        className="mt-4 w-full bg-gradient-brand text-brand-foreground shadow-glow"
      >
        <Sparkles className="mr-2 h-4 w-4" /> Let&apos;s build
      </Button>
      <button onClick={onBack} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
        Try a different number or email
      </button>
    </div>
  );
}

/**
 * Shown when email + password don't match. Supabase answers an unknown email and a
 * wrong password with the same "Invalid login credentials", so this copy must never
 * claim the account is missing — it only says the details didn't work.
 */
function CredentialsFailed({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <h2 className="text-lg font-bold">Email or password is incorrect</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Check your email and password, then try again. Forgot your password? Use the
        &ldquo;Forgot password?&rdquo; link to get a reset link.
      </p>
      <Button
        onClick={onBack}
        className="mt-4 w-full bg-gradient-brand text-brand-foreground shadow-glow"
      >
        <ShieldCheck className="mr-2 h-4 w-4" /> Try again
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">
        No account yet?{" "}
        <a href="/start" className="font-medium text-primary hover:underline">
          Build your website
        </a>
      </p>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  useQuery(siteSettingsQuery);
  // Sign-in only — new accounts are created in the website builder (/start).
  const [mode, setMode] = useState<"phone" | "email">("phone");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid max-w-md gap-6 px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Welcome to <span className="text-gradient">SKTECHLAB</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "phone" ? "Log in with your WhatsApp number" : "Log in with email"}
          </p>
        </div>


        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setMode("phone")}
            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "phone" ? "bg-background shadow-soft" : "text-muted-foreground"}`}
          >
            <Phone className="h-3.5 w-3.5" /> WhatsApp OTP
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "email" ? "bg-background shadow-soft" : "text-muted-foreground"}`}
          >
            <Mail className="h-3.5 w-3.5" /> Email & password
          </button>
        </div>

        {mode === "phone" ? <PhoneOtpForm /> : <EmailForm />}

        <p className="text-center text-xs text-muted-foreground">
          Login only. New here?{" "}
          <a href="/start" className="font-medium text-primary hover:underline">Build your website</a>{" "}
          — your account is created during the build.
        </p>

        <div className="text-center">
          <a href="/admin-login" className="text-[11px] text-muted-foreground/70 hover:text-foreground hover:underline">
            Staff & admin sign-in
          </a>
        </div>
      </main>
    </div>
  );
}

function PhoneOtpForm() {
  const navigate = useNavigate();
  const send = useServerFn(sendLoginOtp);
  const verify = useServerFn(verifyLoginOtp);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return toast.error("Enter a valid WhatsApp number (10+ digits)");
    setLoading(true);
    try {
      const r = await send({ data: { phone } });
      setStep("otp");
      setCooldown(60);
      if (r.demo && r.code) {
        setDemoCode(r.code);
        toast.info(`Demo mode: OTP is ${r.code}`, { duration: 8000 });
      } else {
        toast.success(`Code sent to your WhatsApp (+${digits.length === 10 ? "91" + digits : digits})`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (code.trim().length !== 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    try {
      const res: any = await verify({ data: { phone, code, loginOnly: true } });
      if (res.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: res.tokenHash });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: res.email, password: res.password });
        if (error) throw error;
      }
      toast.success("Welcome! 🎉");
      goAfterAuth(navigate);
    } catch (e: any) {
      if (String(e?.message ?? "").includes("ACCOUNT_NOT_FOUND")) setNotFound(true);
      else toast.error(e?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return <AccountNotFound onBack={() => { setNotFound(false); setStep("phone"); setCode(""); }} />;
  }

  if (step === "phone") {
    return (
      <div className="space-y-4">
        <div>
          <Label>WhatsApp number</Label>
          <div className="mt-1 flex gap-2">
            <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">+91</div>
            <Input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="90000 00000"
              className="flex-1"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">We'll send a 6-digit OTP to your WhatsApp.</p>
        </div>
        <Button
          onClick={requestOtp}
          disabled={loading}
          className="w-full bg-gradient-brand text-brand-foreground shadow-glow"
        >
          <Phone className="mr-2 h-4 w-4" />
          {loading ? "Sending…" : "Send OTP on WhatsApp"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        Code sent to <span className="font-semibold text-foreground">{phone}</span>.{" "}
        <button className="text-primary underline" onClick={() => { setStep("phone"); setCode(""); setDemoCode(null); }}>
          Change
        </button>
      </div>
      {demoCode && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          <b>Demo mode:</b> WhatsApp provider not configured yet. Use code <span className="font-mono text-base">{demoCode}</span>.
        </div>
      )}
      <div>
        <Label>6-digit code</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          className="mt-1 text-center text-2xl tracking-[0.5em]"
          maxLength={6}
        />
      </div>
      <Button
        onClick={submitCode}
        disabled={loading || code.length !== 6}
        className="w-full bg-gradient-brand text-brand-foreground shadow-glow"
      >
        <ShieldCheck className="mr-2 h-4 w-4" />
        {loading ? "Verifying…" : "Verify & continue"}
      </Button>
      <button
        onClick={requestOtp}
        disabled={cooldown > 0 || loading}
        className="w-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
      </button>
    </div>
  );
}

function EmailForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [badCredentials, setBadCredentials] = useState(false);

  const signIn = async () => {
    setLoading(true);
    setBadCredentials(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Same error for "no such account" and "wrong password" — never say the
      // account doesn't exist, or a real customer thinks they have none.
      if (/invalid login credentials|user not found/i.test(error.message)) return setBadCredentials(true);
      return toast.error(error.message);
    }
    toast.success("Welcome back!");
    goAfterAuth(navigate);
  };

  if (badCredentials) return <CredentialsFailed onBack={() => setBadCredentials(false)} />;

  return (
    <div className="pt-1">
      <div className="space-y-4 pt-4">
        <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="text-right">
          <button
            type="button"
            onClick={async () => {
              if (!email.trim()) return toast.error("Enter your email first");
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              if (error) return toast.error(error.message);
              toast.success("Password reset link sent");
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <Button onClick={signIn} disabled={loading} className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
          <Sparkles className="mr-2 h-4 w-4" /> Sign in
        </Button>
      </div>
    </div>
  );
}
