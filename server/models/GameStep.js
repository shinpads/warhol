const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const schema = {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },

  type: { type: String, enum: ['DRAWING', 'GUESS'] },
  user: { type: ObjectId, ref: 'User' },
  guess: String,
  drawing: { type: ObjectId, ref: 'Drawing' },
  submitted: { type: Boolean, default: false },
};

const compiledSchema = new mongoose.Schema(schema, {
  collection: 'gamesteps',
  autoIndex: true,
  strict: false,
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
});

const GameStep = {
  model: mongoose.model('GameStep', compiledSchema),
};

module.exports = GameStep;
