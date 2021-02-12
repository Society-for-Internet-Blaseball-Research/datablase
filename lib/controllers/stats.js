const { PrismaClient } = require('@prisma/client');
import { getCurrentSeason } from '../controllers/timeMap.js';
import { getSeasonStartAndEndTimestamps } from '../controllers/timeMap.js';

const prisma = new PrismaClient();

// @TODO: Add stat leader limit, leaderCategories filters
// @TODO: Replace ref_leaderboard database functions
// @TODO: Add all-time and single season leaders
export async function statLeaders({ group, season, type = 'season' } = {}) {
  if (type === 'season' && season === 'current') {
    season = await getCurrentSeason();
  }

  const statGroups = group.split(',');

  let response = [];

  for (const statGroup of statGroups) {
    let statGroupResult = {};
    let leaders;

    if (type === 'season') {
      if (statGroup === 'hitting') {
        leaders = await prisma.$queryRaw`SELECT * FROM ref_leaderboard_season_batting(${season})`;
      } else if (statGroup === 'pitching') {
        leaders = await prisma.$queryRaw`SELECT * FROM ref_leaderboard_season_pitching(${season})`;
      }
    }

    const leaderCategories = leaders.reduce((accumulator, currentValue) => {
      const { stat: currentStatCategory, ...leader } = currentValue;

      let leaderCategory = accumulator.find(
        (category) => category.leaderCategory === currentValue.stat
      );

      if (leaderCategory === undefined) {
        leaderCategory = {
          leaderCategory: currentStatCategory,
          leaders: [],
        };

        accumulator.push(leaderCategory);
      }

      if (type === 'season') {
        leader.season = season;
      }

      leaderCategory.leaders.push(leader);

      return accumulator;
    }, []);

    statGroupResult.leaderCategories = leaderCategories;
    statGroupResult.statGroup = statGroup;

    response.push(statGroupResult);
  }

  return response;
}

// @TODO: Add explicit types for career, single season, single game, etc
export async function playerStats({
  fields,
  gameType = 'R',
  group,
  limit,
  order = 'desc',
  playerId,
  season,
  sortStat,
  teamId,
  type = 'season',
}) {
  // A list of base running fields for `fields` filters and to fill in nulls when a relation doesn't exist
  const BASE_RUNNING_FIELDS = ['stolen_bases', 'caught_stealing', 'runs'];

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

    // The requested sort stat along with a default ASC sort on `season`
    const orderByFilterWithDefaults = [
      ...(sortStat !== undefined ? [{ [sortStat]: order }] : []),
      {
        season: 'asc',
      },
    ];

    const viewResults = await view.findMany({
      select: getFieldSelection(fields, BASE_RUNNING_FIELDS),
      include:
        // `include` cannot be used with `select`, so set to undefined when `fields` param is set
        fields === undefined && statGroup === 'hitting'
          ? {
              runningStats: true,
            }
          : undefined,
      where: {
        season,
        player_id: playerId,
        team_id: teamId,
      },
      take: limit,
      orderBy: orderByFilterWithDefaults,
    });

    statGroupResult.group = statGroup;
    statGroupResult.type = type;
    statGroupResult.totalSplits = viewResults.length;
    statGroupResult.splits = [];

    for (const record of viewResults) {
      const { player_id, player_name, team, team_id, season, ...stat } = record;

      // Merge fields from runningStats association object into stat object
      if (Object.prototype.hasOwnProperty.call(stat, 'runningStats')) {
        if (stat.runningStats !== null) {
          const {
            player_id,
            player_name,
            season,
            ...runningStats
          } = stat.runningStats;

          stat = { ...stat, ...runningStats };
        } else {
          BASE_RUNNING_FIELDS.forEach((baseRunningStat) => {
            stat[baseRunningStat] = 0;
          });
        }

        delete stat.runningStats;
      }

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

function getFieldSelection(fieldSelection, baseRunningFields) {
  if (fieldSelection === undefined || baseRunningFields === undefined) {
    return undefined;
  }

  return fieldSelection.reduce(
    (accumulator, field) => {
      // If the field is a base running stat, merge it into relation select object
      if (baseRunningFields.includes(field)) {
        return {
          ...accumulator,
          runningStats: {
            select: {
              ...accumulator.runningStats?.select,
              [field]: true,
            },
          },
        };
      } else {
        return { ...accumulator, [field]: true };
      }
    },
    {
      // Always return the following fields in addition to the requested fields
      player_id: true,
      player_name: true,
      season: true,
      team_id: true,
    }
  );
}
