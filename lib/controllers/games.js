import prisma from '../prisma.js';

import { gameStats } from '../controllers/stats.js';
import { getCurrentDay, getCurrentSeason } from '../controllers/timeMap.js';
import { getTimestampFromSeasonAndDay } from '../controllers/timeMap.js';

export async function games({ season, day, teamIds }) {
  if (season === 'current') {
    season = await getCurrentSeason();
  }

  if (day === 'current') {
    day = await getCurrentDay();
  }

  const gamesResult = await prisma.game.findMany({
    where: {
      season,
      day,
      ...(teamIds != null
        ? {
            OR: [
              { home_team: { in: teamIds } },
              { away_team: { in: teamIds } },
            ],
          }
        : {}),
    },
    orderBy: [{ season: 'desc' }, { day: 'asc' }],
  });

  return gamesResult;
}

export async function game({ gameId }) {
  const gameResult = await prisma.game.findUnique({
    where: {
      game_id: gameId,
    },
  });

  return gameResult;
}

export async function gameBoxScore({ gameId, teamId = null }) {
  let result = {};

  const gameResult = await prisma.game.findUnique({
    where: {
      game_id: gameId,
    },
  });

  const gameDayTimestamp = await getTimestampFromSeasonAndDay({
    season: gameResult.season,
    day: gameResult.day,
  });

  // Extracted validity filter to use when grabbing properly timestamped home and away teams
  const validTeamFilter = {
    valid_from: {
      lte: gameDayTimestamp,
    },
    OR: [
      {
        valid_until: {
          gte: gameDayTimestamp,
        },
      },
      {
        valid_until: null,
      },
    ],
  };

  const teamsResult = await prisma.team.findMany({
    where: {
      OR: [
        { team_id: gameResult.away_team },
        { team_id: gameResult.home_team },
      ],
      AND: { ...validTeamFilter },
    },
  });

  result.teams = {};

  result.teams.away = {
    team: teamsResult.find((team) => team.team_id === gameResult.away_team),
    playerStats: await gameStats({
      gameId,
      teamId: gameResult.away_team,
    }),
  };

  result.teams.home = {
    team: teamsResult.find((team) => team.team_id === gameResult.home_team),
    playerStats: await gameStats({
      gameId,
      teamId: gameResult.home_team,
    }),
  };

  result.game = gameResult;

  return result;
}

export async function gameEvents({ gameId }) {
  const gameResult = await prisma.game.findUnique({
    where: {
      game_id: gameId,
    },
    include: {
      game_events: {
        orderBy: {
          event_index: 'asc',
        },
        include: {
          game_event_base_runners: {
            orderBy: {
              id: 'asc',
            },
          },
          outcomes: {
            orderBy: {
              id: 'asc',
            },
          },
        },
      },
    },
  });

  const { game_events, ...game } = gameResult;

  const response = {
    game: game,
    events: game_events,
  };

  return response;
}
