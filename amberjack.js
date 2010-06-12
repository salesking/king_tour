/**
 * Amberjack's main class
 * @author Arash Yalpani
 */

Aj = (function(){

  var _resetHash = {},
  _existingOnresize = null; // reference to onresize method of window/document

  /**
   * Enables keys: space, escape, left, right, backspace & return
   * @example _initKeyboard()
   */
  function _initKeyboard() {
    document.onkeydown = function(e) {
      var e = e || window.event;
      e.cancelBubble = true;
      if (e.preventDefault) e.preventDefault(); //ie chokes here
      if (e.stopPropagation) e.stopPropagation(); 

      switch (e.keyCode) {
        case 35: // quit
        case 27: // esc
          Aj.close();break;
        case 8: // backspace
        case 40: // down
        case 37: // left
          Aj.Dialog.prev();break;
        case 13: // return
        case 38: // up
        case 39: // right
          Aj.Dialog.next();break;
        case 32: // space - needs bugfix since it scrolls the window body
          e.returnValue = false;
          Aj.Dialog.next();
          break;
      }
    }
  }

  function _reset_keyboard(){
    document.onkeydown = null;
  }
  /**
   * Returns the tourDef DOM element (or false)
   */
  function _getTourDef(tourId) {
    var tourDefElements = jQuery('div.ajTourDef');
    for (i = 0; i < tourDefElements.length; i++) {
      if (tourDefElements[i].getAttribute('id') == tourId) {
        return tourDefElements[i];
      }
    }

    Ajt.alert('DIV with CLASS "ajTourDef" and ID "' + tourId + '" is not defined');
    return false;
  }

  /**
   * read in tour definition html and set steps
   */
  function _transformTourDefToSteps(tourDef) {
    var children = tourDef.childNodes,
    steps = [],
    stepIndex = 0,
    stepSet = false;
    //collect top most div's with url definitions in title
    for (var i = 0; i < children.length; i++) {
      if (!children[i].tagName || children[i].tagName.toLowerCase() != 'div') { continue ; }
      // init page object
      var page = {}
      // set the url taken from this div's title attr
      page.url = children[i].getAttribute('title');
      //check if the url matches the curret location
      var url_matches = new RegExp(''+page.url+'', "gi").test(location.href);
      //only match tour url once, if a tour goes over multiple pages and has the
      //same url set twice(f.ex. return back to home page) the url param tourStep
      //MUST be set and overrides this setting
      if ( url_matches && !stepSet) {
        Aj.__currentStep = stepIndex;
        stepSet = true
      }
      //insert tour steps under this url
      var cn = children[i].childNodes;
      for (var j = 0; j < cn.length; j++) {
        if (!cn[j].tagName || cn[j].tagName.toLowerCase() != 'div') { continue ; }
        //load the settings from step title
        eval('steps[stepIndex] = {' + cn[j].title + '};');

        //set current step to given step from url param.
        //used in interpage tours => mypage.de?tourStep=13
        if (Ajt.getUrlParam(location.href, 'tourStep') && url_matches) {
          Aj.__currentStep = parseInt(Ajt.getUrlParam(location.href, 'tourStep')); //implicit conversion to int
        }

        steps[stepIndex].body = cn[j].innerHTML;
        steps[stepIndex].pageUrl = page.url;
        stepIndex++
      }
    }
    return steps;
  }

  function _saveResetValues() {
    _resetHash.textOf             = Aj.textOf;
    _resetHash.textClose          = Aj.textClose;
    _resetHash.textPrev           = Aj.textPrev;
    _resetHash.textNext           = Aj.textNext;
    _resetHash.onCloseClickStay   = Aj.onCloseClickStay;
    _resetHash.doCoverBody        = Aj.doCoverBody;
    _resetHash.mouseNav   = Aj.mouseNav;
    _resetHash.urlPassTourParams  = Aj.urlPassTourParams;
    _resetHash.currentStep      = 0;
  }

  function _doResetValues() {
    Aj.textOf             = _resetHash.textOf;
    Aj.textClose          = _resetHash.textClose;
    Aj.textPrev           = _resetHash.textPrev;
    Aj.textNext           = _resetHash.textNext;
    Aj.onCloseClickStay   = _resetHash.onCloseClickStay;
    Aj.doCoverBody        = _resetHash.doCoverBody;
    Aj.mouseNav   = _resetHash.mouseNav;
    Aj.urlPassTourParams  = _resetHash.urlPassTourParams;
    Aj.__currentStep      = _resetHash.currentStep;
  }

  return {
    // constants
    BASE_URL          : 'http://github.com/salesking/amberjack/raw/master/', // do not forget trailing slash!
    // public attributes
    // - set these through url (...&tourId=MyTour&skinId=Safari...)
    // - OR right before the call to Aj.open()
    tourId            : null,  // mandatory: if not set, tour will not open
    skinId            : null,  // optional: if not set, skin "model_t" will be used

    // Options - set these right before the call to Aj.open()
    template          : null,   //html snippet to be used as template for popup bubbles
    textOf            : 'of',  // text of splitter between "2 of 3"
    textClose         : 'x',   // text of close button
    textPrev          : '',    // text of previous button (i.e. &laquo;)
    textNext          : '',    // text of next button (i.e. &raquo;)

    onCloseClickStay  : false, // set this to 'true', if you want the close button to close tour but remain on current page
    doCoverBody       : false, // set this to 'true', if a click on the body cover should force it to close
    mouseNav          : true,  // forward / backward on mouse click
    urlPassTourParams : true,  // set this to false, if you have hard coded the tourId and skinId in your tour
                               //     template. the tourId and skindId params will not get passed on prev/next button click
    openCallback : null,      // callback to be executed on open
    closeCallback : null,     // callback to be executed on close
    // protected attributes - don't touch (used by other Aj.* classes)
    __steps             : [],
    __currentStep       : null,

    /**
     * Initializes tour, creates transparent layer and causes Amberjack Dialog
     * to open the skin's template (control.tpl.js) into document. Call this
     * manually right after inclusion of this library. Don't forget to pass
     * tourId param through URL to show tour!
     *
     * Iterates child DIVs of DIV.ajTourDef, extracts tour pages
     *
     * @author Arash Yalpani
     *
     * @example Aj.open()
     * Note that a HEAD tag needs to be existent in the current document
     */

    open: function() {
      // set Aj.tourId
      Aj.tourId = Aj.tourId || Ajt.getUrlParam(location.href, 'tourId');
      if (!Aj.tourId) { // do nothing if no tourId is found
        return ;
      }

      _saveResetValues();

      var tourDef = _getTourDef(Aj.tourId);
      Aj.__steps  = _transformTourDefToSteps(tourDef);

      // set Aj.skinId
      Aj.skinId = Aj.skinId || Ajt.getUrlParam(location.href, 'skinId');
      Aj.skinId = Aj.skinId || 'model_t';

      // set Aj.closeUrl
      Aj.closeUrl    = tourDef.getAttribute('title') || false;

      // get Style
      Ajt.postFetch(Aj.BASE_URL + 'skins/' + Aj.skinId.toLowerCase() + '/style.css', 'style');
      // trigger open control bubble
      Aj.Dialog.open();
      // mix Aj.onresize into existing onresize function, so wwe can reset it later
      var ref = document.onresize ? document : window;
      Aj._existingOnresize = ref.onresize;
      ref.onresize = function() {
        Aj.onResize();
        if (Aj._existingOnresize) {
          Aj._existingOnresize();
        }
      };
      // call Aj.onResize initially once
      Aj.onResize();
      _initKeyboard();
      //run a given open callback
      if (typeof Aj.openCallback == 'function') { Aj.openCallback(Aj); }
    },

    onResize: function() {
      setTimeout( function(){
        Aj.redrawEverything();
      }, 100);
    },

    redrawEverything: function() {
      //set prev/next class for buttons
      jQuery('#ajPrev, #ajNext').removeClass();
      if (Aj.__currentStep == 0) {
        jQuery('#ajPrev').addClass('disabled');
      }
      if (Aj.__currentStep == Aj.__steps.length - 1) {
        jQuery('#ajNext').addClass('disabled');
      }

      var ajc = Aj.__steps[ Aj.__currentStep ];
      // set bubble content to current step content
      jQuery('#ajDialogBody').html(ajc.body);
      //set current step number
      jQuery('#ajCurrentStep').text( Aj.__currentStep + 1 );
      Aj.Expose.expose(ajc.el, ajc.padding, ajc.position);
      Aj.Dialog.attachToExpose(ajc.trbl);
      Aj.Dialog.ensureVisibility();
    },

    /**
     * Gets called, whenever the user clicks on the close button of Amberjack control
     * @author Arash Yalpani
     *
     * @example Aj.close()
     */
    close: function() {
      // reset resize handler
      var ref = document.onresize ? document : window;
      ref.onresize = Aj._existingOnresize ? Aj._existingOnresize : null;
      //reset mouse contextmenu
      if (Aj.mouseNav) {  document.body.oncontextmenu = null; }
      // execute close Callback if present
      if (typeof Aj.closeCallback == 'function') {  Aj.closeCallback(Aj); }
      _doResetValues();
      _reset_keyboard();
      //kick all markup
      jQuery('#Ajc, .ajCover, #ajArrow, #ajExposeCover').remove();
      //stay in here
      if (Aj.onCloseClickStay) {  return null; }     
      //go to the closeUrl if present
      if (Aj.closeUrl) {  window.location.href = Aj.closeUrl;  }     
      return null;
    }
  }
})();

