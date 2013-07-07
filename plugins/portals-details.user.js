// ==UserScript==
// @id             iitc-plugin-portals-details@scvalex
// @name           IITC plugin: show details of portals
// @category       Info
// @version        0.0.1.@@DATETIMEVERSION@@
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      @@UPDATEURL@@
// @downloadURL    @@DOWNLOADURL@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Display a sortable list of all visible portals with full details.  Based on `iitc-plugin-portals-list@teo96`.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

/* What's new
 * 0.0.1 : initial release
 */

// Namespace
window.plugin.portalsdetails = function() {
};

window.plugin.portalsdetails.listPortals = []; // structure : name, team, level, resonators = Array, Shields = Array, APgain
window.plugin.portalsdetails.sortOrder=-1;
window.plugin.portalsdetails.enlP = 0;
window.plugin.portalsdetails.resP = 0;
window.plugin.portalsdetails.filter=0;

//fill the listPortals array with portals avalaible on the map (level filtered portals will not appear in the table)
window.plugin.portalsdetails.getPortals = function() {
  //filter : 0 = All, 1 = Res, 2 = Enl
  //console.log('** getPortals');
  var retval=false;

  var displayBounds = map.getBounds();

  window.plugin.portalsdetails.listPortals = [];
  //get portals informations from IITC
  $.each(window.portals, function(i, portal) {
    // eliminate offscreen portals (selected, and in padding)
    if(!displayBounds.contains(portal.getLatLng())) return true;

    retval=true;
    var d = portal.options.details;
    var name =  d.portalV2.descriptiveText.TITLE;
    var address = d.portalV2.descriptiveText.ADDRESS;
    var img = d.imageByUrl && d.imageByUrl.imageUrl ? d.imageByUrl.imageUrl : DEFAULT_PORTAL_IMG;
    var team = portal.options.team;
    switch (team){
      case 1 :
        window.plugin.portalsdetails.resP++;
        break;
      case 2 :
        window.plugin.portalsdetails.enlP++;
        break;
    }
    var level = getPortalLevel(d).toFixed(2);
    var guid = portal.options.guid;


    //get resonators informations
    var resonators = []; // my local resonator array : reso level, reso deployed by, distance to portal, energy total, max 
    var energy = 0;
    var maxenergy=0;
    $.each(portal.options.details.resonatorArray.resonators, function(ind, reso) {
      if(reso) {
        resonators[ind] = [reso.level, window.getPlayerName(reso.ownerGuid), reso.distanceToPortal, reso.energyTotal, RESO_NRG[reso.level]];
        energy += reso.energyTotal;
        maxenergy += RESO_NRG[reso.level];
      } else { resonators[ind] = [0,'',0,0,0]; }
    });
    // Sort resonators array by resonator level
    resonators.sort(function (a, b) {return b[0] - a[0]});

    //get mods informations
    var mods = [];
    $.each(d.portalV2.linkedModArray, function(ind, mod) {
        var modShortName='';
        if (mod) {
            switch (mod.displayName) {
                case 'Portal Shield':
    				modShortName = 'S';		
            		break;
                case 'Force Amp':
					modShortName = 'FA';		
            		break;
                case 'Link Amp':
					modShortName = 'LA';		
            		break;  
                case 'Heat Sink':
					modShortName = 'H';		
            		break;
                case 'Multi-hack':
					modShortName = 'M';		
            		break;  
                case 'Turret':
					modShortName = 'T';		
            		break;  
                default:
                    modShortName = '';		
            		break;  
            }
        if (modShortName === '') {
            mods[ind] = ['', '', ''];
            } else {
			mods[ind] = [mod.rarity, getPlayerName(mod.installingUser), modShortName, mod.displayName];            
        }
      }else { mods[ind] = ['', '', '']; }
    });
	console.log(mods);
    var APgain= getAttackApGain(d).enemyAp;
    var thisPortal = {'portal': d, 'name': name, 'team': team, 'level': level, 'guid': guid, 'resonators': resonators, 'energyratio': maxenergy ? Math.floor(energy/maxenergy*100) : 0, 'mods': mods, 'APgain': APgain, 'EAP': (energy/APgain).toFixed(2), 'energy': energy, 'maxenergy': maxenergy, 'links': d.portalV2.linkedEdges.length, 'lat': portal._latlng.lat, 'lng': portal._latlng.lng, 'address': address, 'img': img};
    window.plugin.portalsdetails.listPortals.push(thisPortal);
  });

  return retval;
}

