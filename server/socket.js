const socketio = require('socket.io');
const debug = require('debug');

const log = debug('bpbe:socket');
// const logError = debug('bpbe:socket:error');


function setup(http) {
  const io = socketio(http);
  io.on('connection', connection);
}

function connection(socket) {
  log('connection', socket);
}

module.exports = setup;
