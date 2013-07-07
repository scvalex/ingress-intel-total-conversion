// ==UserScript==
// @id             iitc-plugin-portals-details@scvalex
// @name           IITC plugin: show details of portals
// @category       Info
// @version        0.0.1.@@DATETIMEVERSION@@
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      @@UPDATEURL@@
// @downloadURL    @@DOWNLOADURL@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] List details of visible.  Based on `iitc-plugin-portals-list@teo96`.
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

window.plugin.portalsdetails.listPortals = [];

//fill the listPortals array with portals avalaible on the map (level filtered portals will not appear in the table)
window.plugin.portalsdetails.getPortals = function() {
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
        var level = getPortalLevel(d).toFixed(2);
        var guid = portal.options.guid;
        var coords = { lat: portal.options.details.locationE6.latE6,
                       lng: portal.options.details.locationE6.lngE6
                     };

        var edges = [];
        $.each(d.portalV2.linkedEdges, function(ind, edge) {
            edges.push({ source: guid,
                         dest: edge.otherPortalGuid
                       });
        });

        var thisPortal = { 'portal': d,
                           'name': name,
                           'team': team,
                           'level': level,
                           'guid': guid,
                           'edges': edges,
                           'lat': portal._latlng.lat,
                           'lng': portal._latlng.lng,
                           'address': address,
                           'img': img,
                           'coords': coords
                         };
        window.plugin.portalsdetails.listPortals.push(thisPortal);
    });

    return retval;
}

window.plugin.portalsdetails.displayPL = function() {
    // debug tools
    //var start = new Date().getTime();
    //console.log('***** Start ' + start);

    var html = '';

    if (window.plugin.portalsdetails.getPortals()) {
        html += '<h3>Portals</h3>';
        html += window.plugin.portalsdetails.portalsTable();
        html += '<h3>Links</h3>';
        html += window.plugin.portalsdetails.edgesTable();
    } else {
        html = '<table><tr><td>Nothing to show!</td></tr></table>';
    };

    dialog({
        html: '<div id="portalsdetails">' + html + '</div>',
        dialogClass: 'ui-dialog-portals-details',
        title: 'Portal details: ' + window.plugin.portalsdetails.listPortals.length + ' ' + (window.plugin.portalsdetails.listPortals.length == 1 ? 'visible portal' : 'visible portals'),
        id: 'portals-details'
    });

    //debug tools
    //end = new Date().getTime();
    //console.log('***** end : ' + end + ' and Elapse : ' + (end - start));
}

window.plugin.portalsdetails.edgesTable = function() {
    var portals = window.plugin.portalsdetails.listPortals;

    var html = "";
    html += "<table><tbody>";

    $.each(portals, function(ind, portal) {
        $.each(portal.edges, function(jnd, edge) {
            html += '<tr class="' + (portal.team === 1 ? 'res' : (portal.team === 2 ? 'enl' : 'neutral')) + '">'
                + '<td>' + edge.source + '</td>'
                + '<td>' + edge.dest + '</td>'
                + '</tr>';
        });
    });

    html += "</tbody></table>";

    return html;
}

window.plugin.portalsdetails.portalsTable = function() {
    var portals = window.plugin.portalsdetails.listPortals;

    var html = "";
    html += '<table>'
        + '<tr><th>GUID</th>'
        + '<th>Portal</th>'
        + '<th>Latitude</th>'
        + '<th>Longitude</th>'
        + '<th>Level</th>'
        + '<th>Team</th>'
        + '<th>Links</th></tr>';

    $.each(portals, function(ind, portal) {
        html += '<tr class="' + (portal.team === 1 ? 'res' : (portal.team === 2 ? 'enl' : 'neutral')) + '">'
            + '<td>' + portal.guid + '</td>'
            + '<td>' + window.plugin.portalsdetails.getPortalLink(portal.portal, portal.guid) + '</td>'
            + '<td>' + (portal.coords.lat / 1e6) + '</td>'
            + '<td>' + (portal.coords.lng / 1e6) + '</td>'
            + '<td class="L' + Math.floor(portal.level) +'">' + portal.level + '</td>'
            + '<td style="text-align:center;">' + portal.team + '</td>';

        html += '<td style="cursor:help">' + portal.edges.length + '</td>';
        html+= '</tr>';
    });
    html += '</table>';

    return html;
}

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
    $('#toolbox').append(' <a onclick="window.plugin.portalsdetails.displayPL()" title="List details of visible portals.">Portals details</a>');
    $('head').append('<style>' +
                     '.ui-dialog-portals-details {max-width: 1200px !important; width: auto !important;}' +
                     '#dialog-portals-details {max-width: 1200px !important; width: auto !important; }' +
                     '#portalsdetails table {margin-top:5px; margin-bottom: 1em; border-collapse: collapse; empty-cells: show; width:100%; clear: both;}' +
                     '#portalsdetails table td, #portalsdetails table th {border-bottom: 1px solid #0b314e; padding:3px; color:white; background-color:#1b415e}' +
                     '#portalsdetails table tr.res td {  background-color: #005684; }' +
                     '#portalsdetails table tr.enl td {  background-color: #017f01; }' +
                     '#portalsdetails table tr.neutral td {  background-color: #000000; }' +
                     '#portalsdetails table th { text-align:center;}' +
                     '#portalsdetails table td { text-align: center;}' +
                     '#portalsdetails table td.L0 { cursor: help; background-color: #000000 !important;}' +
                     '#portalsdetails table td.L1 { cursor: help; background-color: #FECE5A !important;}' +
                     '#portalsdetails table td.L2 { cursor: help; background-color: #FFA630 !important;}' +
                     '#portalsdetails table td.L3 { cursor: help; background-color: #FF7315 !important;}' +
                     '#portalsdetails table td.L4 { cursor: help; background-color: #E40000 !important;}' +
                     '#portalsdetails table td.L5 { cursor: help; background-color: #FD2992 !important;}' +
                     '#portalsdetails table td.L6 { cursor: help; background-color: #EB26CD !important;}' +
                     '#portalsdetails table td.L7 { cursor: help; background-color: #C124E0 !important;}' +
                     '#portalsdetails table td.L8 { cursor: help; background-color: #9627F4 !important;}' +
                     '#portalsdetails table td:nth-child(1) { text-align: left;}' +
                     '</style>');
}

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
