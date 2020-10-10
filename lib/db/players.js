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

// All roster and player info as of a specific season/gameday

async function allPlayersForGameday(season, day) {
	return await all(
		`SELECT r.team_id, t.nickname, r.position_type_id, r.position_id, 
		player_name, p.player_id,
		anticapitalism, base_thirst, buoyancy, chasiness, coldness, continuation, divinity, ground_friction, indulgence,
		laserlikeness, martyrdom, moxie, musclitude, omniscience, overpowerment, patheticism, ruthlessness, shakespearianism,
		suppression, tenaciousness, thwackability, tragicness, unthwackability, watchfulness, pressurization,
		cinnamon, total_fingers, soul, fate, peanut_allergy, armor, bat, ritual, coffee, blood,
		data.batting_rating_raw(p.tragicness, p.patheticism, p.thwackability, p.divinity, p.moxie, p.musclitude, p.martyrdom) AS batting_rating,
		data.baserunning_rating_raw(p.laserlikeness, p.continuation, p.base_thirst, p.indulgence, p.ground_friction) AS baserunning_rating,
		data.defense_rating_raw(p.omniscience, p.tenaciousness, p.watchfulness, p.anticapitalism, p.chasiness) AS defense_rating,
		data.pitching_rating_raw(p.unthwackability, p.ruthlessness, p.overpowerment, p.shakespearianism, p.coldness) AS pitching_rating,
		data.rating_to_star(data.batting_rating_raw(p.tragicness, p.patheticism, p.thwackability, p.divinity, p.moxie, p.musclitude, p.martyrdom)) AS batting_stars,
		data.rating_to_star(data.baserunning_rating_raw(p.laserlikeness, p.continuation, p.base_thirst, p.indulgence, p.ground_friction)) AS baserunning_stars,
		data.rating_to_star(data.defense_rating_raw(p.omniscience, p.tenaciousness, p.watchfulness, p.anticapitalism, p.chasiness)) AS defense_stars,
		data.rating_to_star(data.pitching_rating_raw(p.unthwackability, p.ruthlessness, p.overpowerment, p.shakespearianism, p.coldness)) AS pitching_stars
		FROM DATA.rosters_from_timestamp(DATA.timestamp_from_gameday(${season}, ${day})) r
		JOIN DATA.teams_from_timestamp(DATA.timestamp_from_gameday(${season}, ${day})) t
		ON (r.team_id = t.team_id)
		JOIN DATA.players_from_timestamp(DATA.timestamp_from_gameday(${season}, ${day})) p
		ON (r.player_id = p.player_id)
		WHERE r.position_type_id < 2
		ORDER BY t.nickname, r.position_type_id, r.position_id`
	);
}

module.exports = {
	deceasedPlayers,
	playerIdsByName,
	playerInfoCurrent,
	playerInfoAll,
	taggedPlayers,
	allPlayers,
	allPlayersForGameday,
}
