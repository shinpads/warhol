const express = require('express');
const debug = require('debug');
const db = require('../models');

const log = debug('warhol:contactMessages');
const logError = debug('warhol:contactMessages:error');

const contactMessageRouter = express.Router();

contactMessageRouter.post('/', postUser);

// POST /api/users/:_id
async function postUser(req, res) {
  log('POST /api/contact-messages', req.body);
  try {
    const contactMessage = new db.ContactMessage.model(req.body);
    contactMessage.user = req.user._id;
    await contactMessage.save();
    return res.send({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).send({ success: false });
  }
}


module.exports = contactMessageRouter;
