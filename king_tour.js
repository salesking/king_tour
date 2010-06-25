/**
 * KingTours's main class
 */

KingTour = (function(){

  var _resetHash = {},
  _existingOnresize = null; // later used as reference to onresize method of window/document

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
          KingTour.close();break;
        case 8: // backspace
        case 40: // down
        case 37: // left
          KingTour.Dialog.prev();break;
        case 13: // return
        case 38: // up
        case 39: // right
          KingTour.Dialog.next();break;
        case 32: // space - needs bugfix since it scrolls the window body
          e.returnValue = false;
          KingTour.Dialog.next();
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
    var tourDefElements = jQuery(KingTour.tourSel);
    // iterate over the dom el inside the tour definition
    for ( var i = 0; i < tourDefElements.length; i++) {
      if (tourDefElements[i].getAttribute('id') == tourId) {
        return tourDefElements[i];
      }
    }
    KingToolz.alert('Sorry Babe, the King cannot find a Dom element with Selector"'
                    + KingTour.tourSel + '" and ID "' + tourId + '" .. fire up firebug');
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
        KingTour.__currentStep = stepIndex;
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
        if (KingToolz.getUrlParam(location.href, 'tourStep') && url_matches) {
          KingTour.__currentStep = parseInt(KingToolz.getUrlParam(location.href, 'tourStep')); //implicit conversion to int
        }

        steps[stepIndex].body = cn[j].innerHTML;
        steps[stepIndex].pageUrl = page.url;
        stepIndex++
      }
    }
    return steps;
  }

  function _saveResetValues() {
    _resetHash.textOf             = KingTour.textOf;
    _resetHash.textClose          = KingTour.textClose;
    _resetHash.textPrev           = KingTour.textPrev;
    _resetHash.textNext           = KingTour.textNext;
    _resetHash.onCloseClickStay   = KingTour.onCloseClickStay;
    _resetHash.doCoverBody        = KingTour.doCoverBody;
    _resetHash.mouseNav           = KingTour.mouseNav;
    _resetHash.urlPassTourParams  = KingTour.urlPassTourParams;
    _resetHash.currentStep        = 0;
    _resetHash.dialogSel          = KingTour.dialogSel;
    _resetHash.dialogBodySel      = KingTour.dialogBodySel ;
    _resetHash.prevSel            = KingTour.prevSel ;
    _resetHash.nextSel            = KingTour.nextSel ;
    _resetHash.tourSel            = KingTour.tourSel ;
  }

  function _doResetValues() {
    KingTour.textOf             = _resetHash.textOf;
    KingTour.textClose          = _resetHash.textClose;
    KingTour.textPrev           = _resetHash.textPrev;
    KingTour.textNext           = _resetHash.textNext;
    KingTour.onCloseClickStay   = _resetHash.onCloseClickStay;
    KingTour.doCoverBody        = _resetHash.doCoverBody;
    KingTour.mouseNav           = _resetHash.mouseNav;
    KingTour.urlPassTourParams  = _resetHash.urlPassTourParams;
    KingTour.__currentStep      = _resetHash.currentStep;
    KingTour.dialogSel          = _resetHash.dialogSel;
    KingTour.dialogBodySel      = _resetHash.dialogBodySel;
    KingTour.prevSel            = _resetHash.prevSel;
    KingTour.nextSel            = _resetHash.nextSel;
    KingTour.tourSel            = _resetHash.tourSel;

  }

  return {
    // constants
    BASE_URL          : 'http://github.com/salesking/king_tour/raw/master/', // do not forget trailing slash!
    // public attributes
    // - set these through url (...&tourId=MyTour&skinId=Safari...)
    // - OR right before the call to KingTour.open()
    tourId            : null,  // mandatory: if not set, tour will not open
    skinId            : null,  // optional: if not set, skin "salesking" will be used

    // Options - set these right before the call to KingTour.open()
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
    // jQuery selectors for modal popup and soem of its content elements. Set those yourself if you have custom html/css for the dialog box.
    // The default dialog template inserts a div with this id. The selector is used for the modal to be inserted and closed
    dialogSel     : '#kDialog',
    dialogBodySel : '#kDialogBody',
    prevSel       : '#kPrev',
    nextSel       : '#kNext',
    tourSel       : '.kTour',

    // protected attributes - don't touch (used by other KingTour.* classes)
    __steps             : [],
    __currentStep       : null,

    /**
     * Initializes tour, creates transparent layer and causes Amberjack Dialog
     * to open the skin's template (control.tpl.js) into document. Call this
     * manually right after inclusion of this library. Don't forget to pass
     * tourId param through URL to show tour!
     *
     * Iterates child DIVs of DIV.kTourDef or to whateber KingTour.tourSel is
     * set and extracts tour pages
     *
     * @example KingTour.open()
     * Note that a HEAD tag needs to be existent in the current document
     */

    open: function() {
      // set KingTour.tourId
      KingTour.tourId = KingTour.tourId || KingToolz.getUrlParam(location.href, 'tourId');
      if (!KingTour.tourId) { return ; /* do nothing if no tourId is found */  }
      //remember settings
      _saveResetValues();
      //grad the tour definition
      var tourDef = _getTourDef(KingTour.tourId);
      KingTour.__steps  = _transformTourDefToSteps(tourDef);

      // set KingTour.skinId
      KingTour.skinId = KingTour.skinId || KingToolz.getUrlParam(location.href, 'skinId');
      KingTour.skinId = KingTour.skinId || 'salesking';
      // set KingTour.closeUrl
      KingTour.closeUrl    = tourDef.getAttribute('title') || false;
      // get Style
      KingToolz.postFetch(KingTour.BASE_URL + 'skins/' + KingTour.skinId.toLowerCase() + '/style.css', 'style');
      // trigger open control bubble
      KingTour.Dialog.open();
      // mix KingTour.onresize into existing onresize function, so we can reset it later
      var ref = document.onresize ? document : window;
      KingTour._existingOnresize = ref.onresize;
      ref.onresize = function() {
        KingTour.onResize();
        if (KingTour._existingOnresize) {
          KingTour._existingOnresize();
        }
      };
      // call KingTour.onResize initially once
      KingTour.onResize();
      _initKeyboard();
      //run a given open callback
      if (typeof KingTour.openCallback == 'function') { KingTour.openCallback(KingTour); }
      //append mouse click event to go to next dialog
      if (KingTour.mouseNav) {
        jQuery('.kCover, #kExposeCover').live('click', function() {
          KingTour.Dialog.next();
        });
      }
      //listen for prev/next/close events
      jQuery('#kNext').live('click', function () {
        KingTour.Dialog.next();
        return false;
      });
      jQuery('#kPrev').live('click', function () {
        KingTour.Dialog.prev();
        return false;
      });
      jQuery('#kClose').live('click', function () {
        KingTour.close();
        return false;
      });

    },

    onResize: function() {
      setTimeout( function(){
        KingTour.redrawEverything();
      }, 100);
    },

    redrawEverything: function() {
      //set disabled class for prev/next buttons
      jQuery('' + KingTour.prevSel + ', ' + KingTour.nextSel + '').removeClass();
      if (KingTour.__currentStep == 0) {
        jQuery(KingTour.prevSel).addClass('disabled');
      }
      if (KingTour.__currentStep == KingTour.__steps.length - 1) {
        jQuery(KingTour.nextSel).addClass('disabled');
      }

      var step = KingTour.__steps[ KingTour.__currentStep ];
      // set bubble content to current step content
      jQuery(KingTour.dialogBodySel).html(step.body);
      //set current step number
      jQuery('#kCurrentStep').text( KingTour.__currentStep + 1 );
      KingTour.Expose.draw(step.el, step.padding);
      KingTour.Dialog.attachToExpose(step.pos);
      KingTour.Dialog.ensureVisibility();
    },

    /**
     * Gets called, whenever the user clicks on the close button of Amberjack control
     * @author Arash Yalpani
     *
     * @example KingTour.close()
     */
    close: function() {
      // reset resize handler
      var ref = document.onresize ? document : window;
      ref.onresize = KingTour._existingOnresize ? KingTour._existingOnresize : null;
      //reset mouse contextmenu
      if (KingTour.mouseNav) {  document.body.oncontextmenu = null; }
      // execute close Callback if present
      if (typeof KingTour.closeCallback == 'function') {  KingTour.closeCallback(KingTour); }
      _doResetValues();
      _reset_keyboard();
      //kick all markup
      jQuery('' + KingTour.dialogSel + ', .kCover, #kArrow, #kExposeCover').remove();
      //stay in here
      if (KingTour.onCloseClickStay) {  return null; }
      //go to the closeUrl if present
      if (KingTour.closeUrl) {  window.location.href = KingTour.closeUrl;  }
      return null;
    }
  }
})();

