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

notify pgrst, 'reload schema';
