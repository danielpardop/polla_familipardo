drop function if exists public.get_leaderboard();

create function public.get_leaderboard()
returns table (
  user_id uuid,
  full_name text,
  total_points integer,
  exact_scores integer,
  goal_differences integer,
  outcomes integer,
  scorer_hits integer,
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
  )
  select
    profiles.id as user_id,
    coalesce(profiles.full_name, profiles.email) as full_name,
    coalesce(sum(predictions.points), 0)::integer as total_points,
    count(*) filter (where predictions.points = 3)::integer as exact_scores,
    count(*) filter (where predictions.points = 2)::integer as goal_differences,
    count(*) filter (where predictions.points = 1)::integer as outcomes,
    coalesce(scorer_hits.scorer_hits, 0)::integer as scorer_hits,
    count(predictions.id)::integer as predictions_count
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
  order by total_points desc, exact_scores desc, goal_differences desc, outcomes desc, scorer_hits desc, full_name asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;

notify pgrst, 'reload schema';
