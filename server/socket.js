const socketio = require('socket.io');
const debug = require('debug');
const mongoose = require('mongoose');

const { asyncForEach } = require('../util/helperFunctions');
const db = require('./models');
const { uploadDrawing } = require('./drawingStore');
const { getDrawingsForGame } = require('./lib/Drawings');
const { generateWords } = require('./lib/generateWords');
const { getFromCache, setInCache } = require('../util/redisClient');

const { ObjectId } = mongoose.mongo;

const log = debug('warhol:socket');
const logError = debug('warhol:socket:error');

function setupSocket(http) {
  const io = socketio(http);
  io.on('connection', async (socket) => {
    try {
      const socketId = socket.id;
      const { hash, sessionId } = socket.handshake.query;
      if (!hash || !sessionId) {
        throw new Error();
      }
      hash.toUpperCase();
      const session = await db.Session.model.findOne({ sessionId }).populate('user');
      if (!session || !session.user) {
        throw new Error();
      }

      log(session.user._id, 'connected');

      await db.User.model.findOneAndUpdate({ _id: session.user._id }, { socketId });

      await socket.join(hash);

      const game = await db.Game.model.findOneAndUpdate(
        { hash },
        {
          $addToSet: {
            users: session.user._id,
          },
        },
        { new: true },
      )
        .select('users')
        .select('host')
        .select('state')
        .populate('users');
      if (!game) throw new Error();
      if (game.state === 'COMPLETE') return;

      // get rid of any disconnected sockets if for some reasone the on disconnected didnt work
      const oldLength = game.users.length;
      game.users = game.users.filter(user => user.socketId
        && io.sockets.sockets[user.socketId]
        && io.sockets.sockets[user.socketId].connected);
      if (oldLength !== game.users.length) {
        await db.Game.model.findOneAndUpdate({ hash }, { users: game.users });
      }

      if (!game.host || game.users.findIndex(user => user._id === game.host) === -1) {
        game.host = game.users[0]._id;
        await db.Game.model.findOneAndUpdate({ hash }, { host: game.host })
          .select('host')
          .select('users')
          .select('rounds');
      }

      await io.in(hash).emit('update-game', game);

      socket.on('disconnect', async () => {
        handleDisconnect(socket, hash, session.user._id, io);
      });
      socket.on('start-game', async () => {
        startGame(socket, hash, session.user._id, io);
      });
      socket.on('submit-step', async (step) => {
        submitStep(socket, hash, session.user._id, io, step);
      });
    } catch (err) {
      logError(err);
      socket.close();
    }
  });
}
/**
 * Called when socket disconnects
 * @param {Socket} socket - the socket that disconnected
 * @param {string} hash - the hash of the game which the socket disconnected from
 * @param {ObjectId} userId - the user who disconnected from the game
 * @param {io} io socketio
 */
async function handleDisconnect(socket, hash, userId, io) {
  log(userId, 'disconnected');
  const game = await db.Game.model.findOneAndUpdate(
    { hash },
    {
      $pull: {
        users: userId,
      },
    },
    { new: true },
  )
    .select('users')
    .select('host')
    .select('state')
    .populate('users');
  if (game.state === 'COMPLETE') return;
  if (String(game.host) === String(userId)) {
    game.host = null;
    if (game.users && game.users.length) {
      game.host = game.users[0]._id;
    }
    await db.Game.model.findOneAndUpdate({ hash }, { host: game.host })
      .select('users')
      .select('host');
  }
  await io.in(hash).emit('update-game', game);
}

/**
 * Called when a socket emits 'start-game'
 * @param {Socket} socket - the socket that emitted
 * @param {string} hash - the hash of the game
 * @param {ObjectId} userId - the user who owns the socket
 * @param {io} io socketio
 */
async function startGame(socket, hash, userId, io) {
  try {
    log(userId, 'start-game');
    const game = await db.Game.model.findOne({ hash }).populate('users');
    if (String(game.host) !== String(userId)) return;
    if (game.state !== 'PRE_START') return;

    game.state = 'IN_PROGRESS';
    game.round = 1;
    game.rounds = game.users.length;
    const words = generateWords(game.users.length);
    let i = 0;
    // create gamechains
    const gameChains = [];
    await asyncForEach(game.users, async (user) => {
      const gameStep = new db.GameStep.model();
      gameStep.type = 'DRAWING';
      gameStep.user = user._id;
      await gameStep.save();
      const gameChain = new db.GameChain.model();
      gameChain.originalWord = words[i];
      i += 1;
      gameChain.user = user._id;
      gameChain.game = game._id;
      gameChain.gameSteps = [gameStep._id];
      await gameChain.save();
      gameChains.push(gameChain._id);
      gameStep.user = user; // populate user
      gameChain.gameSteps = [gameStep]; // 'populate' gamestep
      await io.to(user.socketId).emit('update-game', {
        state: game.state,
        rounds: game.rounds,
        round: game.round,
        gameChains: [gameChain],
      });
    });

    game.gameChains = gameChains;

    await game.save();
  } catch (err) {
    logError(err);
    socket.emit('error', 'error starting game');
  }
}

