require('dotenv').config();

const express = require('express');
const request = require('request');
const RC = require('ringcentral');
const axios = require('axios');
const request = require('request');
const http = require('https');
const bodyparser = require('body-parser');
const FormData = require('form-data');
const format = require('./format.js');
const SDK = require('ringcentral');

var rcsdk = new SDK({
    server: SDK.server.sandbox,
    appKey: process.env.CLIENT_ID,
    appSecret: process.env.CLIENT_SECRET,
    redirectUri: '' // optional, but is required for Implicit Grant and Authorization Code OAuth Flows
                    // (see https://github.com/ringcentral/ringcentral-js#api-calls)
});

const PORT = process.env.PORT;
const REDIRECT_HOST = process.env.REDIRECT_HOST;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const RINGCENTRAL_ENV = process.env.RINGCENTRAL_ENV;


var app = express();
var platform, subscription, rcsdk, subscriptionId, bot_token;


// Let's start our server
app.listen(PORT, () => {
    //Callback triggered when server is successfully listening. Hurray!
    console.log(`Example app listening on port ${PORT}`);
});

app.use(bodyparser.json());

// This route handles GET requests to our root ngrok address and responds with the same "Ngrok is working message" we used before
app.get('/', (req, res) => {
    res.send(`Ngrok is working! Path Hit: ${req.url}`);
});


rcsdk = new RC({
    server: RINGCENTRAL_ENV,
    appKey: CLIENT_ID,
    appSecret: CLIENT_SECRET
});

platform = rcsdk.platform();

//Authorization callback method.
app.get('/oauth', (req, res) => {
    if (!req.query.code) {
        res.status(500);
        res.send({'Error': 'Looks like we\'re not getting code.'});
        console.log('Looks like we\'re not getting code.');
    } else {
        platform.login({
            code: req.query.code,
            redirectUri: `${REDIRECT_HOST}/oauth`
        }).then(authResponse => {
            var obj = authResponse.json();
            bot_token = obj.access_token;
            res.send(obj)
            subscribeToGlipEvents();
        }).catch(e => {
            console.error(e)
            res.send(`Error: ${e}`);
        })
    }
});

app.use('/voicebase/callback', (req, res) => {
   console.log('RECEIVED VOICEBASE\'S OUTPUT');

   //   Get the transcript from the object returned by VoiceBase
   var myWords = req.body.transcript.words;
   var transcript = '';
   for (var i = 0; i < myWords.length; i++) {
       transcript = transcript.concat(myWords[i].w + ' ');
   }

   //   FORMATTING AND CLEANING UP OUR TRANSCRIPT
   var resultTranscript = format.format(transcript);

   //   Configure RingCentral API call to get groups.
   var config = {
            headers: {
              'Authorization': process.env.RC_BEARER
            }
   };
   //   RingCentral API Call: Fetch Teams
   axios.get('https://platform.devtest.ringcentral.com/restapi/v1.0/glip/groups?type=Team', config)
            .then(resp) => {
              console.log('FETCHING GLIP GROUP');
              var postToThisGroupId = resp.data.records[0].id;
              //    RingCentral API Call: Post to the first Team retrieved
              axios({
                    method: 'post',
                    url: 'https://platform.devtest.ringcentral.com/restapi/v1.0/glip/posts',
                    data: {
                        groupId: postToThisGroupId,
                        text: resultTranscript
                    },
                    headers: {
                          'Authorization' : process.env.RC_BEARER
                        }
            });
   });
});

// Callback method received after subscribing to webhook
app.post('/callback', (req, res) => {
    var validationToken = req.get('Validation-Token');
    var body =[];

    if (validationToken) {
        console.log('Responding to RingCentral as last leg to create new Webhook');
        res.setHeader('Validation-Token', validationToken);
        res.statusCode = 200;
        res.end();
    } else {
        var bodyObj = req.body;
        if (bodyObj.body.attachments) {

            var fileLocation = bodyObj.body.attachments[0].contentUri;
            console.log(`FILE RECEIVED, STORED AT: ${fileLocation}`);

            request(
             {
                 method: 'POST',
                 url: 'https://apis.voicebase.com/v3/media',
                 headers:
                     {
                         contentType: 'multipart/form-data',
                         accept: 'application/json',
                         authorization: process.env.VOICEBASE_BEARER
                     },
                 formData: {
                    mediaUrl: fileLocation,
                    configuration: `{'speechModel': {'language': 'en-US'}, 'publish': {'callbacks': [{'url': 'https://ebf95d80.ngrok.io/voicebase/callback', 'method': 'POST', 'include': ['transcript', 'knowledge', 'metadata', 'prediction', 'streams', 'spotting']}, {'url': 'https://requestb.in/1hj21511', 'method': 'POST', 'include' : ['transcript', 'knowledge', 'metadata', 'prediction', 'streams', 'spotting']}]}, 'prediction': {'detectors': []}, 'transcript': {'formatting': {'enableNumberFormatting': true}, 'contentFiltering': {'enableProfanityFiltering': true}}, 'vocabularies': [{'terms': [{'term': 'Sam', 'weight': 1, 'soundsLike': ['Send, Sam']}, {'term': 'Xander', 'weight': 0, 'soundsLike': ['Zander']}]}], 'knowledge': {'enableDiscovery': true, 'enableExternalDataSources': true}, 'priority': 'normal', 'spotting': {'groups': [{'groupName': 'TeamMeetings'}]}}`
                 }
             }, (error, response, body) => {
                 if (error) {
                     console.log(error);
                 } else {
                     console.log(body);
                 }
             });

        }
        else {
            console.log(`MESSAGE RECEIVED: ${bodyObj}`);
        }
        res.statusCode = 200;
        res.end('END');
        if (bodyObj.event == '/restapi/v1.0/subscription/~?threshold=60&interval=15') {
                renewSubscription(bodyObj.subscriptionId);
        }
    }
});

// Method to Subscribe to Glip Events.
function subscribeToGlipEvents(token) {

    var requestData = {
        'eventFilters': [
            '/restapi/v1.0/glip/posts',
            '/restapi/v1.0/glip/groups',
            '/restapi/v1.0/subscription/~?threshold=60&interval=15'
        ],
        'deliveryMode': {
            'transportType': 'WebHook',
            'address': `${REDIRECT_HOST}/callback`
        },
        'expiresIn': 604799
    };
    platform.post('/subscription', requestData)
        .then(subscriptionResponse => {
            console.log(`Subscription Response: ${subscriptionResponse.json()}`);
            subscription = subscriptionResponse;
            subscriptionId = subscriptionResponse.id;
        }).catch(e => {
            console.error(e);
            throw e;
    });
}

function renewSubscription(id) {
    console.log('Renewing Subscription');
    platform.post(`/subscription/${id}/renew`)
        .then(response => {
            var data = JSON.parse(response.text());
            subscriptionId = data.id;
            console.log(`Subscription renewal successful. Next renewal scheduled for: ${data.expirationTime}`);
        }).catch(e => {
            console.error(e);
            throw e;
        });
}
