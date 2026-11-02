export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Accounts are required: the editor and projects need a signed-in user.
 * NEXT_PUBLIC_AUTH_ENABLED=false switches them off (local testing only).
 */
export const authEnabled = supabaseConfigured && process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";
