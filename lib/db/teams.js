const { all } = require('./db.js');


async function currentTeams() {
	return await all(
		`SELECT * FROM data.teams_current`
	);
}

async function currentTeamStars() {
	return await all(
		`SELECT * FROM data.stars_team_all_current`
	);
}

module.exports = {
	currentTeams,
	currentTeamStars
}