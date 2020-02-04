function generateHash() {
  const values = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  const length = 6;
  let hash = '';
  for (let i = 0; i < length; i++) {
    hash += values[Math.floor(Math.random() * (values.length - 1))];
  }
  return hash;
}

module.exports = {
  generateHash,
};
