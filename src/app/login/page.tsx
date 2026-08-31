"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const router = useRouter();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError("Could not send the code. Try again in a minute.");
    else {
      setStage("code");
      toast("Code sent. Check your email.", "success");
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setError("That code did not work. Check it and try again.");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_seller")
      .maybeSingle();
    router.push(profile ? (profile.is_seller ? "/dashboard" : "/browse") : "/welcome");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-semibold">Log in or sign up</h1>
      <p className="mt-2 text-muted">
        One account for selling and following. We email you a code, no password
        to remember.
      </p>

      {stage === "email" ? (
        <form onSubmit={sendCode} className="tag-card mt-6 flex flex-col gap-4 p-6" noValidate>
          <div>
            <label htmlFor="login-email" className="field-label">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!error}
            />
            {error && <p className="field-error">{error}</p>}
          </div>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Sending" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="tag-card mt-6 flex flex-col gap-4 p-6" noValidate>
          <p className="text-sm">
            We sent a 6 digit code to <span className="font-semibold">{email}</span>.
          </p>
          <div>
            <label htmlFor="login-code" className="field-label">
              Code
            </label>
            <input
              id="login-code"
              className="field text-center text-2xl tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-invalid={!!error}
            />
            {error && <p className="field-error">{error}</p>}
          </div>
          <button className="btn btn-primary" disabled={busy || code.length < 6}>
            {busy ? "Checking" : "Log in"}
          </button>
          <button
            type="button"
            className="text-sm text-muted underline"
            onClick={() => setStage("email")}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
