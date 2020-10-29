import { PrismaClient } from '@prisma/client';
import {
  getCurrentSeason,
  getSeasonStartAndEndTimestamps,
} from '../controllers/timeMap.js';

const prisma = new PrismaClient();

async function players({ season }) {
  if (isNaN(season)) {
    season = await getCurrentSeason();
  }

  const [
    seasonStartTimestamp,
    seasonEndTimestamp,
  ] = await getSeasonStartAndEndTimestamps(season);

  return await prisma.player.findMany({
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
        season_from: 'desc',
      },
      {
        gameday_from: 'desc',
      },
      {
        player_id: 'asc',
      },
      {
        valid_from: 'desc',
      },
    ],
    distinct: ['player_id'],
  });
}

async function deceasedPlayers() {
  return await prisma.player.findMany({
    where: {
      deceased: true,
      valid_until: null,
    },
    orderBy: {
      player_name: 'asc',
    },
  });
}

async function playerIdBySlug(slug) {
  // Get the first record with the given url_slug
  return await prisma.player.findFirst({
    select: {
      player_id: true,
    },
    where: {
      player_url_slug: slug,
    },
  });
}

async function playerInfoCurrent(playerIds) {
  return await prisma.player.findMany({
    where: {
      player_id: {
        in: playerIds,
      },
      valid_until: null,
    },
  });
}

module.exports = {
  deceasedPlayers,
  players,
  playerInfoCurrent,
  playerIdBySlug,
};
