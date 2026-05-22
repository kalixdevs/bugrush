"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary — catches errors thrown by the root layout
 * itself. Must render its own <html>/<body>. Never shows a stack trace.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "26rem",
            width: "100%",
            border: "2px solid #27272a",
            background: "#18181b",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.75rem" }}>
            SOMETHING BROKE
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#a1a1aa", margin: "0 0 1.25rem" }}>
            The app hit an unexpected error. Please reload the page.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.7rem", color: "#52525b", margin: "0 0 1.25rem" }}>
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              cursor: "pointer",
              border: "2px solid #09090b",
              background: "#6366f1",
              color: "#09090b",
              padding: "0.5rem 1.25rem",
              fontFamily: "inherit",
              fontSize: "0.8rem",
            }}
          >
            RELOAD
          </button>
        </div>
      </body>
    </html>
  );
}
