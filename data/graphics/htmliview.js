//
// Javascript functions to support IsoView in the HTML documents that are
// published by Arbortext Editor
//

// An example of a graphics set markup
// <span id="iview_1_5_3">
//   <span id="graphic-one">
//     <span class="viewpath">mytest_files/fileone.iso</span>
//     <span class="viewlinks">...</span>
//   </span>
//   <span id="graphic-two">
//     <span class="viewpath">mytest_files/filetwo.iso</span>
//     <span class="viewlinks">...</span>
//   </span>
//   <script>iview_Insert('iview_1_5_3', ...);</script>
// </span>
//
// deckelem: iview_1_5-3
// cardelem: graphic-one, graphic-two
//
// --Property----------  --Description-----
// deckelem._servicecenter this script is used in service center
// deckelem._curcard:    graphic-one or graphic-two
//                       depending on which one is currently displayed in ivx
// cardelem._links[]:    the target of a hotspot link
// cardelem._linkdata[]: the target data of a hotspot link

if (msieversion() > 0){
    window.onload = function() {
        var objs = document.getElementsByTagName('object');
        for (var i = 0; i < objs.length; i++) {
            if (objs[i].getAttribute("type") === "image") {
                try {
                    new ActiveXObject('METAWEB.MetaWebCtrl.1');
                } catch (e) {
                    alert("未安装电路图参看插件. 请点击确定下载电路图参看插件。");
                    window.top.location.href ="../../../techniqueInfo/show/f488766c-0780-44c4-ac40-fb79e2661a6c";
                }
                break;
            }
        }
    };
}

function msieversion() {
	var ua = window.navigator.userAgent;
	var msie = ua.indexOf("MSIE ");
	if (msie > 0){  
		var no = parseInt(ua.substring(msie + 5, ua.indexOf(".", msie)));
		return no;
	} else {
		if(!!navigator.userAgent.match(/Trident.*rv\:11\./)) {
			return 11;
		} else{
			alert('请使用IE浏览器浏览电路图数据。');
		}        
	}
   return 0;
}	


// This function executes a hotspot link from a grobject click.
function ivLinkFromGrobject(ivx, mouse, deckid, grobject)
{
  var deckelem = document.getElementById(deckid);
  if (deckelem == null)
    return;

  var cardid = deckelem._curcard;

  var cardelem = document.getElementById(cardid);
  if (cardelem == null)
    return;

  if (cardelem._links == null)
    return;

  if (grobject in cardelem._links)
    {
      if (mouse == 1)
	{
	  // The grobject is clicked on
	  var target = cardelem._links[grobject];

	  // Jump to the target element
	  // If the target is "D:\abc..." in the local file system or
	  // "x-sc---file..." in Service Center then the target is in a
	  // different HTML file
	  if (target.indexOf(':') < 0 && target.indexOf('x-sc') != 0)
	      window.location.href = target; // a page in the same document
	  else
	    top.location.href = target; // an external page

	  // If the target is an IsoView graphic, execute the targetdata
	  // by highlighting a grobjct, starting an animation sequence,
	  // or changing the view
	  var targetdata = cardelem._linkdata[grobject];
	  if (targetdata != null)
	    {
	      // target is 'somehtml.htm#targetid'
	      var targetid = target.slice(target.indexOf('#') + 1);
	      iview_Link(targetid, targetdata);
	    }
	}
      else
	{
	  // The mouse hovers over the grobjct
	  //    8: kIV_HotSpotFlash
	  // 0xff: red
	  ivx.Iso3HighlightObject(grobject, 8, 0xff);
	}
    }
}

// Collect all the hotpost links of a graphic and store the data in some
// properties of the related element.
function ivCollectLinks(cardelem, hotspotlinks)
{
  if (hotspotlinks == '')
    return;

  // If it is already done, don't do it again
  if (cardelem._links != null)
    return;

  cardelem._links = new Object();
  cardelem._linkdata = new Object();

  // The '|' separates the links
  // link01|link02|link03
  var linkSeparator = '|';
  var linkarr = hotspotlinks.split(linkSeparator);

  for (var i = 0; i < linkarr.length; i++)
    {
      var link = linkarr[i];

      // Examples for link
      // grobj01=idref{elemid01}{...}
      // grobj01=url{http://www.ptc.com}
      var pattern = '([^=]+)=([a-z]+){([^}]+)}(.*)';
      var result = link.match(pattern);

      if (result != null)
	{
	  var source = result[1];
	  var type = result[2];
	  var target = result[3];
	  var linkdata = result[4];

	  if (type == 'idref')
	    {
	      if (target.indexOf('#') < 0)
		target = '#' + target;
	    }

	  cardelem._links[source] = target;
	  cardelem._linkdata[source] = linkdata;
	}
    }
}

