/**
 * Listens for the app launching, then creates the window.
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function(launchData) {
  
  var mainWindow = chrome.app.window.create(
    'editor.html',
    {
      id: 'editorWindow',
      frame: 'chrome',
      resizable: true,
      bounds: {width: 800, height: 600}
    },
    function(wnd) {
        wnd.onClosed.addListener(function() {
            //chrome.app.window.get('presenterWindow').close();
            //chrome.app.window.get('displayWindow').close();
            var windows = chrome.app.window.getAll();
            for(var i = 0; i < windows.length; i++) {
                windows[i].close();
            }
        });
    }
  );
  
});

var presenterPort = null;
var displayPort = null;

chrome.runtime.onConnect.addListener(function(port) {
    if(port.name == "presenter-channel"){
      presenterPort = port;
      port.onMessage.addListener(function(msg) {
        console.log("Presenter Message Received: ", msg);
        if(displayPort !== null) {
          displayPort.postMessage(msg);
        }
      });
    }
    else if(port.name == "display-channel") {
      displayPort = port;
      port.onMessage.addListener(function(msg) {
        console.log("Display Message Received: ", msg);
        if(presenterPort !== null) {
          presenterPort.postMessage(msg);
        }
      });
    }
});
