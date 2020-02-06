const socketio = require('socket.io');
const debug = require('debug');

const db = require('./models');

const log = debug('warhol:socket');
const logError = debug('warhol:socket:error');

function setupSocket(http) {
  const io = socketio(http);
  io.on('connection', setup);
}

async function setup(socket) {
  try {
    log('connection', socket.handshake);
    const { hash, sessionId } = socket.handshake.query;
    if (!hash || !sessionId) {
      throw new Error();
    }
    // join room
    socket.join(hash);

    const session = await db.Session.model.findOne({ sessionId }).populate('user');
    if (!session || !session.user) {
      throw new Error();
    }

    await db.Game.model.findOneAndUpdate(
      { hash },
      {
        $addToSet: {
          users: session.user._id,
        },
      },
      { new: true },
    ).populate('users');
  } catch (err) {
    logError(err);
    socket.close();
  }
}

module.exports = setupSocket;
