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
    });

    gCastInitialized = true;
}

function getCastSession() {
    if(!gCastInitialized) {
        console.log("google cast not initialized!");
        return null;
    }

    return cast.framework.CastContext.getInstance().getCurrentSession();
}

function castMessage(msg) {
    var session = getCastSession();
    if(session == null) return;

    session.sendMessage(CONTROL_CHANNEL, msg);
}