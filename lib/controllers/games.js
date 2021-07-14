import prisma from '../prisma.js';

import { gameStats } from '../controllers/stats.js';
import { getTimestampFromSeasonAndDay } from '../controllers/timeMap.js';

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
