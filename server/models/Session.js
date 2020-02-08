const mongoose = require('mongoose');

const schema = {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  sessionId: String,
  loggedIn: { type: Boolean, default: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
};

const compiledSchema = new mongoose.Schema(schema,
  {
    collection: 'sessions',
    autoIndex: true,
    strict: false,
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  });
const Session = {
  model: mongoose.model('Session', compiledSchema),
};


module.exports = Session;
