const socketio = require('socket.io');
const debug = require('debug');
const mongoose = require('mongoose');
const moment = require('moment');

const { asyncForEach } = require('../util/helperFunctions');
const db = require('./models');
const { uploadDrawing } = require('./drawingStore');
const { getDrawingsForGame } = require('./lib/Drawings');
const { generateWords } = require('./lib/generateWords');
const { getFromCache, setInCache } = require('../util/redisClient');

const { ObjectId } = mongoose.mongo;

const log = debug('warhol:socket');
const logError = debug('warhol:socket:error');

const SUBMIT_PADDING_TIME = 5000;

const nextRoundTimeouts = {};

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

      log('connection', hash, session.user.username);

      await db.User.model.findOneAndUpdate({ _id: session.user._id }, { socketId });

      await socket.join(hash);

      const checkStateGame = await db.Game.model.findOne({ hash }).select('state').select('players');

      if (!checkStateGame) throw new Error();
      if (checkStateGame.state === 'COMPLETE') return;

      if (checkStateGame.state === 'IN_PROGRESS' && (!checkStateGame.players || checkStateGame.players.indexOf(session.user._id) === -1)) {
        const game = await db.Game.model.findOneAndUpdate(
          { hash },
          {
            $addToSet: {
              playersWaiting: session.user._id,
            },
          },
          { new: true },
        )
          .select('playersWaiting')
          .select('users')
          .select('players')
          .select('host')
          .select('state')
          .populate('users')
          .populate('playersWaiting')
          .populate('players');

        await io.in(hash).emit('update-game', game);
      } else {
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
          .select('playersWaiting')
          .select('players')
          .populate('users')
          .populate('playersWaiting')
          .populate('players');
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
      }

      socket.on('disconnect', async () => {
        log('disconnect', hash, session.user.username);
        handleDisconnect(socket, hash, session.user._id, io);
      });

      socket.on('start-game', async () => {
        startGame(socket, hash, session.user._id, io);
      });

      socket.on('submit-step', async (step) => {
        log('submit-step', hash, session.user.username);
        submitStep(socket, hash, session.user._id, io, step);
      });

      socket.on('ready', async (ready) => {
        log('ready', hash, session.user.username);
        sendReady(socket, hash, session.user._id, io, ready);
      });

      socket.on('update-users', async () => {
        log('update-users', hash, session.user.username);
        updateUsers(socket, hash, io);
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
  const redisUserReadyMapKey = `game:${hash}:user-ready-map`;
  let userReadyMap = JSON.parse(await getFromCache(redisUserReadyMapKey));
  if (!userReadyMap) userReadyMap = {};
  userReadyMap[userId] = false;
  await setInCache(redisUserReadyMapKey, JSON.stringify(userReadyMap));
}

/**
 * starts a game
 * @param {string} hash - the hash of the game
 * @param {io} io socketio
 */
async function startGame(hash, io) {
  try {
    log('start-game', hash);
    const game = await db.Game.model.findOne({ hash }).populate('users');
    if (game.state !== 'PRE_START') return;
    game.players = game.users.map(u => u._id);
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
      gameStep.timeDue = moment().add(game.drawTimeLimit, 's');
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
        players: game.users,
      });
    });

    game.gameChains = gameChains;
    game.startTime = Date.now();
    await game.save();

    const timeoutTime = game.drawTimeLimit * 1000;
    nextRoundTimeouts[hash] = setTimeout(() => {
      startNextRound(io, hash);
    }, timeoutTime + SUBMIT_PADDING_TIME);
  } catch (err) {
    logError(err);
    throw new Error(err);
  }
}

/**
 * Called when a socket emits 'ready'
 * @param {Socket} socket - the socket that emitted
 * @param {string} hash - the hash of the game
 * @param {ObjectId} userId - the user who owns the socket
 * @param {io} io socketio
 * @param {boolean} ready if user is ready or not
 */
async function sendReady(socket, hash, userId, io, ready) {
  const redisUserReadyMapKey = `game:${hash}:user-ready-map`;
  let userReadyMap = JSON.parse(await getFromCache(redisUserReadyMapKey));
  if (!userReadyMap) userReadyMap = {};
  userReadyMap[userId] = ready;
  await setInCache(redisUserReadyMapKey, JSON.stringify(userReadyMap));
  io.to(hash).emit('user-ready-map', userReadyMap);

  const game = await db.Game.model.findOne({ hash });
  let allReady = true;
  game.users.forEach(user => {
    if (!userReadyMap[user]) {
      allReady = false;
    }
  });
  if (allReady) {
    startGame(hash, io);
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
    const gameStep = await db.GameStep.model.findOneAndUpdate(
      { _id: step._id },
      { submitted: true },
      { new: false },
    );
    if (String(gameStep.user) !== String(step.user._id)) return;
    if (gameStep.submitted) return;
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
      .populate('users')
      .populate('players');

    const allSubmitted = game.gameChains.map(gc => gc.gameSteps[gc.gameSteps.length - 1]
      && gc.gameSteps[gc.gameSteps.length - 1].submitted).indexOf(false) === -1;

    if (allSubmitted) {
      if (nextRoundTimeouts[hash]) {
        clearTimeout(nextRoundTimeouts[hash]);
        nextRoundTimeouts[hash] = null;
      }
      await startNextRound(io, hash);
    }
  } catch (err) {
    logError(err);
    socket.emit('error', 'error submitting step');
  }
}

