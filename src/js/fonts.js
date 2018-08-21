
$(document).ready(function() {
  
  var style = document.createElement("style");
  style.type="text/css";
  style.id="fontStyles";
  document.getElementsByTagName('head')[0].appendChild(style);
  
  setDisplayFont('"Myriad Pro",Helvetica,Calibri,Arial,sans-serif');
  
});

var setDisplayFont = function(fontFamily) {
  $("#fontStyles").html('.display-font { font-family: ' + fontFamily + '; }');
};