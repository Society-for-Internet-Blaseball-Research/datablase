const Router = require('express-promise-router');

const { allWithCount } = require('../db/db.js');
const { atBats, plateAppearances, hits, timesOnBase, battingAverage, onBasePercentage, slugging, onBasePlusSlugging, outsRecorded, hitsRecorded, walksRecorded, whip, earnedRuns, era } = require('../db/stats.js');
const { resultsWithCount } = require('../utils/utils.js');

const router = new Router();

function addRoute(router, endpoint, method, queryAccessor) {
  router.get(endpoint, async (req, res) => {
    res.json(resultsWithCount(await method(req.query[queryAccessor])));
  })
}

/**
 * @typedef GameEvent
 * @property {number} id - The unique ID of the game event record.
 * @property {string} game_id - The ID of the game record as specified by the Blaseball API.
 * @property {string} event_type - The type of event that occurred. One of UNKNOWN, NONE, OUT, STRIKEOUT, STOLEN_BASE, CAUGHT_STEALING, PICKOFF, WILD_PITCH, BALK, OTHER_ADVANCE, WALK, INTENTIONAL_WALK, HIT_BY_PITCH, FIELDERS_CHOICE, SINGLE, DOUBLE, TRIPLE, HOME_RUN.
 * @property {number} event_index - The position of this event relative to the other events in the game (0-indexed).
 * @property {number} inning - The inning in which the event occurred (1-indexed).
 * @property {boolean} top_of_inning - Did this event take place in the top or the bottom of the inning?
 * @property {number} outs_before_play - The number of outs before this event took place.
 * @property {string} batter_id - The ID of the batter's player record as specified by the Blaseball API.
 * @property {string} batter_team_id - The ID of the batter's team record as specified by the Blaseball API.
 * @property {string} pitcher_id - The ID of the pitcher's player record as specified by the Blaseball API.
 * @property {string} batter_id - The ID of the pitcher's team record as specified by the Blaseball API.
 * @property {number} home_score - The score of the home team.
 * @property {number} away_score - The score of the away team.
 * @property {number} home_strike_count - The number of strikes required to strike out a batter on the home team.
 * @property {number} away_strike_count - The number of strikes required to strike out a batter on the away team.
 * @property {number} batter_count - The total number of batters that have taken the plate in this game.
 * @property {[string]} pitches - The pitches in this play. See Retrosheet's MEVENT for symbology.
 * @property {number} total_strikes - The total number of strikes that occurred in the play.
 * @property {number} total_balls - The total number of balls that occurred in the play.
 * @property {number} total_fouls - The total number of foul balls that occurred in the play (not currently trackable).
 * @property {boolean} is_leadoff - Is this batter leading off the inning?
 * @property {boolean} is_pinch_hit - Is this batter pinch hitting?
 * @property {number} lineup_position - Not currently implemented.
 * @property {boolean} is_last_event_for_plate_appearance - Is this the last event in the plate appearance? (Almost always true; false if a base is stolen, for example).
 * @property {number} bases_hit -  The number of bases reached in the hit.
 * @property {number} runs_batted_in - The number of runs batted in.
 * @property {boolean} is_sacrifice_hit - Was this a sacrifice hit?
 * @property {boolean} is_sacrifice_fly -  Was this a sacrifice fly?
 * @property {number} outs_on_play - The number of outs that occurred from this play.
 * @property {boolean} is_double_play - Is this a double play?
 * @property {boolean} is_triple_play - Is this a triple play?
 * @property {boolean} is_wild_pitch - Was this event a wild pitch?
 * @property {string} batted_ball_type -  F - fly ball, G - ground ball, L - line drive, P - pop-up.
 * @property {boolean} is_bunt - Was this play a bunt?
 * @property {number} errors_on_play - The number of errors that occurred on the play.
 * @property {number} batter_base_after_play - The number of batters on base after the play.
 * @property {boolean} is_last_game_event - Is this the last event in the game?
 * @property {[string]} event_text - The message text descriptions that contributed to this event. 
 * @property {string} additional_context - Additional comments.
 */

 /**
  * Get the list of game events that match the query. One of `playerId`, `gameId`, `pitcherId`, `batterId` must be specified.
  * 
  * @route GET /events
  * @group Statistics
  * @summary Query for game events.
  * @param {string} playerId.query - The ID of a player that must be the batter or the pitcher in each event.
  * @param {string} gameId.query - The ID of the game by which to filter results.
  * @param {string} pitcherId.query - The ID of the pitcher that must be in each event.
  * @param {string} batterId.query - The ID of the pitcher that must be in each event.
  * @returns {[GameEvent]} 200 - The events that match the query and the number of matching events.
  */
