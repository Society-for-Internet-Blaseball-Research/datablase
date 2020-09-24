const Router = require('express-promise-router');

const { allWithCount, all } = require('../db/db.js');
const { atBats, plateAppearances, hits, timesOnBase, battingAverage, onBasePercentage, slugging, onBasePlusSlugging, outsRecorded, hitsRecorded, walksRecorded, whip, earnedRuns, era, countBattersByType, countPitchersByType } = require('../db/stats.js');
const { resultsWithCount, normalizeCommaSeparatedParam } = require('../utils/utils.js');
const { deceasedPlayers, playerIdsByName, playerInfoCurrent, playerInfoAll, taggedPlayers, allPlayers } = require('../db/players.js');
const { currentRoster } = require('../db/rosters.js');
const { seasonBattingStats, lifetimeBattingStats, seasonPitchingStats, lifetimePitchingStats, lifetimeFieldingStats, seasonFieldingStats, lifetimeRunningStats, seasonRunningStats} = require('../db/statviews.js');
const { currentTeams, currentTeamStars } = require('../db/teams.js');

const router = new Router();

function addRoute(router, endpoint, method, queryAccessor) {
  router.get(endpoint, async (req, res) => {
    res.json(resultsWithCount(await method(req.query[queryAccessor])));
  })
}

/**
 * @typedef RosterEntry
 * @property {string} valid_from - Timestamp representing when this player first moved to this roster slot
 * @property {string} team_id - ID of the team
 * @property {string} nickname - Nickname of the team
 * @property {string} position_type - "BATTER" or "PITCHER"
 * @property {number} position_id - index within the lineup or rotation (batter 0 is the leadoff batter, etc)
 * @property {string} player_id - ID of the player
 * @property {string} player_name - Player's name
 */

/**
 * @typedef BaseRunner
 * @property {number} id - The unique ID of the base runner record.
 * @property {number} game_event_id - The ID of the game event to which this base runner record belongs.
 * @property {string} runner_id - The ID of the base runner as specified by the Blaseball API.
 * @property {string} responsible_pitcher_id - The ID of the pitcher that is responsible for this base runner, as specified by the Blaseball API.
 * @property {number} base_before_play - The base that the base runner was on before the play started. 0 means the runner was not on base.
 * @property {number} base_after_play - The base that the base runner was on after the play ended. 0 means the runner is no longer on base; 4 means the runner reached home.
 * @property {boolean} was_base_stolen - Was a base stolen by this runner on the play?
 * @property {boolean} was_caught_stealing - Was this runner caught stealing in the play?
 * @property {boolean} was_picked_off - Was this runner picked off in the play?
 */

/**
 * @typedef Outcome
 * @property {number} id - The unique ID of the player event record.
 * @property {number} game_event_id - The ID of the game event during which that this player event occurred.
 * @property {string} entity_id - The ID of the player or team that was affected as specified by the Blaseball API.
 * @property {string} event_type - The type of event that occurred. One of INCINERATION, PEANUT_GOOD, PEANUT_BAD, FEEDBACK, FEEDBACK_BLOCKED, REVERB_PITCHERS, REVERB_HITTERS, REVERB_SEVERAL, REVERB_ALL, REVERB_PLAYER, BLOOD_DRAIN_VICTIM, BLOOD_DRAIN_SIPHONER
 * @property {string} original_text
 */

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
 * @property {string} pitcher_team_id - The ID of the pitcher's team record as specified by the Blaseball API.
 * @property {string} batter_id - The ID of the batter's team record as specified by the Blaseball API.
 * @property {number} home_score - The score of the home team.
 * @property {number} away_score - The score of the away team.
 * @property {number} home_strike_count - The number of strikes required to strike out a batter on the home team.
 * @property {number} away_strike_count - The number of strikes required to strike out a batter on the away team.
 * @property {number} batter_count - The total number of batters that have taken the plate in this game.
 * @property {[string]} pitches - The pitches in this play. See Retrosheet's BEVENT for symbology (https://www.retrosheet.org/datause.txt).
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
 * @property {Array.<BaseRunner>} base_runners - The base runners during the event. Not included unless requested.
 * @property {Array.<Outcome>} outcomes - The player events that occurred during the event. Not included unless requested.
 */

