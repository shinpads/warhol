// require('dotenv').config({ path: `./.env.${process.env.NODE_ENV}` });
// const fs = require('fs');
// const readline = require('readline');
// const { google } = require('googleapis');
// const debug = require('debug');
//
// const log = debug('mjlbe:apiRouter');
// const logError = debug('mjlbe:apiRouter:error');
//
// let drive = null;
// let auth = null;
//
// const SCOPES = ['https://www.googleapis.com/auth/drive'];
//
// const TOKEN_PATH = 'token.json';
//
// fs.readFile('credentials.json', (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   authorize(JSON.parse(content));
// });
//
// function authorize(credentials) {
//   const { client_secret, client_id, redirect_uris } = credentials.installed;
//   const oAuth2Client = new google.auth.OAuth2(
//     client_id, client_secret, redirect_uris[0],
//   );
//
//   fs.readFile(TOKEN_PATH, (err, token) => {
//     oAuth2Client.setCredentials(JSON.parse(token));
//     auth = oAuth2Client;
//     drive = google.drive({ version: 'v3', oAuth2Client });
//   });
// }
//
// function getAccessToken(oAuth2Client, callback) {
//   const authUrl = oAuth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: SCOPES,
//   });
//   console.log('Authorize this app by visiting this url:', authUrl);
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });
//   rl.question('Enter the code from that page here: ', (code) => {
//     rl.close();
//     oAuth2Client.getToken(code, (err, token) => {
//       if (err) return console.error('Error retrieving access token', err);
//       oAuth2Client.setCredentials(token);
//       // Store the token to disk for later program executions
//       fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
//         if (err) console.error(err);
//         console.log('Token stored to', TOKEN_PATH);
//       });
//       callback(oAuth2Client);
//     });
//   });
// }
//
//
// function streamFile(fileId, res) {
//   try {
//     drive.files.get({
//       auth: process.env.DRIVE_API_KEY,
//       fileId,
//       alt: 'media',
//     }, { responseType: 'stream' },
//     (err, result) => {
//       if (err) {
//         logError(err);
//         return res.send({ success: false });
//       }
//       res.set({
//         'content-type': 'application/zip',
//         'content-disposition': 'attachment',
//         'content-length': result.headers['content-length'],
//       });
//       result.data
//         .on('end', () => log('done sending file'))
//         .on('error', (err) => logError(err))
//         .pipe(res);
//     });
//   } catch (err) {
//     logError(err);
//     res.send({ success: false });
//   }
// }
//
// module.exports = { streamFile };
