"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ShopSwitch({ shopId, label = "Work here" }: { shopId: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function go() {
    setBusy(true);
    await fetch("/api/shops/select", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shopId }) });
    setBusy(false);
    router.push("/dashboard");
    router.refresh();
  }
  return <button onClick={go} disabled={busy} className="btn btn-grove !min-h-10 !px-4 text-sm">{busy ? "Switching" : label}</button>;
}
