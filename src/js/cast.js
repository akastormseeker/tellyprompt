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

function sendReceiverConfigurationMessage() {
    var cfgMsg = {
        cmd: "config",
        data: {}
    };

    chrome.storage.local.get(['mirrorHoriz', 'mirrorVert', 'contentText', 'textDirection', 'displayFontSize', 'displayTextColor', 'displayBackgroundColor', 'marginsHoriz'], function(items) {
        cfgMsg.data = items;
        castMessage(cfgMsg);
    });
}