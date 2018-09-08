
var mirrorHoriz = false;
var mirrorVert = false;

var windowBounds = null;
var markerPosition = .5;

var firstConfigReceived = false;
const context = cast.framework.CastReceiverContext.getInstance();

const CONTROL_CHANNEL = 'urn:x-cast:akastormseeker.tellyprompt';
context.addCustomMessageListener(CONTROL_CHANNEL, function(event) {
  console.log("Message Received: ", event);
  var msg = event.data;

  if(msg.hasOwnProperty("cmd")) {
    if(msg.cmd == "heartbeat") {
      console.log("heartbeat received.");
    }
    else if(msg.cmd == "config") {
      console.log("config received.", msg.data);
      if(!firstConfigReceived) {
        fadeOutLogo(2000);
        firstConfigReceived = true;
      }
      processConfigData(msg.data);
        
    }
    else if(msg.cmd == "scrollSync") {
      //console.log("scrollSync received");
      scrollToPercent(msg.value);
    }
    else {
      console.log("Unhandled message: ", msg);
    }
  }
});

context.addEventListener(cast.framework.system.EventType.READY, () => {
    //fadeOutLogo(2000);
});
        
function fadeOutLogo(fadeTime) {
    var startTime = Date.now();
    var elem = document.getElementById("logo");
    
    function doFadeStep() {
        var stepTime = Date.now();
        var timeMillis = stepTime - startTime;
        //lastStepTime = stepTime;
        var progress = Math.max(0.0, Math.min(1.0, timeMillis / fadeTime));
        var opacity = 1.0 - progress;
        elem.style.opacity = opacity;
        
        if(progress < 1.0) {
            setTimeout(doFadeStep, 10);
        }
    }
    
    doFadeStep();
}

const options = new cast.framework.CastReceiverOptions();
options.maxInactivity = 3600; //Development only
context.start(options);


function toRgbaString(hexColor, alpha) {
  var shorthandRegex = /^#?([0-9A-F])([0-9A-F])([0-9A-F])$/i;
  hexColor = hexColor.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });
  var match = hexColor.match(/^#?([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i);
  if(match) {
    return "rgba(" + parseInt(match[1], 16) + "," + parseInt(match[2], 16) + "," + parseInt(match[3], 16) + "," + alpha + ")";
  }
  return hexColor;
}

var resizeWindow = function(bounds) {
  windowBounds = bounds;
};

$(document).ready(function() {
  /*
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    
  });
  */
  
  $(window).resize();
});

function processConfigData(changes) {
  for (var key in changes) {
    var value = changes[key];
    if(key == "contentText") {
      $("#content").html(value);
    }
    else if(key == 'textDirection') {
      $("#content").attr('dir', value);
    }
    else if(key == 'displayFontSize') {
      $("#content").css('font-size', value + "pt");
    }
    else if(key == 'mirrorHoriz') {
      mirrorHoriz = value;
      updateMirroring();
    }
    else if(key == 'mirrorVert') {
      mirrorVert = value;
      updateMirroring();
    }
    else if(key == 'marginsHoriz') {
      $("#text").css("padding-left", value + "px")
        .css("padding-right", value + "px");
    }
    else if(key == 'displayBackgroundColor') {
      $("body").css('background-color', value);
      $("#topGradient").css('background', 'linear-gradient(to bottom, ' + toRgbaString(value, 1) + ' 0%,' + toRgbaString(value, 0) + ' 100%)');
      $("#bottomGradient").css('background', 'linear-gradient(to bottom, ' + toRgbaString(value, 0) + ' 0%,' + toRgbaString(value, 1) + ' 100%)');
    }
    else if(key == 'displayTextColor') {
      $("#content").css('color', value);
    }
    else if(key == 'centerMarkerVisible') {
      $("#screenMarker").toggle(value);
    }
    else if(key == 'centerMarkerOpacity') {
      $("#screenMarker").css('opacity', value);
    }
    else if(key == 'centerMarkerPosition') {
      $("#screenMarker").css("top", value + "%");
      markerPosition = value / 100.0;
      updateMargins();
    }
    else if(key == 'centerMarkerLineThickness') {
      $("#screenMarker svg line").css("strokeWidth", value + "px");
    }
    else if(key == 'centerMarkerColor') {
      $("#screenMarker svg line").css("stroke", value);
      $("#screenMarker svg path").css("fill", value);
    }
  } 
}

var updateMirroring = function() {
  $("#text").css("transform", "scale(" + (mirrorHoriz ? "-1" : "1") + ", " + (mirrorVert ? "-1" : "1") + ")");
};

var syncMessageListener = function(msg) {
  if(msg.cmd == "scrollSync") {
    scrollToPercent(msg.value);
  }
};

var scrollToPercent = function(percent) {
  var scrollHeight = $("#text")[0].scrollHeight;
  var divHeight = $("#text").height();
  var scrollBottom = scrollHeight - divHeight;
  var scrollTop = scrollBottom * percent;
  $("#text").scrollTop(scrollTop);
};

var updateMargins = function() {
  var topMargin = $(window).height() * markerPosition;
  var bottomMargin = $(window).height() * (1.0 - markerPosition);
  
  $("#content").css("margin-top", topMargin + "px");
  $("#content").css("margin-bottom", bottomMargin + "px");
}


$(window).on("resize", function() {
  $("#text").css("height", $(window).height());
  
  var fontSize = parseFloat($("#content").css("fontSize"));
  var lineHeight = fontSize * 1.3;
  
  updateMargins();
  
  
  //updateProgressBar();
  
  //if(syncPort !== null) syncPort.postMessage({"cmd": "resizeContent", "value": { "height": $("#content").height(), "width": $("#content").width() } });
}).resize();


