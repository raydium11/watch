"use client";

import { forwardRef } from "react";
import { CloseIcon } from "./icons";

const SHORTCUTS: Array<[string[], string]> = [
  [["/"], "Focus the link box"],
  [["K", "Space"], "Play or pause"],
  [["J", "L"], "Back or forward 10 seconds"],
  [["←", "→"], "Back or forward 5 seconds"],
  [["M"], "Mute or unmute"],
  [["F"], "Full screen"],
  [["Esc"], "Close this panel or clear the link box"],
];

export const ShortcutsDialog = forwardRef<HTMLDialogElement>(function ShortcutsDialog(_props, ref) {
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="shortcuts-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-head">
          <h2 id="shortcuts-title" className="dialog-title">
            Keyboard shortcuts
          </h2>
          <form method="dialog">
            <button className="icon-btn" aria-label="Close keyboard shortcuts">
              <CloseIcon width={18} height={18} />
            </button>
          </form>
        </div>
        <dl className="shortcut-list">
          {SHORTCUTS.map(([keys, label]) => (
            <div key={label} className="shortcut-row">
              <dt>
                {keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <p className="dialog-note">
          When the video itself has focus, YouTube&apos;s own shortcuts apply, including C for captions and
          Shift + &gt; or &lt; for playback speed.
        </p>
      </div>
    </dialog>
  );
});
