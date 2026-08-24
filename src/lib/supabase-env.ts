/** Supabase JWT keys are base64 JSON and start with eyJ. Some hosts drop the leading "e". */
export function normalizeSupabaseKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.startsWith("yJhbGci")) {
    return `e${trimmed}`;
  }
  return trimmed;
}

export function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
}

export function getSupabaseAnonKey(): string {
  return normalizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
}
