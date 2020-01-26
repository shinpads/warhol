const express = require('express');
const db = require('../models');

const gameRouter = express.Router();


gameRouter.get('/:_id', getGame);

// GET /api/game/:_id
async function getGame(req, res, next) {
  const { _id } = req.params;
  try {
    const game = await db.Game.model.findOne({ _id });
    res.send({ success: true, game });
  } catch (err) {
    next(err);
  }
}

module.exports = gameRouter;
