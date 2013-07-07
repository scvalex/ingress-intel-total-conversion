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

window.plugin.portalsdetails.listPortals = []; // structure : name, team, level, resonators = Array, Shields = Array, APgain
window.plugin.portalsdetails.enlP = 0;
window.plugin.portalsdetails.resP = 0;

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
        var coords = { lat: portal.options.details.locationE6.latE6,
                       lng: portal.options.details.locationE6.lngE6
                     };

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
        var thisPortal = { 'portal': d,
                           'name': name,
                           'team': team,
                           'level': level,
                           'guid': guid,
                           'resonators': resonators,
                           'energyratio': maxenergy ? Math.floor(energy/maxenergy*100) : 0,
                           'mods': mods,
                           'APgain': APgain,
                           'EAP': (energy/APgain).toFixed(2),
                           'energy': energy,
                           'maxenergy': maxenergy,
                           'links': d.portalV2.linkedEdges.length,
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
    window.plugin.portalsdetails.enlP = 0;
    window.plugin.portalsdetails.resP = 0;

    if (window.plugin.portalsdetails.getPortals()) {
        html += window.plugin.portalsdetails.portalTable();
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

window.plugin.portalsdetails.portalTable = function() {
    var portals = window.plugin.portalsdetails.listPortals;

    var html = "";
    html += '<table>'
        + '<tr><th>GUID</th>'
        + '<th>Portal</th>'
        + '<th>Coordinates</th>'
        + '<th>Level</th>'
        + '<th>T</th>'
        + '<th>R1</th>'
        + '<th>R2</th>'
        + '<th>R3</th>'
        + '<th>R4</th>'
        + '<th>R5</th>'
        + '<th>R6</th>'
        + '<th>R7</th>'
        + '<th>R8</th>'
        + '<th>Energy</th>'
        + '<th>%</th>'
        + '<th>Links</th>'
        + '<th>M1</th>'
        + '<th>M2</th>'
        + '<th>M3</th>'
        + '<th>M4</th>'
        + '<th>AP Gain</th>'
        + '<th title="Energy / AP Gain ratio">E/AP</th></tr>';

    var prettyPrintCoords = function(coords) {
        return "" + (coords.lat / 1e6) + " " + (coords.lng / 1e6);
    }

    $.each(portals, function(ind, portal) {
        html += '<tr class="' + (portal.team === 1 ? 'res' : (portal.team === 2 ? 'enl' : 'neutral')) + '">'
            + '<td>' + portal.guid + '</td>'
            + '<td>' + window.plugin.portalsdetails.getPortalLink(portal.portal, portal.guid) + '</td>'
            + '<td>' + prettyPrintCoords(portal.coords) + '</td>'
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
                     '#portalsdetails table {margin-top:5px; border-collapse: collapse; empty-cells: show; width:100%; clear: both;}' +
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
