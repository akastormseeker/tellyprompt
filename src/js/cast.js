window['__onGCastApiAvailable'] = function(isAvailable) {
    if (isAvailable) {
        initializeCastApi();
    }
};

const CONTROL_CHANNEL = 'urn:x-cast:akastormseeker.tellyprompt';

var gCastInitialized = false;

function initializeCastApi() {
    console.log("Initializing Google Cast API...");

    cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: "C5CCCF82",
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });

    cast.framework.CastContext.getInstance().addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, (event) => {
        console.log("Cast State Changed", event);
    });
    cast.framework.CastContext.getInstance().addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (event) => {
        console.log("Session State Changed", event);

        if(event.sessionState == "SESSION_STARTED") {
            sendReceiverConfigurationMessage();
            monitorConfigurationChanges();
            startHeartbeat();
        }
        else if(event.sessionState == "SESSION_ENDING") {
            stopMonitoringConfigChanges();
            stopHeartbeat();
        }
    });

    gCastInitialized = true;
}

function getCastSession() {
    if(!gCastInitialized) {
        return null;
    }

    return cast.framework.CastContext.getInstance().getCurrentSession();
}

function castMessage(msg) {
    var session = getCastSession();
    if(session == null) return;

    session.sendMessage(CONTROL_CHANNEL, msg);
}

var isHeartbeating = false;
var heartbeatInterval = null;
function startHeartbeat() {
    if(isHeartbeating) return;
    heartbeatInterval = setInterval(function() {
        castMessage({cmd: "heartbeat"});
    }, 30000);
    isHeartbeating = true;
}
function stopHeartbeat() {
    if(!isHeartbeating) return;
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    isHeartbeating = false;
}

function sendConfigMessage(data) {
    var msg = {
        cmd: "config",
        data: data
    }
    castMessage(msg);
}

function sendReceiverConfigurationMessage() {
    chrome.storage.local.get(['mirrorHoriz', 'mirrorVert', 'contentText', 'textDirection', 'displayFontSize', 'displayTextColor', 'displayBackgroundColor', 'marginsHoriz'], function(items) {
        sendConfigMessage(items);
    });
}

var isMonitoringConfigChanges = false;
function monitorConfigurationChanges() {
    if(isMonitoringConfigChanges) return;
    isMonitoringConfigChanges = true;
}
function stopMonitoringConfigChanges() {
    if(!isMonitoringConfigChanges) return;
    isMonitoringConfigChanges = false;
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
    config = {};

    for (var key in changes) {
      config[key] = changes[key].newValue;
    }

    if(isMonitoringConfigChanges) {
        sendConfigMessage(config);
    }
  });