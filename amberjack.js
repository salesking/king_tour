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
        case 27: // esc
          Aj.close();break;
        case 8: // backspace
        case 37: // left
          Aj.Control.prev();break;
        case 13: // return
        case 39: // right
          Aj.Control.next();break;
        case 32: // space - needs bugfix since it scrolls the window body
          e.returnValue = false;
          Aj.Control.next();
          break;
      }
    }
  };

  function _reset_keyboard(){
    document.onkeydown = null;
  };
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
  };

  function _transformTourDefToSteps(tourDef) {
    var children = tourDef.childNodes;
    var steps = [];
    var stepIndex = 0;

    for (var i = 0; i < children.length; i++) {
      if (!children[i].tagName || children[i].tagName.toLowerCase() != 'div') { continue ; }

      var page = {}
      page.url = children[i].getAttribute('title');

      if (Ajt.urlMatch(page.url)) {
        Aj.__currentStep = stepIndex;
      }

      var cn = children[i].childNodes;
      for (var j = 0; j < cn.length; j++) {
        if (!cn[j].tagName || cn[j].tagName.toLowerCase() != 'div') { continue ; }

        eval('steps[stepIndex] = {' + cn[j].title + '};');

        if (Ajt.getUrlParam(location.href, 'fromNext') && Ajt.urlMatch(page.url)) {
          Aj.__currentStep = stepIndex;
        }

        steps[stepIndex].body = cn[j].innerHTML;
        steps[stepIndex].pageUrl = page.url;
        stepIndex++
      }
    }
    return steps;
  };

  function _saveResetValues() {
    _resetHash.textOf             = Aj.textOf;
    _resetHash.textClose          = Aj.textClose;
    _resetHash.textPrev           = Aj.textPrev;
    _resetHash.textNext           = Aj.textNext;
    _resetHash.onCloseClickStay   = Aj.onCloseClickStay;
    _resetHash.doCoverBody        = Aj.doCoverBody;
    _resetHash.mouseCanNavigate   = Aj.mouseCanNavigate;
    _resetHash.urlPassTourParams  = Aj.urlPassTourParams;
    _resetHash.currentStep      = 0;
  };

  function _doResetValues() {
    Aj.textOf             = _resetHash.textOf;
    Aj.textClose          = _resetHash.textClose;
    Aj.textPrev           = _resetHash.textPrev;
    Aj.textNext           = _resetHash.textNext;
    Aj.onCloseClickStay   = _resetHash.onCloseClickStay;
    Aj.doCoverBody        = _resetHash.doCoverBody;
    Aj.mouseCanNavigate   = _resetHash.mouseCanNavigate;
    Aj.urlPassTourParams  = _resetHash.urlPassTourParams;
    Aj.__currentStep      = _resetHash.currentStep;
  };

  return {
    // constants
    BASE_URL          : 'http://github.com/salesking/amberjack/raw/master/', // do not forget trailing slash!

    // public attributes

    // - set these through url (...&tourId=MyTour&skinId=Safari...)
    // - OR right before the call to Aj.open()
    tourId            : null,  // mandatory: if not set, tour will not open
    skinId            : null,  // optional: if not set, skin "model_t" will be used


    // - set these right before the call to Aj.open()
    textOf            : 'of',  // text of splitter between "2 of 3"
    textClose         : 'x',   // text of close button
    textPrev          : '',    // text of previous button (i.e. &laquo;)
    textNext          : '',    // text of next button (i.e. &raquo;)

    onCloseClickStay  : false, // set this to 'true', if you want the close button to close tour but remain on current page
    doCoverBody       : false, // set this to 'true', if a click on the body cover should force it to close
    mouseCanNavigate  : true,  // forward / backward on mouse click
    urlPassTourParams : true,  // set this to false, if you have hard coded the tourId and skinId in your tour
                               //     template. the tourId and skindId params will not get passed on prev/next button click

    // protected attributes - don't touch (used by other Aj.* classes)
    __steps             : [],
    __currentStep       : null,

    /**
     * Initializes tour, creates transparent layer and causes Amberjack Control
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

      // get Style, Template and run Aj.Control.open
      Ajt.postFetch(Aj.BASE_URL + 'skins/' + Aj.skinId.toLowerCase() + '/style.css', 'style');
      Ajt.postFetch(Aj.BASE_URL + 'skins/' + Aj.skinId.toLowerCase() + '/control.tpl.js', 'script');

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
    },

    onResize: function() {
      setTimeout(function(){
        Aj.redrawEverything();
      }, 100);
    },

    redrawEverything: function() {

      jQuery('#ajPrev, #ajNext').removeClass();
      if (Aj.__currentStep == 0) {
        jQuery('#ajPrev').addClass('disabled');
      }
      if (Aj.__currentStep == Aj.__steps.length - 1) {
        jQuery('#ajNext').addClass('disabled');
      }

      var ajc = Aj.__steps[ Aj.__currentStep ];
      Ajt.$('ajControlBody').childNodes[0].innerHTML = ajc.body;
      Ajt.$('ajCurrentStep').innerHTML = Aj.__currentStep + 1;
      Aj.Expose.expose(ajc.el, ajc.padding, ajc.position);
      Aj.Control.attachToExpose(ajc.trbl);
      Aj.Control.ensureVisibility();
    },

    /**
     * Gets called, whenever the user clicks on the close button of Amberjack control
     * @author Arash Yalpani
     *
     * @example Aj.close()
     */
    close: function() {
      var ref = document.onresize ? document : window;
      if (Aj._existingOnresize) {
        ref.onresize = Aj._existingOnresize;
      } else {
        ref.onresize = null;
      };

      if (Aj.mouseCanNavigate) {
        document.body.oncontextmenu = null;
      };

      _doResetValues();
      _reset_keyboard();
      if (Aj.onCloseClickStay) {
        jQuery('#Ajc, .ajCover, #ajArrow, #ajExposeCover').remove();
        return null;
      };

      if (Aj.closeUrl) {
        window.location.href = Aj.closeUrl;
      };
      return null;
    }
  }
})();

