const mongoose = require('mongoose');

const schema = {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  users: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  state: { type: String, enum: ['PRE_START', 'IN_PROGRESS', 'COMPLETE'], default: 'PRE_START' },
};

const compiledSchema = new mongoose.Schema(schema, { collection: 'games', autoIndex: true, strict: false });
const Game = {
  model: mongoose.model('Game', compiledSchema),
};


module.exports = Game;
