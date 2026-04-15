import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Plug, Clock } from "lucide-react";

interface Props {
  Icon: ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;
  providerLabel: string;
  state: "not_connected" | "awaiting_first_scan" | "lambda_unsupported";
  detail?: string;
}

export default function ProviderEmptyState({ Icon, providerLabel, state, detail }: Props) {
  if (state === "not_connected") {
    return (
      <div className="bg-[var(--color-bg)] rounded-2xl border border-dashed border-[var(--color-border)] py-14 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-foreground-subtle)] flex items-center justify-center mx-auto mb-4">
          <Icon className="w-5 h-5" strokeWidth={1.6} />
        </div>
        <div className="text-sm font-semibold text-[var(--color-foreground)]">{providerLabel} not connected</div>
        <div className="text-xs text-[var(--color-muted)] mt-1.5 max-w-sm mx-auto leading-relaxed">
          Connect {providerLabel} from settings to start collecting evidence and surfacing controls automatically.
        </div>
        <Link
          href="/dashboard/settings"
          className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium bg-[var(--color-foreground)] text-[var(--color-surface)] px-3 py-2 rounded-lg hover:opacity-90 transition"
        >
          <Plug className="w-3.5 h-3.5" strokeWidth={1.8} />
          Connect {providerLabel}
        </Link>
      </div>
    );
  }

  if (state === "awaiting_first_scan") {
    return (
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] py-14 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-info-bg)] text-[var(--color-info)] flex items-center justify-center mx-auto mb-4">
          <Clock className="w-5 h-5" strokeWidth={1.6} />
        </div>
        <div className="text-sm font-semibold text-[var(--color-foreground)]">{providerLabel} awaiting first scan</div>
        <div className="text-xs text-[var(--color-muted)] mt-1.5 max-w-sm mx-auto leading-relaxed">
          {detail ?? "Connection saved. The first scan runs automatically — results will appear here within a few minutes."}
        </div>
      </div>
    );
  }

  // lambda_unsupported
  return (
    <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)]/20 py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-[var(--color-warning-bg)] text-[var(--color-warning)] flex items-center justify-center mx-auto mb-4">
        <Icon className="w-5 h-5" strokeWidth={1.6} />
      </div>
      <div className="text-sm font-semibold text-[var(--color-foreground)]">{providerLabel} scanning is on the roadmap</div>
      <div className="text-xs text-[var(--color-muted)] mt-1.5 max-w-md mx-auto leading-relaxed">
        Token is saved and the scanner Lambda is being invoked. {detail ?? "Awaiting scanner support — until then, this provider doesn\u2019t affect your score."}
      </div>
    </div>
  );
}
