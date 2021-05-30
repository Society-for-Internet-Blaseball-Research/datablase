const { all } = require('./db.js');

async function currentRoster(teamId, includeShadows, position) {
  return await all(
    `SELECT * FROM data.players_info_expanded_all
      WHERE team_id = $1
        AND valid_until IS NULL
        ${
          includeShadows === 'false'
            ? `AND current_location = 'main_roster'`
            : ''
        }
        ${position !== undefined ? `AND position_type = $2` : ''}
      ORDER BY position_type, position_id`,
    position === undefined ? [teamId] : [teamId, position]
  );
}

module.exports = {
  currentRoster,
};
