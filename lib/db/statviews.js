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
	return await seasonStats(season, playerIds, "data.pitching_stats_player_season");
}

async function lifetimePitchingStats(playerIds) {
	return await lifetimeStats(playerIds, "data.pitching_stats_player_lifetime");
}

async function seasonFieldingStats(season, playerIds) {
	return await seasonStats(season, playerIds, "data.fielder_stats_season");
}

async function lifetimeFieldingStats(playerIds) {
	return await lifetimeStats(playerIds, "data.fielder_stats_lifetime");
}

async function seasonRunningStats(season, playerIds) {
	return await seasonStats(season, playerIds, "data.running_stats_player_season");
}

async function lifetimeRunningStats(playerIds) {
	return await lifetimeStats(playerIds, "data.running_stats_player_lifetime");
}

async function seasonLeaders(season, category, stat, order, limit)
{
	if(!order)
		order = 'desc';

	let view = "";
	switch(category)
	{
		case 'batting': view = "data.batting_stats_player_season"; break;
		case 'pitching': view = "data.pitching_stats_player_season"; break;
		case 'running': view = "data.running_stats_player_season"; break;
		case 'fielding': view = "data.fielder_stats_season"; break;
	}

	return await all(
		`SELECT player_name, player_id, season, ${stat}, rank() OVER (ORDER BY ${stat} ${order})
		FROM ${view}
		WHERE season=$1
		${!limit ? '' : 'LIMIT $2'}`,
		!limit ? [season] :  [season, limit]
	)
}


module.exports = {
	seasonBattingStats,
	lifetimeBattingStats,
	seasonPitchingStats,
	lifetimePitchingStats,
	seasonFieldingStats,
	lifetimeFieldingStats,
	seasonRunningStats,
	lifetimeRunningStats,
	seasonLeaders,
}