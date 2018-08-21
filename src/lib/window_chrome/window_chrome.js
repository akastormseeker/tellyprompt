
createWindowTitleBar(true);

function setTitleBarColor(background, foreground) {
  
}

// build window "chrome" elements
function createWindowTitleBar(withButtons) {
  var html = "<div id=\"window-titlebar\" class=\"ui-titlebar\">";
  html += "<span class=\"ui-titlebar-title\">" + document.title + "</span>";
  html += "</div>";
  
  $("body").append(html);
  
  // listen for changes to document title && update title bar text
  var observer = new MutationObserver(function(mutations) {
   $(".ui-titlebar .ui-titlebar-title").html($("title").html());
  }).observe(
      document.querySelector('title'),
      { subtree: true, characterData: true }
  );
  
  $(window).on("focus", function() {
    $("body").addClass("window-focused");
  }).on("blur", function() {
    $("body").removeClass("window-focused");
  });

  
  $("#window-titlebar").on({
    "mouseenter": function() {
      $("#window-titlebar").addClass("hover");
    },
    "mouseleave": function() {
      $("#window-titlebar").removeClass("hover");
    }
  });

  $(window).on("mousemove", function(ev) {
    console.log("mousemove: " + ev.clientX + ", " + ev.clientY);
  });
  $(window).on("mouseleave", function(ev) {
    console.log("window.mouseleave");
  });
  $(window).on("mouseenter", function(ev) {
    console.log("window.mouseenter");
  });
  
  chrome.runtime.getPlatformInfo(function(platformInfo) {
    //console.log("Detected platform: ", platformInfo);
    $("body").addClass(platformInfo.os);
    //$("body").addClass("mac");
  });
  
  setTimeout(function() {
      if(document.hasFocus()) {
          $("body").addClass("window-focused");
      } else {
          $("body").removeClass("window-focused");
      }
  }, 10);
  
  if(withButtons) createWindowButtons("#window-titlebar");
}

