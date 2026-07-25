create extension if not exists pgcrypto;

create table if not exists public.incidents (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null unique,
    description text not null check (char_length(description) between 10 and 2000),
    lat double precision not null check (lat between -90 and 90),
    lon double precision not null check (lon between -180 and 180),
    status text not null default 'processing' check (
        status in ('processing', 'needs_review', 'validated', 'processing_failed')
    ),
    priority text check (priority in ('alta', 'media', 'baja')),
    incident_type text,
    created_at timestamptz not null default now(),
    created_at_client timestamptz not null,
    video_url text,
    thumbnail_url text,
    gemma_result jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.incident_media (
    id uuid primary key default gen_random_uuid(),
    incident_id uuid not null references public.incidents(id) on delete cascade,
    media_type text not null check (media_type in ('photo', 'video')),
    storage_path text not null unique,
    public_url text,
    content_type text,
    size_bytes bigint check (size_bytes is null or size_bytes >= 0),
    created_at timestamptz not null default now()
);

create index if not exists incidents_created_at_idx
    on public.incidents (created_at desc);
create index if not exists incidents_status_priority_idx
    on public.incidents (status, priority);
create index if not exists incidents_location_idx
    on public.incidents (lon, lat);
create index if not exists incident_media_incident_id_idx
    on public.incident_media (incident_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists incidents_set_updated_at on public.incidents;
create trigger incidents_set_updated_at
before update on public.incidents
for each row execute function public.set_updated_at();

alter table public.incidents enable row level security;
alter table public.incident_media enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'incident-evidence',
    'incident-evidence',
    false,
    52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

comment on table public.incidents is
    'Reportes ciudadanos idempotentes por client_id y su clasificación multimodal.';
comment on table public.incident_media is
    'Metadatos de fotografías y videos almacenados en Supabase Storage.';
