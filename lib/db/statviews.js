const { all } = require('./db.js');
const { calculateSet, rowToIdMap, normalizeCommaSeparatedParam } = require('../utils/utils.js');

async function seasonStats(season, playerIds, viewName, idName = 'player_id') {
	return await all(
		`SELECT * FROM ${viewName} 
		WHERE ${idName} = ANY($1) 
		AND season=$2`,
		[normalizeCommaSeparatedParam(playerIds), season]
	);
}

async function lifetimeStats(playerIds, viewName, idName = 'player_id'){
	return await all(
		`SELECT * from ${viewName}
		WHERE ${idName} = ANY($1)`,
		[normalizeCommaSeparatedParam(playerIds)]
	);
}

async function seasonBattingStats(season, playerIds) {
	return await seasonStats(season, playerIds, "data.batting_stats_player_season");
}

async function lifetimeBattingStats(playerIds) {
	return await lifetimeStats(playerIds, "data.batting_stats_player_lifetime");
}

async function seasonPitchingStats(season, playerIds) {
	return await seasonStats(season, playerIds, "data.pitching_stats_player_season", 'pitcher_id');
}

async function lifetimePitchingStats(playerIds) {
	return await lifetimeStats(playerIds, "data.pitching_stats_player_lifetime", 'pitcher_id');
}

module.exports = {
	seasonBattingStats,
	lifetimeBattingStats,
	seasonPitchingStats,
	lifetimePitchingStats,
}