/**
 * Amberjack Dialog class
 * @author Arash Yalpani
 */

Aj.Dialog = (function(){
  var _trbl    = null;

  function _fillTemplate() {
    var tpl_parsed = null,
        // use given or default template
        tpl_raw = Aj.template ? Aj.template : Aj.Dialog.defaultTemplate;
    tpl_parsed = tpl_raw.replace(/{skinId}/, Aj.skinId)
      .replace(/{textOf}/,        Aj.textOf)
      .replace(/{textClose}/,     Aj.textClose)
      .replace(/{textPrev}/,      Aj.textPrev)
      .replace(/{textNext}/,      Aj.textNext)
      .replace(/{currentStep}/,   Aj.__currentStep + 1)
      .replace(/{stepCount}/,     Aj.__steps.length)
      .replace(/{body}/,          Aj.__steps[Aj.__currentStep].body);
    return tpl_parsed;
  }

  function _setCoords(coords, position) {
    var el = jQuery('#ajDialog')[0];
    el.style.top      = coords.top      || 'auto';
    el.style.right    = coords.right    || 'auto';
    el.style.bottom   = coords.bottom   || 'auto';
    el.style.left     = coords.left     || 'auto';
    el.style.position = position        || 'static';
  }

  function _drawArrow(topLeft, position, trbl) {
    var arrow = jQuery('#ajArrow');
    //add arrow div if not present
    if ( arrow.length == 0 ) {
      jQuery('<div id="ajArrow"></div>').appendTo("body");
      arrow = jQuery('#ajArrow');
    }
    arrow.css({
      'position' : position,
      'top' : topLeft.top + 'px',
      'left' : topLeft.left + 'px',
      'background' : 'url(' + Aj.BASE_URL + 'skins/' + Aj.skinId.toLowerCase() + '/arr_' + trbl.charAt(0) + '.png)'
    });
  }

  return {
    /**
     * Callback handler for template files. Takes template HTML and fills placeholders
     *
     * @example Aj.Dialog.open()
     * Note that this method should be called directly through control.tpl.js files
     */

    open: function() {
      var ctrDiv = jQuery('#Ajc'),
          tplHtml = _fillTemplate();
      //insert control div bubble only once
      if (ctrDiv.length == 0 ) {
        jQuery('<div id="Ajc">' + tplHtml + '</div>').appendTo("body");
      } else { // div already present just replace existing
        jQuery('#Ajc').html().replaceWith(tplHtml);
      }
      // No URL was set AND no click-close-action was configured:
      if (!Aj.closeUrl && !Aj.onCloseClickStay) {
        jQuery('#ajClose').hide();
      }
      // post fetch a CSS file you can define by setting Aj.ADD_STYLE
      // right before the call to Aj.open();
      if (Aj.ADD_STYLE) {
        Ajt.postFetch(Aj.ADD_STYLE, 'style');
      }
      // post fetch a script you can define by setting Aj.ADD_SCRIPT
      // right before the call to Aj.open();
      if (Aj.ADD_SCRIPT) {
        Ajt.postFetch(Aj.ADD_SCRIPT, 'script');
      }
      //execute callback from current step
      var callback;
      if (callback = Aj.__steps[Aj.__currentStep].callback) {
        eval(callback + '()');
      }

      Aj.redrawEverything();
    },
   
    prev: function() {
      if (Aj.__currentStep == 0) {
        return ;
      }

      // we will not change url
      var callback;
      if (Aj.__steps[Aj.__currentStep].pageUrl == Aj.__steps[Aj.__currentStep - 1].pageUrl) {
        if (callback = Aj.__steps[Aj.__currentStep].callback) {
          eval(callback + '(true)');
        }

        Aj.__currentStep--;

        if (callback = Aj.__steps[Aj.__currentStep].callback) {
          eval(callback + '()');
        }

        Aj.redrawEverything();
        return ;
      }

      var prevStep = Aj.__currentStep - 1,
          prevUrl = Aj.__steps[prevStep].pageUrl,
          urlSplit = prevUrl.split('?'),
          urlQuery = urlSplit[1] || false;
      if (Aj.urlPassTourParams) {
        prevUrl+= (urlQuery ? '&' : '?') + 'tourId=' + Aj.tourId + '&tourStep=' + prevStep + (Aj.skinId ? '&skinId=' + Aj.skinId : '');
      }

      window.location.href = prevUrl;
    },

    next: function() {
      if (Aj.__currentStep == Aj.__steps.length - 1) {
        return ;
      }
      var callback;
      //stay on the same page
      if (Aj.__steps[Aj.__currentStep].pageUrl == Aj.__steps[Aj.__currentStep + 1].pageUrl) {
        if (callback = Aj.__steps[Aj.__currentStep].callback) {
          eval(callback + '(true)');
        }

        Aj.__currentStep++;

        if (callback = Aj.__steps[Aj.__currentStep].callback) {
          eval(callback + '()');
        }
        Aj.redrawEverything();
        return ;
      }
      //construct next link
      var nextStep = Aj.__currentStep + 1,
          nextUrl = Aj.__steps[nextStep].pageUrl,
          urlSplit = nextUrl.split('?'),
          urlQuery = urlSplit[1] || false;
      if (Aj.urlPassTourParams) {
        nextUrl+= (urlQuery ? '&' : '?') + 'tourId=' + Aj.tourId + '&tourStep=' + nextStep + (Aj.skinId ? '&skinId=' + Aj.skinId : '');
      }

      window.location.href = nextUrl;
    },

    attachToExpose: function(trbl) {
      _trbl = trbl;
      var dialog = jQuery('#ajDialog')[0],
      ajcWidth  = Ajt.getWidth(dialog),
      ajcHeight = Ajt.getHeight(dialog),
      coords    = Aj.Expose.getCoords(),
      position  = Aj.Expose.getPosition(),
      arrowTop    = 0,
      arrowLeft   = 0,
      controlTop  = 0,
      controlLeft = 0;

      switch (_trbl.charAt(0)) {
      case 't':
        arrowTop    = coords.t - 31;
        controlTop  = coords.t - 15 - ajcHeight
        break;
      case 'b':
        arrowTop    = coords.b + 1;
        controlTop  = coords.b + 15;
        break;
      case 'l':
        arrowLeft   = coords.l - 31;
        controlLeft = coords.l - 15 - ajcWidth;
        break;
      case 'r':
        arrowLeft   = coords.r + 1;
        controlLeft = coords.r + 15;
        break;
      }

      switch (_trbl.charAt(1)) {
      case 't':
        arrowTop    = coords.t;
        controlTop  = coords.t;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 't') {
          controlTop  = coords.t - ajcHeight + 30;
        }
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'm') {
          controlTop  = coords.t - ajcHeight / 2 + 15;
        }
        break;
      case 'm':
        arrowTop   = coords.t + coords.h / 2 - 15;
        controlTop = coords.t + coords.h / 2 - ajcHeight / 2;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 't') {
          controlTop  = arrowTop - ajcHeight + 30;
        }
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'b') {
          controlTop  = arrowTop;
        }
        break;
      case 'b':
        arrowTop    = coords.b - 30;
        controlTop  = coords.b - ajcHeight;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'b') {
          controlTop  = coords.b - 30;
        }
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'm') {
          controlTop  = coords.b - ajcHeight / 2 - 15;
        }
        break;
      case 'l':
        arrowLeft   = coords.l;
        controlLeft = coords.l;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'l') {
          controlLeft = coords.l - ajcWidth + 30;
        }
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'c') {
          controlLeft = coords.l - ajcWidth / 2 + 15;
        }
        break;
      case 'c':
        arrowLeft   = coords.l + coords.w / 2 - 15;
        controlLeft = coords.l + coords.w / 2 - ajcWidth / 2;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'l') {
          controlLeft = arrowLeft - ajcWidth + 30;
        }
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'r') {
          controlLeft = arrowLeft;
        }
        break;
      case 'r':
        arrowLeft   = coords.r - 30;
        controlLeft = coords.r - ajcWidth;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'r') {
          controlLeft = coords.r - 30;
        }
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'c') {
          controlLeft = coords.r - ajcWidth / 2 - 15;
        }
        break;
      }

      _drawArrow({top: arrowTop, left: arrowLeft}, position, _trbl);
      _setCoords({
        top:  controlTop  + 'px',
        left: controlLeft + 'px'
      }, position);
    },

    ensureVisibility: function() {
      if ('fixed' == Aj.__steps[Aj.__currentStep].position) {
        return ;
      }

      var dialog   = jQuery('#ajDialog')[0],
        ajcTop      = Ajt.getTop(dialog),
        ajcHeight   = Ajt.getHeight(dialog),
        ajcBottom   = Ajt.getBottom(dialog),
        vpScrollTop = Ajt.viewport().scrollTop,
        vpHeight    = Ajt.viewport().height,
        // coordinates
        coords = Aj.Expose.getCoords(),
        superTop    = Math.min(coords.t, ajcTop),
        superBottom = Math.max(coords.b, ajcBottom),
        superHeight = superBottom - superTop,
        //scrolling
        minScrollTop = ajcTop - 20,
        maxScrollTop = ajcBottom + 20 - vpHeight;

      // everything is fitting, no need to jump
      if (superTop >= vpScrollTop && superBottom <= vpScrollTop + vpHeight) {
        return ;
      }

      // Dialog heigher than viewport?
      if (ajcHeight >= vpHeight) {
        window.scroll(0, ajcTop - 20); // align to control top
        return ;
      }

      var scrollTo = 0;
      // trbl = b
      if (ajcBottom == superBottom) {
        scrollTo = superBottom - vpHeight + 20;
      } else {
        scrollTo = superTop - 20;
      }

      window.scroll(0, Math.max(maxScrollTop, Math.min(minScrollTop, scrollTo)));
    },

    refresh: function() {
      if (!_trbl) {
        return ;
      }

      Aj.Dialog.attachToExpose(_trbl);
    },

    /**
     * Returns html string for default control bubble template. You can set your
     * own template within Aj objects settings =>
     * Aj.template = '<div>my custom bubble</div>';
     * Aj.open();
     * Just make sure your html contains the right id's so the tour content can be set
     **/
    defaultTemplate: 
      '<div id="ajDialog">' +
        '<div id="dialogHead">' +
          '<a id="ajPrev" class="{prevClass}" href="javascript:;" onclick="this.blur();Aj.Dialog.prev();return false;"><span>{textPrev}</span></a>' +
          '<span id="ajCount"><span id="ajCurrentStep">{currentStep}</span> {textOf} <span id="ajStepCount">{stepCount}</span></span>' +
          '<a id="ajNext" class="{nextClass}" href="javascript:;" onclick="this.blur();Aj.Dialog.next();return false;"><span>{textNext}</span></a>' +
          '<a id="ajClose" href="javascript:;" onclick="Aj.close();return false">{textClose}</a>' +
        '</div>' +
        '<div id="ajDialogBody">{body}</div>' +
      '</div>'
    
  };
})();


