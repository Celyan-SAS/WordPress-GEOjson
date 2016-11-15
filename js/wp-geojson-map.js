/** WordPress GEOjson plugin by Celyan **/
/** Map and geolocation JavaScript functions **/

console.log( 'wp-geojson-map js script loaded.' );
var map;

/**
 * jQuery functions
 *
 */
(function($) {
	$(document).ready(function() {
		
		var map_type = 'leaflet';
		
		if( $('#map-canvas').hasClass('ggmap') ) {
			ggmap_init();
			map_type = 'ggmap';
		}
		
		if( $('#map-canvas').hasClass('openlayers') ) {
			ol_init();
			map_type = 'openlayers';
		}
	
		if( $('#map-canvas').hasClass('leaflet') )
			leaflet_init();
		
		if( $('#map-canvas').data('selection') )
			load_points( 
				$('#map-canvas').data('post_type'), 
				$('#map-canvas').data('selection'),
				map_type
			);
	});
	
	function load_points( post_type, selection, map_type ) {
		console.log( 'Loading points...' );

		$.post( ajaxurl, {
			action: 'get_points_for_post_type',
			post_type: post_type,
			selection: selection
		}, function( data ) {
			console.log( 'Ajax get_points_for_post_type data length: ' + data.length );
			//console.log( data );
			add_markers( data, map_type );
		}).done(function() {
			console.log( "Ajax get_points_for_post_type success" );
		}).fail(function() {
			console.log( "Ajax get_points_for_post_type error" );
		}).always(function() {
			console.log( "Ajax get_points_for_post_type finished" );
		});
	}
})( jQuery );


/** 
 * Leaflet maps functions
 *
 */
function leaflet_init() {
	console.log( 'leaflet_init()' );
	map = L.map('map-canvas').setView([47, 1.6], 5);
	L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
	}).addTo(map);
}


/**
 * Openlayers maps functions
 * 
 */
function ol_init() {
	console.log( 'ol_init()' );
    map = new ol.Map({
        target: 'map-canvas',
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM()
          })
        ],
        view: new ol.View({
          center: ol.proj.fromLonLat([1.6, 47]),
          zoom: 5
        })
      });
}

/**
 * Google Maps function
 *
 */
function ggmap_init() {
	
	console.log( 'ggmap_init()' );
	
	if( document.getElementById("map-canvas") ) {
		
		console.log( 'found map-canvas' );

		map = new google.maps.Map(document.getElementById("map-canvas"), {
			center: new google.maps.LatLng( '47', '1.6' ),
			zoom: 5,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			mapTypeControlOptions: { mapTypeIds: [] },
		});
	
	} else {
		console.log( 'No map canvas on this page.' );
	}
	
}


/**
 * GEOjson functions
 *
 */
function add_markers( geojson, map_type ) {
	if( 'ggmap' == map_type )
		map.data.addGeoJson(geojson);
	
	if( 'leaflet' == map_type )
		L.geoJSON(geojson).addTo(map);
	
	if( 'openlayers' == map_type ) {
	    var features = new ol.format.GeoJSON().readFeatures(geojson, {
	        featureProjection: 'EPSG:3857'
	    });
	    var vectorSource = new ol.source.Vector({
	    	  features: features
	    });
		var vectorLayer = new ol.layer.Vector({
	        source: vectorSource
		});
		map.addLayer(vectorLayer);
	}
		
}