const debug = require('debug');
const log = debug('mjlbe:Update');
const logError = debug('mjlbe:Update:error');

const mongoose = require('mongoose');

const schema = {
  _id: String,
  title: String,
  content: String,
  date: Date,
  fileId: String,
  gameId: mongoose.Schema.Types.ObjectId,
};

const compiledSchema = new mongoose.Schema(schema, { collection: 'updates', autoIndex: true, strict: false });
const Update = {
  model: mongoose.model('Update', compiledSchema),
};


module.exports = Update;
