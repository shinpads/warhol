const express = require('express');
const debug = require('debug');
const db = require('../models');

const { getDrawingsForGame } = require('../lib/Drawings');
const { getFromCache } = require('../../util/redisClient');

const log = debug('warhol:games');
const logError = debug('warhol:games:error');

const gameRouter = express.Router();


gameRouter.get('/:hash', getGame);
gameRouter.post('/', createGame);

// GET /api/games/:hash
async function getGame(req, res) {
  const { hash } = req.params;
  log(`GET /api/games/${hash}`);
  try {
    const game = await db.Game.model.findOne({ hash })
      .populate({
        path: 'gameChains',
        populate: {
          path: 'gameSteps',
          populate: { path: 'user' },
        },
      });
    if (game) {
      const drawingMap = await getDrawingsForGame(game.hash);
      log( await getFromCache(`game:${hash}:user-submitted-map`));
      const userSubmittedMap = JSON.parse(await getFromCache(`game:${hash}:user-submitted-map`));
      res.status(200).send({
        success: true,
        game,
        drawingMap,
        userSubmittedMap,
      });
    } else {
      res.status(400).send({ success: false });
    }
  } catch (err) {
    logError(err);
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