window.plugin.portalsdetails.displayPL = function() {
  // debug tools
  //var start = new Date().getTime();
  //console.log('***** Start ' + start);

  var html = '';
  window.plugin.portalsdetails.sortOrder=-1;
  window.plugin.portalsdetails.enlP = 0;
  window.plugin.portalsdetails.resP = 0;

  if (window.plugin.portalsdetails.getPortals()) {
    html += window.plugin.portalsdetails.portalTable('level', window.plugin.portalsdetails.sortOrder,window.plugin.portalsdetails.filter);
  } else {
    html = '<table><tr><td>Nothing to show!</td></tr></table>';
  };

  dialog({
    html: '<div id="portalslist">' + html + '</div>',
    dialogClass: 'ui-dialog-portalslist',
    title: 'Portal list: ' + window.plugin.portalsdetails.listPortals.length + ' ' + (window.plugin.portalsdetails.listPortals.length == 1 ? 'portal' : 'portals'),
    id: 'portal-list'
  });

  // Setup sorting
  $(document).on('click.portalsdetails', '#portalslist table th', function() {
    $('#portalslist').html(window.plugin.portalsdetails.portalTable($(this).data('sort'),window.plugin.portalsdetails.sortOrder,window.plugin.portalsdetails.filter));
  });
  $(document).on('click.portalsdetails', '#portalslist .filterAll', function() {
    $('#portalslist').html(window.plugin.portalsdetails.portalTable($(this).data('sort'),window.plugin.portalsdetails.sortOrder,0));
  });
  $(document).on('click.portalsdetails', '#portalslist .filterRes', function() {
    $('#portalslist').html(window.plugin.portalsdetails.portalTable($(this).data('sort'),window.plugin.portalsdetails.sortOrder,1));
  });
  $(document).on('click.portalsdetails', '#portalslist .filterEnl', function() {
    $('#portalslist').html(window.plugin.portalsdetails.portalTable($(this).data('sort'),window.plugin.portalsdetails.sortOrder,2));
  });
  
  //debug tools
  //end = new Date().getTime();
  //console.log('***** end : ' + end + ' and Elapse : ' + (end - start));
 }
    
