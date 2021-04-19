# Kaltura Teleprompter
A proof of concept that overlays a teleprompter on top of the [Kaltura Express Recorder]( https://github.com/kaltura-vpaas/express-recorder). The Kaltura [Editor](https://github.com/kaltura-vpaas/kaltura-editor-app-embed) is then implemented to allow recordings to be trimmed. 

# Demo App: 
https://kaltura-teleprompter.herokuapp.com/

# Video Walkthrough of code:
http://www.kaltura.com/tiny/qag4h

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
   				  //when upload of video is complete, redirect user to share
            expRec.instance.addEventListener("mediaUploadEnded", function(event) {
                window.onbeforeunload = null;
                window.location = "/share?entryId="+event.detail.entryId;
            });
```

And it is the `mediaUploadEnded` listener that actually triggers the browser to redirect to the share page. Remember, you can access the uploaded MediaEntry from the [KMC](https://kmc.kaltura.com/index.php/kmcng/login) once it is uploaded.

### Sharing The Video

The sharing page is based off https://developer.kaltura.com/player. But before the player is shown, the video must be ready for sharing. 

In [views/share.ejs](https://github.com/kaltura-vpaas/kaltura-teleprompter-nodejs/blob/master/views/share.ejs) 

```javascript
  			function poll() {
            $.getJSON("/status?entryId=<%=entryId%>", function (data) {
                if (data['ready']) {
                    //show player
                } else {
                    setTimeout(poll, 3000);
                }
            }
        }
        poll();
```

the `/status` method in [routes/index.js](https://github.com/kaltura-vpaas/kaltura-teleprompter-nodejs/blob/master/routes/index.js) is polled, recursively every 3 seconds until the video is ready. 

And when the video is ready, it is displayed:

```javascript
 								if (data['ready']) {
                    $("#spinner").hide();
                    try {
                        var player = KalturaPlayer.setup({
                            targetId: "kaltura-player",
                            provider: {
                                partnerId: <%= process.env.KALTURA_PARTNER_ID %>,
                                uiConfId: <%= process.env.KALTURA_RECPLAYER_ID %>
                            }
                        });
                        //load first entry in player
                        player.loadMedia({ entryId: '<%= entryId%>' });
```



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
