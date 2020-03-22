const Cloud = require('@google-cloud/storage');
const path = require('path');

const serviceKey = path.join(__dirname, '../../google-service-account.json');

const storage = new Cloud.Storage({
  keyFilename: serviceKey,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

module.exports = storage;
