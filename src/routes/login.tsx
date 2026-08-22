import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg select-text">
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl italic tracking-tight">Apsis</p>
        <h1 className="mt-3 text-xl font-medium">Sign in to the lab</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Keep your place among the worlds. The sandbox itself stays open to guests.
        </p>
        <div className="mt-8 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-fg transition-colors duration-(--motion-quick) hover:bg-surface-2"
              >
                Continue with {p.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center text-sm text-muted hover:text-fg"
        >
          Back to the lab
        </Link>
      </div>
    </main>
  );
}
