"use client";
import { useState } from "react";
import { useToast } from "./Toast";

export default function CopyButton({
  text,
  label = "Copy link",
  className = "btn btn-outline",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast("Copied.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy. Long press the link to copy it.", "error");
    }
  }
  return (
    <button onClick={copy} className={className}>
      {copied ? "Copied" : label}
    </button>
  );
}
