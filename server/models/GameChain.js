const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const schema = {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  wordOptions: [String],
  originalWord: String,
  game: { type: ObjectId, ref: 'Game' },
  user: { type: ObjectId, ref: 'User' }, // the user who chose the word
  steps: [{ type: ObjectId, ref: 'GameStep' }],
};

const compiledSchema = new mongoose.Schema(schema, { collection: 'gamechains', autoIndex: true, strict: false });

const GameChain = {
  model: mongoose.model('GameChain', compiledSchema),
};

module.exports = GameChain;
