
var syncPort = null;

var mirrorHoriz = false;
var mirrorVert = false;

var windowBounds = null;
var markerPosition = .5;

function postMsg(msg) {
  if(syncPort !== null) {
    syncPort.postMessage(msg);
  }
}

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

chrome.app.window.current().onRestored.addListener(function() {
  if(windowBounds !== null) {
    var wnd = chrome.app.window.current();
    wnd.outerBounds.left = windowBounds.left;
    wnd.outerBounds.top = windowBounds.top;
    wnd.outerBounds.width = windowBounds.width;
    wnd.outerBounds.height = windowBounds.height;
    //wnd.fullscreen();
  }
});

var resizeWindow = function(bounds) {
  windowBounds = bounds;
  // trigger onRestored event to set bounds and re-fullscreen the window
  //chrome.app.window.current().restore();
  /*
  if(windowBounds !== null) {
    var wnd = chrome.app.window.current();
    wnd.outerBounds.left = windowBounds.left;
    wnd.outerBounds.top = windowBounds.top;
    wnd.outerBounds.width = windowBounds.width;
    wnd.outerBounds.height = windowBounds.height;
    //wnd.fullscreen();
  }
  */
};

$(document).ready(function() {
  
  syncPort = chrome.runtime.connect({ name: "display-channel" });
  syncPort.onMessage.addListener(function(msg) {
    syncMessageListener(msg);
  });
  
  chrome.storage.local.get(['mirrorHoriz', 'mirrorVert', 'contentText', 'textDirection', 'displayFontSize', 'displayTextColor', 'displayBackgroundColor', 'marginsHoriz', 'displayScreenId'], function(items) {
    if(items.hasOwnProperty('mirrorHoriz')) {
      mirrorHoriz = items['mirrorHoriz'];
      updateMirroring();
    }
    if(items.hasOwnProperty('mirrorVert')) {
      mirrorVert = items['mirrorVert'];
      updateMirroring();
    }
    if(items.hasOwnProperty('marginsHoriz')) {
      $("#text").css("padding-left", items['marginsHoriz'] + "px")
          .css("padding-right", items['marginsHoriz'] + "px");
    }
    if(items.hasOwnProperty('contentText')) {
      $("#content").html(items['contentText']);
    }
    if(items.hasOwnProperty('textDirection')) {
      $("#content").attr('dir', items['textDirection']);
    }
    if(items.hasOwnProperty('displayFontSize')) {
      $("#content").css('font-size', items['displayFontSize'] + "pt");
    }
    if(items.hasOwnProperty('displayTextColor')) {
      $("#content").css('color', items['displayTextColor']);
    }
    if(items.hasOwnProperty('displayBackgroundColor')) {
      $("body").css('background-color', items['displayBackgroundColor']);
      $("#topGradient").css('background', 'linear-gradient(to bottom, ' + toRgbaString(items['displayBackgroundColor'], 1) + ' 0%,' + toRgbaString(items['displayBackgroundColor'], 0) + ' 100%)');
      $("#bottomGradient").css('background', 'linear-gradient(to bottom, ' + toRgbaString(items['displayBackgroundColor'], 0) + ' 0%,' + toRgbaString(items['displayBackgroundColor'], 1) + ' 100%)');
    }
    
    //, 'centerMarkerVisible', 'centerMarkerColor', 'centerMarkerOpacity', 'centerMarkerPosition'
    if(items.hasOwnProperty('centerMarkerVisible')) {
      $("#screenMarker").toggle(items['centerMarkerVisible']);
    }
    if(items.hasOwnProperty('centerMarkerOpacity')) {
      $("#screenMarker").css('opacity', items['centerMarkerVisible']);
    }
    if(items.hasOwnProperty('centerMarkerPosition')) {
      $("#screenMarker").css("top", items['centerMarkerPosition'] + "%");
      markerPosition = items['centerMarkerPosition'] / 100.0;
      updateMargins();
    }
    if(items.hasOwnProperty('centerMarkerLineThickness')) {
      $("#screenMarker svg line").css("strokeWidth", items['centerMarkerLineThickness']);
    }
    if(items.hasOwnProperty('centerMarkerColor')) {
      $("#screenMarker svg line").css("stroke", items['centerMarkerColor']);
      $("#screenMarker svg path").css("fill", items['centerMarkerColor']);
    }
    
    if(items.hasOwnProperty('displayScreenId')) {
      console.log("displayScreenId: ", items['displayScreenId']);
      chrome.system.display.getInfo(function(displays) {
        for(var i = 0; i < displays.length; i++) {
          if(displays[i].id == items['displayScreenId']) {
            console.log("found display with ID ", items['displayScreenId']);
            resizeWindow(displays[i].bounds);
          }
        }
      });
    }
  });
  
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (var key in changes) {
      var storageChange = changes[key];
      if(key == "contentText") {
        $("#content").html(storageChange.newValue);
      }
      else if(key == 'textDirection') {
        $("#content").attr('dir', storageChange.newValue);
      }
      else if(key == 'displayFontSize') {
        $("#content").css('font-size', storageChange.newValue + "pt");
      }
      else if(key == 'mirrorHoriz') {
        mirrorHoriz = storageChange.newValue;
        updateMirroring();
      }
      else if(key == 'mirrorVert') {
        mirrorVert = storageChange.newValue;
        updateMirroring();
      }
      else if(key == 'marginsHoriz') {
        $("#text").css("padding-left", storageChange.newValue + "px")
          .css("padding-right", storageChange.newValue + "px");
      }
      else if(key == 'displayBackgroundColor') {
        $("body").css('background-color', storageChange.newValue);
        $("#topGradient").css('background', 'linear-gradient(to bottom, ' + toRgbaString(storageChange.newValue, 1) + ' 0%,' + toRgbaString(storageChange.newValue, 0) + ' 100%)');
        $("#bottomGradient").css('background', 'linear-gradient(to bottom, ' + toRgbaString(storageChange.newValue, 0) + ' 0%,' + toRgbaString(storageChange.newValue, 1) + ' 100%)');
      }
      else if(key == 'displayTextColor') {
        $("#content").css('color', items['displayTextColor']);
      }
      else if(key == 'centerMarkerVisible') {
        $("#screenMarker").toggle(storageChange.newValue);
      }
      else if(key == 'centerMarkerOpacity') {
        $("#screenMarker").css('opacity', storageChange.newValue);
      }
      else if(key == 'centerMarkerPosition') {
        $("#screenMarker").css("top", storageChange.newValue + "%");
        markerPosition = storageChange.newValue / 100.0;
        updateMargins();
      }
      else if(key == 'centerMarkerLineThickness') {
        $("#screenMarker svg line").css("strokeWidth", storageChange.newValue + "px");
      }
      else if(key == 'centerMarkerColor') {
        $("#screenMarker svg line").css("stroke", storageChange.newValue);
        $("#screenMarker svg path").css("fill", storageChange.newValue);
      }
    }
  });
  
  $(window).resize();
});

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
  
  if(syncPort !== null) syncPort.postMessage({"cmd": "resizeContent", "value": { "height": $("#content").height(), "width": $("#content").width() } });
}).resize();

$(window).on("keydown keyup", function(e) {
  if(e.keyCode == 27 /* ESC */) {
    e.preventDefault();
    postMsg({"cmd": "closeWindow"});
  }
  else if(e.type == "keydown" && e.keyCode == 32 /* Space */) {
    e.preventDefault();
    postMsg({"cmd": "toggleScrolling"});
  }
});


