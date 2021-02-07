const { all } = require('./db.js');
const {
  calculateSet,
  rowToIdMap,
  normalizeCommaSeparatedParam,
} = require('../utils/utils.js');

async function deceasedPlayers() {
  return await all(
    `SELECT *
		FROM data.players_info_expanded_all WHERE deceased AND valid_until IS NULL
		ORDER BY player_name`
  );
}

async function playerIdsByName(name, current) {
  return await all(
    `SELECT distinct on(player_id) player_id, player_name, valid_from, valid_until 
		FROM data.players_info_expanded_all
		WHERE player_name=$1 
		${current ? 'AND valid_until IS NULL' : ''} 
		ORDER BY player_id, player_name, valid_until DESC`,
    [name]
  );
}

// Get the first record with the given url_slug
async function playerIdBySlug(slug) {
  return await all(
    `SELECT player_id
		FROM data.players_info_expanded_all
		WHERE url_slug=$1 AND valid_until IS NULL`,
    [slug]
  );
}

async function playerInfoCurrent(playerIds) {
  return await all(
    `SELECT * 
		FROM data.players_info_expanded_all 
		WHERE player_id=ANY($1)
		AND valid_until is NULL
		ORDER BY player_name`,
    [normalizeCommaSeparatedParam(playerIds)]
  );
}

async function playerInfoAll(playerIds) {
  return await all(
    `SELECT * 
		FROM data.players_info_expanded_all 
		WHERE player_id=ANY($1)
		ORDER BY player_name, valid_from`,
    [normalizeCommaSeparatedParam(playerIds)]
  );
}

async function taggedPlayers() {
  return await all(
    `SELECT * 
		FROM data.players_info_expanded_all 
		WHERE valid_until IS NULL AND modifications IS NOT null ORDER BY player_name`
  );
}

// The player encyclopedia page is { playerName, playerSlug, isIncinerated } and the teams page is { teamFullName, teamSlug, teamEmoji, teamMainColor } I think

async function allPlayers(includeShadows = false) {
  return await all(
    `SELECT *
		FROM data.players_info_expanded_all 
		WHERE valid_until IS NULL
		${includeShadows ? '' : 'AND current_location=\'main_roster\''}
		ORDER BY player_name`
  );
}

// 

// All roster and player info as of a specific season/gameday

async function allPlayersForGameday(season, day) {
  return await all(
    `SELECT *
		from data.players_info_expanded_all p
		where p.valid_from <= DATA.timestamp_from_gameday(${season}, ${day}) + (INTERVAL '1 millisecond')
		and DATA.timestamp_from_gameday(${season}, ${day}) < coalesce(p.valid_until,timezone('utc'::text, now()) + (INTERVAL '1 millisecond'))
		AND position_type IN ('PITCHER','BATTER')
		ORDER BY team, position_type, position_id`
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
  playerIdBySlug,
};
