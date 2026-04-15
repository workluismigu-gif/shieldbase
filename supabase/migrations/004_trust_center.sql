-- Phase 4: Trust Center — publishable /trust/[slug] page backed by real org data

alter table organizations
  add column if not exists trust_slug text unique,
  add column if not exists trust_published boolean not null default false,
  add column if not exists trust_tagline text,
  add column if not exists trust_description text,
  add column if not exists trust_website text,
  add column if not exists trust_contact_email text;

-- Public read function. Returns a minimal, safe projection only when the org
-- has opted in via trust_published = true. Callable by the anon role so the
-- unauthenticated /trust/[slug] page can resolve the org without exposing the
-- full organizations table via RLS.
create or replace function get_trust_data(p_slug text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.trust_slug,
    'tagline', o.trust_tagline,
    'description', o.trust_description,
    'website', o.trust_website,
    'contact_email', o.trust_contact_email,
    'readiness_score', coalesce(o.readiness_score, 0),
    'frameworks', coalesce(o.frameworks, array[]::text[]),
    'tech_stack', coalesce(o.tech_stack, '{}'::jsonb),
    'created_at', o.created_at,
    'controls', coalesce((
      select jsonb_agg(jsonb_build_object(
        'control_id', c.control_id,
        'category', c.category,
        'status', c.status,
        'updated_at', c.updated_at
      ))
      from controls c
      where c.org_id = o.id
    ), '[]'::jsonb),
    'policies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', d.title,
        'type', d.type,
        'status', d.status
      ) order by d.title)
      from documents d
      where d.org_id = o.id and d.status = 'approved'
    ), '[]'::jsonb)
  )
  from organizations o
  where o.trust_slug = p_slug
    and o.trust_published = true
  limit 1;
$$;

grant execute on function get_trust_data(text) to anon, authenticated;

-- Deferred: NDA-gated report request inbox (v2).
-- create table trust_report_requests ( ... ) — not in this migration.
