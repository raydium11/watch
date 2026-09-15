"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { preconnect } from "react-dom";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { InlineError } from "./ErrorMessage";
import { ClipboardIcon, CloseIcon, LinkIcon, Spinner } from "./icons";

interface Props {
  variant: "hero" | "compact";
  onSubmitId: (id: string) => void;
  pending?: boolean;
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Called when Escape is pressed on an empty field. */
  onEscape?: () => void;
}

export const INVALID_LINK_MESSAGE = "That doesn't look like a valid YouTube link.";

export function VideoUrlInput({ variant, onSubmitId, pending = false, autoFocus = false, inputRef, onEscape }: Props) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const submitRef = useRef<HTMLButtonElement>(null);

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [canPaste, setCanPaste] = useState(false);

  useEffect(() => {
    setCanPaste(typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function");
  }, []);

  useEffect(() => {
    if (autoFocus && window.matchMedia("(hover: hover)").matches) ref.current?.focus();
  }, [autoFocus, ref]);

  function warmUp(text: string) {
    if (extractYouTubeVideoId(text)) {
      preconnect("https://www.youtube-nocookie.com");
      preconnect("https://i.ytimg.com");
    }
  }

  function handleChange(next: string) {
    setValue(next);
    if (error) setError(null);
    warmUp(next);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!value.trim()) {
      setError("Paste a YouTube link first.");
      ref.current?.focus();
      return;
    }
    const id = extractYouTubeVideoId(value);
    if (!id) {
      setError(INVALID_LINK_MESSAGE);
      ref.current?.focus();
      return;
    }
    setError(null);
    if (variant === "compact") setValue("");
    ref.current?.blur();
    onSubmitId(id);
  }

  async function handlePaste() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setError("Your clipboard is empty.");
        return;
      }
      setValue(text.slice(0, 2048));
      if (extractYouTubeVideoId(text)) {
        setError(null);
        warmUp(text);
        submitRef.current?.focus();
      } else {
        setError(INVALID_LINK_MESSAGE);
        ref.current?.focus();
      }
    } catch {
      setError("Clipboard access is blocked. Paste into the field instead.");
      ref.current?.focus();
    }
  }

  function handleClear() {
    setValue("");
    setError(null);
    ref.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    if (error) setError(null);
    else if (value) setValue("");
    else {
      ref.current?.blur();
      onEscape?.();
    }
  }

  const compact = variant === "compact";

  return (
    <form
      className={variant === "hero" ? "url-form url-form-hero" : "url-form url-form-compact"}
      onSubmit={handleSubmit}
      noValidate
      role="search"
      aria-label="Play a YouTube video"
    >
      <div className="url-bar" data-invalid={error ? "" : undefined}>
        <div className="url-field">
          <label htmlFor={fieldId} className="sr-only">
            YouTube link
          </label>
          <LinkIcon className="url-field-icon" width={compact ? 18 : 20} height={compact ? 18 : 20} />
          <input
            ref={ref}
            id={fieldId}
            className="url-input"
            type="url"
            inputMode="url"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={2048}
            placeholder={compact ? "Paste another YouTube link" : "https://www.youtube.com/watch?v=…"}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          {value ? (
            <button type="button" className="icon-btn" onClick={handleClear} aria-label="Clear link">
              <CloseIcon width={18} height={18} />
            </button>
          ) : canPaste ? (
            <button type="button" className="paste-btn" onClick={handlePaste} aria-label="Paste link from clipboard">
              <ClipboardIcon width={17} height={17} />
              {compact ? null : <span>Paste</span>}
            </button>
          ) : null}
        </div>
        <button
          ref={submitRef}
          type="submit"
          className="btn btn-primary url-submit"
          disabled={pending}
          aria-label={compact ? "Play Video" : undefined}
        >
          {pending ? <Spinner /> : null}
          <span>{compact ? "Play" : pending ? "Loading" : "Play Video"}</span>
        </button>
      </div>
      <div aria-live="polite">{error ? <InlineError id={errorId}>{error}</InlineError> : null}</div>
    </form>
  );
}
