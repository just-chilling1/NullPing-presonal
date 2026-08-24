"use client";

import { clsx } from "clsx";
import { Eye, EyeOff, LucideIcon } from "lucide-react";
import { InputHTMLAttributes, useId, useState } from "react";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  icon: LucideIcon;
  id?: string;
  showPasswordToggle?: boolean;
}

export function AuthField({
  label,
  icon: Icon,
  id: idProp,
  showPasswordToggle,
  className,
  type,
  ...props
}: AuthFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password" || (showPasswordToggle && type !== "text");
  const inputType = showPasswordToggle ? (visible ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="auth-field-label">
        {label}
      </label>
      <div className="relative group">
        <Icon className="auth-field-icon absolute left-4 top-1/2 -translate-y-1/2" size={18} aria-hidden />
        <input
          id={id}
          type={inputType}
          className={clsx("input-base w-full pl-12", showPasswordToggle && "pr-12", className)}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((v) => !v)}
            className="auth-field-icon absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer hover:text-pulse-700"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
