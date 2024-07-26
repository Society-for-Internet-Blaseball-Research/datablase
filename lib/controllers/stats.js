import { getCurrentSeason } from '../controllers/timeMap.js';
import prisma from '../prisma.js';

// A list of base running fields for `fields` stat filters and to fill in nulls when a relation doesn't exist
const BASE_RUNNING_FIELDS = ['stolen_bases', 'caught_stealing', 'runs'];

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
    let view;

    // Select the appropriate function or view based on request
    if (type === 'season') {
      if (statGroup === 'hitting') {
        leaders =
          await prisma.$queryRaw`SELECT * FROM ref_leaderboard_season_batting(${season})`;
      } else if (statGroup === 'pitching') {
        leaders =
          await prisma.$queryRaw`SELECT * FROM ref_leaderboard_season_pitching(${season})`;
      } else {
        throw new Error(
          `Unsupported value provided for 'type' parameter: ${type}`
        );
      }
    } else if (type === 'career') {
      if (statGroup === 'hitting') {
        view = prisma.playerBattingLeaderboardsLifetime;
      } else if (statGroup === 'pitching') {
        view = prisma.playerPitchingLeaderboardsLifetime;
      } else {
        throw new Error(
          `Unsupported value provided for 'type' parameter: ${type}`
        );
      }
    } else {
      throw new Error(
        `Unsupported value provided for 'type' parameter: ${type}`
      );
    }

    if (leaders === undefined && view !== undefined) {
      leaders = await view.findMany();
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

export async function gameStats({ gameId, teamId }) {
  let response = [];

  for (const statGroup of ['hitting', 'pitching']) {
    let statGroupResult = {};
    let view;

    if (statGroup === 'hitting') {
      view = prisma.playerBattingStatsGame;
    } else if (statGroup === 'pitching') {
      view = prisma.playerPitchingStatsGame;
    }

    const viewResults = await view.findMany({
      where: {
        game_id: gameId,
        team_id: teamId,
      },
      include: statGroup === 'hitting' ? { runningStats: true } : undefined,
    });

    statGroupResult.group = statGroup;
    statGroupResult.totalSplits = viewResults.length;
    statGroupResult.splits = [];

    for (const record of viewResults) {
      let {
        day,
        game_id,
        is_postseason,
        player_id,
        player_name,
        season,
        team_id,
        team_valid_from,
        team_valid_until,
        weather_id,
        ...stat
      } = record;

      // Merge stat fields from runningStats association object into stat object
      if (Object.prototype.hasOwnProperty.call(stat, 'runningStats')) {
        if (stat.runningStats !== null) {
          // Discard unused non-base running stat fields
          const {
            day,
            game_id,
            player_id,
            player_name,
            season,
            team,
            team_id,
            team_valid_until,
            team_valid_from,
            ...runningStats
          } = stat.runningStats;

          stat = { ...stat, ...runningStats };
        } else {
          // If a player does not have base running stats for a particular season, fill with 0s
          BASE_RUNNING_FIELDS.forEach((baseRunningStat) => {
            stat[baseRunningStat] = 0;
          });
        }

        // Remove the association record since the fields were embedded into the `stat` property
        delete stat.runningStats;
      }

      statGroupResult.splits.push({
        gameId: game_id,
        day,
        season,
        stat,
        team: {
          team_id,
          team_valid_from,
          team_valid_until,
        },
        player: {
          id: player_id,
          fullName: player_name,
        },
      });
    }

    response.push(statGroupResult);
  }

  return response;
}

export async function teamStats({
  fields,
  gameType = 'R',
  group,
  limit,
  order = 'desc',
  season,
  sortStat,
  teamId,
  type = 'season',
}) {
  if (type === 'season' && season === 'current') {
    season = await getCurrentSeason();
  }

  const statGroups = group.split(',');

  let response = [];

  for (const statGroup of statGroups) {
    let statGroupResult = {};
    let view;

    if (type === 'season') {
      if (statGroup === 'hitting' && gameType === 'R') {
        view = prisma.teamBattingStatsSeason;
      } else if (statGroup === 'hitting' && gameType === 'P') {
        view = prisma.teamBattingStatsPostseason;
      } else if (statGroup === 'pitching' && gameType === 'R') {
        view = prisma.teamPitchingStatsSeason;
      } else if (statGroup === 'pitching' && gameType === 'P') {
        view = prisma.teamPitchingStatsPostseason;
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

    const viewResults = await queryPrismaView({
      fields,
      isPlayerStatRequest: false,
      limit,
      order,
      sortStat,
      season,
      statGroup,
      teamId,
      type,
      view,
    });

    // Attach the stat group information
    statGroupResult.group = statGroup;
    statGroupResult.type = type;
    statGroupResult.totalSplits = viewResults.length;
    statGroupResult.splits = [];

    // Insert the stat group splits
    for (const record of viewResults) {
      let {
        team,
        team_id,
        team_valid_from,
        team_valid_until,
        season,
        ...stat
      } = record;

      // Merge stat fields from runningStats association object into stat object
      if (Object.prototype.hasOwnProperty.call(stat, 'runningStats')) {
        if (stat.runningStats !== null) {
          // Discard unused non-base running stat fields
          const { season, team, team_id, ...runningStats } = stat.runningStats;

          stat = { ...stat, ...runningStats };
        } else {
          // If a player does not have base running stats for a particular season, fill with 0s
          BASE_RUNNING_FIELDS.forEach((baseRunningStat) => {
            stat[baseRunningStat] = 0;
          });
        }

        // Remove the association record since the fields were embedded into the `stat` property
        delete stat.runningStats;
      }

      statGroupResult.splits.push({
        season,
        stat,
        team: team,
      });
    }

    response.push(statGroupResult);
  }

  return response;
}

// @TODO: Add explicit types for single season, single game, etc
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
  if (type === 'season' && season === 'current') {
    season = await getCurrentSeason();
  }

  const statGroups = group.split(',');

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
    } else if (type === 'seasonCombined') {
      // @TODO: Add combined postseason views
      if (statGroup === 'hitting' && gameType === 'R') {
        view = prisma.playerBattingStatsSeasonCombined;
      } else if (statGroup === 'pitching' && gameType === 'R') {
        view = prisma.playerPitchingStatsSeasonCombined;
      } else {
        throw new Error(
          `Unsupported value provided for 'group' parameter: ${statGroup}`
        );
      }
    } else if (type === 'career') {
      if (statGroup === 'hitting' && gameType === 'R') {
        view = prisma.playerBattingStatsLifetime;
      } else if (statGroup === 'hitting' && gameType === 'P') {
        view = prisma.playerBattingStatsPostseasonLifetime;
      } else if (statGroup === 'pitching' && gameType === 'R') {
        view = prisma.playerPitchingStatsLifetime;
      } else if (statGroup === 'pitching' && gameType === 'P') {
        view = prisma.playerPitchingStatsPostseasonLifetime;
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

    const viewResults = await queryPrismaView({
      fields,
      limit,
      order,
      sortStat,
      playerId,
      season,
      statGroup,
      teamId,
      type,
      view,
    });

    // Attach the stat group information
    statGroupResult.group = statGroup;
    statGroupResult.type = type;
    statGroupResult.totalSplits = viewResults.length;
    statGroupResult.splits = [];

    // Insert the stat group splits
    for (const record of viewResults) {
      let {
        player_id,
        player_name,
        team,
        team_id,
        team_valid_from,
        team_valid_until,
        season,
        ...stat
      } = record;

      // Merge stat fields from runningStats association object into stat object
      if (Object.prototype.hasOwnProperty.call(stat, 'runningStats')) {
        if (stat.runningStats !== null) {
          // Discard unused non-base running stat fields
          const {
            player_id,
            player_name,
            season,
            team,
            team_id,
            team_valid_from,
            team_valid_until,
            ...runningStats
          } = stat.runningStats;

          stat = { ...stat, ...runningStats };
        } else {
          // If a player does not have base running stats for a particular season, fill with 0s
          BASE_RUNNING_FIELDS.forEach((baseRunningStat) => {
            stat[baseRunningStat] = 0;
          });
        }

        // Remove the association record since the fields were embedded into the `stat` property
        delete stat.runningStats;
      }

      statGroupResult.splits.push({
        season,
        stat,
        player: {
          id: player_id,
          fullName: player_name,
        },
        team: team,
      });
    }

    response.push(statGroupResult);
  }

  return response;
}

// Build the `select` query to include requested fields as well as relations
function getFieldSelection({
  baseRunningFields,
  isPlayerStatRequest = true,
  fieldSelection,
  splitType,
}) {
  if (
    baseRunningFields === undefined ||
    fieldSelection === undefined ||
    splitType === undefined
  ) {
    return undefined;
  }

  return fieldSelection.reduce(
    (accumulator, field) => {
      // If the field is a base running stat, merge it into relation select object
      if (baseRunningFields.includes(field)) {
        return {
          ...accumulator,
          // Because `select` cannot be used on the same level as `include` in Prisma,
          // we must select each association field (issue could be addressed by Prisma)
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
      ...(isPlayerStatRequest === true ? { player_id: true } : {}),
      ...(isPlayerStatRequest === true ? { player_name: true } : {}),
      // The `season` column does not exist in non-season views
      ...(splitType === 'season' ? { season: true } : {}),
      // The `team` association does not exist in career views
      ...(isPlayerStatRequest === true && splitType === 'career'
        ? {}
        : {
          team: {
            // Because `select` cannot be used on the same level as `include` in Prisma,
            // we must select each association field (issue could be addressed by Prisma in future)
            select: {
              team_id: true,
              location: true,
              nickname: true,
              full_name: true,
              team_abbreviation: true,
              url_slug: true,
              team_current_status: true,
              valid_from: true,
              valid_until: true,
              gameday_from: true,
              season_from: true,
              division: true,
              division_id: true,
              league: true,
              league_id: true,
              tournament_name: true,
              modifications: true,
              team_main_color: true,
              team_secondary_color: true,
              team_slogan: true,
              team_emoji: true,
            },
          },
        }),
    }
  );
}

async function queryPrismaView({
  fields,
  isPlayerStatRequest = true,
  limit,
  order,
  playerId,
  season,
  sortStat,
  statGroup,
  teamId,
  type,
  view,
}) {
  // The requested sort stat along with a default ASC sort on `season`
  const orderByFilterWithDefaults = [
    ...(sortStat !== undefined ? [{ [sortStat]: order }] : []),
    ...(type === 'season'
      ? [
        {
          season: 'asc',
        },
      ]
      : []),
  ];

  // The relations to include with the request
  const relationFields =
    // `include` cannot be used with `select`, so set to undefined when `fields` param is set
    fields === undefined
      ? {
        ...(statGroup === 'hitting' ? { runningStats: true } : {}),
        ...(type === 'season' ? { team: true } : {}),
      }
      : undefined;

  // Build the Prisma query
  const viewResults = await view.findMany({
    select: getFieldSelection({
      baseRunningFields: BASE_RUNNING_FIELDS,
      fieldSelection: fields,
      isPlayerStatRequest,
      splitType: type,
    }),
    include:
      // Include relationFields' properties if they exist
      relationFields !== undefined &&
        relationFields.constructor === Object &&
        Object.keys(relationFields).length !== 0
        ? relationFields
        : undefined,
    where: {
      season,
      ...(playerId != null ? { player_id: playerId } : {}),
      team_id: teamId,
    },
    take: limit,
    orderBy: orderByFilterWithDefaults,
  });

  return viewResults;
}
