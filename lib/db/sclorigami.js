const { all } = require('./db.js');

async function sclorigami() {
  return await all(
    `SELECT winning_score::TEXT || '|' || losing_score::TEXT AS lookup,
	winning_score, losing_score, instances,
	'S' || season + 1 || 'D' || (RIGHT(firstgame,3)::INTEGER)::TEXT AS first_game
	FROM
	(
		SELECT
			MIN(((season +1 ) * 1000) + DAY + 1)::text AS firstgame, MIN(season) AS season,
			COUNT(1) AS instances,
			CASE WHEN home_score > away_score THEN home_score ELSE away_score END AS winning_score,
			CASE WHEN home_score < away_score THEN home_score ELSE away_score END AS losing_score
			FROM DATA.games
			WHERE NOT (home_score = 0 AND away_score = 0)
			AND NOT(home_score = 3 AND away_score = 3)
			--Oy Vey, Coffee Cup ...
			AND season <> -1
			GROUP BY winning_score, losing_score
			ORDER BY winning_score, losing_score

	) a
	ORDER BY winning_score, losing_score
	;`
  );
}

module.exports = {
  sclorigami,
};
