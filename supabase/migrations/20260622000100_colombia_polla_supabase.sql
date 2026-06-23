create extension if not exists pgcrypto;

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.prediction_scorers cascade;
drop table if exists public.match_scorers cascade;
drop table if exists public.predictions cascade;
drop table if exists public.players cascade;
drop table if exists public.matches cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;

drop function if exists public.calculate_points(uuid);
drop function if exists public.get_leaderboard();
drop function if exists public.has_role(uuid, public.app_role);
drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();
drop type if exists public.match_status cascade;
drop type if exists public.app_role cascade;

create type public.app_role as enum ('admin', 'user');
create type public.match_status as enum ('open', 'closed', 'finished');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'user',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  home_team text not null,
  home_flag text not null,
  away_team text not null,
  away_flag text not null,
  match_date timestamptz not null,
  venue text not null,
  phase text not null default 'Grupo K',
  home_goals integer,
  away_goals integer,
  status public.match_status not null default 'open',
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_non_negative_scores check (
    (home_goals is null or home_goals >= 0)
    and (away_goals is null or away_goals >= 0)
  ),
  constraint finished_matches_have_scores check (
    status <> 'finished'
    or (home_goals is not null and away_goals is not null)
  )
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  name text not null,
  position text not null default 'Mediocampista',
  active boolean not null default true,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint players_valid_position check (position in ('Delantero', 'Mediocampista', 'Defensa', 'Arquero')),
  unique (team_name, name)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_goals integer not null,
  away_goals integer not null,
  points integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id),
  constraint predictions_non_negative_scores check (home_goals >= 0 and away_goals >= 0),
  constraint predictions_valid_points check (points is null or points in (0, 2, 3, 4, 6))
);

create table public.prediction_scorers (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team_name text not null,
  slot_number integer not null,
  created_at timestamptz not null default now(),
  unique (prediction_id, team_name, slot_number),
  constraint prediction_scorers_slot_positive check (slot_number > 0)
);

create table public.match_scorers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team_name text not null,
  minute integer,
  created_at timestamptz not null default now(),
  constraint match_scorers_minute check (minute is null or minute between 1 and 130)
);

create index matches_order_idx on public.matches (display_order, match_date);
create index players_team_order_idx on public.players (team_name, display_order, name);
create index predictions_user_idx on public.predictions (user_id);
create index prediction_scorers_prediction_idx on public.prediction_scorers (prediction_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.calculate_points(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_home integer;
  actual_away integer;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only admins can calculate points.' using errcode = '42501';
  end if;

  select home_goals, away_goals
  into actual_home, actual_away
  from public.matches
  where id = p_match_id
    and status = 'finished';

  if actual_home is null or actual_away is null then
    raise exception 'Match must be finished with a complete score.';
  end if;

  update public.predictions
  set points = case
    when home_goals = actual_home and away_goals = actual_away then 6
    when actual_home = actual_away and home_goals = away_goals then 2
    when sign(home_goals - away_goals) = sign(actual_home - actual_away)
      and (home_goals - away_goals) = (actual_home - actual_away) then 4
    when sign(home_goals - away_goals) = sign(actual_home - actual_away) then 3
    else 0
  end
  where match_id = p_match_id;
end;
$$;

create or replace function public.get_leaderboard()
returns table (
  user_id uuid,
  full_name text,
  score_points integer,
  scorer_hits integer,
  total_points integer,
  exact_scores integer,
  goal_differences integer,
  outcomes integer,
  predictions_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with scorer_hits as (
    select
      predicted.user_id,
      coalesce(sum(least(predicted.predicted_count, coalesce(actual.actual_count, 0))), 0)::integer as scorer_hits
    from (
      select
        predictions.user_id,
        predictions.match_id,
        prediction_scorers.player_id,
        count(*)::integer as predicted_count
      from public.predictions
      join public.prediction_scorers on prediction_scorers.prediction_id = predictions.id
      group by predictions.user_id, predictions.match_id, prediction_scorers.player_id
    ) predicted
    left join (
      select
        match_scorers.match_id,
        match_scorers.player_id,
        count(*)::integer as actual_count
      from public.match_scorers
      join public.matches on matches.id = match_scorers.match_id
      where matches.status = 'finished'
      group by match_scorers.match_id, match_scorers.player_id
    ) actual on actual.match_id = predicted.match_id
      and actual.player_id = predicted.player_id
    group by predicted.user_id
  ),
  user_scores as (
    select
      profiles.id as user_id,
      coalesce(profiles.full_name, profiles.email) as full_name,
      coalesce(sum(predictions.points), 0)::integer as score_points,
      count(*) filter (where predictions.points = 6)::integer as exact_scores,
      count(*) filter (where predictions.points = 4)::integer as goal_differences,
      count(*) filter (where predictions.points in (2, 3))::integer as outcomes,
      count(predictions.id)::integer as predictions_count,
      coalesce(scorer_hits.scorer_hits, 0)::integer as scorer_hits
    from public.profiles
    left join public.predictions on predictions.user_id = profiles.id
    left join scorer_hits on scorer_hits.user_id = profiles.id
    where auth.role() = 'authenticated'
      and profiles.deleted_at is null
      and not exists (
        select 1
        from public.user_roles
        where user_roles.user_id = profiles.id
          and user_roles.role = 'admin'
      )
    group by profiles.id, profiles.full_name, profiles.email, scorer_hits.scorer_hits
  )
  select
    user_id,
    full_name,
    score_points,
    scorer_hits,
    (score_points + scorer_hits)::integer as total_points,
    exact_scores,
    goal_differences,
    outcomes,
    predictions_count
  from user_scores
  order by total_points desc, exact_scores desc, goal_differences desc, outcomes desc, scorer_hits desc, full_name asc;
$$;

revoke all on function public.calculate_points(uuid) from public;
revoke all on function public.get_leaderboard() from public;
grant execute on function public.calculate_points(uuid) to authenticated;
grant execute on function public.get_leaderboard() to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.matches enable row level security;
alter table public.players enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_scorers enable row level security;
alter table public.match_scorers enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, update on public.matches to authenticated;
grant select on public.players to authenticated;
grant select, insert, update, delete on public.predictions to authenticated;
grant select, insert, delete on public.prediction_scorers to authenticated;
grant select, insert, delete on public.match_scorers to authenticated;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and role = 'user');

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.has_role(auth.uid(), 'admin'))
with check (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "user_roles_select_own_or_admin"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "user_roles_insert_admin"
on public.user_roles
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "user_roles_update_admin"
on public.user_roles
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "user_roles_delete_admin"
on public.user_roles
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "matches_select_authenticated"
on public.matches
for select
to authenticated
using (true);

create policy "matches_update_admin"
on public.matches
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "players_select_authenticated"
on public.players
for select
to authenticated
using (true);

create policy "match_scorers_select_authenticated"
on public.match_scorers
for select
to authenticated
using (true);

create policy "match_scorers_insert_admin"
on public.match_scorers
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "match_scorers_delete_admin"
on public.match_scorers
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "predictions_select_own_or_admin"
on public.predictions
for select
to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "predictions_insert_own_open_match"
on public.predictions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.matches
    where matches.id = match_id
      and matches.status = 'open'
      and matches.match_date > now()
  )
);

