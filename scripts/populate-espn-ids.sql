update games set espn_event_id = '401864003', espn_league = 'fifa.friendly'
where (home_team ilike '%panama%' and away_team ilike '%brazil%')
   or (home_team ilike '%brazil%' and away_team ilike '%panama%');

update games set espn_event_id = '401861998', espn_league = 'fifa.friendly'
where (home_team ilike '%brazil%' and away_team ilike '%egypt%')
   or (home_team ilike '%egypt%' and away_team ilike '%brazil%');

select home_team, away_team, espn_event_id, espn_league, api_football_fixture_id, thesportsdb_event_id
from games where is_enabled = true order by scheduled_at;
