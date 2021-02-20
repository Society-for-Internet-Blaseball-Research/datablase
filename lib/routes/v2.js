const Router = require('express-promise-router');

const { config } = require('../controllers/config.js');
const { playerStats, statLeaders } = require('../controllers/stats.js');
const { player, players } = require('../controllers/players.js');
const { team, teams } = require('../controllers/teams.js');

const router = new Router();

/**
 * Get all teams for a given season. Defaults to current season.
 *
 * @route GET /v2/teams
 * @group Teams
 * @group APIv2
 * @param {string} season.query - The (0-indexed) Blaseball season (or `current` for current season).
 * @returns {[object]} 200 - list of teams
 */
router.get('/teams', async (req, res) => {
  let season;

  if (req.query.season !== undefined) {
    if (req.query.season === '' || req.query.season === 'current') {
      season = 'current';
    } else {
      season = Number(req.query.season);
    }
  }
  const result = await teams({ season });

  res.json(result);
});

/**
 * Get a single team's details for a given season. Defaults to current season.
 *
 * @route GET /v2/teams/:teamIdOrSlug
 * @group Teams
 * @group APIv2
 * @param {string} teamIdOrSlug.query.required - The team ID or URL slug.
 * @param {string} season.query - The (0-indexed) Blaseball season.
 * @returns {[object]} 200 - a team's details
 */
router.get('/teams/:teamIdOrSlug', async (req, res, next) => {
  const teamIdOrSlug = req.params.teamIdOrSlug;

  if (teamIdOrSlug === undefined) {
    const err = new Error('Required query param `teamIdOrSlug` missing');
    err.status = 400;
    return next(err);
  }

  const season =
    req.query.season !== undefined
      ? isNaN(req.query.season)
        ? req.query.season
        : Number(req.query.season)
      : undefined;

  // Attempt to retrieve team by the default 'team_id' field
  let result = await team({ season, teamId: teamIdOrSlug });

  // If 'team_id' lookup returns null, attempt to find team by 'url_slug' field
  if (result === null) {
    result = await team({
      findByField: 'url_slug',
      season,
      teamId: teamIdOrSlug,
    });
  }

  if (result === null) {
    const err = new Error('No results found.');
    err.status = 404;
    return next(err);
  }

  res.json(result);
});

/**
 * Get a list of player details. Defaults to retrieving all players.
 *
 * @route GET /v2/players
 * @group Players
 * @group APIv2
 * @param {string} season.query - The (0-indexed) Blaseball season (or `current` for current season).
 * @param {string} playerPool.query - The pool of players to return (e.g. `deceased`, `rookies`).
 * @param {string} sortField.query - The column to sort players by.
 * @param {string} order.query - The order of the sortField (`asc` or `desc`).
 * @returns {[object]} 200 - list of players
 */
router.get('/players', async (req, res) => {
  const season =
    req.query.season !== undefined
      ? isNaN(req.query.season)
        ? req.query.season
        : Number(req.query.season)
      : undefined;
  const { order, playerPool, sortField } = req.query;

  const result = await players({ order, playerPool, season, sortField });

  res.json(result);
});

/**
 * Get a player's details. Defaults to retrieving most recent record.
 *
 * @route GET /v2/players/:playerIdOrSlug
 * @group Players
 * @group APIv2
 * @param {string} playerIdOrSlug.query.required - The player ID or URL slug.
 * @returns {[object]} 200 - player
 */
router.get('/players/:playerIdOrSlug', async (req, res, next) => {
  const playerIdOrSlug = req.params.playerIdOrSlug;

  if (playerIdOrSlug === undefined) {
    const err = new Error("Required query param 'playerIdOrSlug' missing.");
    err.status = 400;
    return next(err);
  }

  // Attempt to retrieve player by the default 'player_id' field
  let result = await player(playerIdOrSlug);

  // If 'player_id' lookup returns null, attempt to find player by 'url_slug' field
  if (result === null) {
    result = await player(playerIdOrSlug, { findByField: 'url_slug' });
  }

  if (result === null) {
    const err = new Error('No results found.');
    err.status = 404;
    return next(err);
  }

  res.json(result);
});

