import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthChip() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-9 animate-pulse rounded-full bg-surface-2" />;
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface/80 px-3 text-sm font-medium text-fg backdrop-blur-sm hover:bg-surface-2"
      >
        Sign in
      </Link>
    );
  }
  return (
    <div className="rounded-md border border-border bg-surface/80 px-2 py-1 backdrop-blur-sm [&_button]:text-muted [&_img]:size-7 [&_span]:text-fg">
      <UserButton />
    </div>
  );
}
