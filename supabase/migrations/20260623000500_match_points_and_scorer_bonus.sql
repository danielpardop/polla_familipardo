alter table public.predictions
  drop constraint if exists predictions_valid_points;

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
    when sign(home_goals - away_goals) = sign(actual_home - actual_away)
      and (home_goals - away_goals) = (actual_home - actual_away) then 4
    when sign(home_goals - away_goals) = sign(actual_home - actual_away) then 3
    else 0
  end
  where match_id = p_match_id;
end;
$$;

update public.predictions
set points = case
  when predictions.home_goals = matches.home_goals and predictions.away_goals = matches.away_goals then 6
  when sign(predictions.home_goals - predictions.away_goals) = sign(matches.home_goals - matches.away_goals)
    and (predictions.home_goals - predictions.away_goals) = (matches.home_goals - matches.away_goals) then 4
  when sign(predictions.home_goals - predictions.away_goals) = sign(matches.home_goals - matches.away_goals) then 3
  else 0
end
from public.matches
where predictions.match_id = matches.id
  and matches.status = 'finished'
  and matches.home_goals is not null
  and matches.away_goals is not null;

alter table public.predictions
  add constraint predictions_valid_points check (points is null or points in (0, 3, 4, 6));

drop function if exists public.get_leaderboard();

create function public.get_leaderboard()
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

notify pgrst, 'reload schema';