function createWindowButtons(titlebar) {
  var html = "<div class=\"ui-window-buttons\">";
  html += "<button class=\"ui-window-button wb-fullscreen\" title=\"Enter Fullscreen\"><svg width=\"12\" height=\"12\"><path d=\"M0,0 L5,0 L5,1 L2,1 L5,4 L4,5 L1,2 L1,5 L0,5 Z M12,0 L7,0 L7,1 L10,1 L7,4 L8,5 L11,2 L11,5 L12,5 Z M12,12 L7,12 L7,11 L10,11 L7,8 L8,7 L11,10 L11,7 L12,7 Z M0,12 L5,12 L5,11 L2,11 L5,8 L4,7 L1,10 L1,7 L0,7 Z\" /></svg></button>";
  html += "<button class=\"ui-window-button wb-minimize\" title=\"Minimize\"><svg width=\"10\" height=\"10\"><path d=\"M0.5,5.5 L9.5,5.5\" /></svg></button>";
  html += "<button class=\"ui-window-button wb-unfullscreen\" title=\"Leave Fullscreen\"><svg width=\"12\" height=\"12\"><path d=\"M7,7 L12,7 L12,8 L9,8 L12,11 L11,12 L8,9 L8,12 L7,12 Z M5,7 L0,7 L0,8 L3,8 L0,11 L1,12 L4,9 L4,12 L5,12 Z M5,5 L0,5 L0,4 L3,4 L0,1 L1,0 L4,3 L4,0 L5,0 Z M7,5 L12,5 L12,4 L9,4 L12,1 L11,0 L8,3 L8,0 L7,0 Z\" /></svg></button>";
  html += "<button class=\"ui-window-button wb-restore\" title=\"Restore\"><svg width=\"10\" height=\"10\"><path d=\"M0.5,2.5 L7.5,2.5 L7.5,9.5 L0.5,9.5 Z M2.5,2.5 L2.5,0.5 L9.5,0.5 L9.5,7.5 L7.5,7.5\" /></svg></button>";
  html += "<button class=\"ui-window-button wb-maximize\" title=\"Maximize\"><svg width=\"10\" height=\"10\"><path d=\"M0.5,0.5 L0.5,9.5 L9.5,9.5 L9.5,0.5 Z\" /></svg></button>";
  html += "<button class=\"ui-window-button wb-close\" title=\"Close Window\"><svg width=\"10\" height=\"10\"><path d=\"M0,0 L10,10 M10,0 L0,10\" /></svg></button>";
  html += "</div>";
  
  $(titlebar).append(html);
  
  var syncButtonState = function() {
    
    var allowFS = $("body").data("allowfullscreen");
    if(typeof allowFS === 'undefined') {
      allowFS = false;
    }
    if(allowFS !== true && allowFS !== false) {
      if(allowFS === "true" || allowFS === "yes" || allowFS === "1" || allowFS !== 0) allowFS = true;
      else allowFS = false;
    }
    
    var disableClose = $("body").data("disableclose");
    if(typeof disableClose === 'undefined') {
      disableClose = false;
    }
    if(disableClose !== true && disableClose !== false) {
      if(disableClose === "true" || disableClose === "yes" || disableClose === "1" || disableClose !== 0) disableClose = true;
      else disableClose = false;
    }
    
    
    
    var wnd = chrome.app.window.current();
    if(!allowFS) {
      $(".ui-window-buttons .wb-fullscreen").hide();
      $(".ui-window-buttons .wb-unfullscreen").hide(); 
    } else {
      if(wnd.isFullscreen()) {
        $(".ui-window-buttons .wb-fullscreen").hide();
        $(".ui-window-buttons .wb-unfullscreen").show();
        $(".ui-window-buttons .wb-restore").hide(); //.prop("disabled", true);
        $(".ui-window-buttons .wb-maximize").hide(); //.prop("disabled", true);
        $("body").addClass("fullscreen");
      } else {
        $(".ui-window-buttons .wb-fullscreen").show();
        $(".ui-window-buttons .wb-unfullscreen").hide();
        //$(".ui-window-buttons .wb-restore").show(); //.prop("disabled", false);
        //$(".ui-window-buttons .wb-maximize").show(); //.prop("disabled", false);
        $("body").removeClass("fullscreen");
      }
    }
    
    if(wnd.isMaximized()) {
      $(".ui-window-buttons .wb-minimize").show();
      $(".ui-window-buttons .wb-restore").show();
      $(".ui-window-buttons .wb-maximize").hide();
      $("body").addClass("maximized");
    }
    else if(wnd.isMinimized()) {
      $(".ui-window-buttons .wb-minimize").hide();
      $(".ui-window-buttons .wb-restore").show();
      $(".ui-window-buttons .wb-maximize").show();
      $("body").removeClass("maximized");
    }
    else {
      $(".ui-window-buttons .wb-minimize").show();
      $(".ui-window-buttons .wb-restore").hide();
      if(!wnd.isFullscreen()) $(".ui-window-buttons .wb-maximize").show();
      $("body").removeClass("maximized");
    }
    
    $(".ui-window-buttons .wb-close").prop('disabled', disableClose);
  };
  
  chrome.app.window.current().onFullscreened.addListener(function() { syncButtonState(); });
  chrome.app.window.current().onRestored.addListener(function() { syncButtonState(); });
  chrome.app.window.current().onMaximized.addListener(function() { syncButtonState(); });
  chrome.app.window.current().onMinimized.addListener(function() { syncButtonState(); });
  
  $(".ui-window-buttons .wb-minimize").on("click", function() {
    chrome.app.window.current().minimize();
  });
  $(".ui-window-buttons .wb-close").on("click", function() {
    chrome.app.window.current().close();
  });
  $(".ui-window-buttons .wb-maximize").on("click", function() {
    chrome.app.window.current().maximize();
  });
  $(".ui-window-buttons .wb-restore").on("click", function() {
    chrome.app.window.current().restore();
  });
  $(".ui-window-buttons .wb-fullscreen").on("click", function() {
    chrome.app.window.current().fullscreen();
  });
  $(".ui-window-buttons .wb-unfullscreen").on("click", function() {
    chrome.app.window.current().restore();
  });
  
  syncButtonState();
}

