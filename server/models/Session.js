const mongoose = require('mongoose');

const schema = {
  _id: String,
  sid: String,
  loggedIn: Boolean,
  userId: mongoose.Schema.Types.ObjectId,
};

const compiledSchema = new mongoose.Schema(schema, { collection: 'sessions', autoIndex: true, strict: false });
const Session = {
  model: mongoose.model('Session', compiledSchema),
};


module.exports = Session;
