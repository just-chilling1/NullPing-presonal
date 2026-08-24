"use client";

import { clsx } from "clsx";

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, Math.max(1, score)) as PasswordStrength;
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;
const COLORS = ["", "bg-[var(--np-danger)]", "bg-[var(--np-warning)]", "bg-pulse-500", "bg-[var(--np-success)]"] as const;

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="flex flex-col gap-1.5 px-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={clsx(
              "auth-strength-segment",
              strength >= level ? COLORS[strength] : "bg-[var(--np-line-strong)]"
            )}
          />
        ))}
      </div>
      <p className="text-[12px] text-ink-5">
        Strength: <span className="text-ink-3">{LABELS[strength]}</span>
        {password.length < 6 && " · At least 6 characters required"}
      </p>
    </div>
  );
}
