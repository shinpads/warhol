require('dotenv').config({ path: '../.env.' + process.env.NODE_ENV });
const debug = require('debug');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const googledrive = require('./googledrive');
const db = require('./models');
mongoose.connect(`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/db?authSource=admin`,
 {
   auth: { audthdb: 'admin' },
   user: process.env.MONGO_USER,
   password: process.env.MONGO_PASSWORD,
});

const log = debug('mjlbe:apiRouter');
const logError = debug('mjlbe:apiRouter:error');

function logStack(err) {
  logError(err);
  throw new Error(err.stack);
}
process.on('uncaughtException', logStack);
process.on('unhandledRejection', logStack);
process.on('rejectionHandled', logStack);

const express = require('express');
const apiRouter = express.Router();

// user routes
apiRouter.post('/user/login', login);
apiRouter.post('/user/register', register);
apiRouter.post('/user/logout', logout);
apiRouter.get('/user/all', permissions('EDIT_USERS'), getUsers);

// game routes
apiRouter.get('/game/all', getGames);
apiRouter.get('/game/download/:id', downloadGame);

async function login(req, res) {
  log('POST /api/login');
  try {
    const { email, password } = req.body;
    const user = await db.User.model.findOne({ email });
    if (!user) return res.send({ success: false });
    const passwordCheck = await bcrypt.compare(password, user._doc.password);
    if (!passwordCheck) return res.send({ success: false, reason: 'wrong password' });
    const sesh = await db.Session.model.findOneAndUpdate(
      { sid: req.sid },
      {
        loggedIn: true,
        userId: user._id,
      }, { new: true });
    if (!sesh) return res.send({ success: false });
    delete user.password;
    res.send({ success: true, user: user });
  } catch (err) {
    res.send({ success: false });
  }
}

async function register(req, res) {
  log('POST /api/register');
  try {
    const { email, username, password } = req.body;

    const users = await db.User.model.find({ email });

    if (users && users.length) return res.send({ success: false, reason: 'email taken' });
    const users2 = await db.User.model.find({ username });
    if (users2.length) return res.send({ success: false, reason: 'username taken' });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new db.User.model({
      email,
      username,
      password: passwordHash
    });
    await newUser.save();
    res.send({ success: true });

  } catch (err) {
    logError(err);
    res.send({ success: false });
  }

}

async function logout(req, res) {
  log('POST /api/logout');
  try {
    const sesh = await db.Session.model.findOne({ sid: req.sid });
    if (!sesh) return res.send({ success: false });
    sesh.loggedIn = false;
    await sesh.save();
    res.send({ success: true });
  } catch (err) {
    logError(err);
    res.send({ success: false });
  }
}

async function getGames(req, res) {
  log('GET /api/games');
  try {
    const games = await db.Game.model.find();
    if (games) {
      res.send({ success: true, games });
    } else {
      res.send({ success: false });
    }
  } catch (err) {
    res.send({ success: false });
  }
}

async function downloadGame(req, res) {
  const { id } = req.params;
  log(`/api/game/download/${id}`);
  try {
    const game = await db.Game.model.findOne({ _id: id });
    if (!game || !game._doc.fileId) {
      return res.send({ success: false });
    }
    const fileId = game._doc.fileId;
    googledrive.streamFile(fileId, res);
  } catch (err) {
    logError(err);
    res.send({ success: false });
  }
}

async function getUsers(req, res) {
  log('GET /api/users/all');
  try {
    const users = await db.User.model.find();
    if (users) {
      return res.send({ sucess: true, users });
    } else {
      return res.send({ success: false });
    }
  } catch(err) {
    res.send({ success: false });
  }
}
function permissions(perm) {
  return async (req, res, next) => {
    try {
      const user = await db.User.model.findOne({ _id: req.user });
      if (req.loggedIn && user && user._doc.permissions && user._doc.permissions[perm]) {
        return next();
      } else {
        return res.send({ success: false });
      }
    } catch (err) {
      logError(err);
      res.send({ sucess: false });
    }
  };
}
module.exports = apiRouter;
