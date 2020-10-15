const { all } = require('./db.js');
const {
  calculateSet,
  rowToIdMap,
  normalizeCommaSeparatedParam,
} = require('../utils/utils.js');

async function currentRoster(teamId) {
  return await all(
    `select 
		*
		from data.rosters_current where team_id = $1;`,
    [teamId]
  );
}

module.exports = {
  currentRoster,
};
