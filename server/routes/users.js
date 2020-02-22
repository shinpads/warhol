const express = require('express');
const debug = require('debug');
const db = require('../models');

const log = debug('warhol:users');
const logError = debug('warhol:users:error');

const usersRouter = express.Router();


usersRouter.get('/from-session', getUserFromSession);
usersRouter.post('/:_id', postUser);

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
    logError(err);
    res.status(500).send({ success: false });
  }
}

// POST /api/users/:_id
async function postUser(req, res) {
  const { _id } = req.params;
  log(`POST /api/users/${_id}`);
  try {
    if (_id !== String(req.user._id)) return res.status(400).send({ success: false });
    const user = await db.User.model.findOneAndUpdate(
      { _id },
      { ...req.body },
      { new: true },
    );
    if (!user) return res.status(400).send({ success: false });
    delete user.password;
    delete user.socketId;
    return res.send({ success: true, user });
  } catch (err) {
    logError(err);
    res.status(500).send({ success: false });
  }
}


module.exports = usersRouter;
