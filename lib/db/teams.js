const { all } = require('./db.js');

async function currentTeams() {
  return await all(`SELECT * FROM data.teams_current`);
}

async function currentTeamStars() {
  return await all(`SELECT * FROM data.stars_team_all_current`);
}

async function teamIdBySlug(slug) {
  return await all(
    `SELECT team_id
		 FROM data.teams_current
		 WHERE url_slug = $1`,
    [slug]
  );
}

module.exports = {
  currentTeams,
  currentTeamStars,
  teamIdBySlug,
};
