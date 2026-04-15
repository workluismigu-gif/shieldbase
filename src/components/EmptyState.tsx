import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

interface Props {
  Icon: ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;
  title: string;
  description: string;
  cta?: { label: string; href: string };
  className?: string;
}

export default function EmptyState({ Icon, title, description, cta, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-foreground-subtle)] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5" strokeWidth={1.6} />
      </div>
      <div className="text-sm font-semibold text-[var(--color-foreground)]">{title}</div>
      <div className="text-xs text-[var(--color-muted)] mt-1.5 max-w-sm leading-relaxed">{description}</div>
      {cta && (
        <Link
          href={cta.href}
          className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium bg-[var(--color-foreground)] text-[var(--color-surface)] px-3 py-2 rounded-lg hover:opacity-90 transition"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
