const socketio = require('socket.io');
const debug = require('debug');

const db = require('./models');

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
        .populate('users');
      if (!game) throw new Error();

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
        await db.Game.model.findOneAndUpdate({ hash }, { host: game.host });
      }

      await io.in(hash).emit('update-game', game);

      socket.on('disconnect', async () => {
        handleDisconnect(socket, hash, session.user._id, io);
      });
    } catch (err) {
      logError(err);
      socket.close();
    }
  });
}

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
    .populate('users');
  if (String(game.host) === String(userId)) {
    game.host = null;
    if (game.users && game.users.length) {
      game.host = game.users[0]._id;
    }
    await db.Game.model.findOneAndUpdate({ hash }, { host: game.host });
  }
  await io.in(hash).emit('update-game', game);
}

module.exports = setupSocket;
