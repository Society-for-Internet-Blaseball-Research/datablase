const dotenv = require('dotenv');
dotenv.config();

const { Appsignal } = require('@appsignal/nodejs');
const appsignal = new Appsignal({
  active: process.env.NODE_ENV !== 'development',
  name: 'Datablase',
  apiKey: process.env.APPSIGNAL_PUSH_API_KEY,
});

const express = require('express');
const {
  expressErrorHandler,
  expressMiddleware,
} = require('@appsignal/express');
const cors = require('cors');
const v1Routes = require('./routes/v1.js');
const v2Routes = require('./routes/v2.js');

const app = express();

app.use(cors());
app.use(expressMiddleware(appsignal));

const expressSwagger = require('express-swagger-generator')(app);
expressSwagger({
  swaggerDefinition: {
    info: {
      description: 'The SIBR public statistics API.',
      title: 'Datablase',
      version: '1.0.0',
    },
    host:
      'SIBR_API_HOST' in process.env
        ? process.env.SIBR_API_HOST
        : 'api.blaseball-reference.com',
    basePath: '/',
    produces: ['application/json'],
    schemes: [
      'SIBR_API_SCHEME' in process.env ? process.env.SIBR_API_SCHEME : 'https',
    ],
  },
  basedir: __dirname,
  files: ['./routes/**/*.js'],
  route: {
    url: '/docs',
    docs: '/docs.json',
  },
});

app.use('/v1', v1Routes);
app.use('/v2', v2Routes);

app.use(expressErrorHandler(appsignal));

app.listen(3000, () => {
  console.log('SIBR API up and running!');
});