router.get('/events', async (req, res) => {
  const playerIdFilter = req.query.playerId;
  const gameIdFilter = req.query.gameId;
  const pitcherIdFilter = req.query.pitcherId;
  const batterIdFilter = req.query.batterId;

  let filters = [];
  let params = [];

  if (!playerIdFilter && !gameIdFilter && !pitcherIdFilter && !batterIdFilter) {
    res.json({
      error: true,
      message: 'Must specify one of: playerId, gameId, pitcherId, batterId.',
    });

    return;
  }

  if (playerIdFilter) {
    filters = [...filters, `(batter_id=$${params.length + 1} OR pitcher_id=$${params.length + 2})`];
    params = [...params, playerIdFilter, playerIdFilter];
  }

  if (gameIdFilter) {
    filters = [...filters, `game_id=$${params.length + 1}`];
    params = [...params, gameIdFilter];
  }

  if (pitcherIdFilter) {
    filters = [...filters, `pitcher_id=$${params.length + 1}`];
    params = [...params, pitcherIdFilter];
  }

  if (batterIdFilter) {
    filters = [...filters, `batter_id=$${params.length + 1}`];
    params = [...params, batterIdFilter];
  }

  res.json(await allWithCount(`SELECT * FROM game_events WHERE ${filters.join(' AND ')}`, params))
});

/**
 * Get the number of plate appearances for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /plateAppearances
 * @group Statistics
 * @summary Calculate plate appearances for each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The number of plate appearances for each batter and the total count of relevant batters.
 */
addRoute(router, '/plateAppearances', plateAppearances, 'batterId');

/**
 * Get the number of at-bats for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /atBats
 * @group Statistics
 * @summary Calculate at-bats for each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The number of at-bats for each batter and the total count of relevant batters.
 */
addRoute(router, '/atBats', atBats, 'batterId');

/**
 * Get the number of hits for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /hits
 * @group Statistics
 * @summary Calculate number of hits for each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The number of hits for each batter and the total count of relevant batters.
 */
addRoute(router, '/hits', hits, 'batterId');

/**
 * Get the number of times each historical batter got on base. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /timesOnBase
 * @group Statistics
 * @summary Calculate number of times on base for each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The number of times each batter got on base and the total count of relevant batters.
 */
addRoute(router, '/timesOnBase', timesOnBase, 'batterId');

/**
 * Get the batting average (BA) for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /battingAverage
 * @group Statistics
 * @summary Calculate batting average of each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The batting average of each batter and the total count of relevant batters.
 */
addRoute(router, '/battingAverage', battingAverage, 'batterId');

/**
 * Get the on-base percentage (OBP) for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /onBasePercentage
 * @group Statistics
 * @summary Calculate OBP of each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The OBP of each batter and the total count of relevant batters.
 */
addRoute(router, '/onBasePercentage', onBasePercentage, 'batterId');

/**
 * Get on-base percentage plus slugging (OPS) for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /onBasePlusSlugging
 * @group Statistics
 * @summary Calculate OPS of each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The OPS of each batter and the total count of relevant batters.
 */
addRoute(router, '/onBasePlusSlugging', onBasePlusSlugging, 'batterId');

/**
 * Get the slugging percentage (SLG) for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /slugging
 * @group Statistics
 * @summary Calculate SLG of each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The SLG of each batter and the total count of relevant batters.
 */
addRoute(router, '/slugging', slugging, 'batterId');

/**
 * Get the number of outs recorded by each historical pitcher. If `pitcherId` is specified, only that pitcher is returned.
 * 
 * @route GET /outsRecorded
 * @group Statistics
 * @summary Calculate number of outs recorded by each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The number of outs recorded by each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/outsRecorded', outsRecorded, 'pitcherId');

/**
 * Get the number of hits recorded by each historical pitcher. If `pitcherId` is specified, only that pitcher is returned.
 * 
 * @route GET /hitsRecorded
 * @group Statistics
 * @summary Calculate number of hits recorded by each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The number of hits recorded by each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/hitsRecorded', hitsRecorded, 'pitcherId');

/**
 * Get the number of walks recorded by each historical pitcher. If `pitcherId` is specified, only that pitcher is returned.
 * 
 * @route GET /walksRecorded
 * @group Statistics
 * @summary Calculate number of walks recorded by each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The number of walks recorded by each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/walksRecorded', walksRecorded, 'pitcherId');

/**
 * Get the number of runs earned by each historical pitcher. If `pitcherId` is specified, only that pitcher is returned.
 * 
 * TODO: Not currently implemented.
 * 
 * @route GET /earnedRuns
 * @group Statistics
 * @summary Calculate the number of runs earned by each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The number of runs earned  by each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/earnedRuns', earnedRuns, 'pitcherId');

/**
 * Get the number of walks and hits per inning pitched (WHIP) for each historical pitcher. 
 * If `pitcherId` is specified, only that pitcher is returned.
 * 
 * @route GET /whip
 * @group Statistics
 * @summary Calculate WHIP of each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The WHIP of each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/whip', whip, 'pitcherId');

/**
 * Get the earned run average (ERA) for each historical pitcher. 
 * If `pitcherId` is specified, only that pitcher is returned.
 * 
 * @route GET /era
 * @group Statistics
 * @summary Calculate ERA of each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The ERA of each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/era', era, 'pitcherId');

module.exports = router;