/**
 * Amberjack Control class
 * @author Arash Yalpani
 */

Aj.Control = (function(){
  var _trbl    = null;

  function _fillTemplate(tplHtml) {
    var _tplHtml = null;
    _tplHtml =  tplHtml.replace(/{skinId}/,        Aj.skinId);
    _tplHtml = _tplHtml.replace(/{textOf}/,        Aj.textOf);
    _tplHtml = _tplHtml.replace(/{textClose}/,     Aj.textClose);
    _tplHtml = _tplHtml.replace(/{textPrev}/,      Aj.textPrev);
    _tplHtml = _tplHtml.replace(/{textNext}/,      Aj.textNext);
    _tplHtml = _tplHtml.replace(/{currentStep}/,   Aj.__currentStep + 1);
    _tplHtml = _tplHtml.replace(/{stepCount}/,     Aj.__steps.length);
    _tplHtml = _tplHtml.replace(/{body}/,          Aj.__steps[Aj.__currentStep].body);
    return _tplHtml;
  };

  function _domInsert(tplHtml) {
    var e = Ajt.$('Ajc');
    if (!e) {
      var div = document.createElement('div');
      div.id = 'Ajc';
      document.body.appendChild(div);
    }
    div.innerHTML = tplHtml;
  };

  function _setCoords(coords, position) {
    var el = Ajt.$('ajControl');
    el.style.top      = coords.top      || 'auto';
    el.style.right    = coords.right    || 'auto';
    el.style.bottom   = coords.bottom   || 'auto';
    el.style.left     = coords.left     || 'auto';
    el.style.position = position        || 'static';
  };

  function _drawArrow(topLeft, position, trbl) {
    if (!(arrow = Ajt.$('ajArrow'))) {
      var arrow               = document.createElement('div');
      arrow.id                = 'ajArrow';
      document.body.appendChild(arrow);
    };

    arrow.style.position    = position;
    arrow.style.top         = topLeft.top + 'px';
    arrow.style.left        = topLeft.left + 'px';
    arrow.style.background  = 'url(' + Aj.BASE_URL + 'skins/' + Aj.skinId.toLowerCase() + '/arr_' + trbl.charAt(0) + '.png)';
  };

  return {
    /**
     * Callback handler for template files. Takes template HTML and fills placeholders
     * @author Arash Yalpani
     *
     * @param _tplHtml HTML code including Amberjack placeholders
     *
     * @example Aj.Control.open('<div>{body}</div>')
     * Note that this method should be called directly through control.tpl.js files
     */

    open: function(tplHtml) {
      var tplHml = _fillTemplate(tplHtml);
      _domInsert(tplHml);

      // No URL was set AND no click-close-action was configured:
      if (!Aj.closeUrl && !Aj.onCloseClickStay) {
        Ajt.$('ajClose').style.display = 'none';
      };

      // post fetch a CSS file you can define by setting Aj.ADD_STYLE
      // right before the call to Aj.open();
      if (Aj.ADD_STYLE) {
        Ajt.postFetch(Aj.ADD_STYLE, 'style');
      };

      // post fetch a script you can define by setting Aj.ADD_SCRIPT
      // right before the call to Aj.open();
      if (Aj.ADD_SCRIPT) {
        Ajt.postFetch(Aj.ADD_SCRIPT, 'script');
      };

      var callback;
      if (callback = Aj.__steps[Aj.__currentStep].callback) {
        eval(callback + '()');
      };

      Aj.redrawEverything();
    },
   
    prev: function() {
      if (Aj.__currentStep == 0) {
        return ;
      };

      // we will not change url
      var callback;
      if (Aj.__steps[Aj.__currentStep].pageUrl == Aj.__steps[Aj.__currentStep - 1].pageUrl) {
        if (callback = Aj.__steps[Aj.__currentStep].callback) {
          eval(callback + '(true)');
        };

        Aj.__currentStep--;

        if (callback = Aj.__steps[Aj.__currentStep].callback) {
          eval(callback + '()');
        };

        Aj.redrawEverything();
        return ;
      };

      var prevUrl = Aj.__steps[Aj.__currentStep - 1].pageUrl;
      var urlSplit = prevUrl.split('?');
      var urlQuery = urlSplit[1] || false;
      if (Aj.urlPassTourParams) {
        prevUrl+= (urlQuery ? '&' : '?') + 'tourId=' + Aj.tourId + (Aj.skinId ? '&skinId=' + Aj.skinId + '&fromNext=1' : '');
      };

      window.location.href = prevUrl;
    },

    next: function() {
      if (Aj.__currentStep == Aj.__steps.length - 1) {
        return ;
      };
      var callback;
      if (Aj.__steps[Aj.__currentStep].pageUrl == Aj.__steps[Aj.__currentStep + 1].pageUrl) {
        if (callback = Aj.__steps[Aj.__currentStep].callback) {
          eval(callback + '(true)');
        };

        Aj.__currentStep++;

        if (callback = Aj.__steps[Aj.__currentStep].callback) {
          eval(callback + '()');
        };

        Aj.redrawEverything();
        return ;
      };

      var nextUrl = Aj.__steps[Aj.__currentStep + 1].pageUrl;

      var urlSplit = nextUrl.split('?');
      var urlQuery = urlSplit[1] || false;
      if (Aj.urlPassTourParams) {
        nextUrl+= (urlQuery ? '&' : '?') + 'tourId=' + Aj.tourId + (Aj.skinId ? '&skinId=' + Aj.skinId : '');
      };

      window.location.href = nextUrl;
    },

    attachToExpose: function(trbl) {
      _trbl = trbl;
      var ajControl = Ajt.$('ajControl'),
      ajcWidth  = Ajt.getWidth(ajControl),
      ajcHeight = Ajt.getHeight(ajControl),
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
      };

      switch (_trbl.charAt(1)) {
      case 't':
        arrowTop    = coords.t;
        controlTop  = coords.t;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 't') {
          controlTop  = coords.t - ajcHeight + 30;
        };
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'm') {
          controlTop  = coords.t - ajcHeight / 2 + 15;
        };
        break;
      case 'm':
        arrowTop   = coords.t + coords.h / 2 - 15;
        controlTop = coords.t + coords.h / 2 - ajcHeight / 2;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 't') {
          controlTop  = arrowTop - ajcHeight + 30;
        };
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'b') {
          controlTop  = arrowTop;
        };
        break;
      case 'b':
        arrowTop    = coords.b - 30;
        controlTop  = coords.b - ajcHeight;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'b') {
          controlTop  = coords.b - 30;
        };
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'm') {
          controlTop  = coords.b - ajcHeight / 2 - 15;
        };
        break;
      case 'l':
        arrowLeft   = coords.l;
        controlLeft = coords.l;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'l') {
          controlLeft = coords.l - ajcWidth + 30;
        };
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'c') {
          controlLeft = coords.l - ajcWidth / 2 + 15;
        };
        break;
      case 'c':
        arrowLeft   = coords.l + coords.w / 2 - 15;
        controlLeft = coords.l + coords.w / 2 - ajcWidth / 2;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'l') {
          controlLeft = arrowLeft - ajcWidth + 30;
        };
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'r') {
          controlLeft = arrowLeft;
        };
        break;
      case 'r':
        arrowLeft   = coords.r - 30;
        controlLeft = coords.r - ajcWidth;
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'r') {
          controlLeft = coords.r - 30;
        };
        if (_trbl.charAt(2) && _trbl.charAt(2) == 'c') {
          controlLeft = coords.r - ajcWidth / 2 - 15;
        };
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
      };

      var ajControl   = Ajt.$('ajControl');
      var ajcTop      = Ajt.getTop(ajControl);
      var ajcHeight   = Ajt.getHeight(ajControl);
      var ajcBottom   = Ajt.getBottom(ajControl);
      var vpScrollTop = Ajt.viewport().scrollTop;
      var vpHeight    = Ajt.viewport().height;

      var coords = Aj.Expose.getCoords();
      var superTop    = Math.min(coords.t, ajcTop);
      var superBottom = Math.max(coords.b, ajcBottom);
      var superHeight = superBottom - superTop;

      var minScrollTop = ajcTop - 20;
      var maxScrollTop = ajcBottom + 20 - vpHeight;

      // everything is fitting, no need to jump
      if (superTop >= vpScrollTop && superBottom <= vpScrollTop + vpHeight) {
        return ;
      };

      // Control heigher than viewport?
      if (ajcHeight >= vpHeight) {
        window.scroll(0, ajcTop - 20); // align to control top
        return ;
      };

      var scrollTo = 0;
      // trbl = b
      if (ajcBottom == superBottom) {
        scrollTo = superBottom - vpHeight + 20;
      } else {
        scrollTo = superTop - 20;
      };

      window.scroll(0, Math.max(maxScrollTop, Math.min(minScrollTop, scrollTo)));
    },

    refresh: function() {
      if (!_trbl) {
        return ;
      };

      Aj.Control.attachToExpose(_trbl);
    }
  };
})();


