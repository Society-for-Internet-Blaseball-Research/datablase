const { all } = require('./db.js');
const { calculateSet, rowToIdMap, normalizeCommaSeparatedParam } = require('../utils/utils.js');

async function playerAttrs(playerId) {
	return await all(
		`SELECT 
		player_name,
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
		FROM data.players WHERE player_id = $1 AND valid_until IS NULL`,
		[playerId]
	);
}

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
		`SELECT distinct on(player_id) player_id, player_name, valid_until 
		FROM data.players 
		WHERE player_name=$1 
		${current ? 'AND valid_until IS NULL': ''} 
		ORDER BY player_id, valid_until DESC`, 
		[name]
	);
}

module.exports = {
	playerAttrs,
	deceasedPlayers,
	playerIdsByName
}