/**
 * Tour Dialog class
 */

KingTour.Dialog = (function(){
  var _pos    = null;

  function _fillTemplate() {
    var tpl_parsed = null,
        // use given or default template
        tpl_raw = KingTour.template ? KingTour.template : KingTour.Dialog.defaultTemplate;

    tpl_parsed = tpl_raw.replace(/{skinId}/, KingTour.skinId)
      .replace(/{textOf}/,        KingTour.textOf)
      .replace(/{textClose}/,     KingTour.textClose)
      .replace(/{textPrev}/,      KingTour.textPrev)
      .replace(/{textNext}/,      KingTour.textNext)
      .replace(/{currentStep}/,   KingTour.__currentStep + 1)
      .replace(/{stepCount}/,     KingTour.__steps.length)
      .replace(/{body}/,          KingTour.__steps[KingTour.__currentStep].body);
    return tpl_parsed;
  }

  /**
   * @param arrowSize Integer size of the arrow, actually set in css
   * @param borderRadius Integer the dialog's order radius,
   * If the dialog has round borders the arrow cannot sit on the edges of the
   * dialog and is moved by the border radius
   * @param dHeight Integer dialog height
   * @param dWidth Integer dialog width
   * @param pos String position tripple => ltm
  */
  function _drawArrow(arrowSize, borderRadius, dHeight, dWidth, pos) {
      //arrow div, also responsible for outer border
      var arrow = jQuery('.arrow'),
        //inner arrow, holds arrow bg-color
        arrow_inner = jQuery('.arrow-inner'),
        //hash applied to .css inline styles for arrow/inner divs
        base_css = {},
        dialogPos = pos.charAt(0), // fist char in position def => t b l r
        dialogAlign = pos.charAt(2); // Third char in position def => m b t / l c r
      //kick inline styles & classes, re-add base classes
      arrow.removeAttr('style').removeClass().addClass('arrow') ;
      arrow_inner.removeAttr('style').removeClass().addClass('arrow-inner');

    switch (dialogPos) {
       //dialog on top / bottom
      case 't': case 'b':
        if (dialogPos === 't'){ 
          arrow.addClass('arrow-down');
          arrow_inner.addClass('arrow-inner-down');         
        } else{ // bottom
          arrow.addClass('arrow-up');
          arrow_inner.addClass('arrow-inner-up');
        }
        // alignment under the bubble border-radius + right/center/right
        switch (dialogAlign) {
          case 'l': // left tl t
            base_css['right'] = arrowSize - borderRadius + 'px';
            break;
          case 'c': // center
            base_css['left'] = dWidth/2 - arrowSize + 'px';
            break;
          case 'r': // right
            base_css['left'] = borderRadius + 'px';
            break;
        }
        break;
      // right, left aligned dialog
      case 'r': case 'l':
        if (dialogPos === 'r') {
          arrow.addClass('arrow-lft'); //arrow pointing left <
          arrow_inner.addClass('arrow-inner-lft');
        } else{ // left >
          arrow.addClass('arrow-rgt');
          arrow_inner.addClass('arrow-inner-rgt');
        }
        // alignment above the bubble border-radius + right/center/right
        switch (dialogAlign) {
          case 't': // top align dialog
            base_css['bottom'] =  borderRadius + 'px';
            break;
          case 'm': // middle
            base_css['top'] = (dHeight/2 - arrowSize) + 'px';             
            break;
          case 'b': // bottom
            base_css['top'] = borderRadius + 'px';
            break;
        }
        break;
      }
      arrow.css(base_css);
  }

  return {
    /**
     * Callback handler for template files. Takes template HTML and fills placeholders
     *
     * @example KingTour.Dialog.open()
     * Note that this method should be called directly through control.tpl.js files
     */

    open: function() {
      var dialog = jQuery( KingTour.dialogSel ),
          tplHtml = _fillTemplate();
      //insert dialog div bubble only once, else div already present just replace existing
      (dialog.length == 0 ) ? jQuery(tplHtml).appendTo("body")
                            : jQuery(KingTour.dialogSel).replaceWith(tplHtml);
      
      // No URL was set AND no click-close-action was configured:
      if (!KingTour.closeUrl && !KingTour.onCloseClickStay) {
        jQuery('#kClose').hide();
      }
      // post fetch a CSS file you can define by setting KingTour.ADD_STYLE
      // right before the call to KingTour.open();
      if (KingTour.ADD_STYLE) {
        KingToolz.postFetch(KingTour.ADD_STYLE, 'style');
      }
      // post fetch a script you can define by setting KingTour.ADD_SCRIPT
      // right before the call to KingTour.open();
      if (KingTour.ADD_SCRIPT) {
        KingToolz.postFetch(KingTour.ADD_SCRIPT, 'script');
      }
      //execute callback from current step
      var callback;
      if (callback = KingTour.__steps[KingTour.__currentStep].callback) {
        eval(callback + '()');
      }

      KingTour.redrawEverything();
    },
   
    prev: function() {
      if (KingTour.__currentStep == 0) {
        return ;
      }

      // we will not change url
      var callback;
      if (KingTour.__steps[KingTour.__currentStep].pageUrl == KingTour.__steps[KingTour.__currentStep - 1].pageUrl) {
        if (callback = KingTour.__steps[KingTour.__currentStep].callback) {
          eval(callback + '(true)');
        }

        KingTour.__currentStep--;

        if (callback = KingTour.__steps[KingTour.__currentStep].callback) {
          eval(callback + '()');
        }

        KingTour.redrawEverything();
        return ;
      }

      var prevStep = KingTour.__currentStep - 1,
          prevUrl = KingTour.__steps[prevStep].pageUrl,
          urlSplit = prevUrl.split('?'),
          urlQuery = urlSplit[1] || false;
      if (KingTour.urlPassTourParams) {
        prevUrl+= (urlQuery ? '&' : '?') + 'tourId=' + KingTour.tourId + '&tourStep=' + prevStep + (KingTour.skinId ? '&skinId=' + KingTour.skinId : '');
      }

      window.location.href = prevUrl;
    },

    next: function() {
      if (KingTour.__currentStep == KingTour.__steps.length - 1) {
        return ;
      }
      var callback;
      //stay on the same page
      if (KingTour.__steps[KingTour.__currentStep].pageUrl == KingTour.__steps[KingTour.__currentStep + 1].pageUrl) {
        if (callback = KingTour.__steps[KingTour.__currentStep].callback) {
          eval(callback + '(true)');
        }

        KingTour.__currentStep++;

        if (callback = KingTour.__steps[KingTour.__currentStep].callback) {
          eval(callback + '()');
        }
        KingTour.redrawEverything();
        return ;
      }
      //construct next link
      var nextStep = KingTour.__currentStep + 1,
          nextUrl = KingTour.__steps[nextStep].pageUrl,
          urlSplit = nextUrl.split('?'),
          urlQuery = urlSplit[1] || false;
      if (KingTour.urlPassTourParams) {
        nextUrl+= (urlQuery ? '&' : '?') + 'tourId=' + KingTour.tourId + '&tourStep=' + nextStep + (KingTour.skinId ? '&skinId=' + KingTour.skinId : '');
      }

      window.location.href = nextUrl;
    },

    attachToExpose: function(pos) {
      _pos = pos;
      var dialog = jQuery(KingTour.dialogSel)[0],
          dWidth  = KingToolz.getWidth(dialog),
          dHeight = KingToolz.getHeight(dialog),
          coords  = KingTour.Expose.getCoords(),
          dialogPos = _pos.charAt(0),
          arrowPos    = _pos.charAt(1),
          dialogAlign = _pos.charAt(2),
          dialogTop  = 0,
          dialogLeft = 0,
          // the arrow size is actually defined in css, but needed in here too for math
          arrowSize = 16,
          //If the dialog has round borders the arrow cannot sit on the edges of the
          //dialog and must be moved by the border size, also definied in css
          borderRadius = 8;

      // Positioning of the dialog, around the exposed area
      switch (dialogPos) {
      case 't':
        //set css top taking dialog height and arrow height into account (move up by hight+arrow Size)
        dialogTop  = coords.t - arrowSize - dHeight
        break;
      case 'b':
        dialogTop  = coords.b + arrowSize;
        break;
      case 'l':
        dialogLeft = coords.l - arrowSize - dWidth;
        break;
      case 'r':
        dialogLeft = coords.r + arrowSize;
        break;
      }
      // switch through Arrow position(second el) and with it the alignment of the dialog
      switch (arrowPos) {
      case 't': // top rt lt
        dialogTop  = coords.t - borderRadius; //rtb ltb
        if (dialogAlign == 't') { //ltt, rtt
          dialogTop  = coords.t - dHeight + arrowSize*2 + borderRadius;
        }
        if (dialogAlign == 'm') { //ltm rtm
          dialogTop  = coords.t - dHeight / 2 + arrowSize;
        }
        break;
      case 'm': // middle rm lm
        var center = coords.t + coords.h / 2;
        dialogTop = center - dHeight / 2;
        if (dialogAlign == 't') { //rmt, lmt
          dialogTop  = center - dHeight + arrowSize + borderRadius;
        }
        if (dialogAlign == 'b') { //rmb, lmb
          dialogTop  = center - arrowSize - borderRadius;
        }
        break;
      case 'b': //rb lb bottom
        dialogTop  = coords.b - dHeight + borderRadius; //rbt lbt
        if (dialogAlign == 'b') { //rbb, lbb,
          dialogTop = coords.b - arrowSize*2 - borderRadius;
        }
        if (dialogAlign == 'm') { //rbm, lbm
          dialogTop  = coords.b - dHeight / 2 - arrowSize;
        }
        break;
      case 'l': // left tlr tlc tll blr bll blc
        dialogLeft = coords.l - borderRadius;// tlr, blr
        if (dialogAlign == 'l') { //tll, bll
          dialogLeft = coords.l - dWidth + arrowSize*2 + borderRadius;
        }
        if ( dialogAlign == 'c') { // tlc, blc
          dialogLeft = coords.l - dWidth / 2 + arrowSize;
        }       
        break;
      case 'c': // center tcl, tcr, bcl , bcr
        var center = coords.l + coords.w/2; //left val of expose - half exposed width
        dialogLeft = center - dWidth / 2; //tcc, bcc
        if (dialogAlign == 'l') { //tcl bcl
          dialogLeft = center - dWidth + arrowSize + borderRadius;
        }
        if (dialogAlign == 'r') { //tcr bcr
          dialogLeft = center - arrowSize - borderRadius;
        }
        break;
      case 'r': //right trl trc trr brl brr brc
        dialogLeft = coords.r - dWidth + borderRadius; // trl
        if (dialogAlign == 'r') { //trr brr
          dialogLeft = coords.r - arrowSize*2 - borderRadius;
        }
        if (dialogAlign == 'c') { //trc brc
          dialogLeft = coords.r - dWidth / 2 - arrowSize;
        }
        break;
      }
      //set css for the arrow
      _drawArrow(arrowSize, borderRadius, dHeight, dWidth, _pos);
      //set top/left positions for the dialog
      jQuery(dialog).css({
        'position' : 'absolute',
        'top' : dialogTop  + 'px',
        'left' : dialogLeft + 'px',
        'right' : 'auto',
        'bottom' : 'auto'
      });
    },

    ensureVisibility: function() {
      
      var dialog   = jQuery(KingTour.dialogSel)[0],
        dTop      = KingToolz.getTop(dialog),
        dHeight   = KingToolz.getHeight(dialog),
        dBottom   = KingToolz.getBottom(dialog),
        vpScrollTop = KingToolz.viewport().scrollTop,
        vpHeight    = KingToolz.viewport().height,
        // coordinates
        coords = KingTour.Expose.getCoords(),
        superTop    = Math.min(coords.t, dTop),
        superBottom = Math.max(coords.b, dBottom),
        //scrolling
        minScrollTop = dTop - 20,
        maxScrollTop = dBottom + 20 - vpHeight;

      // everything is fitting, no need to jump
      if (superTop >= vpScrollTop && superBottom <= vpScrollTop + vpHeight) {
        return ;
      }

      // Dialog heigher than viewport?
      if (dHeight >= vpHeight) {
        window.scroll(0, dTop - 20); // align to control top
        return ;
      }

      var scrollTo = (dBottom == superBottom) 
                      ? superBottom - vpHeight + 2 /* pos = b */
                      : superTop - 20;
    
      window.scroll(0, Math.max(maxScrollTop, Math.min(minScrollTop, scrollTo)));
    },

    refresh: function() {
      if (!_pos) {
        return ;
      }

      KingTour.Dialog.attachToExpose(_pos);
    },

    /**
     * Returns html string for default control bubble template. You can set your
     * own template within KingTour objects settings =>
     * KingTour.template = '<div>my custom bubble</div>';
     * KingTour.open();
     * Just make sure your html contains the right id's so the tour content can be set
     **/
    defaultTemplate: 
      '<div id="kDialog">' +
        '<div id="kDialogHead">' +
          '<a id="kPrev" href="#"><span>{textPrev}</span></a>' +
          '<span id="kCount"><span id="kCurrentStep">{currentStep}</span> {textOf} <span id="kStepCount">{stepCount}</span></span>' +
          '<a id="kNext" href="#"><span>{textNext}</span></a>' +
          '<a id="kClose" href="#">{textClose}</a>' +
        '</div>' +
        '<div id="kDialogBody">{body}</div>' +
        '<div class="arrow">' +
          '<div class="arrow-inner"></div>' +
        '</div>'+

      '</div>'
    
  };
})();


