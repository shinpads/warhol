const dotenv = require('dotenv');
const fs = require('fs');

const optional = [
  'MONGO_USER',
  'MONGO_PASSWORD',
  'REDIS_USER',
  'REDIS_PASSWORD',
];

function check() {
  const baseConfig = dotenv.parse(fs.readFileSync('.env.example'));
  Object.keys(baseConfig).forEach(k => {
    if (optional.indexOf(k) === -1 && !process.env[k]) {
      throw new Error(`set ${k} in the .env you fucking retard`);
    }
  });
}

module.exports = check;
