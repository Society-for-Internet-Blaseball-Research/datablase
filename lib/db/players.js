const { all } = require('./db.js');
const { calculateSet, rowToIdMap, normalizeCommaSeparatedParam } = require('../utils/utils.js');

async function deceasedPlayers() {
	return await all(
		`SELECT 
		player_name,
		player_id,
		deceased,
		anticapitalism,
		base_thirst,
		buoyancy,
		chasiness,
		coldness,
		continuation,
		divinity,
		ground_friction,
		indulgence,
		laserlikeness,
		martyrdom,
		moxie,
		musclitude,
		omniscience,
		overpowerment,
		patheticism,
		ruthlessness,
		shakespearianism,
		suppression,
		tenaciousness,
		thwackability,
		tragicness,
		unthwackability,
		watchfulness,
		pressurization,
		cinnamon,
		total_fingers,
		soul,
		fate,
		peanut_allergy,
		armor,
		bat,
		ritual,
		coffee,
		blood
		FROM data.players WHERE deceased AND valid_until IS NULL`
	);
}

// Get the first record with each player id, sorted by time (so the first is the most recent)
async function playerIdsByName(name, current) {
	return await all(
		`SELECT distinct on(player_id) player_id, player_name, valid_from, valid_until 
		FROM data.players 
		WHERE player_name=$1 
		${current ? 'AND valid_until IS NULL': ''} 
		ORDER BY player_id, valid_until DESC`, 
		[name]
	);
}

async function playerInfoCurrent(playerIds) {
	return await all(
		`SELECT * 
		FROM data.players_info_expanded_all 
		WHERE player_id=ANY($1)
		AND valid_until is null`,
		[normalizeCommaSeparatedParam(playerIds)]
	);
}

async function playerInfoAll(playerIds) {
	return await all(
		`SELECT * 
		FROM data.players_info_expanded_all 
		WHERE player_id=ANY($1)
		ORDER BY player_id, valid_from`,
		[normalizeCommaSeparatedParam(playerIds)]
	);
}

async function taggedPlayers() {
	return await all(
		`select p.player_id, player_name, modification, pm.valid_from, t.team_id, t.nickname
		from data.player_modifications pm 
		join data.players p on p.player_id = pm.player_id
		join data.team_roster tr on p.player_id = tr.player_id
		join data.teams t on t.team_id = tr.team_id
		where p.valid_until is null
		and tr.valid_until is null
		and t.valid_until is null
		and p.deceased = false
		and pm.valid_until is null
		order by valid_from`
	);
}

// The player encyclopedia page is { playerName, playerSlug, isIncinerated } and the teams page is { teamFullName, teamSlug, teamEmoji, teamMainColor } I think

async function allPlayers(includeShadows = false) {
	let view = includeShadows ? "data.players_extended_current" : "data.players_current";

	return await all(
		`SELECT player_id, player_name, gameday_from, season_from, deceased, team_id, team, position_id, position_type
		FROM ${view}
		ORDER BY player_name`
	);
}

module.exports = {
	deceasedPlayers,
	playerIdsByName,
	playerInfoCurrent,
	playerInfoAll,
	taggedPlayers,
	allPlayers,
}