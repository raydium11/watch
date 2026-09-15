import type { ReactNode } from "react";
import { AlertIcon } from "./icons";

interface InlineProps {
  id?: string;
  children: ReactNode;
}

/** Short message shown directly under a form field. */
export function InlineError({ id, children }: InlineProps) {
  return (
    <p id={id} className="inline-error">
      <AlertIcon width={16} height={16} />
      <span>{children}</span>
    </p>
  );
}

interface PanelProps {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Larger state message, used inside the player area and for invalid pages. */
export function ErrorMessage({ title, children, actions, className = "" }: PanelProps) {
  return (
    <div className={`error-panel ${className}`} role="alert">
      <h2 className="error-panel-title">{title}</h2>
      {children ? <p className="error-panel-body">{children}</p> : null}
      {actions ? <div className="error-panel-actions">{actions}</div> : null}
    </div>
  );
}