// Highlight the target grobject based on WebCGM fragment syntax. This
// includes navigation such as zoom, move, full, and highlighting such
// as newHighlight, addHighlight, and clearHighlight
function ivHighlightObject(ivx, content, manner)
{
  var style = '';
  var rgb = '';

  // manner is "circle+0xff"
  if (manner)
    {
      var result = manner.split('+');
      style = result[0];
      rgb = result[1];
    }

  if (style == '')
    style = 'frame';

  if (rgb == '')
    rgb = 0xff0000;

  // Unfortunately, in IsoView 7.1, if a WebCGM style fragment is used
  // to highlight an object, there is no way to specify the highlight
  // color and highlight style.  As a workaround, we use IsoView's API
  // to highlight the object first.
  if (style != 'frame' || rgb != 0xff0000)
    {
      // content looks like "id(grobj01,zoom+newHighlight)"
      var pattern = '([a-z]+)\\((.+),(?:(.{4})\\+)?(.{3}Highlight)\\)$';
      var result;

      // We only care about those behaviors that have newHighlight
      // or addHighlight.
      if ((result = content.match(pattern)) != null)
	{
	  var objtype = result[1];
	  var objcode = result[2];
	  var navigation = result[3];
	  var highlight = result[4]; 

	  // Further make sure that we are getting the right values.  In
	  // theory, a grobject name can be anything
	  if ((objtype == 'id' || objtype == 'name') &&
	      (navigation == '' || navigation == 'zoom' ||
	       navigation == 'full' || navigation == 'move') &&
	      (highlight == 'newHighlight' || highlight == 'addHighlight'))
	    {
	      var flags = 64;

	      switch (style)
                {
		case 'circle':
		  flags = 64;
		  break;
                case 'fill':
		  flags = 4;
		  break;
                case 'flash':
		  flags = 8;
		  break;
                case 'frame':
		  flags = 2;
		  break;
                }
	      // IsoView's color value is 0xBBGGRR, weird.
	      var bgr = ((rgb & 0xff0000) >> 16) +
		        (rgb & 0x00ff00) +
		        ((rgb & 0x0000ff) << 16);

	      // Need to clear highlight for newHighlight
	      if (highlight == 'newHighlight')
		ivx.Iso3HighlightObject('id(*,clearHighlight)', 0, 0);

	      // Highlight the object
	      var object = objtype + '(' + objcode + ')';
	      ivx.Iso3HighlightObject(object, flags, bgr);

	      // If there is no navigation, we are done; otherwise, we need
	      // to let IsoView's fragment code to handle the navigation
	      if (navigation == '')
		return;

	      content = objtype + '(' + objcode + ',' + navigation + ')';
	    }
        }
    }

  ivx.Iso3OpenFile('#' + content);
}

// Start an animation sequence
function ivPlayAnimation(ivx, object, seq)
{
  ivx.Iso7StartAnimation(object, seq, 0);
}

// Change the view of an IsoView graphic
function ivChangeView(ivx, content)
{
  if (content != '')
    ivx.ViewPort = content;
  else
    ivx.ViewPort = ivx.HomeViewPort;
}

function ivGetClassData(elem, classname)
{
  var result = '';

  // The path and links of a graphic is stored in a <span> element.
  //
  // For example:
  // <span id="iview_1_5_3">
  //   <span id="idinxml">
  //     <span class="viewpath">mytest_files/myfile.iso</span>
  //     <span class="viewlinks">...</span>
  //   </span>
  //   <script>iview_Insert('iview_1_5_3', ...);</script>
  // </span>

  if (elem != null)
    {
      var child = elem.firstChild;
      while (child != null)
	{
	  if (child.nodeName == 'SPAN' &&
	      child.className == classname)
	    {
	      var textnode = child.firstChild;
	      while (textnode != null)
		{
		  result += textnode.nodeValue;
		  textnode = textnode.nextSibling;
		}

	      return result;
	    }
	  child = child.nextSibling;
	}
    }

  return result;
}