window.plugin.portalsdetails.portalTable = function(sortBy, sortOrder, filter) {
  // sortOrder <0 ==> desc, >0 ==> asc, i use sortOrder * -1 to change the state
  window.plugin.portalsdetails.filter=filter;
  var portals=window.plugin.portalsdetails.listPortals;

  //Array sort
  window.plugin.portalsdetails.listPortals.sort(function(a, b) {
    var retVal = 0;
    switch (sortBy) {
      case 'names':
        retVal = a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        break;
      case 'r1':
        retVal = b.resonators[0][0] - a.resonators[0][0];
        if (retVal)
          break;
      case 'r2':
        retVal = b.resonators[1][0] - a.resonators[1][0];
        if (retVal)
          break;
      case 'r3':
        retVal = b.resonators[2][0] - a.resonators[2][0];
        if (retVal)
          break;
      case 'r4':
        retVal = b.resonators[3][0] - a.resonators[3][0];
        if (retVal)
          break;
      case 'r5':
        retVal = b.resonators[4][0] - a.resonators[4][0];
        if (retVal)
          break;
      case 'r6':
        retVal = b.resonators[5][0] - a.resonators[5][0];
        if (retVal)
          break;
      case 'r7':
        retVal = b.resonators[6][0] - a.resonators[6][0];
        if (retVal)
          break;
      case 'r8':
        retVal = b.resonators[7][0] - a.resonators[7][0];
        break;
      case 's1':
      	retVal = a.mods[0][2] > b.mods[0][2] ? -1 : 1;
        break;
      case 's2':
        retVal = a.mods[1][2] > b.mods[1][2] ? -1 : 1;
        break;
      case 's3':
        retVal = a.mods[2][2] > b.mods[2][2] ? -1 : 1;
        break;
      case 's4':
        retVal = a.mods[3][2] > b.mods[3][2] ? -1 : 1;
        break;
      default:
        retVal = b[sortBy] - a[sortBy];
        break;
    }
    if (sortOrder > 0) retVal = -retVal; //thx @jonatkins
    return retVal;
  });

  var sort = window.plugin.portalsdetails.portalTableSort;
  var html = window.plugin.portalsdetails.stats();
  html += '<table>'
  + '<tr><th ' + sort('names', sortBy, -1) + '>Portal</th>'
  + '<th ' + sort('level', sortBy, -1) + '>Level</th>'
  + '<th title="Team" ' + sort('team', sortBy, -1) + '>T</th>'
  + '<th ' + sort('r1', sortBy, -1) + '>R1</th>'
  + '<th ' + sort('r2', sortBy, -1) + '>R2</th>'
  + '<th ' + sort('r3', sortBy, -1) + '>R3</th>'
  + '<th ' + sort('r4', sortBy, -1) + '>R4</th>'
  + '<th ' + sort('r5', sortBy, -1) + '>R5</th>'
  + '<th ' + sort('r6', sortBy, -1) + '>R6</th>'
  + '<th ' + sort('r7', sortBy, -1) + '>R7</th>'
  + '<th ' + sort('r8', sortBy, -1) + '>R8</th>'
  + '<th ' + sort('energy', sortBy, -1) + '>Energy</th>'
  + '<th ' + sort('energyratio', sortBy, -1) + '>%</th>'
  + '<th ' + sort('links', sortBy, -1) + '>Links</th>'
  + '<th ' + sort('s1', sortBy, -1) + '>M1</th>'
  + '<th ' + sort('s2', sortBy, -1) + '>M2</th>'
  + '<th ' + sort('s3', sortBy, -1) + '>M3</th>'
  + '<th ' + sort('s4', sortBy, -1) + '>M4</th>'
  + '<th ' + sort('APgain', sortBy, -1) + '>AP Gain</th>'
  + '<th title="Energy / AP Gain ratio" ' + sort('EAP', sortBy, -1) + '>E/AP</th></tr>';


  $.each(portals, function(ind, portal) {

    if (filter === 0 || filter === portal.team) {
      html += '<tr class="' + (portal.team === 1 ? 'res' : (portal.team === 2 ? 'enl' : 'neutral')) + '">'
      + '<td style="">' + window.plugin.portalsdetails.getPortalLink(portal.portal, portal.guid) + '</td>'
      + '<td class="L' + Math.floor(portal.level) +'">' + portal.level + '</td>'
      + '<td style="text-align:center;">' + portal.team + '</td>';

      var title;
      var percent;
      $.each([0, 1, 2, 3 ,4 ,5 ,6 ,7], function(ind, slot) {
        percent = portal.resonators[slot][4] ? Math.floor(portal.resonators[slot][3]/portal.resonators[slot][4]*100) : 0;
        title = 'title="owner: <b>' + portal.resonators[slot][1] + '</b><br>'
        + 'energy: ' + portal.resonators[slot][3] + ' / ' + portal.resonators[slot][4] + ' (' + percent + '%)<br>'
        + 'distance: ' + portal.resonators[slot][2] + 'm';

        html += '<td class="L' + portal.resonators[slot][0] +'" ' + title + '">' + portal.resonators[slot][0] + '</td>';

      });

	  html += '<td style="cursor:help" title="'+ portal.energy +'">' + prettyEnergy(portal.energy) + '</td>'
      + '<td style="cursor:help" title="' + portal.energy + ' / ' + portal.maxenergy +'">' + portal.energyratio + '%</td>'
      + '<td style="cursor:help" title="' + portal.links + '">' + portal.links + '</td>'
      + '<td style="cursor:help; background-color: '+COLORS_MOD[portal.mods[0][0]]+';" title="Mod : ' + portal.mods[0][3] + '\nInstalled by : ' + portal.mods[0][1] + '\nRarity : ' + portal.mods[0][0] + '">' + portal.mods[0][2] + '</td>'
      + '<td style="cursor:help; background-color: '+COLORS_MOD[portal.mods[1][0]]+';" title="Mod : ' + portal.mods[1][3] + '\nInstalled by : ' + portal.mods[1][1] + '\nRarity : ' + portal.mods[1][0] + '">' + portal.mods[1][2] + '</td>'
      + '<td style="cursor:help; background-color: '+COLORS_MOD[portal.mods[2][0]]+';" title="Mod : ' + portal.mods[2][3] + '\nInstalled by : ' + portal.mods[2][1] + '\nRarity : ' + portal.mods[2][0] + '">' + portal.mods[2][2] + '</td>'
      + '<td style="cursor:help; background-color: '+COLORS_MOD[portal.mods[3][0]]+';" title="Mod : ' + portal.mods[3][3] + '\nInstalled by : ' + portal.mods[3][1] + '\nRarity : ' + portal.mods[3][0] + '">' + portal.mods[3][2] + '</td>'
      + '<td>' + portal.APgain + '</td>'
      + '<td>' + portal.EAP + '</td>';

      html+= '</tr>';
    }
  });
  html += '</table>';

  html += '<div class="disclaimer">Click on portals table headers to sort by that column. '
    + 'Click on <b>All Portals, Resistance Portals, Enlightened Portals</b> to filter<br>'
    + 'Thanks to @vita10gy & @xelio for their IITC plugins who inspired me. A <a href="https://plus.google.com/113965246471577467739">@teo96</a> production. Vive la Résistance !</div>';

  window.plugin.portalsdetails.sortOrder = window.plugin.portalsdetails.sortOrder*-1;
  return html;
}

