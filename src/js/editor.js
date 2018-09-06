var count = 0;
$.fn.exists = function () {
    return this.length !== 0;
};

var systemDisplays = [];
var editorIsDirty = false;
var editorFileName = "untitled.txt";
var editorFileId = null;

var helpWindow = null;

var setEditorDirty = function(dirty) {
    editorIsDirty = !!dirty;
    updateWindowTitle();
    
    chrome.storage.local.set({ 
        'editorIsDirty': editorIsDirty
    });
};

var setEditorFile = function(entry) {
    if(entry === null) {
        editorFileId = null;
        editorFileName = "untitled.txt";
    } else {
        editorFileId = chrome.fileSystem.retainEntry(entry);
        editorFileName = entry.name;
    }
    updateWindowTitle();
    
    chrome.storage.local.set({ 
        'editorFileId': editorFileId,
        'editorFileName': editorFileName
    });
}

var updateWindowTitle = function() {
    $("title").html("" + (editorIsDirty ? "&#x25cf;" : "") + editorFileName + " - Editor - TellyPrompt");
    $("#docTitle").html("" + (editorIsDirty ? "&#x25cf;" : "") + editorFileName);
}

var getSystemDisplays = function() {
    chrome.system.display.getInfo(function (displays) {
        var screens = [];
        for(var i = 0; i < displays.length; i++) {
            var display = displays[i];
            if(!display.isEnabled) continue;
            // if the display is mirroring another, ignore it
            if(display.hasOwnProperty('mirroringSourceId') && !!display.mirroringSourceId) continue;
            
            if(!display.name || display.name === "") {
                display.name = "Display " + (i + 1);
            }
            
            screens.push(display);
        }
        systemDisplays = screens;
        if(systemDisplays.length <= 1) {
            //*
            console.log("Only one display detected. Ensuring dual monitor mode is disabled.");
            $("#dualMonitorSettings").prop("disabled", true);
            $("#chkUseDualMonitorView").prop("checked", false);
            chrome.storage.local.set({ 'usePresenterView': false });
            //*/
        } else {
            console.log("Multiple (" + systemDisplays.length + ") displays detected. Enabling dual monitor option in settings.");
            $("#dualMonitorSettings").prop("disabled", false);
        }
        var sel = $("#selectDisplayScreen");
        if(systemDisplays.length >= 1) {
            sel.empty();
            $.each(systemDisplays, function(index, item) {
                console.log(item);
                var opt = $("<option></option>").attr("value", item.id).text((item.isPrimray ? "===" : "") + item.name);
                if(!item.isPrimary) opt.prop("selected", true);
                sel.append(opt);
            });
        }
    });
};
getSystemDisplays();

var newDocument = function() {
    $("#text-editor").val("").change();
    setEditorFile(null);
    setEditorDirty(false);
};