/**
 * Download all of the game events, base runners, and player events. Child data (base runners, player events) are 
 * provided as their own lists and are not mapped into their parents, and thus must be matched by `game_event_id`.
 * 
 * @route GET /data/events
 * @group Raw Data
 * @summary Download all raw event data.
 * @param {number} season.query  - season to get event data for (zero-indexed)
 * @returns 200 - A JSON file with the raw event data.
 */
 router.get('/data/events', async (req, res) => {
	const season = req.query.season;

	if (!season) {
		res.json({
		  error: true,
		  message: 'Must specify a season.',
		});
		return;
	}

	const [gameEvents, baseRunners, outcomes] = await Promise.all([
    all('SELECT * FROM data.game_events WHERE season = $1', [season]),
    all('SELECT geb.* FROM data.game_event_base_runners geb JOIN data.game_events ge ON geb.game_event_id = ge.id WHERE ge.season = $1', [season]),
    all('SELECT pe.* FROM data.outcomes pe JOIN data.game_events ge ON pe.game_event_id = ge.id WHERE ge.season = $1', [season]),
  ])
 
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-disposition',`attachment; filename=datablase-season${season}.json`);

  res.json({
    game_events: gameEvents,
    base_runners: baseRunners,
    outcomes: outcomes
  });
});

const VALID_SORT_DIRECTIONS = ['ASC', 'DESC'];
const VALID_SORT_COLUMNS = [
  'id',
  'game_id',
  'event_type',
  'event_index',
  'outs_before_play',
  'inning',
  'batter_id',
  'batter_team_id',
  'pitcher_id',
  'pitcher_team_id',
  'home_score',
  'away_score',
  'home_strike_count',
  'away_strike_count',
  'batter_count',
  'total_strikes',
  'total_balls',
  'total_fouls',
  'lineup_position',
  'bases_hit',
  'runs_batted_in',
  'outs_on_play',
  'errors_on_play',
  'batter_base_after_play',
];

/**
 * Get the list of game events that match the query. One of `playerId`, `gameId`, `pitcherId`, `batterId` must be specified.
 * 
 * @route GET /events
 * @group Game Events
 * @summary Query for game events.
 * @param {string} playerId.query - The ID of a player that must be the batter or the pitcher in each event.
 * @param {string} gameId.query - The ID of the game by which to filter results.
 * @param {string} pitcherId.query - The ID of the pitcher that must be in each event.
 * @param {string} batterId.query - The ID of the pitcher that must be in each event.
 * @param {string} type.query - The type of event by which to filter.
 * @param {boolean} outcomes.query - Include child player event records.
 * @param {boolean} baseRunners.query - Include child base runner records.
 * @param {string} sortBy.query - The field by which to sort. Most text and numeric columns are supported.
 * @param {string} sortDirection.query - The direction by which to sort. Must be one of ASC, DESC.
 * @returns {[GameEvent]} 200 - The events that match the query and the number of matching events.
 */
