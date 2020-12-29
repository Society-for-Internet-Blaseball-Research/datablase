# Datablase

The SIBR statistics API.

## Contributing

Please feel free to open PRs adding new calculations to this project! The schema for the database can
be found [here](https://github.com/Society-for-Internet-Blaseball-Research/prophesizer/blob/future-perfect/db/schema.sql).

When adding an API endpoint, you must document it using the JSDoc-like syntax recognized by
[express-swagger-generator](https://github.com/pgroot/express-swagger-generator/blob/master/package.json) so that the
API docs are updated.

## Environment

Datablase requires some environmental variables to be set. A list of these variables can be found below. They can be set manually, or placed in a `.env` file.

```
SIBR_PRODUCTION=0
PGUSER=dbuser
PGHOST=database.server.com
PGPASSWORD=secretpassword
PGDATABASE=mydb
PGPORT=3211
DATABASE_URL="postgresql://username:password@localhost:5432/database?schema=data"
```
