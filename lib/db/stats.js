const { all } = require('./db.js');
const {
  calculateSet,
  rowToIdMap,
  normalizeCommaSeparatedParam,
} = require('../utils/utils.js');

async function countBattersByType(eventType, batterId = undefined) {
  return await all(
    `SELECT batter_id, count(id)::int FROM data.game_events WHERE ${
      batterId ? 'batter_id = ANY($1) AND' : ''
    } event_type=${batterId ? '$2' : '$1'} GROUP BY batter_id`,
    batterId ? [normalizeCommaSeparatedParam(batterId), eventType] : [eventType]
  );
}

async function countPitchersByType(eventType, pitcherId = undefined) {
  return await all(
    `SELECT pitcher_id, count(id)::int FROM data.game_events WHERE ${
      pitcherId ? 'pitcher_id = ANY($1) AND' : ''
    } event_type=${pitcherId ? '$2' : '$1'} GROUP BY pitcher_id`,
    pitcherId
      ? [normalizeCommaSeparatedParam(pitcherId), eventType]
      : [eventType]
  );
}

async function plateAppearances(batterId = undefined) {
  return await all(
    `SELECT batter_id, count(id)::int FROM data.game_events WHERE ${
      batterId ? 'batter_id = ANY($1) AND' : ''
    } is_last_event_for_plate_appearance GROUP BY batter_id`,
    batterId ? [normalizeCommaSeparatedParam(batterId)] : []
  );
}

async function atBats(batterId = undefined) {
  return await all(
    `SELECT batter_id, count(id)::int FROM data.game_events WHERE ${
      batterId ? 'batter_id = ANY($1) AND' : ''
    } is_last_event_for_plate_appearance AND event_type != 'WALK' AND NOT is_sacrifice_fly GROUP BY batter_id`,
    batterId ? [normalizeCommaSeparatedParam(batterId)] : []
  );
}

async function hits(batterId = undefined) {
  return await all(
    `SELECT batter_id, count(id)::int FROM data.game_events WHERE ${
      batterId ? 'batter_id = ANY($1) AND' : ''
    } bases_hit > 0 AND event_type != 'WALK' GROUP BY batter_id`,
    batterId ? [normalizeCommaSeparatedParam(batterId)] : []
  );
}

async function timesOnBase(batterId = undefined) {
  return await all(
    `SELECT batter_id, count(id)::int FROM data.game_events WHERE ${
      batterId ? 'batter_id = ANY($1) AND' : ''
    } bases_hit > 0 GROUP BY batter_id`,
    batterId ? [normalizeCommaSeparatedParam(batterId)] : []
  );
}

async function outsRecorded(pitcherId = undefined) {
  return await all(
    `SELECT pitcher_id, count(outs_on_play)::int AS count FROM data.game_events ${
      pitcherId ? 'WHERE pitcher_id = ANY($1)' : ''
    } GROUP BY pitcher_id`,
    pitcherId ? [normalizeCommaSeparatedParam(pitcherId)] : []
  );
}

async function hitsRecorded(pitcherId = undefined) {
  return await all(
    `SELECT pitcher_id, count(id)::int AS count FROM data.game_events WHERE ${
      pitcherId ? 'pitcher_id = ANY($1) AND' : ''
    } bases_hit > 0 GROUP BY pitcher_id`,
    pitcherId ? [normalizeCommaSeparatedParam(pitcherId)] : []
  );
}

async function walksRecorded(pitcherId = undefined) {
  return await all(
    `SELECT pitcher_id, count(id)::int AS count FROM data.game_events WHERE ${
      pitcherId ? 'pitcher_id = ANY($1) AND' : ''
    } event_type = 'WALK' GROUP BY pitcher_id`,
    pitcherId ? [normalizeCommaSeparatedParam(pitcherId)] : []
  );
}

async function earnedRuns(pitcherId = undefined) {
  const pitcherList = normalizeCommaSeparatedParam(pitcherId);
  const [runnersBattedInSet, homeRunsSet] = await Promise.all([
    all(
      `SELECT responsible_pitcher_id, count(id)::int AS count FROM data.game_event_base_runners WHERE ${
        pitcherId ? 'responsible_pitcher_id = ANY($1) AND' : ''
      } base_after_play = 4 GROUP BY responsible_pitcher_id`,
      pitcherId ? [pitcherList] : []
    ),
    all(
      `SELECT pitcher_id, count(id)::int AS count FROM data.game_events WHERE ${
        pitcherId ? 'pitcher_id = ANY($1) AND' : ''
      } event_type='HOME_RUN' GROUP BY pitcher_id`,
      pitcherId ? [pitcherList] : []
    ),
  ]);

  return calculateSet(
    (runnersBattedInValue, homeRunsValue) =>
      Number(runnersBattedInValue) + Number(homeRunsValue),
    rowToIdMap(runnersBattedInSet, 'responsible_pitcher_id'),
    rowToIdMap(homeRunsSet, 'pitcher_id')
  );
}