router.get('/events', async (req, res) => {
  const playerIdFilter = normalizeCommaSeparatedParam(req.query.playerId);
  const gameIdFilter = normalizeCommaSeparatedParam(req.query.gameId);
  const pitcherIdFilter = normalizeCommaSeparatedParam(req.query.pitcherId);
  const batterIdFilter = normalizeCommaSeparatedParam(req.query.batterId);
  const typeFilter = req.query.type;
  const includeOutcomes = (req.query.outcomes || '').toLowerCase() === 'true';
  const includeBaseRunners = (req.query.baseRunners || '').toLowerCase() === 'true';
  const sortBy = (req.query.sortBy || 'id').toLowerCase();
  const sortDirection = (req.query.sortDirection || 'ASC').toUpperCase();

  let filters = [];
  let params = [];

  if (!playerIdFilter && !gameIdFilter && !pitcherIdFilter && !batterIdFilter) {
    res.json({
      error: true,
      message: 'Must specify one of: playerId, gameId, pitcherId, batterId.',
    });

    return;
  }

  if (VALID_SORT_DIRECTIONS.indexOf(sortDirection) === -1) {
    res.json({
      error: true,
      message: `sortDirection must be one of: ${VALID_SORT_DIRECTIONS.join(', ')}.`,
    });

    return;
  }

  if (VALID_SORT_COLUMNS.indexOf(sortBy) === -1) {
    res.json({
      error: true,
      message: `sortBy must be one of: ${VALID_SORT_COLUMNS.join(', ')}.`,
    });

    return;
  }


  if(typeFilter) {
    filters = [...filters, `event_type=$${params.length + 1}`];
    params = [...params, typeFilter];
  }

  if (playerIdFilter) {
    filters = [...filters, `(batter_id = ANY($${params.length + 1}) OR pitcher_id = ANY($${params.length + 2}))`];
    params = [...params, playerIdFilter, playerIdFilter];
  }

  if (gameIdFilter) {
    filters = [...filters, `game_id = ANY($${params.length + 1})`];
    params = [...params, gameIdFilter];
  }

  if (pitcherIdFilter) {
    filters = [...filters, `pitcher_id = ANY($${params.length + 1})`];
    params = [...params, pitcherIdFilter];
  }

  if (batterIdFilter) {
    filters = [...filters, `batter_id = ANY($${params.length + 1})`];
    params = [...params, batterIdFilter];
  }

  const eventResults = await allWithCount(
    `SELECT * FROM data.game_events WHERE ${filters.join(' AND ')} ${sortBy ? `ORDER BY ${sortBy} ${sortDirection}` : ''}`,
    params
  );

  const ids = eventResults.results.map(event => event.id);

  if (includeBaseRunners) {
    const baseRunners = await all(`SELECT * FROM data.game_event_base_runners WHERE game_event_id = ANY($1)`, [ids]);

    const baseRunnersById = baseRunners.reduce((acc, baseRunner) => ({
      ...acc,
      [baseRunner.game_event_id]: [...(acc[baseRunner.game_event_id] || []), baseRunner],
    }), {});
    
    eventResults.results = eventResults.results.map(event => ({
      ...event,
      base_runners: baseRunnersById[event.id] || [],
    }));
  }

  if (includeOutcomes) {
    const outcomes = await all(`SELECT * FROM data.outcomes WHERE game_event_id = ANY($1)`, [ids]);

    const outcomesById = outcomes.reduce((acc, outcome) => ({
      ...acc,
      [outcome.game_event_id]: [...(acc[outcome.game_event_id] || []), outcome],
    }), {});
    
    eventResults.results = eventResults.results.map(event => ({
      ...event,
      outcomes: outcomesById[event.id] || [],
    }));
  }

  res.json(({
    count: eventResults.count,
    results: eventResults.results.map(event => ({
      ...event,
      home_score: Number(event.home_score),
      away_score: Number(event.away_score),
    })),
  }));
});

/**
 * Get the number of events for a batter or pitcher with a certain `event_type`.
 * 
 * @route GET /countByType
 * @group Game Events
 * @summary Calculate the number of events for each batter or pitcher.
 * @param {string} eventType.query.required - The type of event to count.
 * @param {string} batterId.query - The ID of the batter(s) by which to filter.
 * @param {string} pitcherId.query - The ID of the pitcher(s) by which to filter.
 * @returns {object} 200 - The number of events the batter was involved in with the specified type.
 */
router.get('/countByType', async (req, res) => {
  if (!req.query.eventType) {
    res.json({
      error: true,
      message: 'Must specify eventType.'
    });

    return;
  }

  const [batters, pitchers] = await Promise.all([
    await countBattersByType(req.query.eventType, req.query.batterId),
    await countPitchersByType(req.query.eventType, req.query.pitcherId),
  ]);

  res.json({
    batters,
    pitchers
  });
});

/**
 * Get all currently decieased players
 * 
 * @route GET /deceased
 * @group Players
 * @summary Get a list of all currently deceased players
 * @returns {[object]} 200 - Array of player objects
 */
router.get('/deceased', async (req,res)=>{
  res.json(await deceasedPlayers())
})

/**
 * Get all player IDs matching a given name
 * 
 * @route GET /playerIdsByName
 * @group Players
 * @summary Get all player IDs matching a given player name
 * @param {string} name.query - The name of the player
 * @param {boolean} current.query - If true, only players currently using this name will be returned
 * @returns {[object]} 200 - array of objects with player IDs matching that name, including the name and timestamps for when that name started and ended being used for that player
 */
router.get('/playerIdsByName', async (req, res)=>{
	const name = req.query.name;
	const current = (req.query.current || '').toLowerCase() === 'true';

	if(!name){
		res.json({
			error: true,
			message: 'Must specify a name.',
		});
		return;
	}

	res.json(await playerIdsByName(name, current))
})

