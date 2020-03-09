const mongoose = require('mongoose');

const schema = {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  cloudFileName: String,
  gameHash: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
};

const compiledSchema = new mongoose.Schema(schema,
  {
    collection: 'drawings',
    autoIndex: true,
    strict: false,
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  });
const Drawing = {
  model: mongoose.model('Drawing', compiledSchema),
};


module.exports = Drawing;
