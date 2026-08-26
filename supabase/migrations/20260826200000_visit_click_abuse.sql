alter table public.page_visits
  add column if not exists visitor_hash text;

alter table public.affiliate_clicks
  add column if not exists visitor_hash text;

create index if not exists page_visits_dedupe_idx
  on public.page_visits (site_id, visitor_hash, created_at desc);

create index if not exists affiliate_clicks_dedupe_idx
  on public.affiliate_clicks (site_id, visitor_hash, created_at desc);

drop policy if exists "insert page visits" on public.page_visits;
drop policy if exists "insert clicks" on public.affiliate_clicks;

drop function if exists public.record_page_visit(uuid, uuid, text, text);
drop function if exists public.record_page_visit(uuid, uuid, text, text, text);

create or replace function public.record_page_visit(
  p_site_id uuid,
  p_pin_id uuid default null,
  p_source text default null,
  p_country text default null,
  p_visitor_hash text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor_hash is not null and exists (
    select 1
    from public.page_visits
    where site_id = p_site_id
      and visitor_hash = p_visitor_hash
      and created_at > now() - interval '30 minutes'
  ) then
    return;
  end if;

  if exists (select 1 from public.sites where id = p_site_id and status = 'live') then
    insert into public.page_visits (site_id, pin_id, source, country, visitor_hash)
    values (p_site_id, p_pin_id, p_source, p_country, p_visitor_hash);
  end if;
end;
$$;

create or replace function public.record_affiliate_click(
  p_site_id uuid,
  p_post_id uuid default null,
  p_link_url text default null,
  p_visitor_hash text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visitor_hash is not null
    and p_link_url is not null
    and exists (
      select 1
      from public.affiliate_clicks
      where site_id = p_site_id
        and visitor_hash = p_visitor_hash
        and link_url = p_link_url
        and created_at > now() - interval '15 minutes'
    ) then
    return;
  end if;

  if exists (select 1 from public.sites where id = p_site_id and status = 'live') then
    insert into public.affiliate_clicks (post_id, site_id, link_url, visitor_hash)
    values (p_post_id, p_site_id, p_link_url, p_visitor_hash);
  end if;
end;
$$;

grant execute on function public.record_page_visit(uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.record_affiliate_click(uuid, uuid, text, text) to anon, authenticated;
