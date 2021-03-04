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
SIBR_API_SCHEME=http
PGUSER=dbuser
PGHOST=database.server.com
PGPASSWORD=secretpassword
PGDATABASE=mydb
PGPORT=3211
DATABASE_URL="postgresql://username:password@localhost:5432/database?schema=data"
```

## Installation

1. `cd datablase` to go into the project root
1. `yarn` to install the website's dependencies
1. `npx prisma generate` to generate the [Prisma](https://prisma.io) query engine binary used by v2 endpoints

## Running Locally

1. `yarn dev` to start the development server
1. `open http://localhost:3000/` to open the development server
