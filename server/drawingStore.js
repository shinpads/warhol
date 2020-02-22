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
 * @param  {Object} drawing  an object that contains drawing strokes
 * @param  {String} fileName name of file to be saved as on cloud
 * @return {Promise}
 */
async function uploadDrawing(drawing, fileName) {
  log('uploading drawing', fileName);
  const cloudFile = bucket.file(fileName);
  const fileWriteStream = cloudFile.createWriteStream({ resumable: false });
  // TODO: cache in Redis
  await new Promise((resolve, reject) => intoStream(drawing)
    .pipe(fileWriteStream)
    .on('error', reject)
    .on('finish', resolve));
}

/**
 * downloads a drawing file from google cloud
 * @param  {String} fileName name of file
 * @return {Promise} resolves to drawing object
 */
async function downloadDrawing(fileName) {
  log('downloading drawing');
  const cloudFile = bucket.file(fileName);
  const fileReadStream = cloudFile.createReadStream()
    .on('error', () => {
      throw new Error('Could not create readable stream from file', fileName);
    });
  const drawing = await getObjectFromStream(fileReadStream);
  // TODO: cache in Redis
  return drawing;
}

module.exports = {
  uploadDrawing,
  downloadDrawing,
};
