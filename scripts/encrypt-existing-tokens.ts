/**
 * One-time migration: encrypt existing plaintext OAuth tokens in `organizations.tech_stack`.
 *
 * Run with:
 *   npx tsx scripts/encrypt-existing-tokens.ts
 *
 * Idempotent — already-encrypted values (with `enc:v1:` prefix) are left alone.
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SHIELDBASE_ENCRYPTION_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { encryptToken, isEncrypted } from "../src/lib/crypto";

const TOKEN_FIELDS = [
  "github_token",
  "slack_access_token",
  "google_access_token",
  "google_refresh_token",
  "azure_access_token",
  "azure_refresh_token",
  "azure_client_secret",
];

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, tech_stack");
  if (error) throw error;
  if (!orgs) {
    console.log("No orgs found");
    return;
  }

  let touched = 0;
  for (const org of orgs) {
    const tech = (org.tech_stack ?? {}) as Record<string, unknown>;
    let changed = false;
    const updated = { ...tech };
    for (const field of TOKEN_FIELDS) {
      const v = updated[field];
      if (typeof v === "string" && v.length > 0 && !isEncrypted(v)) {
        updated[field] = encryptToken(v);
        changed = true;
        console.log(`  ${org.name}: encrypted ${field}`);
      }
    }
    if (changed) {
      const { error: upErr } = await supabase
        .from("organizations")
        .update({ tech_stack: updated })
        .eq("id", org.id);
      if (upErr) {
        console.error(`  ${org.name}: update failed:`, upErr.message);
      } else {
        touched++;
      }
    }
  }
  console.log(`\nDone. Encrypted tokens for ${touched} org(s).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
