const { all } = require('./db.js');
const { calculateSet, rowToIdMap, normalizeCommaSeparatedParam } = require('../utils/utils.js');

async function currentRoster(teamId) {
	return await all(
		`select position_id, player_id from data.team_roster where team_id = $1 and valid_until is null order by position_id`,
		[teamId]
	);
}

module.exports = {
	currentRoster,
}