var express = require('express');
var router = express.Router();
const kaltura = require('kaltura-client');
var KalturaClientFactory = require('../lib/kalturaClientFactory');

/* GET home page. */
router.get('/', async function (req, res, next) {
  try {
    //you probably want to make an api call with client, see https://developer.kaltura.com/
    var adminks = await KalturaClientFactory.getKS('', { type: kaltura.enums.SessionType.ADMIN });
    var client = await KalturaClientFactory.getClient(adminks);

    res.render('index', { 
      title: 'Kaltura Node Template',
      ks:adminks
    });

  } catch (e) {
    res.render('error', { message: e, error: e });
  }
});

module.exports = router;