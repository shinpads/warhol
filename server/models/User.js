const mongoose = require('mongoose');

const schema = {
  _id: String,
  email: { type: String, required: true },
  username: String,
  password: String,
  createdDate: Date,
  permissions: Object,
  lastOnline: Date,
};

const compiledSchema = new mongoose.Schema(schema, { collection: 'users', autoIndex: true, strict: false });
const User = {
  model: mongoose.model('User', compiledSchema),
};


module.exports = User;
