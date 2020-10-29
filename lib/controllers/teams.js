import { PrismaClient } from '@prisma/client';
import {
  getCurrentSeason,
  getSeasonStartAndEndTimestamps,
} from '../controllers/timeMap.js';

const prisma = new PrismaClient();

async function teams({ season }) {
  if (isNaN(season)) {
    season = await getCurrentSeason();
  }

  const [
    seasonStartTimestamp,
    seasonEndTimestamp,
  ] = await getSeasonStartAndEndTimestamps(season);

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

module.exports = {
  teams,
};
