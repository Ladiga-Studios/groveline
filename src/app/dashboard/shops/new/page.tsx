"use client";
import ShopForm from "@/components/ShopForm";

export default function NewShopPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-semibold">Add a shop</h1>
      <p className="mt-2 text-muted">A second brand, a fundraiser you run, a friend&apos;s farm you post for. Its own page and followers, same login.</p>
      <div className="mt-6"><ShopForm /></div>
    </div>
  );
}