Aj.Expose = (function(){
  var _element  = null,  // jquery selector MUST return array of dom elements from which the first el is taken
  _padding      = 0,
  _coords       = [],
  _position     = null;

  /**
   * calculate coordinates for the help elements
   * */
  function _calcCoords() {
    // use the first element jQuery finds
    var el = jQuery(_element)[0],
    coords = {};
    coords.t = Ajt.getTop(el)     - _padding;
    coords.r = Ajt.getRight(el)   + _padding;
    coords.b = Ajt.getBottom(el)  + _padding;
    coords.l = Ajt.getLeft(el)    - _padding;
    coords.w = Ajt.getWidth(el)   + _padding * 2;
    coords.h = Ajt.getHeight(el)  + _padding * 2;

    return coords;
  }

  function _drawTopCover() {
    if (!(cover = Ajt.$('ajCoverTop'))) {
      var cover       = document.createElement('div');
      cover.id        = 'ajCoverTop';
      cover.className = 'ajCover';
      if (Aj.mouseNav) { cover.onclick = Aj.Dialog.next; };
      document.body.appendChild(cover);
    }

    var height = Math.max(0, _coords.t);
    cover.style.position  = _position;
    cover.style.top         = '0px';
    cover.style.height      = height + 'px';
  }

  function _drawBottomCover() {
    if (!(cover = Ajt.$('ajCoverBottom'))) {
      var cover       = document.createElement('div');
      cover.id        = 'ajCoverBottom';
      cover.className = 'ajCover';
      if (Aj.mouseNav) { cover.onclick = Aj.Dialog.next;  }
      document.body.appendChild(cover);
    }
    var top = Math.max(0, _coords.b);
    if (_position == 'fixed') {
      cover.style.height = Math.max(0, Ajt.viewport().height - top) + 'px';
    } else {
      cover.style.height = (Ajt.getWindowInnerHeight() - top) + 'px';
    }
    cover.style.top         = top + 'px';
    cover.style.position    = _position;

  }

  function _drawLeftCover() {
    if (!(cover = Ajt.$('ajCoverLeft'))) {
      var cover       = document.createElement('div');
      cover.id        = 'ajCoverLeft';
      cover.className = 'ajCover';
      if (Aj.mouseNav) { cover.onclick = Aj.Dialog.next;  }
      document.body.appendChild(cover);
    }

    var width = Math.max(0, _coords.l);
    cover.style.position    = _position;
    cover.style.top         = _coords.t + 'px';
    cover.style.height      = _coords.h + 'px';
    cover.style.width       = width + 'px';

  }

  function _drawRightCover() {
    if (!(cover = Ajt.$('ajCoverRight'))) {
      var cover             = document.createElement('div');
      cover.id              = 'ajCoverRight';
      cover.className       = 'ajCover';
      if (Aj.mouseNav) { cover.onclick = Aj.Dialog.next; }
      document.body.appendChild(cover);
    }

    var width = Math.max(0, _coords.r);
    cover.style.position    = _position;
    cover.style.top         = _coords.t + 'px';
    cover.style.height      = _coords.h + 'px';
    cover.style.left        = _coords.r + 'px';

  }

  function _drawExposeCover() {
    if (!(cover = Ajt.$('ajExposeCover'))) {
      var cover = document.createElement('div');
      cover.id  = 'ajExposeCover';
      if (Aj.mouseNav) {
        cover.onclick = Aj.Dialog.next;
      }
      document.body.appendChild(cover);
    }
    cover.style.position    = _position;
    cover.style.top         = _coords.t + 'px';
    cover.style.left        = _coords.l + 'px';
    cover.style.height      = _coords.h + 'px';
    cover.style.width       = _coords.w + 'px';
  }

  function _drawCover() {
    if (Aj.mouseNav) {
      document.body.oncontextmenu = function(){Aj.Dialog.prev();return false};
    }
    _drawTopCover();
    _drawBottomCover();
    _drawLeftCover();
    _drawRightCover();
    _drawExposeCover();
  }

  return {
    expose: function(element, padding, position) {
      _element  = element;
      _padding  = padding;
      _coords   = _calcCoords();
      _position = position || 'absolute';
      _drawCover();
    },

    refresh: function() {
      _coords = _calcCoords();
      _drawCover();
    },

    getCoords: function() {
      return _coords;
    },

    getPosition: function() {
      return _position;
    }
  }
})();


