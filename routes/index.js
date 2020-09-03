const fs = require('fs')
var express = require('express');
var uniqid = require('uniqid');
var router = express.Router();

const dotenv = require("dotenv");
dotenv.config();

// CLOUDINARY
var cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// AI AZURE FACE
const request = require('sync-request');
const subscriptionKey = process.env.AZURE_SUBSCRIPTION_KEY;
const uriBase = process.env.AZURE_URI;
const params = {
  'returnFaceId': 'true',
  'returnFaceLandmarks': 'false',
  'returnFaceAttributes': 'age,gender,headPose,smile,facialHair,glasses,' +
      'emotion,hair,makeup,occlusion,accessories,blur,exposure,noise'
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* POST upload photo */
router.post('/upload', async function(req, res, next) {

  var pictureName = './tmp/'+uniqid()+'.jpg';
  var resultCopy = await req.files.photo.mv(pictureName);
  var resultCloudinary = await cloudinary.uploader.upload(pictureName, {folder:"faceup"});

  const options = {
    qs: params,
    body: '{"url": ' + '"' + resultCloudinary.secure_url + '"}',
    headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key' : subscriptionKey
    }
  };
  var resultAI = request('POST', uriBase, options);
  let resultVision = JSON.parse(resultAI.getBody());

  var gender = undefined;
  var age = undefined;
  var glasses = undefined;
  var beard = undefined;
  var smile = undefined;
  var hairColor = undefined

  if(resultVision[0] !== undefined) {
    gender = resultVision[0].faceAttributes.gender;
    age = resultVision[0].faceAttributes.age;

    if(resultVision[0].faceAttributes.glasses === "NoGlasses") {
      glasses = "no glasses";
    } else {
      glasses = "glasses";
    }

    if(resultVision[0].faceAttributes.facialHair.beard < 0.5) {
      beard = "no beard";
    } else {
      beard = "beard";
    }

    if(resultVision[0].faceAttributes.smile < 0.7) {
      smile = "no smile";
    } else {
      smile = "smile";
    }

    if(resultVision[0].faceAttributes.hair.hairColor[0].color === "blond") {
      hairColor = "blond hair";
    } else if(resultVision[0].faceAttributes.hair.hairColor[0].color === "brown") {
      hairColor = "brown hair";
    } else if(resultVision[0].faceAttributes.hair.hairColor[0].color === "black") {
      hairColor = "black hair";
    } else if(resultVision[0].faceAttributes.hair.hairColor[0].color === "red") {
      hairColor = "red hair";
    } else if(resultVision[0].faceAttributes.hair.hairColor[0].color === "gray") {
      hairColor = "gray hair";
    } else if(resultVision[0].faceAttributes.hair.hairColor[0].color === "other") {
      hairColor = "other color hair";
    }

  }

  if(!resultCopy) {
    res.json({url: resultCloudinary.url, attributes: {gender: gender, age: age, glasses: glasses, beard: beard, smile: smile, hairColor: hairColor}} );       
  } else {
    res.json({error: resultCopy} );
  }
  fs.unlinkSync(pictureName);
  
});




module.exports = router;
