# Kaltura Teleprompter
A proof of concept that overlays a teleprompter on top of the [Kaltura Express Recorder]( https://github.com/kaltura-vpaas/express-recorder). The Kaltura [Editor](https://github.com/kaltura-vpaas/kaltura-editor-app-embed) is then implemented to allow recordings to be trimmed. 



## Requirements:

1. [Nodejs](https://nodejs.org/en/)
2. [Kaltura VPaaS account](https://corp.kaltura.com/video-paas/registration?utm_campaign=Meetabout&utm_medium=affiliates&utm_source=GitHub)

## Getting Started:

1. Copy env.template to .env and fill in your information
2. Run: npm install
3. For developement run: npm run dev   
4. Or, for production run: npm start

## Underneath the hood

### High Level Application Architecture

Kaltura Teleprompter is built on [Node.js](https://nodejs.org/) and development began by forking the [Kaltura Node.js Template](https://github.com/kaltura-vpaas/kaltura-nodejs-template) 

Essentially, the teleprompter recording UI is a mashup of two projects, the javascript based [Kaltura Express Recorder API](https://github.com/kaltura-vpaas/express-recorder)  and https://github.com/manifestinteractive/teleprompter. Event listeners from the Express Recorder are used to synchronize the start time of the teleprompter and the recorder.

The second part of the application is an implementation of the javascript Kaltura [Editor](https://github.com/kaltura-vpaas/kaltura-editor-app-embed) API, and its event listeners are used to provide reliable download links and a confusion-free user experience.

You may be wondering why a Node.js app is even necessary given that 99% of this application is written in javascript. The answer is that your API keys should be kept secret so no one can access the Kaltura API as you. These API keys are stored server-side in `.env` and time sensitive strings known as `ks` represent a session identifier for each user and are generated and passed to the UI allowing secure identification of the user.  

### Brief API Walkthrough of video from creation to sharing

#### Recording and uploading

When you first record a video with the javascript Express Recorder, it is saved to the Kaltura Cloud as a `MediaEntry` which you can access as a developer from the [KMC](https://kmc.kaltura.com/index.php/kmcng/login) once recording is finished. Each `MediaEntry` has an `entryId` which is a unique identifier for that video. The `entryId` is returned to the Express Recorder javascript object, and the browser is simply redirected to the editor `routes/edit.js` with the `entryID` in the url. There is also an option to download the video at this point, which is a built-in feature of the Express Recorder

#### Editing

The editor is another standalone javascript based API component. Aside from configuration variables, the editor needs two pieces of information to operate on a given video, the `entryID` that was generated in the previous step, and a `ks` to identify the user. Once editing is complete, the editor's event listeners are implemented to allow the user to download the video

### Recording and Syncing with Teleprompter

When first loading the teleprompter, execution begins in [routes/index.js](https://github.com/kaltura-vpaas/kaltura-teleprompter-nodejs/blob/master/routes/index.js) and a Kaltura session is created via 

```javascript
var adminks = await KalturaClientFactory.getKS('', { type: kaltura.enums.SessionType.ADMIN });
```

The session string is then passed to the UI

```javascript
 res.render('index', { 
      title: 'Kaltura Teleprompter',
      ks:adminks
 });
```

And execution proceeds to [views/index.ejs](https://github.com/kaltura-vpaas/kaltura-teleprompter-nodejs/blob/master/views/index.ejs) 

#### The teleprompter UI

The teleprompter has no knowledge of the recorder and it exists as an `<iframe>` positioned above the the Express Recorder's UI on the page. The source code for the teleprompter lives in [/public/teleprompter-master](https://github.com/kaltura-vpaas/kaltura-teleprompter-nodejs/tree/master/public/teleprompter-master)

When starting and stopping the recorder its event listeners are triggered and then make javascript calls into the iframe. For example, in [views/index.ejs](https://github.com/kaltura-vpaas/kaltura-teleprompter-nodejs/blob/master/views/index.ejs#L36)  `start_teleprompter()` is called when the `recordingStarted` of Express Recorder is triggered and  `stop_teleprompter()` is called on `recordingEnded` 

```javascript
           expRec.instance.addEventListener("recordingStarted", function () {
                console.log("STARTED");
                setTimeout(function () {
                    if (!cancelled) {
                        //call into the iframe of the teleprompter and start it
                        //when the Express Recorder has started
                        document.getElementById("teleframe").contentWindow.start_teleprompter();
                    } else {
                        cancelled = false;
                    }
                }, 3000);
            });
            expRec.instance.addEventListener("recordingEnded", function () {
                console.log("ENDED");
                //call into the iframe of the teleprompter and stop it
                //when the Express Recorder has started
                document.getElementById("teleframe").contentWindow.stop_teleprompter();
            });
```

By taking advantage of Kaltura Express Recorder's [event API](https://github.com/kaltura-vpaas/express-recorder) you can create powerful, seamless integrations with the recorder as this project demonstrates.

When the user is satisfied with their recording, they press the "Upload" button on the UI which will upload their video to the Kaltura Cloud as a `MediaEntry`  finally the upload event is triggered in the UI:

```javascript
//when upload of video is complete, redirect user to editor
expRec.instance.addEventListener("mediaUploadEnded", function(event) {
                window.onbeforeunload = null;
                window.location = "edit?entryId="+event.detail.entryId;
 });
```

And it is the `mediaUploadEnded` listener that actually triggers the browser to redirect to the editor. Remember, you can access the uploaded MediaEntry from the [KMC](https://kmc.kaltura.com/index.php/kmcng/login) once it is uploaded.

### The Editor

The second screen of the teleprompter is an implementation of the [Kaltura Editor API component](https://github.com/kaltura-vpaas/kaltura-editor-app-embed) 

From the previous step 

```javascript
    window.location = "edit?entryId="+event.detail.entryId;
```

will route execution to [edit.js](https://github.com/kaltura-vpaas/kaltura-teleprompter-nodejs/blob/master/routes/edit.js) which configures a Kaltura API session and routes execution to [edit.ejs](https://github.com/kaltura-vpaas/kaltura-teleprompter-nodejs/blob/master/views/edit.ejs) 

The editor javascript component is a sophisticated editor capable of many different editing modes like quizzes, hotspots and more. The teleprompter only uses a single editing mode, which is clipping and trimming of videos. 

The editing mode is specified in `tabs` field of the `data` dict used to configure the editor

```javascript
 'tabs': {
            'edit': {
              name: 'edit',
              permissions: ['clip', 'trim'],
              userPermissions: ['clip', 'trim'],
              showOnlyExpandedView: true,
              showSaveButton: true,
              showSaveAsButton: false,
              //preActivateMessage: 'optional: message to show before activating the tab',
              preSaveMessage: 'Correction, please do not close editor',
              //preSaveAsMessage: 'optional: message to show before clipping (Save As)',
            }
          },
```

To allow users to share their edited videos, a share button has been implemented:

```ejs
   <a id="shareBtn" 
 href="https://www.kaltura.com/index.php/extwidget/preview/partner_id/<%=partnerId%>/uiconf_id/<%=uiConfId%>/entry_id/<%=entryId%>/embed/dynamic?">
      <img src="images/share.png"></a>

  <script type="text/javascript">
    //hide share button until we receive a notification entry is processed
    $("#shareBtn").hide();
```



And the share button is initially hidden. If the video was shared before editing is complete, the link would not work, so you need to control when the edited video is shareable or not. 

Just like the Express Recorder, the editor has an extensive event listener interface which you can read more about at [Kaltura Editor API component](https://github.com/kaltura-vpaas/kaltura-editor-app-embed) 

```javascript
 			/* received when a trim action was requested */
      if (postMessageData.messageType === 'kea-trimming-started') {
        $("#shareBtn").hide();
      }

			/* The final notif after entry is finished processing */
      if (postMessageData.messageType === 'kea-editor-tab-loaded') {
        $("#shareBtn").show();
      }
```

The first of two events this application uses is `kea-trimming-started` which fires when the user has begun editing. Once this occurs, the sharebutton must be hidden to prevent an unusable share-link from being used. And when editing has completed,  `kea-editor-tab-loaded` is fired and it is safe to share the video again. 



# How you can help (guidelines for contributors) 
Thank you for helping Kaltura grow! If you'd like to contribute please follow these steps:
* Use the repository issues tracker to report bugs or feature requests
* Read [Contributing Code to the Kaltura Platform](https://github.com/kaltura/platform-install-packages/blob/master/doc/Contributing-to-the-Kaltura-Platform.md)
* Sign the [Kaltura Contributor License Agreement](https://agentcontribs.kaltura.org/)

# Where to get help
* Join the [Kaltura Community Forums](https://forum.kaltura.org/) to ask questions or start discussions
* Read the [Code of conduct](https://forum.kaltura.org/faq) and be patient and respectful

# Get in touch
You can learn more about Kaltura and start a free trial at: http://corp.kaltura.com    
Contact us via Twitter [@Kaltura](https://twitter.com/Kaltura) or email: community@kaltura.com  
We'd love to hear from you!

# License and Copyright Information
All code in this project is released under the [AGPLv3 license](http://www.gnu.org/licenses/agpl-3.0.html) unless a different license for a particular library is specified in the applicable library path.   

Copyright © Kaltura Inc. All rights reserved.   
Authors and contributors: See [GitHub contributors list](https://github.com/kaltura/YOURREPONAME/graphs/contributors).  

### Open Source Libraries Used

https://github.com/manifestinteractive/teleprompter  MIT License