/**
 * Get stats for players and teams.
 *
 * @route GET /v2/stats
 * @group Stats
 * @group APIv2
 * @param {string} type.query.required - The type of stat split (defaults to `season`).
 * @param {string} group.query.required - The stat groups to return (e.g. `hitting,pitching` or `hitting`).
 * @param {string} fields.query - The stat fields to return (e.g. `strikeouts,home_runs` or `home_runs`).
 * @param {string} season.query - The (0-indexed) Blaseball season (or `current` for current season).
 * @param {string} gameType.query - The type of game (e.g. `R` for regular season, `P` for postseason).
 * @param {string} sortStat.query - The stat field to sort on.
 * @param {string} order.query - The order of the sorted stat field.
 * @param {string} playerId.query - The ID of a player.
 * @param {string} teamId.query - The ID of a team to retrieve player stats for.
 * @param {string} limit.query - The number of rows to return for each field (e.g. `5`).
 * @returns {[object]} 200 - list of stat splits
 */
router.get('/stats', async (req, res, next) => {
  const {
    gameType,
    group,
    order,
    playerId,
    sortStat,
    teamId,
    type,
  } = req.query;
  const limit =
    req.query.limit !== undefined ? Number(req.query.limit) : undefined;
  const season =
    req.query.season !== undefined
      ? isNaN(req.query.season)
        ? req.query.season
        : Number(req.query.season)
      : undefined;
  const fields =
    req.query.fields !== undefined ? req.query.fields.split(',') : undefined;

  if (group === undefined) {
    const err = new Error(
      "Required query param 'group' missing. Available groups: hitting, pitching."
    );
    err.status = 400;
    return next(err);
  }

  if (type === undefined) {
    const err = new Error(
      'Required query param `type` missing. Available types: season.'
    );
    err.status = 400;
    return next(err);
  }

  // Return an error when the `season`, `playerId`, `teamId`, `sortStat`, and
  // `order` params are used with `career` requests
  if (
    type === 'career' &&
    (season !== undefined ||
      playerId !== undefined ||
      teamId !== undefined ||
      sortStat !== undefined ||
      order !== undefined)
  ) {
    const err = new Error(
      'Supplied query param(s) cannot be used with `career` type requests.'
    );
    err.status = 400;
    return next(err);
  }

  // Return an error when `fiields` is used when more than one `group` is requested
  // Possible fix: Standardize the fields across groups, or prefix them with their group
  // so that they can be used in their appropriate group query.
  if (fields !== undefined && group.split(',').length > 1) {
    const err = new Error(
      'Query param `fields` cannot be used with multiple groups at this time.'
    );
    err.status = 400;
    return next(err);
  }

  const result = await playerStats({
    fields,
    gameType,
    group,
    limit,
    order,
    playerId,
    season,
    sortStat,
    teamId,
    type,
  });

  res.json(result);
});

/**
 * Get stats for players and teams.
 *
 * @route GET /v2/stats/leaders
 * @group Stat Leaders
 * @group APIv2
 * @param {string} group.query.required - The stat groups to return (e.g. `hitting,pitching` or `hitting`).
 * @param {string} season.query - The (0-indexed) Blaseball season (or `current` for current season).
 * @param {string} type.query - The type of leader results to return (e.g. `season` or `career`).
 * @returns {[object]} 200 - list of stat leader splits
 */
router.get('/stats/leaders', async (req, res, next) => {
  const { group, type } = req.query;
  const season =
    req.query.season !== undefined
      ? isNaN(req.query.season)
        ? req.query.season
        : Number(req.query.season)
      : undefined;

  if (group === undefined) {
    const err = new Error(
      "Required query param 'group' missing. Available groups: hitting, pitching."
    );
    err.status = 400;
    return next(err);
  }

  if (type === 'season' && season === undefined) {
    const err = new Error(
      'Required query param `season` missing. Available seasons: a 0-indexed Blaseball season or `current`.'
    );
    err.status = 400;
    return next(err);
  }

  if (type === 'career' && season !== undefined) {
    const err = new Error(
      'Query param `season` cannot be used with `career` type requests.'
    );
    err.status = 400;
    return next(err);
  }

  const result = await statLeaders({ group, season, type });

  res.json(result);
});

/**
 * Gets available options, limits, and mapped IDs to help navigate the API.
 *
 * @route GET /v2/config
 * @group APIv2
 * @returns {[object]} 200
 */
router.get('/config', async (req, res, next) => {
  const result = await config();

  res.json(result);
});

module.exports = router;
