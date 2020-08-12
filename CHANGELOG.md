# 1.0.12
- Added the `/countByType` endpoint.
- Fixed `count` values returning as strings.
- Fixed `home_score` and `away_score` values in the `GameEvent` object returning as string.

# 1.0.11
- Fix `/events` not accepting comma-separated values.

# 1.0.10
- All endpoints support comma-separated values for ID parameters.
- Added `baseRunners` and `playerEvents` parameters to `/events` which include child records if specified.