import { PrismaClient } from '@prisma/client';
import {
  getCurrentSeason,
  getSeasonStartAndEndTimestamps,
} from '../controllers/timeMap.js';

const prisma = new PrismaClient();

export async function players({
  order = 'desc',
  playerPool,
  season,
  sortField,
}) {
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

  // @TODO: Add rookie and active player pools
  let playerPoolFilter = {};
  switch (playerPool) {
    case 'deceased':
      playerPoolFilter = {
        current_state: 'deceased',
        // Exclude incinerations not attributed to an event
        // @TODO: Workaround until 'nulls last' is implemented for sorts
        NOT: {
          incineration_phase: null,
        },
      };
      break;
    case 'all':
    default:
      break;
  }

  // Allow multiple sort fields
  let sortFilters = [];
  if (sortField !== undefined) {
    for (let field of sortField.split(',')) {
      sortFilters.push({ [field]: order });
    }
  }

  return await prisma.player.findMany({
    where: {
      ...playerPoolFilter,
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
      ...sortFilters,
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

export async function player(playerId, { findByField = 'player_id' } = {}) {
  return await prisma.player.findFirst({
    where: {
      [findByField]: playerId,
    },
    orderBy: {
      valid_from: 'desc',
    },
    distinct: ['player_id'],
  });
}
