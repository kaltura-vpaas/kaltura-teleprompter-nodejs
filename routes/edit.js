var express = require('express');
var router = express.Router();
var kaltura = require('kaltura-client');

router.get('/', function (req, res, next) {
  const config = new kaltura.Configuration();
  config.serviceUrl = process.env.KALTURA_SERVICE_URL;
  const client = new kaltura.Client(config);
  const apiSecret = process.env.KALTURA_ADMIN_SECRET;
  const partnerId = process.env.KALTURA_PARTNER_ID;
  const expiry = 86400;
  const uiConfId = process.env.KALTURA_PLAYER_ID;

  const entryId = req.query.entryId;
  
  //const entryId = "1_5qzo3cc7";
  const userId = "USER ID"
  const userDisplayName = "DISPLAY NAME"

  // Create an ADMIN Kaltura session, to get the editor user role ID, or create one if doesn't already exist -
  let userRoleId = null;
  let ksType = kaltura.enums.SessionType.ADMIN;
  kaltura.services.session.start(apiSecret, userId, ksType, partnerId, expiry)
    .execute(client)
    .then(result => {
      client.setKs(result);
      // use the ADMIN KS to retrieve the ID of the editor app special user role (in order to update the referenceId field):
      let filter = new kaltura.objects.UserRoleFilter();
      filter.systemNameEqual = "kalturaEditorClipRole";
      let pager = new kaltura.objects.FilterPager();
      kaltura.services.userRole.listAction(filter, pager)
        .execute(client)
        .then(result => {
          if (result.totalCount > 0) {
            // if the role exists, render the editor:
            userRoleId = result.objects[0].id;
            renderEditorApp(res, client, config.serviceUrl, entryId, uiConfId, userDisplayName, apiSecret, userId, partnerId, expiry, userRoleId);
          } else {
            // if the role does not exists, create it:
            let userRole = new kaltura.objects.UserRole();
            userRole.systemName = "kalturaEditorClipRole";
            userRole.tags = "kalturaEditorClipRole";
            userRole.status = kaltura.enums.UserRoleStatus.ACTIVE;
            userRole.permissionNames = "BASE_USER_SESSION_PERMISSION,CONTENT_INGEST_REFERENCE_MODIFY,CONTENT_INGEST_CLIP_MEDIA";
            userRole.name = "Kaltura Editor Clip Role";
            userRole.description = "User role to be used with the Kaltura Editor App providing basic user permissions with referenceId setting permission";
            kaltura.services.userRole.add(userRole)
              .execute(client)
              .then(result => {
                //once we have a user role, render the editor:
                userRoleId = result.id;
                renderEditorApp(res, client, config.serviceUrl, entryId, uiConfId, userDisplayName, apiSecret, userId, partnerId, expiry, userRoleId);
              });
          }
        });
    });
});


/*
* Generate a USER KS with the editor role and edit/view permissions, 
* and render the editor app
*/
function renderEditorApp(res, client, serviceUrl, entryId,
  uiConfId, userDisplayName, apiSecret, userId, partnerId, expiry, userRole) {

  let ksType = kaltura.enums.SessionType.USER;
  const privileges = "edit:" + entryId + ",sview:" + entryId + ",setrole:" + userRole;
  // Get a USER Kaltura Session -
  kaltura.services.session.start(apiSecret, userId, ksType, partnerId, expiry, privileges)
    .execute(client)
    .then(result => {
      client.setKs(result);
      // Render the editor iframe
      let editorUrl = "//cdnapisec.kaltura.com/apps/kea/latest/index.html";
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.render('edit', {
        editorUrl: editorUrl,
        partnerId: partnerId,
        ks: result,
        entryId: entryId,
        uiConfId: uiConfId,
        userDisplayName: userDisplayName,
        serviceUrl: serviceUrl
      }
      );
    });
}

module.exports = router;