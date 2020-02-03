const express = require('express');
const debug = require('debug');
const db = require('../models');

const log = debug('warhol:games');
const logError = debug('warhol:games:error');

const gameRouter = express.Router();


gameRouter.get('/:_id', getGame);
gameRouter.post('/', createGame);

// GET /api/games/:_id
async function getGame(req, res) {
  const { _id } = req.params;
  log(`GET /api/games/${_id}`);
  try {
    const game = await db.Game.model.findOne({ _id });
    res.status(200).send({ success: true, game });
  } catch (err) {
    res.status(500).send({ success: false });
  }
}

// POST /api/games
async function createGame(req, res) {
  log('POST /api/games');
  try {
    const game = new db.Game.model();
    await game.save();
    res.status(200).send({ success: true, game });
  } catch (err) {
    logError(err);
    res.status(500).send({ success: false });
  }
}

module.exports = gameRouter;