/**
 * Amberjack Tools
 *
 * Capsulates static helper functions
 * @author Arash Yalpani
 */

Ajt = {

  /**
   * Wrapper method for document.getElementById.
   */
  $: function(id) {
    return document.getElementById(id);
  },

  alert: function(str) {
    alert('Amberjack alert: ' + str);
  },

  getWidth: function(el) {
    return el.offsetWidth;
  },

  getHeight: function(el) {
    return el.offsetHeight;
  },

  getLeft: function(el) {
    if (el.offsetParent){ return el.offsetLeft + Ajt.getLeft(el.offsetParent); }
    return el.offsetLeft;
  },

  getTop: function(el) {
    if (el.offsetParent){ return el.offsetTop + Ajt.getTop(el.offsetParent); }
    return el.offsetTop;
  },

  getRight: function(el) {
    return Ajt.getLeft(el) + Ajt.getWidth(el);
  },

  getBottom: function(el) {
    return Ajt.getTop(el) + Ajt.getHeight(el);
  },

  viewport: function() {
    var e = window, a = 'inner';
    if (!('innerWidth' in window)) {
      a = 'client';
      e = document.documentElement || document.body;
    }

    var y = 0;
    if (window.pageYOffset) {
      y = window.pageYOffset;
    } else if (document.compatMode && document.compatMode != 'BackCompat') {
      y = document.documentElement.scrollTop;
    } else if (document.body) {
      y = document.body.scrollTop;
    }

    return {
      scrollTop:  y,
      width:      e[a+'Width'],
      height:     e[a+'Height']
    }
  },

  /**
   * Return height of inner window
   * Copied and modified:
   * http://www.dynamicdrive.com/forums/archive/index.php/t-10373.html
   *
   * @example Ajt.getWindowInnerHeight()
   */
  getWindowInnerHeight: function() {
      // shortcuts
    var db = document.body,
    dde = document.documentElement,
    inner,
    height;
    if (window.innerHeight && window.scrollMaxY) {
      inner = window.innerHeight + window.scrollMaxY;
    } else if (db.scrollHeight > db.offsetHeight){ // all but Explorer Mac
      inner = db.scrollHeight;
    } else if (dde && dde.scrollHeight > dde.offsetHeight){ // Explorer 6 strict mode
      inner = dde.scrollHeight;
    } else { // Explorer Mac...would also work in Mozilla and Safari
      inner = db.offsetHeight;
    }
   
    if (self.innerHeight) { // all except Explorer
      height = self.innerHeight;
    } else if (dde && dde.clientHeight) { // Explorer 6 Strict Mode
      height = dde.clientHeight;
    } else if (document.body) { // other Explorers
      height = db.clientHeight;
    }

    // for small pages with total height less then height of the viewport
    return (inner >= height) ? inner : height;
  },

   /**
   * Returns url param value
   *
   * @param url The url to be queried
   * @param paramName The params name
   * @return paramName's value or false if param does not exist or is empty
   *
   * @example getUrlParam('http://localhost/?a=123', 'a') => 123
   * @example getUrlParam('http://localhost/?a=123', 'b') => false
   * @example getUrlParam('http://localhost/?a=',    'a') => false
   */

  getUrlParam: function(url, paramName) {
    var urlSplit = url.split('?');
    if (!urlSplit[1]) { // no query
      return false;
    }

    var paramsSplit = urlSplit[1].split('&');
    for (var i = 0; i < paramsSplit.length; i++) {
      var paramSplit = paramsSplit[i].split('=');
      if (paramSplit[0] == paramName) {
        return paramSplit[1] || false;
      }
    }

    return false;
  },

  /**
   * Injects javascript or css file into document
   *
   * @param url The JavaScript/CSS file's url
   * @param type Either 'script' OR 'style'
   * @param onerror Optional: callback handler if loading did not work
   *
   * @example loadScript('http://localhost/js/dummy.js', function(){alert('could not load')})
   *
   * Note that a HEAD tag needs to be existent in the current document and head
   * tags are only inserted once per url
   */

  postFetch: function(url, type) {
    var scriptOrStyle = null;

    if (type === 'script') {
      if ( 0 == jQuery('script[src='+ url +']').length ){
        scriptOrStyle = document.createElement('script');
        scriptOrStyle.type = 'text/javascript';
        scriptOrStyle.src  = url;
      }
    } else {
      if ( 0 == jQuery('link[href='+ url +']').length ){
        scriptOrStyle = document.createElement('link');
        scriptOrStyle.type = 'text/css';
        scriptOrStyle.rel  = 'stylesheet';
        scriptOrStyle.href = url;
      }
    }

    if(scriptOrStyle != null){
      document.getElementsByTagName('head')[0].appendChild(scriptOrStyle); // head MUST be present, else js error
    }
    return ;
  }
};

setTimeout( function(){
  Aj.open(); // call Aj.open() to catch possibly set url params
}, 500);