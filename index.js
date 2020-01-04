require('dotenv').config({ path: './.env.' + process.env.NODE_ENV });
const debug = require('debug');
const mongoose = require('mongoose');
const db = require('./server/models');
const express = require('express');

const log = debug('mjlbe:apiRouter');
const logError = debug('mjlbe:apiRouter:error');
const app = express();

const bodyParser = require('body-parser');
const apiRouter = require('./server/apiRouter');

mongoose.connect(`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/db?authSource=admin`,
 {
   auth: { audthdb: 'admin' },
   user: process.env.MONGO_USER,
   password: process.env.MONGO_PASSWORD,
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended:true
}));
app.set('trust proxy', 1);

app.use('/', async (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, sid, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
  if (!req.headers.sid) return res.send({ success: false });
  req.sid = req.headers.sid;
  const sesh = await db.Session.model.findOne({ sid: req.headers.sid });
  if (!sesh) {
    const newSesh = new db.Session.model({
      loggedIn: false,
      sid: req.headers.sid,
    });
    await newSesh.save();
  } else {
    req.user = sesh._doc.userId;
    req.loggedIn = sesh._doc.loggedIn;
    if (sesh._doc.loggedIn && sesh._doc.userId) {
      const user = await db.User.model.findOneAndUpdate({ _id: sesh._doc.userId },
      {
        lastOnline: Date.now(),
      });
    }
  }
  next();
})

app.use('/api', apiRouter);

app.get('/', (req, res) => {
    res.send({ ok: true });
});


app.listen(3030, () => log('MasonJar-Launcher listening on port 3030'));
