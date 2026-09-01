"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

export default function ResetPage() {
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {});
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setReady(true);
      else setExpired(true);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password needs at least 8 characters.");
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError("Could not set the password. Try again.");
      return;
    }
    toast("Password updated.", "success");
    const {
      data: { user: me },
    } = await supabase.auth.getUser();
    const { data: profile } = me
      ? await supabase.from("profiles").select("id, is_seller").eq("id", me.id).maybeSingle()
      : { data: null };
    router.push(profile ? (profile.is_seller ? "/dashboard" : "/browse") : "/welcome");
    router.refresh();
  }

  if (expired) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 text-center">
        <h1 className="text-3xl font-semibold">This link expired.</h1>
        <p className="mt-2 text-muted">
          Reset links only work once and only for a little while.
        </p>
        <Link href="/login" className="btn btn-primary mt-6">
          Request a new one
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <p className="text-muted" role="status">
          Checking your link
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-semibold">Set a new password</h1>
      <form onSubmit={submit} className="tag-card mt-6 flex flex-col gap-4 p-6" noValidate>
        <div>
          <label htmlFor="new-pw" className="field-label">
            New password
          </label>
          <div className="relative">
            <input
              id="new-pw"
              type={showPw ? "text" : "password"}
              className="field pr-20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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
          <p className="field-hint">At least 8 characters.</p>
          {error && <p className="field-error">{error}</p>}
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving" : "Save password"}
        </button>
      </form>
    </div>
  );
}