function ivGetPath(elem)
{
  return ivGetClassData(elem, 'viewpath');
}

function ivGetLinks(elem)
{
  return ivGetClassData(elem, 'viewlinks');
}

// Given any path and return its fullpath
function ivGetFullPath(path)
{
  var fullpath;

  if (path.indexOf("http:") == 0 ||
      path.indexOf("https:") == 0 ||
      path.indexOf("file:") == 0)
    {
      fullpath = path;
    }
  else if (path.indexOf("x-sc---") == 0)
  {
     var loc = decodeURI(window.location);
     loc = loc.slice(0, loc.indexOf('?'));
     // if the location doesn't contain /files this obviously
     // won't work
     loc = loc.slice(0, loc.indexOf('/files') + 6) + '/';
     fullpath = loc + path;
  }
  else
    {
      // IsoView needs "file:\\\", but it doesn't want spaces to turn
      // to %20
      var loc = decodeURI(window.location);

      // Remove everthing that follows the "?"
      loc = loc.slice(0, loc.indexOf('?'));
      fullpath = loc.slice(0, loc.lastIndexOf('/')) + '/' + path;
    }

  return fullpath;
}

// Display the graphic
function ivOpenGraphic(ivx, path, view)
{
  if (path != '')
    {
      var fragment = '';

      if (view != '')
	fragment = '#name(isovp_' + view + ', viewcontext)';
      else
	fragment = '#name(isovp_$EXTENT, viewcontext)';

      // Allow all objects to be clickable
      ivx.Iso4SetPreference("object_behavior", "2");
      // Don't allow users to drop another graphic into this viewer
      ivx.AcceptDroppedFiles = false;

      var fullpath = ivGetFullPath(path);

      ivx.Iso3OpenFile(fullpath + fragment);
    }
}

// This function inserts an IsoView graphic into the current HTML page.
function iview_Insert(deckid, width, height, view, downloaduri)
{
  var deckelem = null;
  var cardelem = null;

  var targetid = '';
  var targetdata = '';

  // If the displaying of the page is caused by a link from anothe page,
  // handle the link here.
  if (parent.isoviewTargetId != null)
    {
      var targetcard = document.getElementById(parent.isoviewTargetId);
      if (targetcard != null)
	{
	  var targetdeck = targetcard.parentNode;
	  var targetdeckid = targetdeck.getAttribute('id');

	  if (targetdeckid == deckid)
	    {
	      cardelem = targetcard;
	      deckelem = targetdeck;

	      targetdata = parent.isoviewTargetData;
	      targetid = parent.isoviewTargetId;

	      parent.isoviewTargetId = null;
	    }
	}
    }

  if (deckelem == null)
    {
      deckelem = document.getElementById(deckid);
      if (deckelem == null)
	return;
    }

  if (cardelem == null)
    {
      // If graphic is not specified, Use the first graphic in the graphics set
      cardelem = deckelem.firstChild;
      if (cardelem == null)
	return;
    }

  var path = ivGetPath(cardelem);
  deckelem._servicecenter = (path.indexOf("x-sc---") === 0) ? true : false;

  // Store the initial graphic in the deck element
  var cardid = cardelem.getAttribute('id');
  deckelem._curcard = cardid;

  // Store the hotpost link data in the card element
  ivCollectLinks(cardelem, ivGetLinks(cardelem));

  var obj = deckid + "obj";

  var btns = 1 + 2 + 4 + 0x20 + 0x40 + 0x80 +
             0x200000 + 0x400000 + 0x800000 + 0x1000000;


  var linkscript = '';

  if (targetdata != '')
    {
      linkscript = 'iview_Link("' + targetid + '","' + targetdata + '");';
      // We need to execute the link at the next message cycle, because
      // otherwise, when the linkscript is executed, IsoView is still
      // initializing and can redraw the view or cause zoom to be ignored.
      linkscript = 'setTimeout(\'' + linkscript + '\', 0)';
    }

  // The InitFinished will be called when the IsoView activex control is
  // created at the location. It will not be called when the file is changed
  // or when a view is changed.
  var initscript =
    '<script event="InitFinished()"' +
    '        for=' + '"' + obj + '">' + 
       obj + '.Iso7ConfigTools(1, ' + btns + ', 0, 0, false, false);' +
    '  ivOpenGraphic(' + obj + ',"' + path + '", "' + view + '");' +
       linkscript + 
    '</script>';

  // Write InitFinished listener
  document.write(initscript);

  var objhitscript =
    '<script event="ObjectHit(mouse, hitid)"' +
    '        for=' + '"' + obj + '">' + 
    '  ivLinkFromGrobject(' + obj + ', mouse, "' + deckid + '", hitid);' + 
    '</script>';

  // Write ObjectHit listener
  document.write(objhitscript);

  var codebasescript = '';

  if (downloaduri != '')
    codebasescript = 'codebase="' + downloaduri + '"';

  if (width == '' && height == '')
    {
      width = 384;
      height = 288;
    }

  var objscript =
    '<object id="' + obj + '" ' +
    '        classid="CLSID:865B2280-2B71-11D1-BC01-006097AC382A" ' + 
    codebasescript +
    '        width="' + width + '" ' +
    '        height="' + height + '"' +
    '>' +
    '</object>';

  // Write IsoView activex object
  document.write(objscript);

  if (deckelem._servicecenter)
    {
      // If we are in service center and IsView is not installed, tell
      // service center about this, so it can install IsoView.
      var ivx = document.getElementById(obj);

      if (!ivx || !ivx.GetVersion)
	{
	  try
	    {
	      if (!window.parent.scTechdocCreoViewConsumerChecked)
		{
		  window.parent.scTechdocCreoViewConsumerChecked = true;
		  if (window.parent.needClientSoftware)
		    window.parent.needClientSoftware('isoview');
		}
	    }
	  catch (e)
	    {
	      // Ignore the exception
	    }
	}
    }
}