/**
 * Get extended player info for a given player
 * 
 * @route GET /playerInfo
 * @group Players
 * @summary Get extended info for a given player - their name, attributes, ratings, and stars
 * @param {string} playerId.query - The player ID of the player (takes precedence if a name is also specified)
 * @param {string} name.query - The name of the player
 * @param {boolean} all.query - (default:false) If true, all historical info for the player will be returned, rather than just the current info
 * @returns {[object]} 200 - array of objects 
 */
router.get('/playerInfo', async (req, res)=>{
	let playerId = req.query.playerId;
	const name = req.query.name;
	const all = req.query.all;

	if(!playerId && !name) {
		res.json({
			error: true,
			message: 'Must specify a player ID or name',
		});
		return;
	}
	else if(!playerId)
	{
		// Get the player IDs for this name
		let ids = await playerIdsByName(name);
		if(ids.length > 0)
		{
			playerId = ids[0].player_id;
		}
		else
		{
			res.json([]);
			return;
		}
	}
	

	if(all) {
		res.json(await playerInfoAll(playerId))
	}
	else
	{
		res.json(await playerInfoCurrent(playerId))
	}

})

/**
 * Get the list of all players currently tagged with some kind of modification (like SHELLED)
 * 
 * @route GET /taggedPlayers
 * @group Players
 * @summary Get the list of all players with a modification tag
 * @returns {object} 200 - array of player information including current team id/nickname
 */
router.get('/taggedPlayers', async (req, res)=>{
	res.json(await taggedPlayers());
})

/**
 * Get the current roster for a given team
 * 
 * @route GET /currentRoster
 * @group Teams
 * @summary Get the current roster for a given team
 * @param {string} teamId.query - The ID of the team
 * @returns {[RosterEntry]} 200 - array of roster information
 */
router.get('/currentRoster', async (req, res) => {
	const teamId = req.query.teamId;

	if(!teamId) {
		res.json({
			error: true,
			message: 'Must specify a teamId.',
		});
		return;
	}

	res.json(await currentRoster(teamId));
});

/**
 * Get the current list of all known players
 * 
 * @route GET /allPlayers
 * @group Players
 * @summary Get the list of all current players, optionally including players in the Shadows
 * @param {boolean} includeShadows.query - whether to include players in the Shadows
 * @returns {[object]} 200 - list of players
 */
router.get('/allPlayers', async(req, res) => {
	const includeShadows = req.query.includeShadows;

	res.json(await allPlayers(includeShadows));
});

/**
 * Get all current teams
 * 
 * @route GET /allTeams
 * @group Teams
 * @summary Get the list of all current teams
 * @returns {[object]} 200 - list of current teams
 */
router.get('/allTeams', async(req, res) =>
{
	teams = await currentTeams();

	res.json(teams);
});

/**
 * Get current star values for all teams
 * 
 * @route GET /allTeamStars
 * @group Teams
 * @summary Get current star values for all teams
 * @returns {[object]} 200 - list of current team stars
 */
router.get('/allTeamStars', async(req, res) =>
{
	res.json(await currentTeamStars());
});


/**
 * Get performance statistics for a given list of players
 * 
 * @route GET /playerStats
 * @group Statistics v2
 * @summary Get categorical statistics for the given players
 * @param {string} category.query - either 'batting' or 'pitching'
 * @param {number} season.query - (optional) season to get stats for
 * @param {[string]} playerIds.query - comma-separated list of player IDs
 * @returns {[object]} 200 - list of player statistics
 */
router.get('/playerStats', async(req, res) => {
	const category = req.query.category;
	const season = req.query.season;
	const playerIds = req.query.playerIds;

	if(!category || (category != 'pitching' && category != 'batting' && category != 'running' && category != 'fielding' )) {
		res.json({
			error: true,
			message: "Must specify a valid stat category ('batting', 'pitching', 'running', 'fielding') as 'category'.",
		});
		return;
	}

	if(!playerIds || playerIds.length ==  0){
		res.json({
			error: true,
			message: "Must specify a comma-separated list of player IDs as 'playerIds'",
		});
		return;
	}

	if(category == 'batting')
	{
		if(!season)
		{
			res.json(await lifetimeBattingStats(playerIds));
		}
		else
		{
			res.json(await seasonBattingStats(season, playerIds));
		}
	}
	else if(category == 'pitching')
	{
		if(!season)
		{
			res.json(await lifetimePitchingStats(playerIds));
		}
		else
		{
			res.json(await seasonPitchingStats(season, playerIds));
		}
	}
	else if(category == 'fielding')
	{
		if(!season)
		{
			res.json(await lifetimeFieldingStats(playerIds));
		}
		else
		{
			res.json(await seasonFieldingStats(season, playerIds));
		}
	}
	else if(category=='running')
	{
		if(!season)
		{
			res.json(await lifetimeRunningStats(playerIds));
		}
		else
		{
			res.json(await seasonRunningStats(season, playerIds));
		}
	}
})


