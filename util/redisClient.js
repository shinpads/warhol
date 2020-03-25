const redis = require('redis');
const { promisify } = require('util');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD || undefined,
});

const setInCache = promisify(redisClient.set).bind(redisClient);
const getFromCache = promisify(redisClient.get).bind(redisClient);

module.exports = {
  setInCache,
  getFromCache,
};
