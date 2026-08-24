"use client";

import { clsx } from "clsx";
import { Loader2, LucideIcon } from "lucide-react";

interface AuthSubmitButtonProps {
  loading: boolean;
  loadingLabel: string;
  label: string;
  icon?: LucideIcon;
  className?: string;
}

export function AuthSubmitButton({
  loading,
  loadingLabel,
  label,
  icon: Icon,
  className,
}: AuthSubmitButtonProps) {
  return (
    <button type="submit" disabled={loading} className={clsx("btn-primary w-full mt-2", className)}>
      <span className="flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden />
            {loadingLabel}
          </>
        ) : (
          <>
            {label}
            {Icon ? <Icon size={18} aria-hidden /> : null}
          </>
        )}
      </span>
    </button>
  );
}
