const { all } = require('./db.js');
const {
  calculateSet,
  rowToIdMap,
  normalizeCommaSeparatedParam,
} = require('../utils/utils.js');

async function currentRoster(teamId, includeShadows, position) {
  return await all(
    `SELECT 
		*
		FROM ${includeShadows ? 'data.rosters_extended_current' : 'data.rosters_current'}
    WHERE ${position ? `position_type='${position}' AND ` : ''}team_id=$1;`,
    [teamId]
  );
}

module.exports = {
  currentRoster,
};
