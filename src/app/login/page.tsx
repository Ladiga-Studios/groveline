"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "register") setMode("register");
    if (params.get("error") === "link") {
      setError("That link expired. Log in below, or reset your password.");
    }
    (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, is_seller")
          .maybeSingle();
        router.replace(
          profile ? (profile.is_seller ? "/dashboard" : "/browse") : "/welcome"
        );
      }
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
  }

  async function goWhereTheyBelong() {
    const supabase = supabaseBrowser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_seller")
      .maybeSingle();
    router.push(profile ? (profile.is_seller ? "/dashboard" : "/browse") : "/welcome");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setError("Password needs at least 8 characters.");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();

    if (mode === "register") {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      setBusy(false);
      if (err) {
        setError(
          err.message.toLowerCase().includes("already registered")
            ? "That email already has an account. Log in instead."
            : "Could not create the account. Try again."
        );
        return;
      }
      if (data.session) {
        toast("Account created.", "success");
        await goWhereTheyBelong();
      } else {
        setNotice(
          "Account created. Check your email for a confirmation link, then come back and log in."
        );
      }
      return;
    }

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setBusy(false);
      if (err) {
        setError("Email or password is not right. Try again or reset it below.");
        return;
      }
      await goWhereTheyBelong();
      return;
    }

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setBusy(false);
    if (err) setError("Could not send the reset email. Try again in a minute.");
    else setNotice("If that email has an account, a reset link is on the way.");
  }

  return (
    <div className="pattern-bg">
      <div className="mx-auto grid max-w-4xl items-center gap-8 px-4 py-14 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <h1 className="text-3xl font-semibold">
            {mode === "register"
              ? "Create your free account"
              : mode === "forgot"
                ? "Reset your password"
                : "Log in"}
          </h1>
          <p className="mt-2 text-muted">
            {mode === "register"
              ? "One account covers buying and selling. Selling is free to start."
              : mode === "forgot"
                ? "Enter your email and we will send you a link to set a new password."
                : "Welcome back."}
          </p>

          <form onSubmit={submit} className="tag-card mt-6 flex flex-col gap-4 p-6" noValidate>
            <div>
              <label htmlFor="auth-email" className="field-label">
                Email address
              </label>
              <input
                id="auth-email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={!!error}
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label htmlFor="auth-password" className="field-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPw ? "text" : "password"}
                    className="field pr-20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    aria-invalid={!!error}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-cream-dark"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                {mode === "register" && (
                  <p className="field-hint">At least 8 characters.</p>
                )}
              </div>
            )}

            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="font-medium text-grove" role="status">
                {notice}
              </p>
            )}

            <button className="btn btn-primary" disabled={busy}>
              {busy
                ? "One second"
                : mode === "register"
                  ? "Create account"
                  : mode === "forgot"
                    ? "Send reset link"
                    : "Log in"}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-2 text-center">
            {mode === "login" && (
              <>
                <button className="text-grove underline underline-offset-2" onClick={() => switchMode("register")}>
                  New here? Create a free account
                </button>
                <button className="text-sm text-muted underline" onClick={() => switchMode("forgot")}>
                  Forgot your password?
                </button>
              </>
            )}
            {mode === "register" && (
              <button className="text-grove underline underline-offset-2" onClick={() => switchMode("login")}>
                Already have an account? Log in
              </button>
            )}
            {mode === "forgot" && (
              <button className="text-grove underline underline-offset-2" onClick={() => switchMode("login")}>
                Back to log in
              </button>
            )}
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2" aria-hidden="true">
          <Image
            src="/illustrations/phone.jpg"
            alt=""
            width={1254}
            height={1254}
            className="w-full max-w-xs"
            priority
          />
        </div>
      </div>
    </div>
  );
}
