import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Save lead email from landing page
export async function saveLead(email: string) {
  const { error } = await supabase.from("leads").insert({ email, source: "landing_page" });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

// Sign up new user + create their org
export async function signUp(email: string, password: string, orgName: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.user) {
    await supabase.from("organizations").insert({
      name: orgName,
      owner_id: data.user.id,
    });
  }
  return data;
}

// Sign in
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  await supabase.auth.signOut();
}

// Get current session
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export type OrgRole = "owner" | "admin" | "auditor_readonly";

export type OrgRow = {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
  tech_stack: Record<string, unknown>;
  readiness_score: number;
  industry: string | null;
  employee_count: number | null;
  cloud_provider: string | null;
  frameworks: string[];
  scope_config?: Record<string, unknown> | null;
  sample_seed?: string | null;
  trust_slug?: string | null;
  trust_published?: boolean | null;
  trust_tagline?: string | null;
  trust_description?: string | null;
  trust_website?: string | null;
  trust_contact_email?: string | null;
  role?: OrgRole;
};

// Get org for current user. Owners are looked up via organizations.owner_id;
// invited members (admin / auditor_readonly) are resolved via org_members.
export async function getOrg(): Promise<OrgRow | null> {
  const session = await getSession();
  if (!session) return null;

  const { data: owned } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", session.user.id)
    .maybeSingle();
  if (owned) return { ...(owned as OrgRow), role: "owner" };

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", session.user.id)
    .not("accepted_at", "is", null)
    .maybeSingle();
  if (!membership?.org_id) return null;

  const { data: memberOrg } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.org_id)
    .maybeSingle();
  if (!memberOrg) return null;

  return { ...(memberOrg as OrgRow), role: membership.role as OrgRole };
}
