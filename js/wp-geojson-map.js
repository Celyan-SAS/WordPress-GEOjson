/** WordPress GEOjson plugin by Celyan **/
/** Map and geolocation JavaScript functions **/

console.log( 'wp-geojson-map js script loaded.' );
var map;
var additionalFeatures = [];
var allFeatures = [];
var allLayers = [];

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
		
		// zoom to show all the features
		var bounds = new google.maps.LatLngBounds();
		map.data.addListener('addfeature', function(e) {
			processPoints(e.feature.getGeometry(), bounds.extend, bounds);
			map.fitBounds(bounds);
		});
	
	} else {
		console.log( 'No map canvas on this page.' );
	}
	
}

//@see: http://stackoverflow.com/questions/28507044/zoom-to-geojson-polygons-bounds-in-google-maps-api-v3
function processPoints(geometry, callback, thisArg) {
	  if (geometry instanceof google.maps.LatLng) {
	    callback.call(thisArg, geometry);
	  } else if (geometry instanceof google.maps.Data.Point) {
	    callback.call(thisArg, geometry.get());
	  } else {
	    geometry.getArray().forEach(function(g) {
	      processPoints(g, callback, thisArg);
	    });
	  }
	}

/**
 * GEOjson functions
 *
 */
function add_markers( geojson, map_type ) {
	
	/* Turf test		
	var hull = turf.concave( geojson, 15, 'kilometers' );
	var hull2 = turf.convex( geojson );
	*/
	
	if( 'ggmap' == map_type ) {
		map.data.addGeoJson(geojson);
		map.data.addGeoJson(hull);
		map.data.addGeoJson(hull2, { fillColor: 'red', style: {color: 'red', fillColor: 'red'} });
	}
	
	if( 'leaflet' == map_type ) {
		
		features = L.geoJSON(geojson);
		layer = features.addTo(map);
		allFeatures.push( features );
		allLayers.push( layer );
		
		var bounds = features.getBounds();
		map.fitBounds( bounds, {
            padding: [50, 50]
        });
			
		additionalFeatures.forEach(function(item){
			var feature = L.geoJSON(item);
			layer = feature.addTo(map);
			allFeatures.push( feature );
			allLayers.push( layer );
			feature.on("click", function (e) {
                // do something here like display a popup
                console.log(e);
            });
		});
		
		var group = L.featureGroup( allFeatures );
		map.fitBounds(group.getBounds());
		
		/* hull test
		L.geoJSON(hull).addTo(map);
		L.geoJSON(
			hull2, {
				style: {color: 'red'}				
			}).addTo(map);
		*/
	}
	
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