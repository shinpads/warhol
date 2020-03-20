async function getObjectFromStream(stream) {
  let dataString = '';
  await new Promise((resolve) => {
    stream.on('data', chunk => { dataString += chunk; });
    stream.on('end', resolve);
  });
  try {
    const data = JSON.parse(dataString);
    return data;
  } catch (err) {
    throw new Error('Invalid JSON String');
  }
}

module.exports = getObjectFromStream;
