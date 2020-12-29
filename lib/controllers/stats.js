const { PrismaClient } = require('@prisma/client');
import { getCurrentSeason } from '../controllers/timeMap.js';
import { getSeasonStartAndEndTimestamps } from '../controllers/timeMap.js';

const prisma = new PrismaClient();

// @TODO: Add explicit types for career, single season, single game, etc
export async function playerStats({
  gameType = 'R',
  group,
  limit,
  order,
  playerId,
  season,
  sortStat,
  teamId,
  type = 'season',
}) {
  if (type === 'season' && season === 'current') {
    season = await getCurrentSeason();
  }

  const statGroups = group.split(',');

  // A map of players' teams and the seasons in which they appear
  const teamsBySeason = {};

  let response = [];

  for (const statGroup of statGroups) {
    let statGroupResult = {};
    let view;

    if (type === 'season') {
      if (statGroup === 'hitting' && gameType === 'R') {
        view = prisma.playerBattingStatsSeason;
      } else if (statGroup === 'hitting' && gameType === 'P') {
        view = prisma.playerBattingStatsPostseason;
      } else if (statGroup === 'pitching' && gameType === 'R') {
        view = prisma.playerPitchingStatsSeason;
      } else if (statGroup === 'pitching' && gameType === 'P') {
        view = prisma.playerPitchingStatsPostseason;
      } else {
        throw new Error(
          `Unsupported value provided for 'group' parameter: ${statGroup}`
        );
      }
    } else {
      throw new Error(
        `Unsupported value provided for 'type' parameter: ${type}`
      );
    }

    const viewResults = await view.findMany({
      where: {
        season,
        player_id: playerId,
        team_id: teamId,
      },
      take: limit,
      orderBy: {
        [sortStat]: order,
      },
    });

    statGroupResult.group = statGroup;
    statGroupResult.type = type;
    statGroupResult.totalSplits = viewResults.length;
    statGroupResult.splits = [];

    for (const record of viewResults) {
      const { player_id, player_name, team, team_id, season, ...stat } = record;

      if (!Object.prototype.hasOwnProperty.call(teamsBySeason, season)) {
        teamsBySeason[season] = {};
      }

      if (
        !Object.prototype.hasOwnProperty.call(teamsBySeason[season], team_id)
      ) {
        teamsBySeason[season][team_id] = {};
      }

      statGroupResult.splits.push({
        season,
        stat,
        player: {
          id: player_id,
          fullName: player_name,
        },
        team: team_id,
      });
    }

    response.push(statGroupResult);
  }

  // Fetch teams from relevant seasons
  for (const season in teamsBySeason) {
    for (const team_id in teamsBySeason[season]) {
      const [
        seasonStartTimestamp,
        seasonEndTimestamp,
      ] = await getSeasonStartAndEndTimestamps(Number(season));

      const result = await prisma.team.findFirst({
        where: {
          team_id,
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

      teamsBySeason[season][team_id] = result;
    }
  }

  // Insert teams into splits
  for (const statGroup of response) {
    for (const split of statGroup.splits) {
      split.team = teamsBySeason[split.season][split.team];
    }
  }

  return response;
}
