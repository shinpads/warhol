require('dotenv').config({ path: `../.env.${process.env.NODE_ENV}` });
const debug = require('debug');
const mongoose = require('mongoose');
const express = require('express');

const gameRouter = require('./routes/games');

const log = debug('bpbe:apiRouter');
const logError = debug('bpbe:apiRouter:error');

mongoose.connect(`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/db?authSource=admin`,
  {
    auth: { audthdb: 'admin' },
    user: process.env.MONGO_USER,
    password: process.env.MONGO_PASSWORD,
  });


const apiRouter = express.Router();

apiRouter.use('/games', gameRouter);

apiRouter.get('/test', tester);

async function tester(req, res) {
  log('GET /test');
  try {
    log('doing stuff');
    res.send({ success: true });
  } catch (err) {
    logError(err);
    res.status(400).send({ success: false });
  }
}

module.exports = apiRouter;
