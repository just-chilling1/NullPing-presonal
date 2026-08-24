import Link from "next/link";

interface AuthAlternateLinkProps {
  prompt: string;
  href: string;
  linkLabel: string;
}

export function AuthAlternateLink({ prompt, href, linkLabel }: AuthAlternateLinkProps) {
  return (
    <div className="flex flex-col items-center gap-2 auth-divider pt-5">
      <p className="text-ink-3 text-[13px]">{prompt}</p>
      <Link href={href} className="auth-link brand-font text-[15px] font-medium">
        {linkLabel}
      </Link>
    </div>
  );
}
