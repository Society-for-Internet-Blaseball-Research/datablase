import {
  getCurrentSeason,
  getSeasonStartAndEndTimestamps,
} from '../controllers/timeMap.js';
import prisma from '../prisma.js';

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

  // @TODO: Add rookie player pool
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
    case 'current':
      playerPoolFilter = {
        current_state: 'active',
        current_location: 'main_roster',
      };
      break;
    case 'shadows':
      playerPoolFilter = {
        current_state: 'active',
        current_location: 'shadows',
      };
      break;
    case 'all':
    default:
      break;
  }

  return await prisma.player.findMany({
    where: {
      ...playerPoolFilter,
      valid_from: {
        lte: seasonEndTimestamp,
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
      ...(sortField !== undefined ? [{ [sortField]: order }] : []),
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
