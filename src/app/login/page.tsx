"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "link") {
      setError(
        "That link expired or was already used. Enter your email and we will send a fresh one."
      );
    }
  }, []);

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
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setBusy(false);
    if (error) setError("Could not send the code. Try again in a minute.");
    else {
      setStage("code");
      toast("Check your email.", "success");
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
        New here? Same box. Enter your email, we send you a code, and your
        account is made on the spot. Buy, sell, or both, one account covers it.
        No password to remember.
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
            We sent an email to <span className="font-semibold">{email}</span>.
            Type the code below, or just tap the link in the email. Either one
            signs you in.
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
            onClick={() => {
              setStage("email");
              setError("");
            }}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
