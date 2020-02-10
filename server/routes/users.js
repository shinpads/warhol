const express = require('express');
const debug = require('debug');
// const db = require('../models');

const log = debug('warhol:users');
// const logError = debug('warhol:users:error');

const usersRouter = express.Router();


usersRouter.get('/from-session', getUserFromSession);

// GET /api/users/from-session
async function getUserFromSession(req, res) {
  log('GET /api/users/from-session');
  try {
    const { user } = req;
    if (user) {
      delete user.password;
      delete user.socketId;
      res.status(200).send({ success: true, user });
    } else {
      res.status(400).send({ success: false });
    }
  } catch (err) {
    res.status(500).send({ success: false });
  }
}


module.exports = usersRouter;