/**
 * Get the number of plate appearances for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /plateAppearances
 * @group Statistics (deprecated)
 * @summary Calculate plate appearances for each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The number of plate appearances for each batter and the total count of relevant batters.
 */
addRoute(router, '/plateAppearances', plateAppearances, 'batterId');

/**
 * Get the number of at-bats for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /atBats
 * @group Statistics (deprecated)
 * @summary Calculate at-bats for each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The number of at-bats for each batter and the total count of relevant batters.
 */
addRoute(router, '/atBats', atBats, 'batterId');

/**
 * Get the number of hits for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /hits
 * @group Statistics (deprecated)
 * @summary Calculate number of hits for each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The number of hits for each batter and the total count of relevant batters.
 */
addRoute(router, '/hits', hits, 'batterId');

/**
 * Get the number of times each historical batter got on base. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /timesOnBase
 * @group Statistics (deprecated)
 * @summary Calculate number of times on base for each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The number of times each batter got on base and the total count of relevant batters.
 */
addRoute(router, '/timesOnBase', timesOnBase, 'batterId');

/**
 * Get the batting average (BA) for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /battingAverage
 * @group Statistics (deprecated)
 * @summary Calculate batting average of each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The batting average of each batter and the total count of relevant batters.
 */
addRoute(router, '/battingAverage', battingAverage, 'batterId');

/**
 * Get the on-base percentage (OBP) for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /onBasePercentage
 * @group Statistics (deprecated)
 * @summary Calculate OBP of each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The OBP of each batter and the total count of relevant batters.
 */
addRoute(router, '/onBasePercentage', onBasePercentage, 'batterId');

/**
 * Get on-base percentage plus slugging (OPS) for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /onBasePlusSlugging
 * @group Statistics (deprecated)
 * @summary Calculate OPS of each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The OPS of each batter and the total count of relevant batters.
 */
addRoute(router, '/onBasePlusSlugging', onBasePlusSlugging, 'batterId');

/**
 * Get the slugging percentage (SLG) for each historical batter. If `batterId` is specified, only that batter is returned.
 * 
 * @route GET /slugging
 * @group Statistics (deprecated)
 * @summary Calculate SLG of each batter.
 * @param {string} batterId.query - The ID of the batter by which to filter.
 * @returns {object} 200 - The SLG of each batter and the total count of relevant batters.
 */
addRoute(router, '/slugging', slugging, 'batterId');

/**
 * Get the number of outs recorded by each historical pitcher. If `pitcherId` is specified, only that pitcher is returned.
 * 
 * @route GET /outsRecorded
 * @group Statistics (deprecated)
 * @summary Calculate number of outs recorded by each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The number of outs recorded by each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/outsRecorded', outsRecorded, 'pitcherId');

/**
 * Get the number of hits recorded by each historical pitcher. If `pitcherId` is specified, only that pitcher is returned.
 * 
 * @route GET /hitsRecorded
 * @group Statistics (deprecated)
 * @summary Calculate number of hits recorded by each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The number of hits recorded by each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/hitsRecorded', hitsRecorded, 'pitcherId');

/**
 * Get the number of walks recorded by each historical pitcher. If `pitcherId` is specified, only that pitcher is returned.
 * 
 * @route GET /walksRecorded
 * @group Statistics (deprecated)
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
 * @group Statistics (deprecated)
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
 * @group Statistics (deprecated)
 * @summary Calculate WHIP of each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The WHIP of each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/whip', whip, 'pitcherId');

router.post("/brewCoffee",(req,res)=>{res.status(418);res.send("418<hr>I am a teapot")})

/**
 * Get the earned run average (ERA) for each historical pitcher. 
 * If `pitcherId` is specified, only that pitcher is returned.
 * 
 * @route GET /era
 * @group Statistics (deprecated)
 * @summary Calculate ERA of each pitcher.
 * @param {string} pitcherId.query - The ID of the pitcher by which to filter.
 * @returns {object} 200 - The ERA of each pitcher and the total count of relevant pitchers.
 */
addRoute(router, '/era', era, 'pitcherId');


module.exports = router;
