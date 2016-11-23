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
		
		/** defaults **/
		var map_type = 'leaflet';
		
		var post_type = 'post';
		if( $('#map-canvas').attr('data-post_type') )
			post_type = $('#map-canvas').data('post_type');
		
		var selection = 'all';
		if( $('#map-canvas').attr('data-selection') )
			selection = $('#map-canvas').data('selection');
		
		var file = '';
		if( $('#map-canvas').attr('data-file') )
			file = $('#map-canvas').data('file');
		
		var popup_fields = '';
		if( $('#map-canvas').attr('data-popup_fields') )
			popup_fields = $('#map-canvas').data('popup_fields');
		
		var field_names = 'no';
		if( $('#map-canvas').attr('data-field_names') )
			field_names = $('#map-canvas').data('field_names');
		
		var gray_if_no = '';
		if( $('#map-canvas').attr('data-gray_if_no') )
			gray_if_no = $('#map-canvas').data('gray_if_no');
		
		/** Check map type **/
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
		
		/** launch load_points ajax call **/		
		if( !$('#map-canvas').attr('data-load_points') || 'yes'==$('#map-canvas').data('load_points') )
			load_points( 
				post_type, 
				selection,
				file,
				popup_fields,
				field_names,
				gray_if_no,
				map_type
			);
	});
	
	/** 
	 * Ajax request to load needed points/features on the map
	 * 
	 */
	function load_points( post_type, selection, file, popup_fields, field_names, gray_if_no, map_type ) {
		console.log( 'Loading points...' );

		if( '' != file ) {
			/** get existing GEOjson file **/
			console.log('loading GEOjson file ' + file + '...');
			var fetures = new L.geoJson();
			$.ajax({
				dataType: "json",
				url: file,
				success: function(data) {
					add_markers( data, popup_fields, field_names, gray_if_no, map_type );
					if( $('.wpgeojson_choropleth').length > 0 )
						process_choropleths();
				}
			});
		} else {
			/** get GEOjson list of selected points **/
			$.post( ajaxurl, {
				action: 'get_points_for_post_type',
				post_type: post_type,
				selection: selection
			}, function( data ) {
				console.log( 'Ajax get_points_for_post_type data length: ' + data.length );
				//console.log( data );
				add_markers( data, popup_fields, field_names, gray_if_no, map_type );
			}).done(function() {
				console.log( "Ajax get_points_for_post_type success" );
			}).fail(function() {
				console.log( "Ajax get_points_for_post_type error" );
			}).always(function() {
				console.log( "Ajax get_points_for_post_type finished" );
			});
		}
	}
	
	window.update_list_box = function( visible ) {
		
		if( !$('.wpgeojson_list').length > 0 )
			return;
		
		$('.wpgeojson_list').each( function( index ) {
			
			var list_box = $( this );
			
			var html = '';
			
			if( !list_box.attr('data-field_names') )
				return;
			
			var field_names = list_box.data('field_names');
			
			fields_arr = field_names.split(",");
				
			html += '<ul>';
			visible.forEach( function( feature ){
				
				console.log(feature);
				
				html += '<li>';
				
				if( feature.properties['link'] )
					html += '<a href="' + feature.properties['link'] + '">';
				
				fields_arr.forEach( function( field ){
					
					html += '<div class="' + field + '">';
					html += feature.properties[field];
					html += '</div>';
					
				});
				
				if( feature.properties['link'] )
					html += '</a>';
				
				html +='</li>';
			});
			html += '</ul>';
			
			list_box.html( html );
		});
	};
	
	function process_choropleths() {
		$('.wpgeojson_choropleth').each( function( index ) {
			
			var choro_box = $( this );
			
			//TODO: only process box with active radio button
			
			/** defaults **/
			var base_color = 'ffff**';
			if( choro_box.attr('data-color') )
				base_color = choro_box.data('color');
			
			if( !choro_box.attr('data-property') )
				return;
			var field = choro_box.data('property');
			
			var min_value = -1;
			var max_value = 0;
			
			var percentage = false;
			re = new RegExp("\%");
			if( re.test(field) ) {
				var splitted = field.split("%");
				field = splitted[0];
				if( splitted[1] )
					percentage = true;
			}
			
			/** Get min and max values **/
			allFeatures.forEach( function( feature ) {
				
				feature.eachLayer(function(layer){
					
					if( typeof layer.setStyle != 'function' )
						return;
					
					//console.log( layer.feature );
					
					var value = layer.feature.properties[field];
					if( percentage )
						value = Math.round(layer.feature.properties[field]*1000/layer.feature.properties[splitted[1]])/10;
					
					if( min_value == -1 )
						min_value = value;
					
					if( value < min_value ) 
						min_value = value;
					
					if( value > max_value ) 
						max_value = value;
				});
			});
			
			var interval = max_value - min_value;
			var step = 256 / interval;
			console.log( 'min_value:' + min_value );
			console.log( 'max_value:' + max_value );
			console.log( 'interval:' + interval );
			console.log( 'step:' + step );
			
			/** Style the shades **/
			allFeatures.forEach( function( feature ) {
				feature.eachLayer(function(layer){
					
					if( typeof layer.setStyle != 'function' )
						return;
				
					var value = layer.feature.properties[field];
					if( percentage )
						value = Math.round(layer.feature.properties[field]*1000/layer.feature.properties[splitted[1]])/10;
					
					var shade = Math.round( value * step );
					console.log( 'shade new:' + shade );
					var invshade = parseInt( (256-shade) );
					invshade = invshade.toString(16);
					while (invshade.length < 2)
						invshade = '0' + invshade;
					
					console.log( 'invshade new:' + invshade );
					
					shade = '#ff' + invshade + invshade;
					layer.setStyle({fillColor: shade, fillOpacity: 0.8});
				});
			});
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
	L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
	
		google.maps.event.addListener( map, 'bounds_changed', on_bounds_changed );
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

function on_bounds_changed() {
	console.log( 'bounds changed' );
	var visible = get_visible_markers();
	
	if( nodes = document.getElementsByClassName("wpgeojson_list") ) {
		update_list_box( visible );	
	}
}

function get_visible_markers() {
	
	var visible = [];
	
	allFeatures.forEach( function( feature ) {
		//console.log('feature:');
		//console.log( feature );
		if( 'Point' == feature.geometry.type ) {
			position = new google.maps.LatLng( feature.geometry.coordinates[1], feature.geometry.coordinates[0] );
			if ( map.getBounds().contains( position )) {
				visible.push( feature );
			}
		}
	});
	
	return visible;
}

/**
 * GEOjson functions
 *
 */
function add_markers( geojson, popup_fields, field_names, gray_if_no, map_type ) {
	
	//console.log( 'popup_fields:' + popup_fields );
	//console.log( 'gray_if_no:' + gray_if_no );
	/* Turf test		
	var hull = turf.concave( geojson, 15, 'kilometers' );
	var hull2 = turf.convex( geojson );
	*/
	
	if( 'ggmap' == map_type ) {
		map.data.addGeoJson(geojson);
		
		geojson.features.forEach( function( item ) {
			allFeatures.push( item );
		});
		
		/* hull test
		map.data.addGeoJson(hull);
		map.data.addGeoJson(hull2, { fillColor: 'red', style: {color: 'red', fillColor: 'red'} });
		*/
	}
	
	if( 'leaflet' == map_type ) {
		
		popup_arr = popup_fields.split(",");
		//console.log( 'popup_arr:' + popup_arr );
		re = new RegExp("\%");
		features = L.geoJSON(
			geojson, {
				style: {},
				onEachFeature: function (feature, layer) {
					popupcontent = '';
					popup_arr.forEach( function(field){
						
						perc = '';
						if( re.test(field) ) {
							var splitted = field.split("%");
							field = splitted[0];
							if( splitted[1] )
								perc = Math.round(feature.properties[field]*1000/feature.properties[splitted[1]])/10;
						}
						
						if( '' == feature.properties[field] )
							return;
						
						popupcontent += '<div class="' + field + '">';
						if( 'yes' == field_names )
							popupcontent += '<strong>' + field + ': </strong>';
						popupcontent += feature.properties[field];
						if( '' != perc )
							popupcontent += ' | ' + perc + '%';
						popupcontent += '</div>';
					});
					layer.bindPopup( popupcontent );
					if( '' == popupcontent || ( gray_if_no && ''==feature.properties[gray_if_no] ) ) {
						layer.setStyle({fillColor: "#999",color: "#999", fillOpacity: 0.5});
					} else {
						if( typeof layer.setStyle != 'function' )
							return;
						//console.log(layer);
						var ffp = feature.properties['res.F. Fillon']/feature.properties['res.Exprimés'];
						var shade = (ffp*100-24)*9;
						shade = parseInt( shade );
						invshade = parseInt( (256-shade) ); 
						shade = shade.toString(16);
						invshade = invshade.toString(16);
						while (invshade.length < 2)
							invshade = '0' + invshade;
						shade = '#' +invshade + invshade + 'ff';
						layer.setStyle({fillColor: shade, fillOpacity: 0.8});
						//console.log( 'shade:' + shade );
					}
				}
			}
		);
		layer = features.addTo(map);
		allFeatures.push( features );
		allLayers.push( layer );
		
		var bounds = features.getBounds();
		map.fitBounds( bounds, {
            padding: [10, 20]
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