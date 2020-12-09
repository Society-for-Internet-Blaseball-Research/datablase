const { PrismaClient } = require('@prisma/client');
import { getCurrentSeason } from '../controllers/timeMap.js';

const prisma = new PrismaClient();

// @TODO: The 'teamId' is currently unsupported for pitching stats
export async function playerStats({
  group,
  limit,
  order,
  season,
  sortStat,
  teamId,
  type = 'season',
}) {
  if (type === 'season' && isNaN(season)) {
    season = await getCurrentSeason();
  }

  const statGroups = group.split(',');

  let response = [];

  // @TODO: Add career stats
  for (const statGroup of statGroups) {
    let statGroupResult = {};
    let view;

    if (statGroup === 'hitting') {
      view = prisma.playerBattingStatsSeason;
    } else if (statGroup === 'pitching') {
      view = prisma.playerPitchingStatsSeason;
    } else {
      throw new Error(
        `Unsupported value provided for 'group' parameter: ${statGroup}`
      );
    }

    const viewResults = await view.findMany({
      where: {
        season,
        // @TODO: Remove conditional once pitching view includes a 'team_id' column
        team_id: statGroup === 'hitting' ? teamId : undefined,
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

      statGroupResult.splits.push({
        season,
        stat: {
          ...stat,
        },
        player: {
          id: player_id,
          fullName: player_name,
        },
        team: {
          id: team_id,
          name: team,
        },
      });
    }

    response.push(statGroupResult);
  }

  return response;
}
