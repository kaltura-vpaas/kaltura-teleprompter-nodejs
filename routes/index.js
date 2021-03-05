var express = require('express');
var router = express.Router();
const kaltura = require('kaltura-client');
const { MediaEntry, BaseEntry } = require('kaltura-client/KalturaModel');
const { EntryStatus } = require('kaltura-client/KalturaTypes');
var KalturaClientFactory = require('../lib/kalturaClientFactory');

/* GET home page. */
router.get('/', async function (req, res, next) {
  try {
    //you probably want to make an api call with client, see https://developer.kaltura.com/
    var adminks = await KalturaClientFactory.getKS('', { type: kaltura.enums.SessionType.ADMIN });

    res.render('index', {
      title: 'Kaltura Teleprompter',
      ks: adminks
    });

  } catch (e) {
    res.render('error', { message: e, error: e });
  }
});

//allow the UI to poll for whent the video is ready
router.get('/status', async function (req, res, next) {
  var adminks = await KalturaClientFactory.getKS('', { type: kaltura.enums.SessionType.ADMIN });
  var client = await KalturaClientFactory.getClient(adminks);
  try {
    kaltura.services.media.get(req.query.entryId)
      .execute(client)
      .then(result => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ready: result.status == EntryStatus.READY }));
      });
  } catch (e) {
    res.render('error', { message: e, error: e });
  }
});

router.get('/share', function (req, res, next) {
  try {
    res.render('share', { 'entryId': req.query.entryId })
  } catch (e) {
    res.render('error', { message: e, error: e });
  }
});


module.exports = router;