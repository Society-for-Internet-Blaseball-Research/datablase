const dotenv = require('dotenv')
dotenv.config()
const express = require('express');
const cors = require('cors');
const routes = require('./routes/v1.js');

const app = express();

app.use(cors());

const expressSwagger = require('express-swagger-generator')(app);

expressSwagger({
  swaggerDefinition: {
    info: {
      description: 'The SIBR public statistics API.',
      title: 'Datablase',
      version: '1.0.0'
    },
    host: 'api.blaseball-reference.com',
    basePath: '/v1',
    produces: [
      'application/json'
    ],
    schemes: ['https'],
  },
  basedir: __dirname,
  files: ['./routes/**/*.js'],
  route: {
    url: '/docs',
    docs: '/docs.json',
  }
});

app.use('/v1', routes);

app.listen(3000, () => {
  console.log('SIBR API up and running!');
});