create policy "predictions_update_own_open_match"
on public.predictions
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.matches
    where matches.id = match_id
      and matches.status = 'open'
      and matches.match_date > now()
  )
);

create policy "prediction_scorers_select_own_or_admin"
on public.prediction_scorers
for select
to authenticated
using (
  exists (
    select 1
    from public.predictions
    where predictions.id = prediction_id
      and (predictions.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  )
);

create policy "prediction_scorers_insert_own_open_match"
on public.prediction_scorers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.predictions
    join public.matches on matches.id = predictions.match_id
    where predictions.id = prediction_id
      and predictions.user_id = auth.uid()
      and matches.status = 'open'
      and matches.match_date > now()
  )
);

create policy "prediction_scorers_delete_own_open_match"
on public.prediction_scorers
for delete
to authenticated
using (
  exists (
    select 1
    from public.predictions
    join public.matches on matches.id = predictions.match_id
    where predictions.id = prediction_id
      and predictions.user_id = auth.uid()
      and matches.status = 'open'
      and matches.match_date > now()
  )
);

insert into public.matches
  (code, home_team, home_flag, away_team, away_flag, match_date, venue, phase, home_goals, away_goals, status, display_order)
values
  ('uzb-col-2026-06-17', 'Uzbekistan', '🇺🇿', 'Colombia', '🇨🇴', '2026-06-18 03:00:00+00', 'Estadio Azteca, Ciudad de Mexico', 'Grupo K', 1, 3, 'finished', 1),
  ('col-cod-2026-06-23', 'Colombia', '🇨🇴', 'R. D. del Congo', '🇨🇩', '2026-06-24 03:00:00+00', 'Estadio Akron, Guadalajara', 'Grupo K', null, null, 'open', 2),
  ('col-por-2026-06-27', 'Colombia', '🇨🇴', 'Portugal', '🇵🇹', '2026-06-27 22:30:00+00', 'Hard Rock Stadium, Miami', 'Grupo K', null, null, 'open', 3);

