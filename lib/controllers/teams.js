import { PrismaClient } from '@prisma/client';
import {
  getCurrentSeason,
  getSeasonStartAndEndTimestamps,
} from '../controllers/timeMap.js';

const prisma = new PrismaClient();

export async function team({ findByField = 'team_id', season, teamId } = {}) {
  if (season === 'current') {
    season = await getCurrentSeason();
  }

  let seasonStartTimestamp, seasonEndTimestamp;

  if (season !== undefined) {
    [
      seasonStartTimestamp,
      seasonEndTimestamp,
    ] = await getSeasonStartAndEndTimestamps(season);
  }

  return await prisma.team.findFirst({
    where: {
      [findByField]: teamId,
      valid_from: {
        lte: seasonStartTimestamp,
      },
      OR: [
        {
          valid_until: {
            gte: seasonEndTimestamp,
          },
        },
        {
          valid_until: null,
        },
      ],
    },
    orderBy: [
      {
        valid_from: 'desc',
      },
    ],
  });
}

export async function teams({ season }) {
  if (season === 'current') {
    season = await getCurrentSeason();
  }

  let seasonStartTimestamp, seasonEndTimestamp;

  if (season !== undefined) {
    [
      seasonStartTimestamp,
      seasonEndTimestamp,
    ] = await getSeasonStartAndEndTimestamps(season);
  }

  return await prisma.team.findMany({
    where: {
      valid_from: {
        lte: seasonStartTimestamp,
      },
      OR: [
        {
          valid_until: {
            gte: seasonEndTimestamp,
          },
        },
        {
          valid_until: null,
        },
      ],
    },
    orderBy: [
      {
        team_id: 'asc',
      },
      {
        valid_from: 'desc',
      },
    ],
    distinct: ['team_id'],
  });
}
