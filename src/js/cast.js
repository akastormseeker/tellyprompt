window['__onGCastApiAvailable'] = function(isAvailable) {
    if (isAvailable) {
        initializeCastApi();
    }
};

function initializeCastApi() {
    console.log("Initializing Google Cast API...");

    cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: "C5CCCF82",
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });
}