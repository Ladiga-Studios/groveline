"use client";
import ShopForm from "@/components/ShopForm";

export default function NewShopPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-semibold">Start a new shop</h1>
      <p className="mt-2 text-muted">A second business, a fundraiser you help run, a friend&apos;s farm you post for. It gets its own page and its own followers, all under the login you already have.</p>
      <div className="mt-6"><ShopForm /></div>
    </div>
  );
}
