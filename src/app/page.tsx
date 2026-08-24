import { redirect } from "next/navigation";

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return null;
}

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const code = first(params.code);
  const tokenHash = first(params.token_hash);
  const type = first(params.type);

  if (code || (tokenHash && type)) {
    const qs = new URLSearchParams();
    if (code) qs.set("code", code);
    if (tokenHash) qs.set("token_hash", tokenHash);
    if (type) qs.set("type", type);
    qs.set("next", type === "recovery" ? "/reset-password" : "/dashboard");
    redirect(`/auth/callback?${qs.toString()}`);
  }

  redirect("/dashboard");
}
