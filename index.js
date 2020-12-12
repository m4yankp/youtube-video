require('dotenv').config()
var {
    google
} = require('googleapis');
var fs = require("fs");
var OAuth2 = google.auth.OAuth2;
const cron = require('node-cron');
const VIDEO_ID = "i1HWOlzsYYU";
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/youtube'];

var Jimp = require("jimp");
const { resolve } = require('path');
const { auth } = require('google-auth-library');
const { createConnection } = require('net');

const TOKEN_PATH = 'token.json';

const COMMENT_PATH = "comments.json";

var mainAuth;
// Get the credentials
// Get the comments on Video
// Sort comments to get the real comment object that is needed
// Read Comments and separate out new comments and store all comment IDs in our log
// Make comment to all new comments 
// Take the last name 
// Create thumbnail
// Update video title 
// Update Video thumbnail

async function main() {
  try{
    return new Promise(function(resolve,reject){
      fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Tasks API.  
        resolve(content);    
      }); }).then(authorize).then(getVideoComments).then(sortComments).then(readComments).then(replyComments).then(writeOnImage).then(updateVideoTitle).then(updateVideoThumbnail).then(function(data){
        console.log(data);
        
      });
  } catch (e) {
    console.error(e)
  }
}


const readComments = (response) =>{
  return new Promise(function(resolve,reject){
     fs.readFile(COMMENT_PATH, (err, commentIds) => {
        var newComments = [];
        var commentsToReplyOn = [];
        if(JSON.parse(commentIds).length == 0)
        {
          response.comments.forEach(function(singleComment){
            newComments.push(singleComment.id);
            commentsToReplyOn.push(singleComment);
          });
        }
        else
        {
          const allCommentIds = JSON.parse(commentIds);
          allCommentIds.forEach(function(value,index){
            response.comments.forEach(function(val,index){
            
              if(val.id != value)
              {
                commentsToReplyOn.push(val);
              }
              newComments.push(val.id);
            });
          });
        }
        fs.writeFile(COMMENT_PATH, JSON.stringify(newComments), (err) => {
              if (err) return console.error(err);
        });
        response.commentsToReply = commentsToReplyOn;
        resolve(response);
      });
  });
}

const replyComments = (response) =>{

  return new Promise(function async(resolve,reject){
    if(response.commentsToReply.length > 0)
    {
      response.commentsToReply.forEach(async(value,index) => {
        // console.log(value);
        await writeComment(value);
      });
      resolve(response);
    }
  });
}


const writeComment = async (comment) => {
   const service = google.youtube('v3')
  service.comments.insert({
    auth: mainAuth,
    part: 'snippet',
            resource: {
                snippet: {
                    textOriginal: `Thank you for your support ${comment.snippet.authorDisplayName} ! `,
                    parentId: comment.id
                }
            }
        }, function(err, response) {
          console.log(err);
         
            if (err) return (err)
            return response;
        });
  
}


const sortComments = (response) =>{
  return new Promise(function(resolve,reject){
    let newComments = [];
    response.comments.forEach(val => {
      newComments.push(val.snippet.topLevelComment);
    });
    response.comments = newComments;
    resolve (response);
  });
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
         mainAuth = oAuth2Client;
         resolve()
      });
  });
}


function writeOnImage(response)
{
  return new Promise(function(resolve,reject){
    if(response.commentsToReply.length > 0)
    {
      var res = response.commentsToReply[response.commentsToReply.length-1];
      var fileName = 'thumbnail/thumbnail.png';
      var imageCaption = res.snippet.authorDisplayName;
      var loadedImage;
      var outputFile = 'thumbnail/'+res.snippet.authorDisplayName+'.png';

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
              reject(err);
          });

    resolve(res);
    }
    else
    {
      resolve(0);
    }
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



function getVideoComments() {
    const service = google.youtube('v3')
    return new Promise((resolve, reject) => {
        service.commentThreads.list({
            auth: mainAuth,
            part: "id,snippet,replies",
            videoId: VIDEO_ID
        }, function(err, response) {
            if (err) return reject(err)
            response.comments = response.data.items;
            resolve(response)
        })
    })
}

function updateVideoTitle(response) {
  return new Promise(function(resolve,reject){
      if(response){
        const service = google.youtube('v3')
      return new Promise((resolve, reject) => {
          service.videos.update({
              auth: mainAuth,
              part: 'snippet',
              resource: {
                  id: VIDEO_ID,
                  snippet: {
                      title: `Thank you for your support ${response.snippet.authorDisplayName} | This video will thank you personally for your comment!`,
                      categoryId:28,
                      description:"If you support this video by commenting below, I’d personally thank you by changing the title of this video! If you want to see how this is happening, please comment below and do not forget to Like Share and Subscribe",
                      tags:"thank you video,thank you,100 subs thank you video,100 subscriber thank you video,thank you for 100 subscribers,thank you for 100 subs,job interview thank you note tutorial,job interview thank you,job interview thank you note,reading your comments,thank you note tutorial,how to budget your money for beginners,thank you note,dont take things personally 4 agreements,dont take things personally"
                  }
              }
          }, function(err, response) {
              if (err) return reject(err)
              resolve(response.data.snippet.title)
          })
      })
  }
  else
  {
    reject();
  }
  });

}



function updateVideoThumbnail(response) {
    const service = google.youtube('v3')
    return new Promise((resolve, reject) => {
        service.videos.update({
            auth: mainAuth,
            videoId: VIDEO_ID,
            items:[{
                "default": {
                  "url": "",
                  "width": 1280,
                  "height": 720
                }
              }
            ]
            
        }, function(err, response) {
            if (err) return reject(err)
            resolve(response)
        })
    }); }


cron.schedule("* * * * *",function(){
  main();
});