insert into public.players (team_name, name, position, display_order)
values
  ('Colombia', 'Luis Diaz', 'Delantero', 1),
  ('Colombia', 'Jhon Duran', 'Delantero', 2),
  ('Colombia', 'Rafael Santos Borre', 'Delantero', 3),
  ('Colombia', 'Luis Sinisterra', 'Delantero', 4),
  ('Colombia', 'Jaminton Campaz', 'Delantero', 5),
  ('Colombia', 'James Rodriguez', 'Mediocampista', 20),
  ('Colombia', 'Jhon Arias', 'Mediocampista', 21),
  ('Colombia', 'Jefferson Lerma', 'Mediocampista', 22),
  ('Colombia', 'Richard Rios', 'Mediocampista', 23),
  ('Colombia', 'Kevin Castano', 'Mediocampista', 24),
  ('Colombia', 'Juan Fernando Quintero', 'Mediocampista', 25),
  ('Colombia', 'Daniel Munoz', 'Defensa', 40),
  ('Colombia', 'Yerry Mina', 'Defensa', 41),
  ('Colombia', 'Davinson Sanchez', 'Defensa', 42),
  ('Colombia', 'Jhon Lucumi', 'Defensa', 43),
  ('Colombia', 'Johan Mojica', 'Defensa', 44),
  ('Colombia', 'Carlos Cuesta', 'Defensa', 45),
  ('Colombia', 'Camilo Vargas', 'Arquero', 60),
  ('Colombia', 'David Ospina', 'Arquero', 61),
  ('Colombia', 'Alvaro Montero', 'Arquero', 62),
  ('Uzbekistan', 'Eldor Shomurodov', 'Delantero', 1),
  ('Uzbekistan', 'Oston Urunov', 'Delantero', 2),
  ('Uzbekistan', 'Abbosbek Fayzullaev', 'Mediocampista', 20),
  ('Uzbekistan', 'Jaloliddin Masharipov', 'Mediocampista', 21),
  ('Uzbekistan', 'Odiljon Hamrobekov', 'Mediocampista', 22),
  ('Uzbekistan', 'Azizbek Turgunboev', 'Mediocampista', 23),
  ('Uzbekistan', 'Farrukh Sayfiev', 'Defensa', 40),
  ('Uzbekistan', 'Rustam Ashurmatov', 'Defensa', 41),
  ('Uzbekistan', 'Abdukodir Khusanov', 'Defensa', 42),
  ('Uzbekistan', 'Utkir Yusupov', 'Arquero', 60),
  ('R. D. del Congo', 'Cedric Bakambu', 'Delantero', 1),
  ('R. D. del Congo', 'Yoane Wissa', 'Delantero', 2),
  ('R. D. del Congo', 'Silas', 'Delantero', 3),
  ('R. D. del Congo', 'Theo Bongonda', 'Delantero', 4),
  ('R. D. del Congo', 'Simon Banza', 'Delantero', 5),
  ('R. D. del Congo', 'Gael Kakuta', 'Mediocampista', 20),
  ('R. D. del Congo', 'Samuel Moutoussamy', 'Mediocampista', 21),
  ('R. D. del Congo', 'Charles Pickel', 'Mediocampista', 22),
  ('R. D. del Congo', 'Chancel Mbemba', 'Defensa', 40),
  ('R. D. del Congo', 'Arthur Masuaku', 'Defensa', 41),
  ('R. D. del Congo', 'Dimitry Bertaud', 'Arquero', 60),
  ('Portugal', 'Cristiano Ronaldo', 'Delantero', 1),
  ('Portugal', 'Rafael Leao', 'Delantero', 2),
  ('Portugal', 'Goncalo Ramos', 'Delantero', 3),
  ('Portugal', 'Joao Felix', 'Delantero', 4),
  ('Portugal', 'Diogo Jota', 'Delantero', 5),
  ('Portugal', 'Bruno Fernandes', 'Mediocampista', 20),
  ('Portugal', 'Bernardo Silva', 'Mediocampista', 21),
  ('Portugal', 'Vitinha', 'Mediocampista', 22),
  ('Portugal', 'Joao Palhinha', 'Mediocampista', 23),
  ('Portugal', 'Ruben Dias', 'Defensa', 40),
  ('Portugal', 'Pepe', 'Defensa', 41),
  ('Portugal', 'Joao Cancelo', 'Defensa', 42),
  ('Portugal', 'Diogo Dalot', 'Defensa', 43),
  ('Portugal', 'Diogo Costa', 'Arquero', 60);

insert into public.match_scorers (match_id, player_id, team_name, minute)
select matches.id, players.id, players.team_name, scored.minute
from (
  values
    ('uzb-col-2026-06-17', 'Daniel Munoz', 22),
    ('uzb-col-2026-06-17', 'Abbosbek Fayzullaev', 54),
    ('uzb-col-2026-06-17', 'Luis Diaz', 63),
    ('uzb-col-2026-06-17', 'Jaminton Campaz', 90)
) as scored(match_code, player_name, minute)
join public.matches on matches.code = scored.match_code
join public.players on players.name = scored.player_name;
