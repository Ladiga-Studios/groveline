"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Held in a ref so the effect below doesn't depend on it. Call sites
     pass an inline arrow, which is a new function every render, and an
     effect that re-runs on every render would re-run its focus setup on
     every keystroke. */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement;
    const scrollY = window.scrollY;
    document.body.dataset.modalOpen = "true";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    const card = cardRef.current;
    const SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = () => card?.querySelectorAll<HTMLElement>(SELECTOR) ?? [];

    /* Focus what the modal is actually for, not the close button. The X
       comes first in the DOM, so focusing focusables()[0] would land
       there and skip past the input the person came to type in. */
    const firstInBody = bodyRef.current?.querySelector<HTMLElement>(SELECTOR);
    (firstInBody ?? focusables()[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const items = Array.from(focusables());
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      delete document.body.dataset.modalOpen;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
      lastFocused.current?.focus();
    };
  }, [open]);

  if (!open || !mounted) return null;

  /* Rendered into <body> rather than in place. A modal opened from inside
     a sticky header, a transformed element, or an overflow-hidden card
     would otherwise be clipped or stacked behind its own backdrop. */
  return createPortal(
    <div className="modal-backdrop overflow-y-auto" onClick={onClose}>
      <div
        ref={cardRef}
        className="modal-card max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-xl font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-cream-dark"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2 2 L14 14 M14 2 L2 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div ref={bodyRef}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
