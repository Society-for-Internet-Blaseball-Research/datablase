const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

export async function getCurrentSeason() {
  const currentSeason = await prisma.timeMap.aggregate({
    max: {
      season: true,
    },
    where: {
      time_event_type: 'GAMEDAY',
    },
  });

  return currentSeason.max.season;
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
  const result = await prisma.timeMap.aggregate({
    min: {
      day: true,
    },
    max: {
      day: true,
    },
    where: {
      season,
      time_event_type: 'GAMEDAY',
    },
  });

  return [result.min.day, result.max.day];
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
