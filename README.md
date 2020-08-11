# Datablase

The SIBR statistics API.

## Contributing

Please feel free to open PRs adding new calculations to this project! The schema for the database can 
be found [here](https://github.com/Society-for-Internet-Blaseball-Research/sibr-ops/blob/master/sibr-postgres-schema.sql).

When adding an API endpoint, you must document it using the JSDoc-like syntax recognized by
[express-swagger-generator](https://github.com/pgroot/express-swagger-generator/blob/master/package.json) so that the
API docs are updated.