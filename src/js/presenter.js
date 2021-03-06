var displayWindow = null;
var syncPort = null;

var contentScale = 1.0;
var displayContentWidth = 1024-160;
var displayFontSize = 64;

var usePresenter = false;
var presenterOpen = false;
var mirrorHoriz = false;
var mirrorVert = false;
var displayScreenId = null;
var systemDisplays = [];
var haveSettings = false;
var markerPosition = .5;

function postMsg(msg) {
  if(syncPort !== null) {
    syncPort.postMessage(msg);
  }
  castMessage(msg);
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

var getSystemDisplays = function() {
  chrome.system.display.getInfo(function (displays) {
    systemDisplays = displays;
  });
};
getSystemDisplays();

var closePresenterWindow = function() {
    var windows = chrome.app.window.getAll();
    for(var i = 0; i < windows.length; i++) {
        var wid = "" + windows[i].id;
        
        if(wid.startsWith("displayWindow")) {
            windows[i].close();
        }
    }
};

var showPresenterWindow = function() {
    console.log("start showPresenterWindow()...");
    if(systemDisplays.length === 0) {
        console.log("no system displays found. can't show presenter window");
        return;
    }
    if(!haveSettings) {
        console.log("don't have settings. can't show presenter window.");
        return;
    }
    if(!usePresenter) {
        console.log("dual display mode not enabled. can't show presenter window");
        return;
    }

    var disp = findDisplay(displayScreenId);
    console.log("found display id " + displayScreenId + ": ", disp);
    if(usePresenter && systemDisplays.length >= 1) {
        if(disp === null) disp = systemDisplays[systemDisplays.length - 1];

        chrome.app.window.create(
            'display.html',
            {
                id: 'displayWindow' + new Date().getTime(),
                state: 'fullscreen',
                resizable: false,
                focused: false,
                frame: 'none',
                outerBounds: disp.bounds
            },
            function(wnd) {
                presenterOpen = true;
                updateMirroring();
                wnd.fullscreen();
                wnd.onClosed.addListener(function() {
                    //chrome.app.window.current().close();
                    presenterOpen = false;
                    updateMirroring();
                });
            }
        );
    }
};

var findDisplay = function(id) {
    for(var i = 0; i < systemDisplays.length; i++) {
        if(systemDisplays[i].id == id) {
            return systemDisplays[i];
        }
    }
    return null;
};

var updateMirroring = function() {
    $("#text").css("transform", "scale(" + ((!presenterOpen && mirrorHoriz) ? "-1" : "1") + ", " + ((!presenterOpen && mirrorVert) ? "-1" : "1") + ")");
};

function syncButtonState() {
  var wnd = chrome.app.window.current();
  if(wnd.isFullscreen()) {
    $("#windowFullscreen").hide();
    $("#windowUnfullscreen").show();
    $("body").addClass("fullscreen");
  } else {
    $("#windowFullscreen").show();
    $("#windowUnfullscreen").hide();
    $("body").removeClass("fullscreen");
  }
}

$(document).ready(function() {
  
  scrollSpeedHandler();
  
  setTimeout(updateProgressBar, 100);
  
  syncPort = chrome.runtime.connect({ name: "presenter-channel" });
  syncPort.onMessage.addListener(function(msg) {
    syncMessageListener(msg);
  });
  
  chrome.storage.local.get(['disableScroll', 'mirrorHoriz', 'mirrorVert', 'contentText', 'scrollSpeed', 'textDirection', 'displayFontSize', 'displayTextColor', 'displayBackgroundColor', 'marginsHoriz', 'usePresenterView', 'displayScreenId', 'centerMarkerVisible', 'centerMarkerColor', 'centerMarkerOpacity', 'centerMarkerLineThickness', 'centerMarkerPosition'], function(items) {
    if(items.hasOwnProperty('disableScroll')) {
      $("#chkDisableScroll").prop("checked", items['disableScroll']).change();
    }
    if(items.hasOwnProperty('mirrorHoriz')) {
      mirrorHoriz = items['mirrorHoriz'];
    }
    if(items.hasOwnProperty('mirrorVert')) {
      mirrorVert = items['mirrorVert'];
    }
    if(items.hasOwnProperty('marginsHoriz')) {
      $("#text").css("padding-left", items['marginsHoriz'] + "px")
          .css("padding-right", items['marginsHoriz'] + "px");
    }
    if(items.hasOwnProperty('contentText')) {
      $("#content").html(items['contentText']);
    }
    if(items.hasOwnProperty('scrollSpeed')) {
      $("#scrollSpeedSlider").val(items['scrollSpeed']);
      scrollSpeedHandler(false);
    }
    if(items.hasOwnProperty('textDirection')) {
      $("#content").attr('dir', items['textDirection']);
    }
    if(items.hasOwnProperty('displayFontSize')) {
      $("#content").css('font-size', items['displayFontSize'] + "pt");
      displayFontSize = items['displayFontSize'];
      updateMargins();
      updateDisplayScale();
    }
    if(items.hasOwnProperty('displayTextColor')) {
      $("#content").css('color', items['displayTextColor']);
    }
    if(items.hasOwnProperty('displayBackgroundColor')) {
      $("body").css('background-color', items['displayBackgroundColor']);
      $("#topGradient").css('background', 'linear-gradient(to bottom, ' + toRgbaString(items['displayBackgroundColor'], 1) + ' 0%,' + toRgbaString(items['displayBackgroundColor'], 0) + ' 100%)');
      $("#bottomGradient").css('background', 'linear-gradient(to bottom, ' + toRgbaString(items['displayBackgroundColor'], 0) + ' 0%,' + toRgbaString(items['displayBackgroundColor'], 1) + ' 100%)');
    }
    if(items.hasOwnProperty('usePresenterView')) {
      usePresenter = items['usePresenterView'];
    }
    if(items.hasOwnProperty('displayScreenId')) {
      displayScreenId = items['displayScreenId'];
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
    
    haveSettings = true;
    
    updateMirroring();
    syncButtonState();
    
    if(usePresenter) {
      showPresenterWindow();
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
        displayFontSize = storageChange.newValue;
        updateMargins();
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
        $("#content").css('color', storageChange.newValue);
      }
      else if(key == 'usePresenterView' && usePresenter != storageChange.newValue) {
        console.log("usePresenterView changed to ", storageChange.newValue);
        usePresenter = storageChange.newValue;
        updateMirroring();
        if(usePresenter) {
          showPresenterWindow();
        } else {
          closePresenterWindow();
        }
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
  
  displayContentWidth = $("#content").width();

  chrome.app.window.current().onFullscreened.addListener(function() { syncButtonState(); });
  chrome.app.window.current().onRestored.addListener(function() { syncButtonState(); });
  chrome.app.window.current().onMaximized.addListener(function() { syncButtonState(); });
  chrome.app.window.current().onMinimized.addListener(function() { syncButtonState(); });
  
  $("#windowFullscreen").on("click", function() {
    chrome.app.window.current().fullscreen();
  });
  $("#windowUnfullscreen").on("click", function() {
    chrome.app.window.current().restore();
  });

  $(window).resize();
});

chrome.app.window.current().onClosed.addListener(function() {
  closePresenterWindow();
});

var syncMessageListener = function(msg) {
  if(msg.cmd == "closeWindow") {
    //chrome.app.window.current().close();
  }
  else if(msg.cmd == "resizeContent") {
    //console.log("resizeContent", msg.value);
    var w = msg.value.width;
    displayContentWidth = w;
    updateDisplayScale();
  }
  else if(msg.cmd == "toggleScrolling") {
    setScrolling(!isScrolling);
  }
};

var updateDisplayScale = function() {
  var txtW = $("#content").width();
  contentScale = parseFloat(txtW) / displayContentWidth;
  $("#content")
    .css("font-size", (displayFontSize * contentScale) + "pt");
};

var isScrolling = false;
var scrollSpeed = 1;
var lastScroll = 0;
var scrollAccumulator = 0;

var scrollFn = function() {
  var now = Date.now();
  var frameTime = (now - lastScroll) / 1000.0;
  lastScroll = now;
  var fontSize = parseFloat($("#content").css("fontSize"));
  var lineHeight = fontSize * 1.3;
  var scrollAmount = frameTime * scrollSpeed * lineHeight;
  
  var curTop = $("#text").scrollTop();

  var scrollPercent = getScrollPercent();
  console.log(scrollPercent);
  if(scrollPercent >= 1.0) {
    console.log("Cancelling auto-scroll.");
    $("#btnStart").click();
  }

  if(scrollAmount > 0) {
    scrollAccumulator += scrollAmount;
    
    scrollAmount = Math.floor(scrollAccumulator);
    scrollAccumulator -= scrollAmount;
    var newTop = $("#text")[0].scrollTop + scrollAmount;
    $("#text").scrollTop(newTop);
  }

  //setTimeout(function() {
    //if($("#text").scrollTop() != newTop && isScrolling) {
    //  console.log("current top: " + $("#text").scrollTop() + "; newTop: " + newTop);
    //  $("#btnStart").click();
    //} else {
      if(isScrolling) {
        setTimeout(scrollFn, 10);
      }
    //}
  //}, 1);
  
};

function getScrollPercent() {
  var scrollTop = $("#text")[0].scrollTop;
  var scrollHeight = $("#text")[0].scrollHeight;
  var divHeight = $("#text").height();
  var scrollBottom = scrollHeight - divHeight;
  return scrollTop / scrollBottom;
}

var updateProgressBar = function() {
  var scrollPercent = getScrollPercent();
  $("#progressBar_progress").css("width", (scrollPercent * 100) + "%");
  
  sendScrollMessage(scrollPercent);
};

var curScrollPercent = 0;
var lastScrollMessage = 0;
var scrollMessageQueued = false;
function sendScrollMessage(scrollPercent) {
  curScrollPercent = scrollPercent;
  var now = Date.now();
  if(now - lastScrollMessage > 20) {
    lastScrollMessage = now;
    postMsg({ "cmd": "scrollSync", "value": scrollPercent });
  }
  else if(!scrollMessageQueued) {
    scrollMessageQueued = true;
    setTimeout(function() {
      postMsg({ "cmd": "scrollSync", "value": curScrollPercent });
    }, (20 - (now - lastScrollMessage)));
  }
}

chrome.app.window.current().onFullscreened.addListener(function() { setTimeout(updateProgressBar, 100); });
chrome.app.window.current().onRestored.addListener(function() {  setTimeout(updateProgressBar, 100); });
chrome.app.window.current().onMaximized.addListener(function() {  setTimeout(updateProgressBar, 100); });
chrome.app.window.current().onMinimized.addListener(function() {  setTimeout(updateProgressBar, 100); });

$(window).on("resize", function() {
  $("#text").css("height", $(window).height());
  updateMargins();
  updateDisplayScale();
});

var updateMargins = function() {
  var topMargin = $(window).height() * markerPosition;
  var bottomMargin = $(window).height() * (1.0 - markerPosition);
  
  $("#content").css("margin-top", topMargin + "px");
  $("#content").css("margin-bottom", bottomMargin + "px");
  
  updateProgressBar();
};

$(window).on("keydown keyup", function(e) {
  if(e.keyCode == 27 /* ESC */) {
    e.preventDefault();
    chrome.app.window.current().close();
  }
  else if(e.type == "keydown" && (e.keyCode == 32 || e.keyCode == 190)) {
    e.preventDefault();
    setScrolling(!isScrolling);
  }
  else if(e.type == "keydown" && (e.keyCode >= 37 && e.keyCode <= 40)) {
    e.preventDefault();
    var step = 0.01;
    if(e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      step = 0.001;
    } else if(e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
      step = 0.1;
    }
    console.log(((e.keyCode == 37 || e.keyCode == 40) ? "Slow down by " : "Speed up by ") + step);
    
    if(e.keyCode == 37 || e.keyCode == 40) step *= -1;
    
    var curVal = parseFloat($("#scrollSpeedSlider").val());
    curVal += step;
    $("#scrollSpeedSlider").val(curVal);
    
    scrollSpeedHandler(true);
  }
  else {
    //console.log("type=" + e.type + "; code=" + e.keyCode, e);
  }
});

$("#chkDisableScroll").on("change", function() {
  var checked = $(this).prop("checked");
  var doit = checked && isScrolling;
  $("#scrollDisabler").toggle(doit);
  chrome.storage.local.set({'disableScroll': checked});
});

$("#text").on("scroll", updateProgressBar).scroll();
$(".scrollable").on("scroll", updateProgressBar);

$("#btnStart").on("click", function() {
  setScrolling(!isScrolling);
});

var setScrolling = function(scroll) {
  var pathData;
  if(!scroll) {
    isScrolling = false;
    //postMmsg({"cmd": "scroll", "value": isScrolling});
    $("#btnStart .ui-button-text").html("Start");
    $("#btnStart .ui-button-icon").removeClass("red").addClass("green");
    pathData = $("#btnStart .ui-button-icon path").data("play");
    $("#scrollDisabler").hide();
    $("#btnStart .ui-button-icon path").attr("d", pathData);
  } else {
    isScrolling = true;
    //postMsg({"cmd": "scrollSpeed", "value": scrollSpeed });
    //postMsg({"cmd": "scroll", "value": isScrolling});
    $("#btnStart .ui-button-text").html("Stop");
    $("#btnStart .ui-button-icon").removeClass("green").addClass("red");
    pathData = $("#btnStart .ui-button-icon path").data("pause");
    $("#btnStart .ui-button-icon path").attr("d", pathData);
    $("#scrollDisabler").toggle($("#chkDisableScroll").prop("checked"));
    lastScroll = Date.now();
    setTimeout(scrollFn, 10);
  }
};

var scrollSpeedHandler = function(save) {
  var value = $("#scrollSpeedSlider").val();
  if(value > 1) {
    value = 1 + ((value - 1) * 4.0);
  }
  scrollSpeed = value;
  $("#scrollSpeedLabel").text(parseFloat(value).toFixed(3));
  
  if(save) {
    chrome.storage.local.set({"scrollSpeed": value});
  }
  //postMsg({"cmd": "scrollSpeed", "value": scrollSpeed });
};

$("#scrollSpeedSlider")
  .on("input", function() { scrollSpeedHandler(false); })
  .on("change", function() { scrollSpeedHandler(true); });
