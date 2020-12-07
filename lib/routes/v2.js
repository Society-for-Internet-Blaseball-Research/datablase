const Router = require('express-promise-router');

const { players } = require('../controllers/players.js');
const { team, teams } = require('../controllers/teams.js');

const router = new Router();

/**
 * Get all teams for a given season. Defaults to current season.
 *
 * @route GET /teams
 * @group Teams
 * @group APIv2
 * @summary Get the list of all teams
 * @returns {[object]} 200 - list of teams
 */
router.get('/teams', async (req, res) => {
  const season = Number(req.query.season);

  const result = await teams({ season });

  res.json(result);
});

/**
 * Get a single team's details for a given season. Defaults to current season.
 *
 * @route GET /teams/:teamId
 * @group Teams
 * @group APIv2
 * @summary Get a specific team's details
 * @returns {[object]} 200 - a team's details
 */
router.get('/teams/:teamId', async (req, res) => {
  const season = Number(req.query.season);
  const teamId = req.params.teamId;

  if (teamId === undefined) {
    const err = new Error('Required query param `teamId` missing');
    err.status = 400;
    next(err);
  }

  const result = await team({ season, teamId });

  res.json(result);
});

/**
 * Get all teams for a given season. Defaults to current season.
 *
 * @route GET /players
 * @group Players
 * @group APIv2
 * @summary Get the list of all players
 * @returns {[object]} 200 - list of players
 */
router.get('/players', async (req, res) => {
  const season = Number(req.query.season);

  const result = await players({ season });

  res.json(result);
});

module.exports = router;