async function battingAverage(batterId = undefined) {
  const [hitsSet, atBatsSet] = await Promise.all([
    hits(batterId),
    atBats(batterId),
  ]);

  return calculateSet(
    (hitsValue, atBatsValue) => Number(hitsValue) / Number(atBatsValue),
    rowToIdMap(hitsSet, 'batter_id'),
    rowToIdMap(atBatsSet, 'batter_id')
  );
}

async function onBasePercentage(batterId = undefined) {
  const [timesOnBaseSet, plateAppearancesSet] = await Promise.all([
    timesOnBase(batterId),
    plateAppearances(batterId),
  ]);

  return calculateSet(
    (timesOnBaseValue, plateAppearancesValue) =>
      timesOnBaseValue / plateAppearancesValue,
    rowToIdMap(timesOnBaseSet, 'batter_id'),
    rowToIdMap(plateAppearancesSet, 'batter_id')
  );
}

async function slugging(batterId = undefined) {
  const [
    singlesSet,
    doublesSet,
    triplesSet,
    homeRunsSet,
    atBatsSet,
  ] = await Promise.all([
    countBattersByType('SINGLE', batterId),
    countBattersByType('DOUBLE', batterId),
    countBattersByType('TRIPLE', batterId),
    countBattersByType('HOME_RUN', batterId),
    atBats(batterId),
  ]);

  return calculateSet(
    (singlesValue, doublesValue, triplesValue, homeRunsValue, atBatsValue) => {
      return (
        ((singlesValue || 0) +
          (doublesValue || 0) * 2 +
          (triplesValue || 0) * 3 +
          (homeRunsValue || 0) * 4) /
        atBatsValue
      );
    },
    rowToIdMap(singlesSet, 'batter_id'),
    rowToIdMap(doublesSet, 'batter_id'),
    rowToIdMap(triplesSet, 'batter_id'),
    rowToIdMap(homeRunsSet, 'batter_id'),
    rowToIdMap(atBatsSet, 'batter_id')
  );
}

async function onBasePlusSlugging(batterId = undefined) {
  const [onBaseSet, sluggingSet] = await Promise.all([
    onBasePercentage(batterId),
    slugging(batterId),
  ]);

  return calculateSet(
    (onBaseValue, sluggingValue) => onBaseValue + sluggingValue,
    rowToIdMap(onBaseSet, 'id', 'value'),
    rowToIdMap(sluggingSet, 'id', 'value')
  );
}

async function whip(pitcherId = undefined) {
  const [outsSet, hitsSet, walksSet] = await Promise.all([
    outsRecorded(pitcherId),
    hitsRecorded(pitcherId),
    walksRecorded(pitcherId),
  ]);

  return calculateSet(
    (outsValue, hitsValue, walksValue) =>
      (hitsValue + walksValue) / (outsValue / 3),
    rowToIdMap(outsSet, 'pitcher_id'),
    rowToIdMap(hitsSet, 'pitcher_id'),
    rowToIdMap(walksSet, 'pitcher_id')
  );
}

async function era(pitcherId = undefined) {
  const [earnedRunsSet, outsRecordedSet] = await Promise.all([
    earnedRuns(pitcherId),
    outsRecorded(pitcherId),
  ]);

  return calculateSet(
    (earnedRunsValue, outsRecordedValue) =>
      27 * (earnedRunsValue / outsRecordedValue),
    rowToIdMap(earnedRunsSet, 'id', 'value'),
    rowToIdMap(outsRecordedSet, 'pitcher_id')
  );
}

module.exports = {
  countBattersByType,
  countPitchersByType,
  plateAppearances,
  atBats,
  hits,
  timesOnBase,
  battingAverage,
  onBasePercentage,
  slugging,
  onBasePlusSlugging,
  outsRecorded,
  hitsRecorded,
  walksRecorded,
  earnedRuns,
  whip,
  era,
};
