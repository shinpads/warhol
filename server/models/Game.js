const debug = require('debug');
const log = debug('mjlbe:Game');
const logError = debug('mjlbe:Game:error');

const mongoose = require('mongoose');

const schema = {
  _id: String,
  title: String,
  description: String,
  fullDescription: String,
  lastUpdated: Date,
  downloads: Number,
  hoursPlayed: Number,
  fileId: String,
  imageId: String,
  updates: Array,
  version: String,
  forceUpdate: Boolean
};

const compiledSchema = new mongoose.Schema(this.schema, { collection: 'games', autoIndex: true, strict: false });
const Game = {
  model: mongoose.model('Game', compiledSchema)
};


module.exports = Game;
