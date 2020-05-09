require('dotenv').config({ path: `../.env.${process.env.NODE_ENV}` });
const debug = require('debug');
const express = require('express');

const db = require('./models');
const { downloadDrawing } = require('./drawingStore');

const gamesRouter = require('./routes/games');
const usersRouter = require('./routes/users');
const contactMessagesRouter = require('./routes/contactMessages');

const log = debug('warhol:apiRouter');
const logError = debug('warhol:apiRouter:error');

const apiRouter = express.Router();

apiRouter.use('/games', gamesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/contact-messages', contactMessagesRouter);

apiRouter.get('/drawing/:_id', getDrawing);

// GET /api/drawing/:_id
async function getDrawing(req, res) {
  const { _id } = req.params;
  log(`/api/drawing/${_id}`);
  try {
    const drawing = await db.Drawing.model.findOne({ _id });
    if (!drawing || !drawing.cloudFileName) return res.status(400).send({ success: false });
    const drawData = await downloadDrawing(drawing.cloudFileName);
    if (!drawData) throw new Error('No draw data found');
    res.send({ success: true, drawData });
  } catch (err) {
    logError(err);
    res.status(500).send({ success: false });
  }
}

module.exports = apiRouter;
