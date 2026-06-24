create or replace function public.get_finished_predictions_for_user(p_user_id uuid)
returns table (
  match_id uuid,
  match_code text,
  display_order integer,
  home_team text,
  away_team text,
  home_goals integer,
  away_goals integer,
  prediction_home_goals integer,
  prediction_away_goals integer,
  score_points integer,
  scorer_hits integer,
  total_points integer,
  scorers jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with scorer_hits as (
    select
      prediction_counts.prediction_id,
      coalesce(sum(least(prediction_counts.predicted_count, coalesce(actual_counts.actual_count, 0))), 0)::integer as scorer_hits
    from (
      select
        predictions.id as prediction_id,
        predictions.match_id,
        prediction_scorers.player_id,
        count(*)::integer as predicted_count
      from public.predictions
      join public.prediction_scorers on prediction_scorers.prediction_id = predictions.id
      where predictions.user_id = p_user_id
      group by predictions.id, predictions.match_id, prediction_scorers.player_id
    ) prediction_counts
    left join (
      select
        match_scorers.match_id,
        match_scorers.player_id,
        count(*)::integer as actual_count
      from public.match_scorers
      group by match_scorers.match_id, match_scorers.player_id
    ) actual_counts on actual_counts.match_id = prediction_counts.match_id
      and actual_counts.player_id = prediction_counts.player_id
    group by prediction_counts.prediction_id
  ),
  scorer_rows as (
    select
      prediction_scorers.prediction_id,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', players.name,
            'team_name', prediction_scorers.team_name,
            'slot_number', prediction_scorers.slot_number
          )
          order by prediction_scorers.slot_number
        ),
        '[]'::jsonb
      ) as scorers
    from public.prediction_scorers
    join public.players on players.id = prediction_scorers.player_id
    group by prediction_scorers.prediction_id
  )
  select
    matches.id as match_id,
    matches.code as match_code,
    matches.display_order,
    matches.home_team,
    matches.away_team,
    matches.home_goals,
    matches.away_goals,
    predictions.home_goals as prediction_home_goals,
    predictions.away_goals as prediction_away_goals,
    coalesce(predictions.points, 0)::integer as score_points,
    coalesce(scorer_hits.scorer_hits, 0)::integer as scorer_hits,
    (coalesce(predictions.points, 0) + coalesce(scorer_hits.scorer_hits, 0))::integer as total_points,
    coalesce(scorer_rows.scorers, '[]'::jsonb) as scorers
  from public.predictions
  join public.matches on matches.id = predictions.match_id
  left join scorer_hits on scorer_hits.prediction_id = predictions.id
  left join scorer_rows on scorer_rows.prediction_id = predictions.id
  where auth.role() = 'authenticated'
    and predictions.user_id = p_user_id
    and matches.status = 'finished'
    and predictions.points is not null
  order by matches.display_order, matches.match_date;
$$;

revoke all on function public.get_finished_predictions_for_user(uuid) from public;
grant execute on function public.get_finished_predictions_for_user(uuid) to authenticated;
