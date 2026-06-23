alter table public.profiles
  add column if not exists deleted_at timestamptz;

drop function if exists public.get_leaderboard();

create function public.get_leaderboard()
returns table (
  user_id uuid,
  full_name text,
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
  select
    profiles.id as user_id,
    coalesce(profiles.full_name, profiles.email) as full_name,
    coalesce(sum(predictions.points), 0)::integer as total_points,
    count(*) filter (where predictions.points = 3)::integer as exact_scores,
    count(*) filter (where predictions.points = 2)::integer as goal_differences,
    count(*) filter (where predictions.points = 1)::integer as outcomes,
    count(predictions.id)::integer as predictions_count
  from public.profiles
  left join public.predictions on predictions.user_id = profiles.id
  where auth.role() = 'authenticated'
    and profiles.deleted_at is null
    and not exists (
      select 1
      from public.user_roles
      where user_roles.user_id = profiles.id
        and user_roles.role = 'admin'
    )
  group by profiles.id, profiles.full_name, profiles.email
  order by total_points desc, exact_scores desc, goal_differences desc, outcomes desc, full_name asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;

notify pgrst, 'reload schema';
