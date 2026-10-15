export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Accounts are off while the app is being tested: everyone uses the editor
 * directly and work stays in their browser. Set NEXT_PUBLIC_AUTH_ENABLED=true
 * (with the Supabase variables) and redeploy to turn sign-up and projects on.
 */
export const authEnabled = supabaseConfigured && process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
