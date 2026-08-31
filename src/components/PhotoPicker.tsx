"use client";
import { useRef, useState } from "react";
import { resizeImageFile } from "@/lib/image";
import { useToast } from "./Toast";

const MAX_PHOTOS = 10;

export default function PhotoPicker({
  files,
  onChange,
  existingUrls = [],
  onRemoveExisting,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  /** Already-uploaded photo URLs shown alongside new picks, for the edit screen. */
  existingUrls?: string[];
  onRemoveExisting?: (url: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const total = existingUrls.length + files.length;

  async function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) return;
    const room = MAX_PHOTOS - total;
    if (room <= 0) {
      toast(`You can add up to ${MAX_PHOTOS} photos.`, "error");
      return;
    }
    const toAdd = incoming.slice(0, room);
    if (incoming.length > toAdd.length) {
      toast(`Only added ${toAdd.length}. You can add up to ${MAX_PHOTOS} photos.`, "info");
    }
    setProcessing(true);
    const resized = await Promise.all(toAdd.map((f) => resizeImageFile(f)));
    setProcessing(false);
    onChange([...files, ...resized]);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-leaf bg-cream-dark" : "border-cream-dark bg-white"
        }`}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="text-leaf">
          <path
            d="M16 21V9M16 9L10 15M16 9l6 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <rect x="5" y="23" width="22" height="4" rx="2" fill="currentColor" opacity="0.25" />
        </svg>
        <p className="mt-2 font-semibold">
          {processing ? "Preparing photos" : "Drag photos here, or tap to choose"}
        </p>
        <p className="mt-1 text-sm text-muted">
          Up to {MAX_PHOTOS} photos. {total} of {MAX_PHOTOS} added.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(existingUrls.length > 0 || files.length > 0) && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {existingUrls.map((url) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg bg-cream-dark">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(url)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-cream"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg bg-cream-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                aria-label="Remove photo"
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-cream"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