/**
 * starts the next round / ends the game
 * @param {io} io socketio
 * @param {string} hash - the hash of the game
 */
async function startNextRound(io, hash) {
  const game = await db.Game.model.findOne({ hash })
    .populate({
      path: 'gameChains',
      populate: {
        path: 'gameSteps',
        populate: { path: 'user' },
      },
    })
    .populate('users')
    .populate('players');

  // process any unsubmitted or empty steps
  await asyncForEach(game.gameChains, async gc => {
    const lastGameStep = gc.gameSteps[gc.gameSteps.length - 1];
    if (lastGameStep.type === 'GUESS') {
      if (!lastGameStep.guess || !lastGameStep.guess.length) {
        // eslint-disable-next-line
        lastGameStep.guess = generateWords(1)[0];
        lastGameStep.autoFilled = true;
      }
      await lastGameStep.save();
    } else if (lastGameStep.type === 'DRAWING') {
      if (!lastGameStep.submitted) {
        for (let i = gc.gameSteps.length - 2; i >= 0; i--) {
          if (gc.gameSteps[i].type === 'DRAWING') {
            lastGameStep.drawing = gc.gameSteps[i].drawing;
            break;
          }
        }
        lastGameStep.autoFilled = true;
        await lastGameStep.save();
      }
    }
  });

  const redisUserSubmittedMapKey = `game:${hash}:user-submitted-map`;
  if (game.round >= game.rounds) {
    // END OF GAME
    game.state = 'COMPLETE';
    game.endTime = Date.now();
    const nextGame = new db.Game.model();
    nextGame.isPublic = game.isPublic;
    await nextGame.save();
    game.nextGame = nextGame._id;
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
      nextGame,
    });
  } else {
    // NEXT ROUND
    game.round += 1;
    const type = game.round % 2 === 1 ? 'DRAWING' : 'GUESS';
    const timeLimit = type === 'DRAWING' ? game.drawTimeLimit : game.guessTimeLimit;
    log('generating', type, 'round', game.round, game.hash);
    await asyncForEach(game.players, async (user) => {
      const userChainIndex = (game.gameChains
        .map(gs => String(gs.user._id))
        .indexOf(String(user._id)) + game.round - 1) % game.gameChains.length;

      const newGameStep = new db.GameStep.model();
      newGameStep.type = type;
      newGameStep.user = user;
      newGameStep.timeDue = moment().add(timeLimit, 's');
      await newGameStep.save();
      game.gameChains[userChainIndex].gameSteps.push(newGameStep);
      await db.GameChain.model.findOneAndUpdate(
        { _id: game.gameChains[userChainIndex]._id },
        {
          $push: {
            gameSteps: newGameStep._id,
          },
        },
      );
    });

    // create a timeout for the next round
    const timeoutTime = (type === 'GUESS' ? game.guessTimeLimit : game.drawTimeLimit) * 1000;
    nextRoundTimeouts[hash] = setTimeout(() => {
      startNextRound(io, hash);
    }, timeoutTime + SUBMIT_PADDING_TIME);
  }
  await game.save();

  await io.to(hash).emit('update-game', {
    round: game.round,
    gameChains: game.gameChains,
  });

  await setInCache(redisUserSubmittedMapKey, '{}');
  await io.to(hash).emit('user-submitted-map', {});
}

/**
 * updates all players / users to the players in current game
 * @param {Socket} socket - the socket that emitted
 * @param {string} hash - the hash of the game
 * @param {io} io socketio
 * @return {Game: {users, players}} populated game.users and game.players
 */
async function updateUsers(socket, hash, io) {
  try {
    const game = await db.Game.model.findOne({ hash })
      .select('users')
      .select('players')
      .populate('users')
      .populate('players');
    if (game) {
      io.to(hash).emit('update-game', game);
    } else {
      throw new Error('game not found', hash);
    }
  } catch (err) {
    logError(err);
  }
}
module.exports = setupSocket;