var saveDocument = function(save_as) {
    function saveEntry(entry) {
        return new Promise(function(resolve, reject) {
            var errorHandler = function(e) {
                console.error("Write Error: ", e);
                reject(e);
            };
            entry.createWriter(function(writer) {
                //console.log("file writer: ", entry, writer);
                var blob = new Blob([$("#text-editor").val()], {type: "text/plain"});
                writer.onwriteend = function(e) {
                  console.log("truncate completed.");
                  writer.onwriteend = function(e) {
                      console.log("write completed.");
                      setEditorFile(entry);
                      setEditorDirty(false);
                      resolve();
                  };
                  writer.write(blob);
                };
                
                writer.onerror = function(e) {
                    errorHandler(e);
                };
                
                
                writer.truncate(0);
            }, errorHandler);
        });
    }
    
    function browseForEntry() {
        return new Promise(function(resolve, reject) {
            chrome.fileSystem.chooseEntry({
                "type": "saveFile",
                "suggestedName": editorFileName,
                "accepts": [
                    { "description": "Text Documents", "mimeTypes": [ "text/plain" ] }
                ],
                "acceptsAllTypes": true
            }, function(entry) {
                if(chrome.runtime.lastError) {
                    console.log("Error saving document: ", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(entry);
            });
        });
    }
    
    return new Promise(function(resolve, reject) {
        
        function dontRestore() {
            browseForEntry().then(function(entry) {
                saveEntry(entry).then(function() {
                    resolve();
                },
                function(err) {
                    reject(err);
                });
            },
            function(err) {
                reject(err);
            });
        }
        
        // try to restore file entry, if user isn't forcing a "save as"
        if(!save_as && editorFileId && editorFileId.length > 0) {
            chrome.fileSystem.isRestorable(editorFileId, function(restorable) {
                if(restorable) {
                    chrome.fileSystem.restoreEntry(editorFileId, function(entry) {
                        if(chrome.runtime.lastError) {
                            console.log("Error restoring file entry: ", chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        saveEntry(entry).then(function() {
                            resolve();
                        },
                        function(err) {
                            reject(err);
                        });
                    });
                } else {
                    dontRestore();
                }
            });
        } else {
            dontRestore();
        }
    });
};

var loadDocument = function(success_callback) {
    return new Promise(function(resolve, reject) {
        chrome.fileSystem.chooseEntry({
            "type": "openFile",
            "suggestedName": editorFileName,
            "accepts": [
                { "description": "Text Documents", "mimeTypes": [ "text/plain" ] }
            ],
            "acceptsAllTypes": true
        }, function(entry) {
            if(chrome.runtime.lastError) {
                console.log("Error loading document: ", chrome.runtime.lastError);
                return;
            }
            
            var errorHandler = function(e) {
                console.error("Read Error: ", e);
                reject(e);
            };
            console.log(entry);
            entry.file(function(file) {
                var reader = new FileReader();
                
                reader.onloadend = function(e) {
                    console.log("load completed.");
                    
                    $("#text-editor").val(e.target.result).change();
                    setEditorFile(entry);
                    setEditorDirty(false);
                    resolve();
                }
                reader.onerror = function(e) {
                    errorHandler(e);
                }
                
                reader.readAsText(file);
            }, errorHandler);
        });
    });
};

chrome.system.display.onDisplayChanged.addListener(function() {
    getSystemDisplays();
});

var findDisplay = function(id) {
    for(var i = 0; i < systemDisplays.length; i++) {
        if(systemDisplays[i].id == id) {
            return systemDisplays[i];
        }
    }
    return null;
};

var checkIfEditorDirtyAndSave = function() {
    return new Promise(function(resolve, reject) {
        if(editorIsDirty) {
            $("#dlgConfirmSave").off("click").on("click", function() {
                $("#dlgConfirmNew").modal("hide");
                saveDocument(false).then(
                    function() {
                        resolve();
                    }
                )
            });
            $("#dlgConfirmDiscard").off("click").on("click", function() {
                $("#dlgConfirmNew").modal("hide");
                resolve();
            });
            $("#dlgConfirmNew").modal("show");
        } else {
            resolve();
        }
    });
};

$(document).ready(function() {

    $("#text-editor").on("change input paste", function() {
        chrome.storage.local.set({'contentText': $(this).val()});
        setEditorDirty(true);
    });
  
    $("#btnStartPresenting").on("click", function() {
        var window = chrome.app.window.create(
        'presenter.html',
        {
            id: 'presenterWindow',
            frame: {
                type: "chrome"
            },
            resizable: true,
            innerBounds: {width: 800, height: 600}
        },
        function(wnd) {
            wnd.focus();
        }
        );
        
    });
  
    $("#btnNew").on("click", function() {
        checkIfEditorDirtyAndSave().then(
            function() {
                newDocument();
            }
        );
    });
    
    $("#btnOpen").on("click", function() {
        checkIfEditorDirtyAndSave().then(
            function() {
                loadDocument(function(entry) {
                    setEditorDirty(false);
                });
            }
        );
    });
    
    $("#btnSave").on("click", function() {
        saveDocument(false);
    });
    $("#btnSaveAs").on("click", function() {
        saveDocument(true);
    });
    
    $("#btnExit").on("click", function() {
        chrome.app.window.current().close();
    });
    
    $("#btnHelp").on("click", function() {
        if(helpWindow == null) {
            chrome.app.window.create(
                'help.html',
                {
                    id: 'helpWindow' + new Date().getTime(),
                    frame: 'none',
                    bounds: {width: 768, height: 700}
                },
                function(wnd) {
                    wnd.focus();
                    helpWindow = wnd;
                    helpWindow.onClosed.addListener(function() {
                        helpWindow = null;
                    });
                }
            );
        } else {
            helpWindow.focus();
        }
    });
    
    chrome.storage.local.get(['textDirection', 'contentText', 'editorFontSize', 'editorIsDirty', 'editorFileName', 'editorFileId'], function(items) {
        if(items.hasOwnProperty('textDirection')) {
            $("#text-editor").attr('dir', items['textDirection']);
        }
        if(items.hasOwnProperty('contentText')) {
            $('#text-editor').val(items['contentText']);
        }
        if(items.hasOwnProperty('editorFontSize')) {
            $('#inputEditorTextSize').val(items['editorFontSize']);
            $("#text-editor").css("font-size", items['editorFontSize'] + "pt");
        }
        if(items.hasOwnProperty('editorIsDirty')) {
            setEditorDirty(items['editorIsDirty']);
        }
        if(items.hasOwnProperty('editorFileName')) {
            editorFileName = items['editorFileName'];
        }
        if(items.hasOwnProperty('editorFileId')) {
            editorFileId = items['editorFileId'];
        }
    });
  
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (var key in changes) {
            var storageChange = changes[key];
        
            if(key == 'textDirection') {
                $("#text-editor").attr('dir', storageChange.newValue);
            }
            else if(key == 'editorFontSize') {
                $("#text-editor").css('font-size', storageChange.newValue + "pt");
            }
        }
    });
  
    $("#btnSettings").on("click", function() {
        chrome.storage.local.get(['textDirection', 'editorFontSize', 'centerMarkerVisible', 'centerMarkerColor', 'centerMarkerOpacity', 'centerMarkerPosition', 'centerMarkerLineThickness', 'displayFontSize', 'displayTextColor', 'displayBackgroundColor', 'mirrorHoriz', 'mirrorVert', 'marginsHoriz', 'usePresenterView', 'displayScreenId'], function(items) {
            var radios = $("input:radio[name=optionTextDir]");
            if(items.hasOwnProperty('textDirection')) {
                var dir = items['textDirection'];
                radios.filter('[value=' + dir + ']').prop('checked', true);
            } else {
                radios.filter('[value=ltr]').prop('checked', true);
            }
            if(items.hasOwnProperty('editorFontSize')) {
                $('#inpEditorFontSize').val(items['editorFontSize']);
            } else {
                $("#inpEditorFontSize").val(16);
            }
            if(items.hasOwnProperty('centerMarkerVisible')) {
                $('#chkShowMarker').prop('checked', items['centerMarkerVisible']);
            } else {
                $('#chkShowMarker').prop('checked', true);
            }
            if(items.hasOwnProperty('centerMarkerColor')) {
                $('#inpMarkerColor').val(items['centerMarkerColor']);
            } else {
                $('#inpMarkerColor').val("#FFFFFF");
            }
            if(items.hasOwnProperty('centerMarkerOpacity')) {
                $('#inpMarkerOpacity').val(items['centerMarkerOpacity']);
            } else {
                $('#inpMarkerOpacity').val(50);
            }
            if(items.hasOwnProperty('centerMarkerLineThickness')) {
                $('#inpMarkerThickness').val(items['centerMarkerLineThickness']);
            } else {
                $('#inpMarkerThickness').val(2);
            }
            if(items.hasOwnProperty('centerMarkerPosition')) {
                $('#inpMarkerPosition').val(items['centerMarkerPosition']);
            } else {
                $('#inpMarkerPosition').val(50);
            }
            if(items.hasOwnProperty('displayFontSize')) {
                $('#inpDisplayFontSize').val(items['displayFontSize']);
            } else {
                $("#inpDisplayFontSize").val(64);
            }
            if(items.hasOwnProperty('displayTextColor')) {
                $('#inpDisplayFontColor').val(items['displayTextColor']);
            } else {
                $("#inpDisplayFontColor").val("#FFFFFF");
            }
            if(items.hasOwnProperty('displayBackgroundColor')) {
                $('#inpDisplayBackgroundColor').val(items['displayBackgroundColor']);
            } else {
                $("#inpDisplayBackgroundColor").val("#000000");
            }
            if(items.hasOwnProperty('marginsHoriz')) {
                $('#inpDisplayMarginsHoriz').val(items['marginsHoriz']);
            } else {
                $("#inpDisplayMarginsHoriz").val(80);
            }
            if(items.hasOwnProperty('mirrorHoriz')) {
                $("#chkMirrorHorizontal").prop("checked", items['mirrorHoriz']);
            } else {
                $("#chkMirrorHorizontal").prop("checked", false);
            }
            if(items.hasOwnProperty('mirrorVert')) {
                $("#chkMirrorVertical").prop("checked", items['mirrorVert']);
            } else {
                $("#chkMirrorVertical").prop("checked", false);
            }
            if(items.hasOwnProperty('usePresenterView')) {
                $("#chkUseDualMonitorView").prop("checked", items['usePresenterView']);
                $("#selectDisplayScreen").prop("disabled", !items['usePresenterView']);
            } else {
                $("#chkUseDualMonitorView").prop("checked", true);
                $("#selectDisplayScreen").prop("disabled", false);
            }
            if(items.hasOwnProperty('displayScreenId')) {
                var id = items['displayScreenId'];
                var display = findDisplay(id);
                console.log("display id: ", id, display);
                if(display !== null) {
                    $("#selectDisplayScreen").val(id);
                }
            }
            
            $("#selectDisplayScreen").change();
            $("#dlgSettings").modal("show");
        });
    });
  
    $("#chkUseDualMonitorView").on("change", function() {
        $("#selectDisplayScreen").prop("disabled", !$("#chkUseDualMonitorView").prop("checked"));
    });
  
    $("#selectDisplayScreen").on("change", function() {
        // Display Info: Size: 0x0 - Offset: 0,0
        var display = findDisplay($("#selectDisplayScreen").val());
        var bs = display.bounds;
        $(".screen-debug-info").html("Display Info: Size: " + bs.width + "x" + bs.height + " - Offset: " + bs.left + "," + bs.top);
    });
  
    $("#dlgSettingsSave").on("click", function() {
        
        if(!validateSettingsDialog()) return;
        
        var textDirection = $("input:radio[name=optionTextDir]:checked").val();
        var editorFontSize = parseInt($("#inpEditorFontSize").val());
        var displayFontSize = parseInt($("#inpDisplayFontSize").val());
        var displayTextColor = $("#inpDisplayFontColor").val();
        var displayBackgroundColor = $("#inpDisplayBackgroundColor").val();
        var displayHorizMargin = parseInt($("#inpDisplayMarginsHoriz").val());
        
        var showMarker = $("#chkShowMarker").prop("checked") ? true : false;
        var markerColor = $("#inpMarkerColor").val();
        var markerOpacity = parseInt($("#inpMarkerOpacity").val());
        var markerPosition = parseInt($("#inpMarkerPosition").val());
        var markerThickness = parseInt($("#inpMarkerThickness").val());
        
        var mirrorHoriz = $("#chkMirrorHorizontal").prop("checked") ? true : false;
        var mirrorVert = $("#chkMirrorVertical").prop("checked") ? true : false;
        var useDualMonitor = $("#chkUseDualMonitorView").prop("checked") ? true : false;
        var displayScreen = $("#selectDisplayScreen").val();
        
        var settings = {
            'textDirection': textDirection,
            'editorFontSize': editorFontSize,
            'displayFontSize': displayFontSize,
            'displayTextColor': displayTextColor,
            'displayBackgroundColor': displayBackgroundColor,
            'marginsHoriz': displayHorizMargin,
            
            'centerMarkerVisible': showMarker,
            'centerMarkerColor': markerColor,
            'centerMarkerOpacity': markerOpacity,
            'centerMarkerPosition': markerPosition,
            'centerMarkerLineThickness': markerThickness,
            
            'mirrorHoriz': mirrorHoriz,
            'mirrorVert': mirrorVert,
            'usePresenterView': useDualMonitor,
            'displayScreenId': displayScreen
        };
        
        chrome.storage.local.set(settings);
        
        $("#dlgSettings").modal("hide");
    });
});

var validateSettingsDialog = function() {
  
    var radios = $("input:radio[name=optionTextDir]");
    
    var inputParent = $(radios[0]);
    while(!inputParent.is(".form-group") && !inputParent.is("form") && inputParent.parent().exists()) {
        inputParent = inputParent.parent();
    }
    if(!inputParent.is(".form-group")) inputParent = input;
    
    inputParent.removeClass("has-error");
    
    if(radios.is(":checked") === false) {
            inputParent.addClass("has-error");
            $("#dlgSettings a[href='#dlgTabStyles']").tab('show');
            return false;
    }
    
    if(!validateIntNumberField("inpEditorFontSize", "dlgSettings", "dlgTabStyles")) return false;
    if(!validateIntNumberField("inpDisplayFontSize", "dlgSettings", "dlgTabStyles")) return false;
    if(!validateColorField("inpDisplayFontColor", "dlgSettings", "dlgTabStyles")) return false;
    if(!validateColorField("inpDisplayBackgroundColor", "dlgSettings", "dlgTabStyles")) return false;
    if(!validateIntNumberField("inpDisplayMarginsHoriz", "dlgSettings", "dlgTabStyles")) return false;
    
    if(!validateColorField("inpMarkerColor", "dlgSettings", "dlgTabDisplay")) return false;
    if(!validateIntNumberField("inpMarkerOpacity", "dlgSettings", "dlgTabDisplay")) return false;
    if(!validateIntNumberField("inpMarkerPosition", "dlgSettings", "dlgTabDisplay")) return false;
    if(!validateIntNumberField("inpMarkerThickness", "dlgSettings", "dlgTabDisplay")) return false;
    
    return true;  
};

var validateIntNumberField = function(id, tabContainerId, tabId) {
    var input = $("#" + id);
    
    if(!input.exists()) return;
    
    var inputParent = input;
    while(!inputParent.is(".form-group") && !inputParent.is("form") && inputParent.parent().exists()) {
        inputParent = inputParent.parent();
    }
    if(!inputParent.is(".form-group")) inputParent = input;
    inputParent.removeClass("has-error");
    
    var editorText = input.val();
    var editorNumber = parseInt(editorText);
    
    if(isNaN(editorNumber)) {
        inputParent.addClass("has-error");
        if(typeof(tabContainerId) !== 'undefined') $("#" + tabContainerId + " a[href='#" + tabId + "']").tab('show');
        input.focus();
        return false;
    }
  
    var min = input.attr("min");
    if(typeof min !== 'undefined') {
        if(editorNumber < parseInt(min)) {
            inputParent.addClass("has-error");
            if(typeof(tabContainerId) !== 'undefined') $("#" + tabContainerId + " a[href='#" + tabId + "']").tab('show');
            input.focus();
            return false;
        }
    }
  
    var max = input.attr("max");
    if(typeof max !== 'undefined') {
        if(editorNumber > parseInt(max)) {
            inputParent.addClass("has-error");
            if(typeof(tabContainerId) !== 'undefined') $("#" + tabContainerId + " a[href='#" + tabId + "']").tab('show');
            input.focus();
            return false;
        }
    }
  
    return true;
};

var validateColorField = function(id, tabContainerId, tabId) {
    var input = $("#" + id);
    
    if(!input.exists()) return false;
    
    var inputParent = input;
    while(!inputParent.is(".form-group") && !inputParent.is("form") && inputParent.parent().exists()) {
        inputParent = inputParent.parent();
    }
    if(!inputParent.is(".form-group")) inputParent = input;
    inputParent.removeClass("has-error");
    
    var editorText = input.val();
    
    var res = editorText.match(/#(?:[0-9a-f]{3}){1,2}/gi);
    if(res === null) {
        inputParent.addClass("has-error");
        if(typeof(tabContainerId) !== 'undefined') $("#" + tabContainerId + " a[href='#" + tabId + "']").tab('show');
        input.focus();
        return false;
    }
    
    return true;
};