window.plugin.portalsdetails.stats = function(sortBy) {
  //console.log('** stats');
  var html = '<table><tr>'
  + '<td class="filterAll" style="cursor:pointer"  onclick="window.plugin.portalsdetails.portalTable(\'level\',-1,0)"><a href=""></a>All Portals : (click to filter)</td><td class="filterAll">' + window.plugin.portalsdetails.listPortals.length + '</td>'
  + '<td class="filterRes" style="cursor:pointer" class="sorted" onclick="window.plugin.portalsdetails.portalTable(\'level\',-1,1)">Resistance Portals : </td><td class="filterRes">' + window.plugin.portalsdetails.resP +' (' + Math.floor(window.plugin.portalsdetails.resP/window.plugin.portalsdetails.listPortals.length*100) + '%)</td>' 
  + '<td class="filterEnl" style="cursor:pointer" class="sorted" onclick="window.plugin.portalsdetails.portalTable(\'level\',-1,2)">Enlightened Portals : </td><td class="filterEnl">'+ window.plugin.portalsdetails.enlP +' (' + Math.floor(window.plugin.portalsdetails.enlP/window.plugin.portalsdetails.listPortals.length*100) + '%)</td>'  
  + '</tr>'
  + '</table>';
  return html;
}

// A little helper functon so the above isn't so messy
window.plugin.portalsdetails.portalTableSort = function(name, by) {
  var retVal = 'data-sort="' + name + '"';
  if(name === by) {
    retVal += ' class="sorted"';
  }
  return retVal;
};