KingTour.Expose = (function() {
  var _element  = null,  // jquery selector MUST return array of dom elements from which the first el is taken
  _padding      = 0,
  _coords       = [];

  /**
   * calculate coordinates for the help elements
   * */
  function _calcCoords() {
    // use the first element jQuery finds
    var el = jQuery(_element)[0],
    coords = {};
    coords.t = KingToolz.getTop(el)     - _padding;
    coords.r = KingToolz.getRight(el)   + _padding;
    coords.b = KingToolz.getBottom(el)  + _padding;
    coords.l = KingToolz.getLeft(el)    - _padding;
    coords.w = KingToolz.getWidth(el)   + _padding * 2;
    coords.h = KingToolz.getHeight(el)  + _padding * 2;
    return coords;
  }

  function _drawTop() {
    var cover = ( 0 === jQuery('#kCoverTop').length )
                ? jQuery('<div id="kCoverTop" class="kCover"></div>').appendTo("body")
                : jQuery('#kCoverTop');
    cover.css({
      'position' : 'absolute',
      'top' : '0px',
      'height' : Math.max(0, _coords.t) + 'px'
    });
  }

  function _drawBottom() {
    var cover = ( 0 === jQuery('#kCoverBottom').length )
                ? jQuery('<div id="kCoverBottom" class="kCover"></div>').appendTo("body")
                : jQuery('#kCoverBottom');
    var top = Math.max(0, _coords.b),
        height = document.documentElement.scrollHeight - top ;
    cover.css({
      'position' : 'absolute',
      'top' : top + 'px',
      'height' : height + 'px'
    });
  }

  function _drawLeft() {
    var cover = (jQuery('#kCoverLeft').length == 0)
                ? jQuery('<div id="kCoverLeft" class="kCover"></div>').appendTo("body")
                : jQuery('#kCoverLeft');

    cover.css({
      'position' : 'absolute',
      'top' : _coords.t + 'px',
      'width' : Math.max(0, _coords.l) + 'px',
      'height' : _coords.h + 'px'
    });
  }

  function _drawRight() {
    var cover = (0 === jQuery('#kCoverRight').length)
                 ? jQuery('<div id="kCoverRight" class="kCover"></div>').appendTo("body")
                 : jQuery('#kCoverRight');
    cover.css({
      'position' : 'absolute',
      'top' : _coords.t + 'px',
      'left' : _coords.r + 'px',
      'height' : _coords.h + 'px'
    });
  }

  function _drawHighlight() {
    var cover = ( 0 === jQuery('#kExposeCover').length)
                ? jQuery('<div id="kExposeCover"></div>').appendTo("body")
                : jQuery('#kExposeCover');
    cover.css({
      'position' : 'absolute',
      'top' : _coords.t + 'px',
      'left' : _coords.l + 'px',
      'height' : _coords.h + 'px',
      'width' : _coords.w + 'px'
    });
  }

  function _drawCover() {
    if (KingTour.mouseNav) { // add previous navigation if right mouse is clicked
      document.body.oncontextmenu = function(){KingTour.Dialog.prev();return false};
    }
    _drawTop();
    _drawBottom();
    _drawLeft();
    _drawRight();
    _drawHighlight();
  }

  // KingTour.Expose public class functions
  return {
    draw: function(element, padding) {
      _element  = element;
      _padding  = padding;
      _coords   = _calcCoords();
      _drawCover();
    },

    refresh: function() {
      _coords = _calcCoords();
      _drawCover();
    },

    getCoords: function() {
      return _coords;
    }   
  }
})();


/**
 * Amberjack Tools
 *
 * Capsulates static helper functions
 * @author Arash Yalpani
 */

KingToolz = {

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
    if (el.offsetParent){ return el.offsetLeft + KingToolz.getLeft(el.offsetParent); }
    return el.offsetLeft;
  },

  getTop: function(el) {
    if (el.offsetParent){ return el.offsetTop + KingToolz.getTop(el.offsetParent); }
    return el.offsetTop;
  },

  getRight: function(el) {
    return KingToolz.getLeft(el) + KingToolz.getWidth(el);
  },

  getBottom: function(el) {
    return KingToolz.getTop(el) + KingToolz.getHeight(el);
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
   * @example KingToolz.getWindowInnerHeight()
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
      if ( 0 == jQuery('link[href='+ url +']').length ) {
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
  KingTour.open(); // call KingTour.open() to catch possibly set url params
}, 500);