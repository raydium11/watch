import Link from "next/link";
import { ErrorMessage } from "@/components/ErrorMessage";

export default function NotFound() {
  return (
    <main id="content" className="state-page">
      <ErrorMessage
        title="This page doesn't exist"
        actions={
          <Link href="/" className="btn btn-primary">
            Go to Watch
          </Link>
        }
      >
        Check the address, or paste a YouTube link on the home page.
      </ErrorMessage>
    </main>
  );
}
