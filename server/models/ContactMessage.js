const mongoose = require('mongoose');

const schema = {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  name: String,
  email: String,
  subject: String,
  message: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
};

const compiledSchema = new mongoose.Schema(schema,
  {
    collection: 'contactMessages',
    autoIndex: true,
    strict: false,
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  });
const ContactMessage = {
  model: mongoose.model('ContactMessage', compiledSchema),
};


module.exports = ContactMessage;
