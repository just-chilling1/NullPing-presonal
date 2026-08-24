import { ShieldCheck } from "lucide-react";

export function AuthTrustBadge() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-[13px] text-ink-5">
      <ShieldCheck size={14} className="text-[var(--np-success)] shrink-0" aria-hidden />
      <span>256-bit encrypted · Secure member access</span>
    </div>
  );
}
