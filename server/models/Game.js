const mongoose = require('mongoose');

const schema = {
  _id: String,
  players: Number,
  state: { type: String, enum: ['PRE_START', 'IN_PROGRESS', 'COMPLETE'] },
};

const compiledSchema = new mongoose.Schema(schema, { collection: 'games', autoIndex: true, strict: false });
const Game = {
  model: mongoose.model('Game', compiledSchema),
};


module.exports = Game;