// portal link - single click: select portal
//               double click: zoom to and select portal
//               hover: show address
// code from getPortalLink function by xelio from iitc: AP List - https://raw.github.com/breunigs/ingress-intel-total-conversion/gh-pages/plugins/ap-list.user.js
window.plugin.portalsdetails.getPortalLink = function(portal,guid) {

  var latlng = [portal.locationE6.latE6/1E6, portal.locationE6.lngE6/1E6].join();
  var jsSingleClick = 'window.renderPortalDetails(\''+guid+'\');return false';
  var jsDoubleClick = 'window.zoomToAndShowPortal(\''+guid+'\', ['+latlng+']);return false';
  var perma = '/intel?latE6='+portal.locationE6.latE6+'&lngE6='+portal.locationE6.lngE6+'&z=17&pguid='+guid;

  //Use Jquery to create the link, which escape characters in TITLE and ADDRESS of portal
  var a = $('<a>',{
    "class": 'help',
    text: portal.portalV2.descriptiveText.TITLE,
    title: portal.portalV2.descriptiveText.ADDRESS,
    href: perma,
    onClick: jsSingleClick,
    onDblClick: jsDoubleClick
  })[0].outerHTML;
  var div = '<div style="max-height: 15px !important; min-width:140px !important;max-width:180px !important; overflow: hidden; text-overflow:ellipsis;">'+a+'</div>';
  return div;
}

var setup =  function() {
  $('#toolbox').append(' <a onclick="window.plugin.portalsdetails.displayPL()" title="Show details for visible portals.">Portals details</a>');
  $('head').append('<style>' +
    '.ui-dialog-portalslist {max-width: 800px !important; width: auto !important;}' +
    '#portalslist table {margin-top:5px; border-collapse: collapse; empty-cells: show; width:100%; clear: both;}' +
    '#portalslist table td, #portalslist table th {border-bottom: 1px solid #0b314e; padding:3px; color:white; background-color:#1b415e}' +
    '#portalslist table tr.res td {  background-color: #005684; }' +
    '#portalslist table tr.enl td {  background-color: #017f01; }' +
    '#portalslist table tr.neutral td {  background-color: #000000; }' +
    '#portalslist table th { text-align:center;}' +
    '#portalslist table td { text-align: center;}' +
    '#portalslist table td.L0 { cursor: help; background-color: #000000 !important;}' +
    '#portalslist table td.L1 { cursor: help; background-color: #FECE5A !important;}' +
    '#portalslist table td.L2 { cursor: help; background-color: #FFA630 !important;}' +
    '#portalslist table td.L3 { cursor: help; background-color: #FF7315 !important;}' +
    '#portalslist table td.L4 { cursor: help; background-color: #E40000 !important;}' +
    '#portalslist table td.L5 { cursor: help; background-color: #FD2992 !important;}' +
    '#portalslist table td.L6 { cursor: help; background-color: #EB26CD !important;}' +
    '#portalslist table td.L7 { cursor: help; background-color: #C124E0 !important;}' +
    '#portalslist table td.L8 { cursor: help; background-color: #9627F4 !important;}' +
    '#portalslist table td:nth-child(1) { text-align: left;}' +
    '#portalslist table th { cursor:pointer; text-align: right;}' +
    '#portalslist table th:nth-child(1) { text-align: left;}' +
    '#portalslist table th.sorted { color:#FFCE00; }' +
    '#portalslist .filterAll { margin-top:10px;}' +
    '#portalslist .filterRes { margin-top:10px; background-color: #005684  }' +
    '#portalslist .filterEnl { margin-top:10px; background-color: #017f01  }' +
    '#portalslist .disclaimer { margin-top:10px; font-size:10px; }' +
    '</style>');
}

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
