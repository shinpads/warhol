require('dotenv').config({ path: `../.env.${process.env.NODE_ENV}` });
const debug = require('debug');
const express = require('express');

const gameRouter = require('./routes/games');

const log = debug('warhol:apiRouter');
const logError = debug('warhol:apiRouter:error');

const apiRouter = express.Router();

apiRouter.use('/games', gameRouter);

apiRouter.get('/test', tester);

async function tester(req, res) {
  log('GET /test');
  try {
    res.send({ success: true });
  } catch (err) {
    logError(err);
    res.status(400).send({ success: false });
  }
}

module.exports = apiRouter;
