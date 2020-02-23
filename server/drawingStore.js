const debug = require('debug');
const intoStream = require('into-stream');

const gc = require('../util/googleCloudStorage');
const getObjectFromStream = require('../util/getObjectFromStream');

const log = debug('warhol:drawingStore');

// put this in .env later, probably make a seperate bucket for testing
const BUCKET_NAME = 'picken-drawings';

const bucket = gc.bucket(BUCKET_NAME);

/**
 * uploads a file to google cloud store
 * @param  {Object} drawData  an object that contains drawing strokes
 * @param  {String} fileName name of file to be saved as on cloud
 * @return {Promise}
 */
async function uploadDrawing(drawData, fileName) {
  log('uploading drawing', fileName);
  try {
    const cloudFile = bucket.file(fileName);
    const fileWriteStream = cloudFile.createWriteStream({ resumable: false });
    // TODO: cache in Redis
    await new Promise((resolve, reject) => intoStream(JSON.stringify(drawData))
      .pipe(fileWriteStream)
      .on('error', reject)
      .on('finish', resolve));
  } catch (err) {
    throw new Error('Failed to upload to cloud', err);
  }
}

/**
 * downloads a drawing file from google cloud
 * @param  {String} fileName name of file
 * @return {Promise} resolves to drawing object
 */
async function downloadDrawing(fileName) {
  log('downloading drawing');
  try {
    const cloudFile = bucket.file(fileName);
    const fileReadStream = cloudFile.createReadStream()
      .on('error', () => {
        throw new Error('Could not create readable stream from file', fileName);
      });
    const drawing = await getObjectFromStream(fileReadStream);
    // TODO: cache in Redis
    return drawing;
  } catch (err) {
    throw new Error('Failed to download file from cloud', err);
  }
}

module.exports = {
  uploadDrawing,
  downloadDrawing,
};
