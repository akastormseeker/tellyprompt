
var mirrorHoriz = false;
var mirrorVert = false;

var windowBounds = null;
var markerPosition = .5;


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
  */
  
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
  
  //if(syncPort !== null) syncPort.postMessage({"cmd": "resizeContent", "value": { "height": $("#content").height(), "width": $("#content").width() } });
}).resize();


