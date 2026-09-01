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
  light = false,
}: {
  sellerId: string;
  initiallyFollowing: boolean;
  loggedIn: boolean;
  /* On a dark green band: peach to follow, cream outline once following. */
  light?: boolean;
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
      toast("Unfollowed. No hard feelings.");
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ buyer_id: user.id, seller_id: sellerId });
      if (error) toast("That didn't work. Try again in a moment.", "error");
      else {
        setFollowing(true);
        toast("Following. You'll hear about what they post next.", "success");
      }
    }
    setBusy(false);
  }

  return (
    <>
      <button
        onClick={toggle}
        disabled={busy}
        className={light ? (following ? "btn btn-outline-cream" : "btn btn-primary") : following ? "btn btn-outline" : "btn btn-grove"}
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
          A free account lets you follow sellers and see everything they post
          in one place. You never need one just to reserve something, this is
          only if you want to keep up.
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
