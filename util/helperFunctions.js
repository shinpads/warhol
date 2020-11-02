function generateHash() {
  const values = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  const length = 6;
  let hash = '';
  for (let i = 0; i < length; i++) {
    hash += values[Math.floor(Math.random() * (values.length - 1))];
  }
  return hash;
}

async function asyncForEach(arr, func) {
  for (let i = 0; i < arr.length; i++) {
    await func(arr[i], i);
  }
}


module.exports = {
  generateHash,
  asyncForEach,
};
