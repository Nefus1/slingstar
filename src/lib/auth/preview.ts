/**
 * Shared live-preview OAuth configuration (server-only).
 * Supply GROK_PREVIEW_CLIENT_SECRET through the host environment for preview
 * sign-in. Deployed apps use their per-app GROK_AUTH_CLIENT_SECRET instead.
 * Never commit OAuth credentials or expose them in client bundles.
 */
export const PREVIEW_CLIENT_ID = "grok_preview";
export const PREVIEW_CLIENT_SECRET = process.env.GROK_PREVIEW_CLIENT_SECRET?.trim() ?? "";

/** The shared auth broker issuer (OIDC discovery lives under it). */
export const GROK_ISSUER_DEFAULT = "https://auth.grok.me";

/**
 * Host patterns whose callbacks the preview client accepts. Better Auth derives
 * the live preview's real origin from the request host and validates it against
 * this list (wildcard-matched), so the OAuth `redirect_uri` becomes the concrete
 * `https://<preview-host>/api/auth/oauth2/callback/...` the broker allows.
 */
export const PREVIEW_ALLOWED_HOSTS = ["*.grok-sandbox.com"] as const;
