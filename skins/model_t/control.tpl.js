Aj.Control.open(
'<div id="ajControl">' +
  '<table cellpadding="0" cellspacing="0">' +
  '<tr id="ajControlNavi">' +
    '<td id="ajPlayerCell">' +
      '<a id="ajPrev" class="{prevClass}" href="javascript:;" onclick="this.blur();Aj.Control.prev();return false;"><span>{textPrev}</span></a>' + 
      '<span id="ajCount"><span id="ajCurrentStep">{currentStep}</span> {textOf} <span id="ajStepCount">{stepCount}</span></span>' +
      '<a id="ajNext" class="{nextClass}" href="javascript:;" onclick="this.blur();Aj.Control.next();return false;"><span>{textNext}</span></a>' +
    '</td>' +
    '<td id="ajCloseCell">' +
      '<a id="ajClose" href="javascript:;" onclick="Aj.close();return false"><span>{textClose}</span></a>' +
    '</td>' +
  '</tr>' +
  '<tr id="ajControlBody"><td colspan="2">{body}</td></tr>' +
  '</table>' +
'</div>'
);