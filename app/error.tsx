"use client";

import Link from "next/link";
import { ErrorMessage } from "@/components/ErrorMessage";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="content" className="state-page">
      <ErrorMessage
        title="Something went wrong on this page"
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={reset}>
              Try again
            </button>
            <Link href="/" className="btn btn-quiet">
              Go to Watch
            </Link>
          </>
        }
      >
        Reload the page, or start again from the home page.
      </ErrorMessage>
    </main>
  );
}
