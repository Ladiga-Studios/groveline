"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import Modal from "./Modal";
import { useToast } from "./Toast";

export default function FollowButton({
  sellerId,
  initiallyFollowing,
  loggedIn,
}: {
  sellerId: string;
  initiallyFollowing: boolean;
  loggedIn: boolean;
}) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [askLogin, setAskLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function toggle() {
    if (!loggedIn) {
      setAskLogin(true);
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setAskLogin(true);
      return;
    }
    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("buyer_id", user.id)
        .eq("seller_id", sellerId);
      setFollowing(false);
      toast("Unfollowed.");
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ buyer_id: user.id, seller_id: sellerId });
      if (error) toast("Could not follow. Try again.", "error");
      else {
        setFollowing(true);
        toast("Following. Their drops will show in your feed.", "success");
      }
    }
    setBusy(false);
  }

  return (
    <>
      <button
        onClick={toggle}
        disabled={busy}
        className={following ? "btn btn-outline" : "btn btn-grove"}
        aria-pressed={following}
      >
        {following ? "Following" : "Follow"}
      </button>
      <Modal
        open={askLogin}
        onClose={() => setAskLogin(false)}
        title="Log in to follow sellers"
      >
        <p className="mb-4">
          A free account lets you follow sellers and see their new drops in one
          place. You never need an account just to reserve something.
        </p>
        <div className="flex gap-3">
          <button
            className="btn btn-primary grow"
            onClick={() => router.push("/login")}
          >
            Log in or sign up
          </button>
          <button className="btn btn-outline" onClick={() => setAskLogin(false)}>
            Not now
          </button>
        </div>
      </Modal>
    </>
  );
}
