// AICPA attribute-sampling defaults for SOC 2 control testing.
// Ranges reflect common auditor practice for low-risk populations at ~90% confidence.
// Source: AICPA Audit Guide — Audit Sampling (2021), Ch. 3 (non-statistical sampling).

export type ControlFrequency =
  | "annual"
  | "semi_annual"
  | "quarterly"
  | "monthly"
  | "weekly"
  | "daily"
  | "recurring";

export interface FrequencyGuide {
  key: ControlFrequency;
  label: string;
  suggestedMin: number;
  suggestedMax: number;
  recommended: number;
}

export const FREQUENCY_GUIDE: FrequencyGuide[] = [
  { key: "annual",       label: "Annual",                       suggestedMin: 1,  suggestedMax: 1,  recommended: 1  },
  { key: "semi_annual",  label: "Semi-annual",                  suggestedMin: 1,  suggestedMax: 2,  recommended: 2  },
  { key: "quarterly",    label: "Quarterly",                    suggestedMin: 2,  suggestedMax: 2,  recommended: 2  },
  { key: "monthly",      label: "Monthly",                      suggestedMin: 2,  suggestedMax: 5,  recommended: 3  },
  { key: "weekly",       label: "Weekly",                       suggestedMin: 5,  suggestedMax: 15, recommended: 8  },
  { key: "daily",        label: "Daily",                        suggestedMin: 25, suggestedMax: 40, recommended: 30 },
  { key: "recurring",    label: "Recurring / multiple per day", suggestedMin: 40, suggestedMax: 60, recommended: 45 },
];

export function sampleSizeFor(
  frequency: ControlFrequency,
  populationSize: number,
): { n: number; rationale: string } {
  const guide = FREQUENCY_GUIDE.find(f => f.key === frequency) ?? FREQUENCY_GUIDE[3];
  // Cap at population size; floor at min.
  const n = Math.min(Math.max(guide.recommended, guide.suggestedMin), Math.max(populationSize, 1));
  const rationale =
    `Sample size ${n} selected from population of ${populationSize} ${guide.label.toLowerCase()} occurrences, ` +
    `per AICPA attribute-sampling guidance (suggested range ${guide.suggestedMin}–${guide.suggestedMax} ` +
    `for ${guide.label.toLowerCase()} controls at 90% confidence).`;
  return { n, rationale };
}

// Deterministic pseudo-random sample selection.
// Given a seed string + array + desired n, returns n unique items reproducibly.
// Uses a simple xorshift32 PRNG seeded by FNV-1a of the seed string — plenty for
// audit-reproducibility purposes (not cryptographic).
function fnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

function xorshift32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17; s >>>= 0;
    s ^= s << 5;  s >>>= 0;
    return s / 0xffffffff;
  };
}

export function deterministicSample<T>(items: T[], n: number, seed: string): T[] {
  if (n >= items.length) return [...items];
  const rand = xorshift32(fnv1a(seed));
  // Fisher–Yates partial shuffle
  const a = [...items];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

// Convenience: suggest a seed for engagement kickoff (user-visible, shareable).
export function generateSeed(): string {
  const now = new Date();
  const y = now.getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AUDIT-${y}-${rand}`;
}
