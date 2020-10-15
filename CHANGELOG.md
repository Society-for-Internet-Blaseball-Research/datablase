# 1.0.16

- Enable CORS for all domains.

# 1.0.15

- Add `type`, `sortBy`, and `sortDirection` parameters to `/events`.

# 1.0.14

- Move `/events/all` endpoint to `/data/events`.

# 1.0.13

- Added the `/events/all` endpoint.

# 1.0.12

- Added the `/countByType` endpoint.
- Fixed `count` values returning as strings.
- Fixed `home_score` and `away_score` values in the `GameEvent` object returning as string.

# 1.0.11

- Fix `/events` not accepting comma-separated values.

# 1.0.10

- All endpoints support comma-separated values for ID parameters.
- Added `baseRunners` and `playerEvents` parameters to `/events` which include child records if specified.