Aj.Expose = (function(){
  var _element  = null,  // jquery selector MUST return dom el
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
  };

  function _drawTopCover() {
    if (!(cover = Ajt.$('ajCoverTop'))) {
      var cover       = document.createElement('div');
      cover.id        = 'ajCoverTop';
      cover.className = 'ajCover';
      if (Aj.mouseCanNavigate) { cover.onclick = Aj.Control.next; };
      document.body.appendChild(cover);
    };

    var height = Math.max(0, _coords.t);
    cover.style.position  = _position;
    cover.style.top         = '0px';
    cover.style.height      = height + 'px';
  };

  function _drawBottomCover() {
    if (!(cover = Ajt.$('ajCoverBottom'))) {
      var cover       = document.createElement('div');
      cover.id        = 'ajCoverBottom';
      cover.className = 'ajCover';
      if (Aj.mouseCanNavigate) { cover.onclick = Aj.Control.next;  }
      document.body.appendChild(cover);
    }
    var top = Math.max(0, _coords.b);
    if (_position == 'fixed') {
      cover.style.height = Math.max(0, Ajt.viewport().height - top) + 'px';
    } else {
      cover.style.height = (Ajt.getWindowInnerHeight() - top) + 'px';
    };
    cover.style.top         = top + 'px';
    cover.style.position    = _position;

  };

  function _drawLeftCover() {
    if (!(cover = Ajt.$('ajCoverLeft'))) {
      var cover       = document.createElement('div');
      cover.id        = 'ajCoverLeft';
      cover.className = 'ajCover';
      if (Aj.mouseCanNavigate) { cover.onclick = Aj.Control.next;  }
      document.body.appendChild(cover);
    }

    var width = Math.max(0, _coords.l);
    cover.style.position    = _position;
    cover.style.top         = _coords.t + 'px';
    cover.style.height      = _coords.h + 'px';
    cover.style.width       = width + 'px';

  };

  function _drawRightCover() {
    if (!(cover = Ajt.$('ajCoverRight'))) {
      var cover             = document.createElement('div');
      cover.id              = 'ajCoverRight';
      cover.className       = 'ajCover';
      if (Aj.mouseCanNavigate) { cover.onclick = Aj.Control.next; };
      document.body.appendChild(cover);
    };

    var width = Math.max(0, _coords.r);
    cover.style.position    = _position;
    cover.style.top         = _coords.t + 'px';
    cover.style.height      = _coords.h + 'px';
    cover.style.left        = _coords.r + 'px';

  };

  function _drawExposeCover() {
    if (!(cover = Ajt.$('ajExposeCover'))) {
      var cover = document.createElement('div');
      cover.id  = 'ajExposeCover';
      if (Aj.mouseCanNavigate) {
        cover.onclick = Aj.Control.next;
      };
      document.body.appendChild(cover);
    };
    cover.style.position    = _position;
    cover.style.top         = _coords.t + 'px';
    cover.style.left        = _coords.l + 'px';
    cover.style.height      = _coords.h + 'px';
    cover.style.width       = _coords.w + 'px';
  }

  function _drawCover() {
    if (Aj.mouseCanNavigate) {
      document.body.oncontextmenu = function(){Aj.Control.prev();return false};
    };
    _drawTopCover();
    _drawBottomCover();
    _drawLeftCover();
    _drawRightCover();
    _drawExposeCover();
  }

  return {
    expose: function(element, padding, position) {
      _element       = element;
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
//        if (el.offsetParent){ return $(el).offset().top + Ajt.getTop(el.offsetParent); }
//    return $(el).offset().top;
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
    };

    return {
      scrollTop:  y,
      width:      e[a+'Width'],
      height:     e[a+'Height']
    };
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
    };
   
    if (self.innerHeight) { // all except Explorer
      height = self.innerHeight;
    } else if (dde && dde.clientHeight) { // Explorer 6 Strict Mode
      height = dde.clientHeight;
    } else if (document.body) { // other Explorers
      height = db.clientHeight;
    };

    // for small pages with total height less then height of the viewport
    return (inner >= height) ? inner : height;
  },

  /**
   * Checks if passed href is *included* in current location's href
   *
   * @param href URL to be matched against
   *
   * @example Ajt.urlMatch('http://mysite.com/domains/')
   */
  urlMatch: function(href) {
    return (
      location.href == href                   ||
      location.href.indexOf(href + '&') != -1 ||
      location.href.indexOf(href + '?') != -1
    );
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
    };

    var urlQuery = urlSplit[1];
    var paramsSplit = urlSplit[1].split('&');
    for (var i = 0; i < paramsSplit.length; i++) {
      var paramSplit = paramsSplit[i].split('=');
      if (paramSplit[0] == paramName) {
        return paramSplit[1] || false;
      }
    };

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
   * Note that a HEAD tag needs to be existent in the current document
   */

  postFetch: function(url, type, onerror) {
    var scriptOrStyle;
    if (type === 'script') {
      scriptOrStyle = document.createElement('script');
      scriptOrStyle.type = 'text/javascript';
      scriptOrStyle.src  = url;
    } else {
      scriptOrStyle = document.createElement('link');
      scriptOrStyle.type = 'text/css';
      scriptOrStyle.rel  = 'stylesheet';
      scriptOrStyle.href = url;
    };

    if (onerror) { scriptOrStyle.onerror = onerror; };
    // header MUST be present, else js error
    document.getElementsByTagName('head')[0].appendChild(scriptOrStyle);
    return ;
  }
};

setTimeout(function(){
  Aj.open(); // call Aj.open() to catch possibly set url params
}, 500);