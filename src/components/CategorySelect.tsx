"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { categoryLabel, groupOf, searchCategories, suggestCategories, type CategoryHit } from "@/lib/categories";

/* Searchable category picker. Type a word ("tumbler", "sourdough", "shirt")
   and the list narrows to matches, grouped. Pass the drop title as `hint`
   and it suggests categories from that before the seller types anything.
   Submits nothing itself: the parent owns `value`, same as the old select. */
export default function CategorySelect({
  id,
  value,
  onChange,
  hint = "",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchCategories(query), [query]);
  const suggestions = useMemo(() => (value ? [] : suggestCategories(hint)), [hint, value]);
  const selectedGroup = value ? groupOf(value)?.label : undefined;

  // Group results in order, preserving the first-seen group order.
  const grouped = useMemo(() => {
    const map = new Map<string, CategoryHit[]>();
    for (const h of results) {
      const list = map.get(h.group.label) ?? [];
      list.push(h);
      map.set(h.group.label, list);
    }
    return Array.from(map.entries());
  }, [results]);

  useEffect(() => setActive(0), [query]);

  // Keep the active option in view while arrowing.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function pick(v: string) {
    onChange(v);
    close();
    inputRef.current?.blur();
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) pick(results[active].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  const shown = open ? query : value ? categoryLabel(value) : "";
  const activeId = open && results[active] ? `${listId}-${results[active].value}` : undefined;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          className="field pr-10"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          value={shown}
          placeholder="Type to search, like sourdough, tumbler, or soap"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={onKey}
        />
        {value && !open ? (
          <button
            type="button"
            aria-label="Clear category"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-cream-dark hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ) : (
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </div>

      {/* Selected: show the group so they can sanity-check the choice. */}
      {value && !open && selectedGroup && <p className="field-hint">In {selectedGroup}</p>}

      {/* Suggestions from the title, before they've picked anything. */}
      {!value && !open && suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Suggested:</span>
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => pick(s.value)}
              className="rounded-full border border-cream-dark bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:border-leaf hover:bg-cream"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-cream-dark bg-white py-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">
              No match for &ldquo;{query}&rdquo;. Try a broader word, or{" "}
              <button type="button" className="font-medium text-grove underline underline-offset-2" onMouseDown={(e) => e.preventDefault()} onClick={() => pick("other")}>
                file it under Other
              </button>
              .
            </li>
          ) : (
            grouped.map(([group, items]) => (
              <li key={group} role="presentation">
                <div className="sticky top-0 bg-white/95 px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted backdrop-blur">
                  {group}
                </div>
                <ul role="group" aria-label={group}>
                  {items.map((h) => {
                    const idx = results.indexOf(h);
                    const isActive = idx === active;
                    return (
                      <li
                        key={h.value}
                        id={`${listId}-${h.value}`}
                        data-index={idx}
                        role="option"
                        aria-selected={h.value === value}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => pick(h.value)}
                        className={`flex cursor-pointer items-center justify-between px-4 py-2 text-[0.95rem] ${
                          isActive ? "bg-cream text-grove" : ""
                        }`}
                      >
                        <span>{h.label}</span>
                        {h.value === value && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12l5 5L19 7" />
                          </svg>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
