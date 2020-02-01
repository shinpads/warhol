const mongoose = require('mongoose');

const schema = {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  registered: { type: Boolean, default: false },
  email: String,
  username: String,
  password: String,
  createdDate: Date,
  lastOnline: Date,
};

const compiledSchema = new mongoose.Schema(schema, { collection: 'users', autoIndex: true, strict: false });
const User = {
  model: mongoose.model('User', compiledSchema),
};


module.exports = User;