// We encode those characters that we use for separaters
function iview_DecodeLinkData(data)
{
  if (data.match(/%/))
    {
      data = data.replace(/%7C/g, '|');
      data = data.replace(/%7D/g, '}');
      data = data.replace(/%27/g, '\'');
      data = data.replace(/%22/g, '"');
      data = data.replace(/%3C/g, '<');
      data = data.replace(/%26/g, '&');
      // the %25 needs to be the last one to replace
      data = data.replace(/%25/g, '%');
    }

  return data;
}

// This function changes the view of a graphic, highlights a grobject, or
// start an animation sequence.
function iview_Link(cardid, targetdata)
{
  var ivx = null;
  var cardelem = null;
  var deckelem = null;

  cardelem = document.getElementById(cardid);
  if (cardelem != null)
    {
      deckelem = cardelem.parentNode;
      if (deckelem != null)
	{
	  var deckid = deckelem.getAttribute('id');
	  ivx = document.getElementById(deckid + 'obj');
	}
    }

  // If the target graphic is not at the current page.  Store the data, so
  // iview_Insert() can execute the view change and hotspot highlighting.
  if (ivx == null)
    {
      parent.isoviewTargetId = cardid;
      parent.isoviewTargetData = targetdata;
      return;
    }

  // If the target is in a graphics set, change the displaying graphic of the
  // graphics set to the new graphic.
  var path = ivGetPath(cardelem);

  // If the path is changed, open the new graphic
  // the ivx.FileName use backslash as path separators
  var pathPattern = '[\\\\/]' + path.slice(path.lastIndexOf('/') + 1) + '$';
  if (!ivx.FileName.match(pathPattern))
    {
      ivCollectLinks(cardelem, ivGetLinks(cardelem));
      deckelem._curcard = cardid;
      ivOpenGraphic(ivx, path, '');
    }

  // Process targetdata
  var pattern = /(obj|ani|view){([^}]*)}(?:hlstyle{([^}]*)})?/g;
  var result;

  while ((result = pattern.exec(targetdata)) != null)
    {
      var type = result[1];
      var content = result[2];

      switch (type)
        {
        case 'obj':
          // obj{id(grobj01,zoom+newHighlight)}hlstyle(circle+0xff)
          var manner = result[3];
          content = iview_DecodeLinkData(content);
          ivHighlightObject(ivx, content, manner)
          break;

        case 'view':
          // view{ViewA}
          content = iview_DecodeLinkData(content);
          ivChangeView(ivx, content);
          break;

        case 'ani':
          // ani{name(name001)`sequence}
          var seqSeparator = '`';
          var anidata = content.split(seqSeparator);
          var object = anidata[0];
          var sequence = anidata[1];

          object = iview_DecodeLinkData(object);
          sequence = iview_DecodeLinkData(sequence);
          ivPlayAnimation(ivx, object, sequence)
          break;
        }
    }
}
