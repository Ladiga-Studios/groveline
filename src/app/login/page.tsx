"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
          .eq("id", user.id)
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
    const {
      data: { user: me },
    } = await supabase.auth.getUser();
    const { data: profile } = me
      ? await supabase.from("profiles").select("id, is_seller").eq("id", me.id).maybeSingle()
      : { data: null };
    router.push(profile ? (profile.is_seller ? "/dashboard" : "/browse") : "/welcome");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("That email doesn't quite look right.");
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
        setError("That email or password doesn't match. Try again, or reset your password below.");
        return;
      }
      await goWhereTheyBelong();
      return;
    }

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setBusy(false);
    if (err) setError("Couldn't send that reset email. Try again shortly.");
    else setNotice("If that email has an account, a reset link is headed its way.");
  }

  return (
    <div className="pattern-bg">
      <div className="mx-auto max-w-md px-4 py-14">
        <div>
          <div className="on-pattern">
            <h1 className="text-3xl font-semibold">
              {mode === "register"
                ? "Let's get you set up"
                : mode === "forgot"
                  ? "Reset your password"
                  : "Welcome back"}
            </h1>
            <p className="mt-2 text-muted">
              {mode === "register"
                ? "One account covers buying and selling both. Selling is free to start."
                : mode === "forgot"
                  ? "Pop in your email and we'll send a link to set a new one."
                  : "Good to see you again."}
            </p>
          </div>

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
                  ? "Create my account"
                  : mode === "forgot"
                    ? "Send reset link"
                    : "Log in"}
            </button>
          </form>

          <div className="on-pattern mt-4 flex flex-col gap-2 text-center">
            {mode === "login" && (
              <>
                <button className="text-grove underline underline-offset-2" onClick={() => switchMode("register")}>
                  New here? Create your free account
                </button>
                <button className="text-sm text-muted underline" onClick={() => switchMode("forgot")}>
                  Forgot your password?
                </button>
              </>
            )}
            {mode === "register" && (
              <>
                <p className="text-xs text-muted">You will be asked to agree to the terms and privacy policy on the next screen.</p>
                <button className="text-grove underline underline-offset-2" onClick={() => switchMode("login")}>
                  Already have one? Log in
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button className="text-grove underline underline-offset-2" onClick={() => switchMode("login")}>
                Back to logging in
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
