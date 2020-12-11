require('dotenv').config()
var {
    google
} = require('googleapis');
var fs = require("fs");
var OAuth2 = google.auth.OAuth2;
const VIDEO_ID = "i1HWOlzsYYU";
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly','https://www.googleapis.com/auth/youtube.force-ssl','https://www.googleapis.com/auth/youtubepartner'];

var Jimp = require("jimp");
const { randomBytes } = require('crypto');

const TOKEN_PATH = 'token.json';

//main()


async function main() {
  try{
    return new Promise(function(resolve,reject){
      fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Tasks API.  
        resolve(content);    
      }); }).then(authorize).then(getVideoViews).then(getVideoComments).then(function(data){
        var auth = {};
        auth.name = "Aashna";
        writeOnImage(auth);
        // console.log(data);
      });
  } catch (e) {
    console.error(e)
  }
   
}


const authorize = (credentials) => {
  var credentials = JSON.parse(credentials);
  return new Promise(function(resolve,reject) {
      const {client_secret, client_id, redirect_uris} = credentials.web;
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, "http://localhost:88");

      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, (err, token) => {
        if (err)  resolve(getNewToken(oAuth2Client, callback));
        oAuth2Client.setCredentials(JSON.parse(token));
         resolve(oAuth2Client)
      });
  });
}

function getVideoViews(auth) {
    const service = google.youtube('v3')
    return new Promise((resolve, reject) => {
        service.videos.list({
            auth: auth,
            part: "statistics",
            id: VIDEO_ID
        }, function(err, response) {
            if (err) return reject(err)
            response.auth = auth;
            resolve(response)
        })
    })
}

function writeOnImage(response)
{
  var fileName = 'thumbnail/thumbnail.png';
  var imageCaption = response.name;
  var loadedImage;
  var outputFile = 'thumbnail/asdasd.png';

  Jimp.read(fileName)
      .then(function (image) {
          loadedImage = image;
          return Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
      })
      .then(function (font) {
          var stringLen = imageCaption.length;
          var x = 740 - (stringLen*10);
          loadedImage.print(font, x, 614, imageCaption)
                    .write(outputFile);
      })
      .catch(function (err) {
          console.error(err);
      });
}
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}



function getVideoComments(response) {
 var stats = response.data.items[0].statistics;
  const auth = response.auth;
    const service = google.youtube('v3')
    return new Promise((resolve, reject) => {
        service.commentThreads.list({
            auth: auth,
            part: "id,snippet,replies",
            videoId: VIDEO_ID
        }, function(err, response) {
            if (err) return reject(err)
            response.stats = stats;
            response.comments = response.data.items;
            response.auth = auth;
            resolve(response)
        })
    })
}

function updateVideoTitle(auth, name) {
    const service = google.youtube('v3')
    return new Promise((resolve, reject) => {
        service.videos.update({
            auth: auth,
            part: 'snippet',
            resource: {
                id: VIDEO_ID,
                snippet: {
                    title: `Thank you for your support ${name} | This video will thank you personally for your comment!`,
                }
            }
        }, function(err, response) {
            if (err) return reject(err)
            resolve(response.data.snippet.title)
        })
    })
}



// function updateVideoThumbnail(auth) {
//     const service = google.youtube('v3')
//     return new Promise((resolve, reject) => {
//         service.videos.update({
//             auth: auth,
//             videoId: VIDEO_ID,
//             items:[{
//                 "default": {
//                   "url": "",
//                   "width": 1280,
//                   "height": 720
//                 }
//               }
//             ]
//             }
//         }, function(err, response) {
//             if (err) return reject(err)
//             resolve(response.data.snippet.title)
//         })
//     })
// }

main();