require('dotenv').config({ path: `./.env.${process.env.NODE_ENV}` });
const debug = require('debug');
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const cors = require('cors');

const log = debug('warhol:index');
// const logError = debug('warhol:index:error');
const bodyParser = require('body-parser');

const apiRouter = require('./server/apiRouter');
const socket = require('./server/socket');
const db = require('./server/models');

mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/db?authSource=admin`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    auth: { audthdb: 'admin' },
  });


const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('trust proxy', 1);

const httpServer = http.createServer(app);

socket(httpServer);


app.use('/', async (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, sessionId, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
  const sessionId = req.header('sessionId');
  if (!sessionId) return res.status(400).send({ success: false, error: 'no sessionId specified' });
  req.sessionId = sessionId;
  const sesh = await db.Session.model.findOne({ sessionId });
  if (sesh) {
    // session already exists
    const user = await db.User.model.findById(sesh.userId);
    req.userId = user._id;
  } else {
    // create new session
    log(`Creating new user with session ${req.sessionId}`);

    const newUser = new db.User.model();
    newUser.username = 'Player';
    await newUser.save();
    req.userId = newUser._id;

    const newSesh = new db.Session.model();
    newSesh.sessionId = req.sessionId;
    newSesh.userId = newUser._id;
    await newSesh.save();
  }

  return next();
});

app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.send({ ok: true });
});


httpServer.listen(3030, () => log('bpbe listening on port 3030'));
