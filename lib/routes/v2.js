const Router = require('express-promise-router');

const { players } = require('../controllers/players.js');
const { teams } = require('../controllers/teams.js');

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
