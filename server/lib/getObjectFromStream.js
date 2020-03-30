async function getObjectFromStream(stream) {
  let dataString = '';
  try {
    await new Promise((resolve) => {
      stream.on('data', chunk => { dataString += chunk; });
      stream.on('end', resolve);
      stream.on('err', (err) => { throw new Error(err); });
    });
  } catch (err) {
    throw new Error(err);
  }
  try {
    const data = JSON.parse(dataString);
    return data;
  } catch (err) {
    throw new Error('Invalid JSON String');
  }
}

module.exports = getObjectFromStream;
