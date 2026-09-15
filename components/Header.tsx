"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { hasModifier, isInteractiveTarget, isModalOpen } from "@/lib/dom";
import { CloseIcon, LogoMark, PlusIcon, SearchIcon } from "./icons";
import { VideoUrlInput } from "./VideoUrlInput";

interface Props {
  onSubmitId: (id: string) => void;
}

export function Header({ onSubmitId }: Props) {
  const inlineRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openSheet() {
    const sheet = sheetRef.current;
    if (!sheet || sheet.open) return;
    sheet.showModal();
    sheetInputRef.current?.focus();
  }

  function closeSheet() {
    sheetRef.current?.close();
  }

  // "/" focuses the link box: inline on wider screens, in a sheet on narrow ones.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || hasModifier(event) || isInteractiveTarget(event.target) || isModalOpen()) return;
      event.preventDefault();
      const inline = inlineRef.current;
      if (inline && inline.offsetParent !== null) {
        inline.focus();
        inline.select();
      } else {
        openSheet();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Watch home">
          <LogoMark />
          <span className="brand-name">Watch</span>
        </Link>

        <div className="header-search">
          <VideoUrlInput variant="compact" inputRef={inlineRef} onSubmitId={onSubmitId} />
        </div>

        <div className="header-actions">
          <button
            ref={triggerRef}
            type="button"
            className="icon-btn header-search-trigger"
            onClick={openSheet}
            aria-label="Play another video"
            aria-haspopup="dialog"
          >
            <SearchIcon />
          </button>
          <Link href="/" className="btn btn-ghost">
            <PlusIcon width={18} height={18} />
            <span>New Video</span>
          </Link>
        </div>
      </header>

      <dialog
        ref={sheetRef}
        className="sheet"
        aria-label="Play another video"
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSheet();
        }}
      >
        <div className="sheet-inner">
          <div className="sheet-head">
            <p className="sheet-title">Play another video</p>
            <button type="button" className="icon-btn" onClick={closeSheet} aria-label="Close">
              <CloseIcon width={18} height={18} />
            </button>
          </div>
          <VideoUrlInput
            variant="hero"
            inputRef={sheetInputRef}
            onEscape={closeSheet}
            onSubmitId={(id) => {
              closeSheet();
              onSubmitId(id);
            }}
          />
        </div>
      </dialog>
    </>
  );
}