/**
 * Called when a socket emits 'submit-step'
 * @param {Socket} socket - the socket that emitted
 * @param {string} hash - the hash of the game
 * @param {ObjectId} userId - the user who owns the socket
 * @param {io} io socketio
 * @param {Step} step - the Step object submitted
 */
async function submitStep(socket, hash, userId, io, step) {
  try {
    log(userId, 'submit-step');
    const gameStep = await db.GameStep.model.findOne({ _id: step._id });
    if (String(gameStep.user) !== String(step.user._id)) return;
    if (gameStep.type === 'DRAWING') {
      const { drawData } = step;
      const drawing = new db.Drawing.model();
      drawing._id = new ObjectId();
      drawing.user = userId;
      drawing.gameHash = hash;
      const fileName = `${hash}/${drawing._id}`;
      drawing.cloudFileName = fileName;
      // upload to google cloud
      await uploadDrawing(drawData, fileName);
      await drawing.save();
      gameStep.drawing = drawing._id;
    } else if (gameStep.type === 'GUESS') {
      gameStep.guess = step.guess;
    }
    gameStep.submitted = true;
    await gameStep.save();

    const redisUserSubmittedMapKey = `game:${hash}:user-submitted-map`;
    let userSubmittedMap = JSON.parse(await getFromCache(redisUserSubmittedMapKey));
    if (!userSubmittedMap) userSubmittedMap = {};
    userSubmittedMap[userId] = true;
    await setInCache(redisUserSubmittedMapKey, JSON.stringify(userSubmittedMap));
    await io.to(hash).emit('user-submitted-map', userSubmittedMap);

    const game = await db.Game.model.findOne({ hash })
      .populate({
        path: 'gameChains',
        populate: {
          path: 'gameSteps',
          populate: { path: 'user' },
        },
      })
      .populate('users');

    const allSubmitted = game.gameChains.map(gc => gc.gameSteps[gc.gameSteps.length - 1]
      && gc.gameSteps[gc.gameSteps.length - 1].submitted).indexOf(false) === -1;

    if (allSubmitted) {
      if (game.round >= game.rounds) {
        game.state = 'COMPLETE';
        try {
          const drawingMap = await getDrawingsForGame(game.hash);
          io.to(hash).emit('drawing-map', drawingMap);
        } catch (err) {
          logError('Coudlnt get drawingMap');
        }
        io.to(hash).emit('update-game', {
          round: game.round,
          state: game.state,
          gameChains: game.gameChains,
        });
      } else {
        game.round += 1;
        const type = game.round % 2 === 1 ? 'DRAWING' : 'GUESS';
        await asyncForEach(game.users, async (user) => {
          const userChainIndex = (game.gameChains
            .map(gs => String(gs.user._id))
            .indexOf(String(user._id)) + game.round - 1) % game.gameChains.length;

          log('adding to', user, game.gameChains[userChainIndex], game.gameChains[userChainIndex].gameSteps.map(gs => gs.user._id));
          const newGameStep = new db.GameStep.model();
          newGameStep.type = type;
          newGameStep.user = user;
          await newGameStep.save();
          game.gameChains[userChainIndex].gameSteps.push(newGameStep);
          await game.gameChains[userChainIndex].save();
          const gameChain = game.gameChains[userChainIndex];
          gameChain.gameSteps = gameChain.gameSteps
            .slice(gameChain.gameSteps.length - 2, gameChain.gameSteps.length);
          io.to(user.socketId).emit('update-game', {
            round: game.round,
            gameChains: [gameChain],
          });
        });
      }
      await game.save();

      await setInCache(redisUserSubmittedMapKey, '{}');
      await io.to(hash).emit('user-submitted-map', {});
    }
  } catch (err) {
    logError(err);
    socket.emit('error', 'error submitting step');
  }
}

module.exports = setupSocket;
