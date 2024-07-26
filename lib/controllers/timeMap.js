import prisma from '../prisma.js';

function getRegularSeasonPhases(season) {
  let regularSeasonPhases;

  /** Regular season phases
   * - Before season 12, the only regular season phase ID was `2`
   * - During and after season 12, valid regular season phase IDs are `2, 3, 4, 5, 6, and 7`
   */
  if (season < 11) {
    regularSeasonPhases = [2];
  } else {
    regularSeasonPhases = [2, 3, 4, 5, 6, 7];
  }

  return regularSeasonPhases;
}

export async function getCurrentSeason() {
  const currentSeason = await prisma.timeMap.aggregate({
    _max: {
      season: true,
    },
  });

  return currentSeason._max.season;
}

export async function getCurrentDay() {
  const currentDay = await prisma.timeMap.aggregate({
    _max: {
      day: true,
    },
    where: {
      season: await getCurrentSeason(),
    },
  });

  return currentDay._max.season;
}

export async function getTimestampFromSeasonAndDay({ day, season }) {
  const timeMapRecord = await prisma.timeMap.findFirst({
    select: {
      first_time: true,
    },
    where: {
      season: season,
      day: day,
    },
  });

  return timeMapRecord.first_time;
}

export async function getFirstDayAndLastDayForSeason(season) {
  const regularSeasonPhases = getRegularSeasonPhases(season);

  const result = await prisma.timeMap.aggregate({
    _min: {
      day: true,
    },
    _max: {
      day: true,
    },
    where: {
      season,
      phase_id: { in: regularSeasonPhases },
    },
  });

  return [result._min.day, result._max.day];
}

export async function getSeasonStartAndEndTimestamps(season) {
  const [firstDay, lastDay] = await getFirstDayAndLastDayForSeason(season);

  const firstDayTimestamp = await getTimestampFromSeasonAndDay({
    season,
    day: firstDay,
  });
  const lastDayTimestamp = await getTimestampFromSeasonAndDay({
    season,
    day: lastDay,
  });

  return [firstDayTimestamp, lastDayTimestamp];
}

// Get a sorted list of regular seasons found in timeMap
export async function seasons() {
  const seasons = await prisma.timeMap.findMany({
    where: {
      // The phase ID '2' marks the start of the regular season for all seasons thus far
      phase_id: 2,
    },
    select: {
      season: true,
    },
    orderBy: {
      season: 'asc',
    },
    distinct: ['season'],
  });

  return seasons;
}
