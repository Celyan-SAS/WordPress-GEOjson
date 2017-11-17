/** WordPress GEOjson plugin by Celyan **/
/** Map and geolocation JavaScript functions **/

console.log( 'wp-geojson-map js script loaded.' );

var map;
var infowindow;
var additionalFeatures = [];
var allFeatures = [];
var allLayers = [];
var list_limit = 50;	// Maximum number of point data to return in the list box
var field_names;
var gray_if_no;

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
		
		field_names = 'no';
		if( $('#map-canvas').attr('data-field_names') )
			field_names = $('#map-canvas').data('field_names');
		
		gray_if_no = '';
		if( $('#map-canvas').attr('data-gray_if_no') )
			gray_if_no = $('#map-canvas').data('gray_if_no');
		
		var marker_icon = '';
		if( $('#map-canvas').attr('data-marker_icon') )
			marker_icon = $('#map-canvas').data('marker_icon');
		
		var marker_icon_2 = '';
		if( $('#map-canvas').attr('data-marker_icon_2') )
			marker_icon = $('#map-canvas').data('marker_icon_2');
		
		var marker_icon_3 = '';
		if( $('#map-canvas').attr('data-marker_icon_3') )
			marker_icon = $('#map-canvas').data('marker_icon_3');
		
		var marker_icon_4 = '';
		if( $('#map-canvas').attr('data-marker_icon_4') )
			marker_icon = $('#map-canvas').data('marker_icon_4');
		
		var big_cluster_icon = '';
		if( $('#map-canvas').attr('data-big_cluster_icon') )
			big_cluster_icon = $('#map-canvas').data('big_cluster_icon');
		
		var medium_cluster_icon = '';
		if( $('#map-canvas').attr('data-medium_cluster_icon') )
			medium_cluster_icon = $('#map-canvas').data('medium_cluster_icon');
		
		var small_cluster_icon = '';
		if( $('#map-canvas').attr('data-small_cluster_icon') )
			small_cluster_icon = $('#map-canvas').data('small_cluster_icon');
				
		var load_tiles = 'yes';
		if( $('#map-canvas').attr('data-load_tiles') )
			load_tiles = $('#map-canvas').data('load_tiles');
		
		var fit_bounds = 'yes';
		if( $('#map-canvas').attr('data-fit_bounds') )
			load_tiles = $('#map-canvas').data('fit_bounds');
		
		var v_load_points = 'yes';
		if( $('#map-canvas').attr('data-load_points') )
			v_load_points = $('#map-canvas').data('load_points');
		
		var cluster_points = 'yes';
		if( $('#map-canvas').attr('data-cluster_points') )
			cluster_points = $('#map-canvas').data('cluster_points');
		
		var force_load_points = 'no';
		if( $('#map-canvas').attr('data-force_load_points') )
			force_load_points = $('#map-canvas').data('force_load_points');
		
		$.event.trigger({
			type:	"wpGeoJSON",
			status:	"map_before_init",
			time:	new Date()
		});
		
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
		if( 'yes'==v_load_points ) {
			load_points({ 
				post_type: post_type, 
				selection: selection,
				file: file,
				popup_fields: popup_fields,
				field_names: field_names,
				gray_if_no: gray_if_no,
				marker_icon: marker_icon,
				marker_icon_2: marker_icon_2,
				marker_icon_3: marker_icon_3,
				marker_icon_4: marker_icon_4,
				big_cluster_icon: big_cluster_icon,
				medium_cluster_icon: medium_cluster_icon,
				small_cluster_icon: small_cluster_icon,
				map_type: map_type,
				fit_bounds: fit_bounds,
				force_load_points: force_load_points,
				cluster_points: cluster_points
			});
		}
		
		$('.wpgeojson_choropleth input').on('click', function(e){
			console.log('clicked cp');
			process_choropleths();
		});
		
		$('.locate_button').live('click', function(e){
			center_map_on_feature( $(this).data('id') );
		});
		
		$('.more_button').live('click', function(e){
			console.log('clicked more_button');
			if( $(this).data('link') ) {
				document.location=$(this).data('link');
			} else {
				document.location='/?p=' + $(this).data('id');
			}
		});
		
		$('.wpgeojson_locateme').click( function(e) {
			console.log( 'Trying out geolocation...' );
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition( 
					function( position ){
						console.log( 'position:' );
						console.log( position );
						locate_me( position );
					},
					function (err){
						console.log( 'navigator.geolocation.getCurrentPosition error:' );
						console.log( err );
						$.event.trigger({
							type:	"wpGeoJSON",
							status:	"geolocation_error",
							error:	err,
							auto:	false,
							time:	new Date()
						});
					}
				);
			} else {
				console.log( 'Geolocation unavailable' );
				$('.wpgeojson_locateme').val('Geolocation unavailable');
			}
		});
		
		/** Autocomplete Place search **/
		if( document.getElementById('ggsearch') ) {
			var input = document.getElementById('ggsearch');
			var options = {
			  types: ['(cities)'],
			  componentRestrictions: {country: 'fr'}
			};
			autocomplete = new google.maps.places.Autocomplete(input, options);

			google.maps.event.addListener(autocomplete, 'place_changed', function() {
				var place = autocomplete.getPlace();
				
				if( document.getElementById("map-canvas") ) {
					//document.getElementById("map-canvas") && 
					//( 'undefined' == typeof iti || !iti ) && 
					//( 'undefined' == typeof page_ville || !page_ville ) 
					//) {
					
					$.event.trigger({
						type:	"wpGeoJSON",
						status:	"place_found",
						place:	place,
						time:	new Date()
					});
					
					map.setCenter( place.geometry.location );
					var closest_m = find_closest_marker( place.geometry.location );
					console.log( 'closest marker:' );
					console.log( closest_m );
					//map.setZoom( 15 );
					
					var bounds = new google.maps.LatLngBounds();
					var position = new google.maps.LatLng( closest_m.geometry.coordinates[1], closest_m.geometry.coordinates[0] );
					//bounds.extend(position);
					//bounds.extend(place.geometry.location);
					getCity( place.geometry.location, position );
					//map.fitBounds(bounds);
					
					console.log( place );
					initialZoom = true;
				} else {
					document.location = '?lat=' + place.geometry.location.lat() + '&lng=' + place.geometry.location.lng();
				}
			});
		}
	});
	
	/** 
	 * Ajax request to load needed points/features on the map
	 * 
	 */
	function load_points( params ) {
		console.log( 'Loading points...' );

		if( '' != params.file ) {
			/** get existing GEOjson file **/
			console.log('loading GEOjson file ' + params.file + '...');
			//var features = new L.geoJson();
			$.ajax({
				dataType: "json",
				url: params.file,
				success: function(data) {
					add_markers( data, params );
					if( $('.wpgeojson_choropleth').length > 0 )
						process_choropleths();
				}
			});
		}
		if( '' == params.file || 'yes'==params.force_load_points ) {
			/** get GEOjson list of selected points **/
			console.log('loading GEOjson points...');
			$.post( ajaxurl, {
				action: 'get_points_for_post_type',
				post_type: params.post_type,
				selection: params.selection,
				fields: params.popup_fields
			}, function( data ) {
				if( data ) {
					console.log( 'Ajax get_points_for_post_type data length: ' + data.length );
				} else {
					console.log( 'No data :(' );
				}
				add_markers( data, params );
			}).done(function() {
				console.log( "Ajax get_points_for_post_type success" );
			}).fail(function() {
				console.log( "Ajax get_points_for_post_type error" );
			}).always(function() {
				console.log( "Ajax get_points_for_post_type finished" );
			});
		}
	}
	
	/** Google Maps function **/
	window.update_list_box = function( visible ) {
		
		if( !$('.wpgeojson_list').length > 0 )
			return;
		
		/* DEBUG *
		console.log( 'visible:' );
		console.log( visible );
		/* */
		
		$('.wpgeojson_list').each( function( index ) {
			
			var list_box = $( this );
			
			var html = '';
			
			if( !list_box.attr('data-field_names') )
				return;
			
			field_names = list_box.data('field_names');
			
			var locate_button = false;
			var locate_text = 'Locate on map';
			if( list_box.attr('data-locate_button') && 'yes' == list_box.data('locate_button') ) {
				locate_button = true;
				if( list_box.attr('data-locate_text') )
					locate_text = list_box.data('locate_text');
			}
			
			var more_button = false;
			var more_text = 'More...';
			if( list_box.attr('data-more_button') && 'yes' == list_box.data('more_button') ) {
				more_button = true;
				if( list_box.attr('data-more_text') )
					more_text = list_box.data('more_text')
			}
			
			fields_arr = field_names.split(",");
				
			html += '<ul>';
			var marker_colors = [];
			var count = 0;
			visible.forEach( function( feature ){
				
				count ++;
				
				if( count > list_limit )
					return;
				
				var color_number = ( ( count - 1 ) % 4 ) + 1;
				//console.log(feature);
				marker_colors[feature.id] = color_number;
				
				html += '<li ';
				if( feature.id )
					html += 'id="' + feature.id + '" ';
				html += 'class="color_' + color_number + '" ';
				html += '>';
				
				if( feature.properties['link'] && !list_box.attr('data-no_link') )
					html += '<a href="' + feature.properties['link'] + '">';
				
				fields_arr.forEach( function( field ){
					
					html += '<div class="' + field + '">';
					if( typeof feature.properties[field] !== 'undefined' )
						html += nl2br( feature.properties[field] );
					html += '</div>';
					
				});
				
				if( feature.properties['link'] && !list_box.attr('data-no_link') )
					html += '</a>';
				
				if( locate_button || more_button )
					html += '<div class="clear">';
				
				if( locate_button && feature.id ) {
					html += '<input type="button" class="locate_button" value="' + locate_text + '" data-id="' + feature.id + '" ';
					html += '/>';
				}

				if( locate_button && more_button )
					html += ' ';
				
				if( more_button && feature.id && feature.properties['link'] != 'no_link' ) {
					html += '<input type="button" class="more_button" value="' + more_text + '" data-id="' + feature.id + '" ';
					if( feature.properties['link'] ) {
						html += 'data-link="' + feature.properties['link'] + '" ';
					}
					html += '/>';	
				}
				
				if( locate_button || more_button )
					html += '</div>';
				
				html +='</li>';
			});
			
			html += '</ul>';
			
			list_box.html( html );
			
			/** If map implements marker numbers change related marker icon **/
			map.data.setStyle( function(my_feature){
				
				feature_id = my_feature.getId();
				if( visible.length !== 0 && marker_colors[feature_id] && typeof marker_colors[feature_id] !== 'undefined' ) {
					color_number = marker_colors[feature_id];
					if( $('#map-canvas').attr('data-marker_icon_' + color_number) ) {
						marker_icon = $('#map-canvas').data('marker_icon_' + color_number);
					} else {
						marker_icon = $('#map-canvas').data('marker_icon');
					}
				} else {
					marker_icon = $('#map-canvas').data('marker_icon');
					color_number = '';
				}
				
				/* DEBUG *
				console.log( 'feature_id: ' + feature_id );
				console.log( 'marker_colors[feature_id]: ' + marker_colors[feature_id] );
				console.log( 'my_feature: ' + my_feature.getId() );
				console.log( 'color_number: ' + color_number );
				/* */
				
				return({icon: marker_icon});
			});
		});
	};
	
	window.list_highlight = function( id, on_off ) {
		
		if( !$('.wpgeojson_list').length > 0 )
			return;
		
		$('.wpgeojson_list').each( function( index ) {
			
			//var list_box = $( this );
			
			if( on_off ) {
				$( 'li#' + id, this ).addClass( 'highlight' );
				console.log( 'highlight ' + id );
			} else {
				$( 'li#' + id, this ).removeClass( 'highlight' );
				console.log( 'unlight ' + id );
			}
		
		});		
	};
	
	/** Google Maps function **/
	window.open_infowindow = function( feature ) {
		var html = '';
		html += '<div class="infowindow pop-up open">';
		
		fields_arr = [];
		if( $('#map-canvas').attr('data-popup_fields') ) {            
			field_names = $('#map-canvas').data('popup_fields');
			fields_arr = field_names.split(",");
		}
		
		more_text = '[More...]';
		if( $('#map-canvas').attr('data-more_text') )
			more_text = $('#map-canvas').data('more_text');
		
		fields_arr.forEach( function ( field ) {
			if( typeof feature.getProperty(field) !== "undefined" ) {
				html += '<div class="' + field + '">';
				if( 'link' == field ) {
					if( 'no_link' != feature.getProperty(field) ) {
						html += '<a href="' + feature.getProperty(field) + '">';
						html += more_text;
						html += '</a>';
					}
				} else {
					html += nl2br( feature.getProperty(field) );
				}
				html += '</div>';
			}
		});
	
		html += '</div>';
		if (infowindow) {
	        infowindow.close();
	    }
		infowindow.setContent( html );
		infowindow.setPosition( feature.getGeometry().get() );
	    infowindow.setOptions( { pixelOffset: new google.maps.Size(0,-30) } );
	    infowindow.open(map);
	};
	
	function process_choropleths() {
		$('.wpgeojson_choropleth').each( function( index ) {
			
			var choro_box = $( this );
			
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
					
					if( min_value == -1 && !isNaN(value) )
						min_value = value;
					
					if( value < min_value && !isNaN(value) ) 
						min_value = value;
					
					if( value > max_value && !isNaN(value) ) 
						max_value = value;
				});
			});
			
			var interval = max_value - min_value;
			var step = 0.0001;
			if( interval != 0  && !isNaN(interval) )
				step = 255 / interval;
			var max_color = base_color.replace( /f/g, '0' );
			max_color = max_color.replace( /\*/g, 'f' );
			console.log( 'min_value:' + min_value );
			console.log( 'max_value:' + max_value );
			console.log( 'interval:' + interval );
			console.log( 'step:' + step );
			console.log( 'max_color:' + max_color );
			
			html = '';
			html += '<span class="field" style="width:200px;padding:3px 10px;display:inline-block;">' + field.replace(/^res\./,'') + '</span>';
			html += '<span class="min" style="width:90px;padding:3px 10px;;display:inline-block;">de ' + min_value;
			if( percentage )
				html += '%';
			html += '</span>';
			html += '<span class="min_shade" style="width:5%;padding:3px 10px;background-color:#fff">&nbsp;</span>';
			html += '<span class="gradient" style="width:30%;padding:3px 10px;background-image:linear-gradient(to right, white, #' + max_color + ');">&nbsp;</span>';
			html += '<span class="max_shade" style="width:10%;padding:3px 10px;background-color:#' + max_color + '">&nbsp;</span>';
			html += '<span class="max" style="width:15%;padding:3px 10px;">à ' + max_value;
			if( percentage )
				html += '%';
			html += '</span>';
			
			$( 'label', this ).html( html );
			
			/** only process box with active radio button **/
			if( !$('input',this).is(':checked') )
				return;
			
			/** Style the shades **/
			allFeatures.forEach( function( feature ) {
				feature.eachLayer(function(layer){
					
					if( typeof layer.setStyle != 'function' )
						return;
				
					var value = layer.feature.properties[field];
					if( percentage && layer.feature.properties[splitted[1]] > 0 )
						value = Math.round(layer.feature.properties[field]*1000/layer.feature.properties[splitted[1]])/10;
					
					var shade = Math.round( ( value - min_value ) * step );
					//console.log( 'shade new:' + shade );
					var invshade = parseInt( (255-shade) );
					invshade = invshade.toString(16);
					while (invshade.length < 2)
						invshade = '0' + invshade;
					
					console.log( 'invshade new:' + invshade );
					
					shade = '#' + base_color.replace( /ff/g, invshade );
					shade = shade.replace( /\*/g, 'f' );
					console.log( 'shade new:' + shade );
					
					layer.setStyle({fillColor: shade, fillOpacity: 0.8});
				});
			});
		});
	}
	
    
    
    

/** 
 * Leaflet maps functions
 *
 */
function leaflet_init() {
	//console.log( 'leaflet_init()' );
	var options = {};
	
	var map_options = '';
	if( $('#map-canvas').attr('data-map_options') )
		map_options = $('#map-canvas').data('map_options');
	options = get_map_options_object( options, map_options );
	
	var load_tiles = 'yes';
	if( $('#map-canvas').attr('data-load_tiles') )
		load_tiles = $('#map-canvas').data('load_tiles');
	
	var fit_bounds = 'yes';
	if( $('#map-canvas').attr('data-fit_bounds') )
		fit_bounds = $('#map-canvas').data('fit_bounds');
	
	//console.log( 'map_options:' ); console.log( options );
	map = L.map( 'map-canvas', options );
	if( 'no' != fit_bounds ) {
		map.setView([47, 1.6], 5);
	}
	if( options['center'] && options['zoom'] ) {
		map.setView(options['center'], options['zoom']);
	}
	if( 'no' != load_tiles ) {
		L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
		}).addTo(map);
	}
	$.event.trigger({
		type:		"wpGeoJSON",
		status:		"map_after_init",
		maptype:	"leaflet",
		time:		new Date()
	});
}


function get_map_options_object( options, map_options ) {
	if( map_options.length ) {
		//console.log( 'map has options' );
		aoptions = map_options.split(',');
		while( aoptions.length ) {
			okv = aoptions.shift();
			//console.log( 'okv: ' + okv );
			if( okv.length ) {
				kv = okv.split(':');
				if( kv[0].length && kv[1].length ) {
					if( 'false' == kv[1] ) {
						kv[1] = false;
					}
					if( 'center' == kv[0] ) {
						kv[1] = kv[1].split(';');
					}
					if( 'maxBounds' == kv[0] ) {
						a = kv[1].split(';');
						kv[1] = [[a[0],a[1]],[a[2],a[3]]];
					}
					options[ kv[0] ] = kv[1];
				}
			}
		}
	}
	return options;
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
	$.event.trigger({
		type:		"wpGeoJSON",
		status:		"map_after_init",
		maptype:	"openlayers",
		time:		new Date()
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

		var options = {
			center: new google.maps.LatLng( '47', '1.6' ),
			zoom: 5,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			mapTypeControlOptions: { mapTypeIds: [] },
			fullscreenControl: true
		};
		var map_options = '';
		if( $('#map-canvas').attr('data-map_options') )
			map_options = $('#map-canvas').data('map_options');
		options = get_map_options_object( options, map_options );
				
		map = new google.maps.Map(document.getElementById("map-canvas"), options);
		
		//TODO: check if cluster_points == 'yes'
		var markerCluster = new DataLayerClusterer({ 
			map: map
		});
		
		// zoom to show all the features
		var bounds = new google.maps.LatLngBounds();
		map.data.addListener('addfeature', function(e) {
			processPoints(e.feature.getGeometry(), bounds.extend, bounds);
			map.fitBounds(bounds);
		});
		
		infowindow = new google.maps.InfoWindow();
		
		// Set mouseover event for each feature.
		map.data.addListener('mouseover', function(event) {
			list_highlight( event.feature.getId(), true );
			console.log( 'highlighting:' + event.feature.getId() );
		});
		map.data.addListener('mouseout', function(event) {
			list_highlight( event.feature.getId(), false );
			console.log( 'unlighting:' + event.feature.getId() );
		});
		
		// Set click event on each feature
		map.data.addListener('click', function(event) {
			open_infowindow( event.feature );
			console.log( 'infowindow:' + event.feature.getId() );
		});
	
		google.maps.event.addListener( map, 'bounds_changed', on_bounds_changed );
		
		$.event.trigger({
			type:		"wpGeoJSON",
			status:		"map_after_init",
			maptype:	"ggmap",
			time:		new Date()
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

/** Google Maps function **/
function on_bounds_changed() {
	//console.log( 'bounds changed' );
	var visible = get_visible_markers();
	
	if( nodes = document.getElementsByClassName("wpgeojson_list") ) {
		update_list_box( visible );	
	}
}

/**
 * Find closest marker
 * @see http://stackoverflow.com/questions/4057665/google-maps-api-v3-find-nearest-markers
 *
 */
function rad(x) {return x*Math.PI/180;}
function find_closest_marker( pos ) {
	console.log( 'searching closest marker...' );
	var lat = pos.lat();
	var lng = pos.lng();
	var R = 6371; // radius of earth in km
	var distances = [];
	var closest = -1;
	var i;
	for( i=0; i<allFeatures.length; i++ ) {
		feature = allFeatures[i];
		if( 'Point' == feature.geometry.type ) {
			var position = new google.maps.LatLng( feature.geometry.coordinates[1], feature.geometry.coordinates[0] );
			var mlat = position.lat();
			var mlng = position.lng();
			var dLat  = rad(mlat - lat);
			var dLong = rad(mlng - lng);
			var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		    		Math.cos(rad(lat)) * Math.cos(rad(lat)) * Math.sin(dLong/2) * Math.sin(dLong/2);
			var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
			var d = R * c;
			distances[i] = d;
			if ( closest == -1 || d < distances[closest] ) {
				closest = i;
			}
		}
	}
	return allFeatures[closest];
}

/**
 * Get city object from LatLng
 * @see: http://stackoverflow.com/questions/6797569/get-city-name-using-geolocation
 *
 */
function getCity( latLng, closest_position ) {
	var geocoder= new google.maps.Geocoder();
	geocoder.geocode({'latLng': latLng}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
  				console.log(results);

			//find city bounds
			city_bounds = false;
			for( var i=0; i<results.length; i++ ) {
				for( var j=0; j<results[i].types.length; j++ ) {
					if( results[i].types[j] == 'locality' ) {
						city_bounds = results[i].geometry.bounds;
						break;
					}
					if( city_bounds )
						break;
				}
			}
			console.log( 'city_bounds:' );
			console.log( city_bounds );
			city_bounds.extend( closest_position );
			map.fitBounds( city_bounds );

    			if (results[1]) {
     				//formatted address
    				console.log( results[0].formatted_address );
			        //find city name
				for (var i=0; i<results[0].address_components.length; i++) {
					for (var b=0;b<results[0].address_components[i].types.length;b++) {

						//there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality type will be more appropriate
						if ( results[0].address_components[i].types[0] == 'locality' ) {
                						//this is the object you are looking for
                						city = results[0].address_components[i];

							$ = jQuery;
							$('h4.ville').html( city.long_name );
							return city;
						}
					}
				}

			} else {
				console.log( "getCity: No results found" );
				return false;
			}
		} else {
			console.log( "Geocoder failed due to: " + status );
			return false;
		}
	});
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
	
	/** Trier par distance au centre de la carte **/
	var mapCenter = map.getCenter();
	visible.sort( function( a, b ) {
		var position_a = new google.maps.LatLng( a.geometry.coordinates[1], a.geometry.coordinates[0] );
		var distance_a = google.maps.geometry.spherical.computeDistanceBetween( position_a, mapCenter );
		a.properties.distance = distance_a;
		var position_b = new google.maps.LatLng( b.geometry.coordinates[1], b.geometry.coordinates[0] );
		var distance_b = google.maps.geometry.spherical.computeDistanceBetween( position_b, mapCenter );
		b.properties.distance = distance_b;
		return distance_a - distance_b;
	});
	
	return visible;
}

/**
 * GEOjson functions
 *
 */
function add_markers( geojson, params ) {
	
	console.log( 'add_markers params:' );
	console.log( params );
	//console.log( 'popup_fields:' + popup_fields );
	//console.log( 'gray_if_no:' + gray_if_no );
	/* Turf test		
	var hull = turf.concave( geojson, 15, 'kilometers' );
	var hull2 = turf.convex( geojson );
	*/
	if( !geojson ) {
		console.log( 'No geojson data for markers :(' );
		return false;
	}
	
	if( 'ggmap' == params.map_type ) {
		
		map.data.addGeoJson(geojson);
		
		if( params.marker_icon )
			map.data.setStyle({icon: params.marker_icon});
		
		geojson.features.forEach( function( item ) {
			allFeatures.push( item );
		});
		
		/* hull test
		map.data.addGeoJson(hull);
		map.data.addGeoJson(hull2, { fillColor: 'red', style: {color: 'red', fillColor: 'red'} });
		*/
	}
	
	if( 'leaflet' == params.map_type ) {
		
		if( 'yes' == params.cluster_points ) {
			var clustered_markers = L.markerClusterGroup({
				showCoverageOnHover: false,
				iconCreateFunction: function(cluster) {
					if( params.big_cluster_icon )
						return L.icon({ iconUrl: params.big_cluster_icon, iconSize: [33, 33] });	//TODO: don't specify size?
					if( params.marker_icon )
						return L.icon({ iconUrl: params.marker_icon });
					return L.divIcon({ html: '<b>' + cluster.getChildCount() + '</b>' });
				}
			});
		}
	
        if((field_names == undefined || field_names == '') && $('#map-canvas').attr('data-popup_fields') ) {            
			field_names = $('#map-canvas').data('popup_fields');
		}
        
        var more_text = '[More...]';
		if( $('#map-canvas').attr('data-more_text') )
			more_text = $('#map-canvas').data('more_text');
		
		popup_arr = params.popup_fields.split(",");
		//console.log( 'popup_arr:' + popup_arr );
		re = new RegExp("\%");
		features = L.geoJSON(
			geojson, {
				style: {},
				onEachFeature: function (feature, layer) {

					popupcontent = '';
					var fieldnb = 0;
					popup_arr.forEach( function(field){
						
						if( 'iconUrl' == field ) {
							return;
						}
						
						fieldnb++;
						
						perc = '';
						if( re.test(field) ) {
							var splitted = field.split("%");
							field = splitted[0];
							if( splitted[1] )
								perc = Math.round(feature.properties[field]*1000/feature.properties[splitted[1]])/10;
						}
						
						if( 
							typeof feature.properties[field] == 'undefined' ||
							'' == feature.properties[field] 
						) {
							return;
						}
												
						popupcontent += '<div class="' + field + '">';
						if( 'link' == field || 'res.link' == field ) {
							if( 'no_link' != feature.properties[field] ) {
								popupcontent += '<a href="' + feature.properties[field] + '">';
								popupcontent += more_text;
								popupcontent += '</a>';
							}
						} else {
							if( 'yes' == field_names ) {
								popupcontent += '<strong>' + field.replace(/^res\./,'') + ': </strong>';
							} else {
								if( 1 == fieldnb && 'name' == field )
									popupcontent += '<h2>';
							}
							popupcontent += markup2html( nl2br( feature.properties[field] ) );
							if( '' != perc )
								popupcontent += ' | ' + perc + '%';
							if( 'yes' != field_names && 1 == fieldnb && 'name' == field )
								popupcontent += '</h2>';
						}
						popupcontent += '</div>';
					});
					if( 
						typeof popupcontent != 'undefined' &&
						'' != popupcontent 
					) {
						layer.bindPopup( popupcontent );
					}
					if( typeof layer.setStyle == 'function' ) {
						if ( '' == popupcontent || ( gray_if_no && ''==feature.properties[gray_if_no] ) ) {
							layer.setStyle({fillColor: "#999",color: "#999", fillOpacity: 0.5});
						} else {
							if( feature.properties['res.color'] ) {
								layer.setStyle({fillColor: feature.properties['res.color'],color: feature.properties['res.color'], fillOpacity: 0.5});
							}
						}
					}
					if( typeof layer.setIcon == 'function' && params.marker_icon ) {
						layer.setIcon( L.icon({ iconUrl: params.marker_icon }) );
						//console.log( 'layer.setIcon: ' + params.marker_icon );
					}
					if( typeof layer.setIcon == 'function' && feature.properties['iconUrl'] ) {
						layer.setIcon( L.icon({ iconUrl: feature.properties['iconUrl'] }) );
					}
					if( feature.properties['res.label'] ) {
						layer.bindTooltip( feature.properties['res.label'], { permanent: true } ).addTo( map );
					}
					/** Umap compatibility **/
					if( typeof layer.setIcon == 'function' && feature.properties['_storage_options'] && feature.properties['_storage_options'].iconUrl ) {
						layer.setIcon( L.icon({ iconUrl: feature.properties['_storage_options'].iconUrl }) );
					}
				}
			}
		);
		
		if( 'yes' == params.cluster_points ) {
			clustered_markers.addLayer( features );
			map.addLayer( clustered_markers );
			layer = features; // (??? test)
		} else {
			layer = features.addTo(map);
		}
		allFeatures.push( features );
		allLayers.push( layer );
		
		var bounds = features.getBounds();
		if( 'no' != params.fit_bounds ) {
			map.fitBounds( bounds, {
	            padding: [10, 20]
	        });
		}
		
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
		if( 'no' != params.fit_bounds ) {
			map.fitBounds(group.getBounds());
		}
		
		/* hull test
		L.geoJSON(hull).addTo(map);
		L.geoJSON(
			hull2, {
				style: {color: 'red'}				
			}).addTo(map);
		*/
	}
	
	if( 'openlayers' == params.map_type ) {
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
	
	if( $('.wpgeojson_locateme').length && $('.wpgeojson_locateme').attr('data-auto') ) {
		console.log( 'Trying out auto geolocation...' );
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition( 
				function( position ){
					console.log( 'position:' );
					console.log( position );
					locate_me( position );
				},
				function (err){
					console.log( 'navigator.geolocation.getCurrentPosition error:' );
					console.log( err );
					$.event.trigger({
						type:	"wpGeoJSON",
						status:	"geolocation_error",
						error:	err,
						auto:	true,
						time:	new Date()
					});
				}
			);
		} else {
			console.log( 'Geolocation unavailable' );
			$('.wpgeojson_locateme').val('Geolocation unavailable');
		}			
	}
	
	$.event.trigger({
		type:	"wpGeoJSON",
		status:	"markers_after_add",
		map_type: params.map_type,
		time:	new Date()
	});
}

function center_map_on_feature( id ) {
	console.log( 'feature id to center map on: ' + id );
	allFeatures.forEach( function( feature ) {
		if( 'Point' == feature.geometry.type ) {
			if( id == feature.id ) {
				position = new google.maps.LatLng( feature.geometry.coordinates[1], feature.geometry.coordinates[0] );
				map.setCenter( position );
				console.log( 'centered feature:' );
				console.log( feature );
				open_infowindow( map.data.getFeatureById( id ) );
			}
		}
	});
}

function locate_me( position ) {
	
	console.log( 'locate me!' );
	
	if( 'undefined' == typeof map || !map )
		return false;
	
	console.log( 'map ok' );
	
	var pos = new google.maps.LatLng(position.coords.latitude,
        	position.coords.longitude);
	
	console.log( 'pos ok' );
	console.log( pos );
	
	$.event.trigger({
		type:	"wpGeoJSON",
		status:	"user_located",
		pos: 	pos,
		time:	new Date()
	});
	
	marker = new google.maps.Marker({
		position: pos,
		map: map,
		title: 'Your position',
		icon: '//www.google.com/mapfiles/dd-start.png'
	});
	
	console.log( 'marker ok' );
	
	map.panTo( pos );
	console.log( 'panTo ok' );
	
	var closest_m = find_closest_marker( pos );
	console.log( 'closest marker:' );
	console.log( closest_m );
	//map.setZoom( 15 );
	
	var bounds = new google.maps.LatLngBounds();
	var position = new google.maps.LatLng( closest_m.geometry.coordinates[1], closest_m.geometry.coordinates[0] );
	//bounds.extend(position);
	//bounds.extend(place.geometry.location);
	getCity( pos, position );
}

/** See: https://stackoverflow.com/questions/2919337/jquery-convert-line-breaks-to-br-nl2br-equivalent **/
function nl2br (str, is_xhtml) {   
	//console.log( 'nl2br' );
	//console.log( str );
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';    
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
}

function markup2html( str ) {
	str = (str + '').replace(/([^>\r\n]?)#(.+)\r?\n/g, '$1' + '<h3>' + '$2' + '</h3>');
	return (str + '').replace(/---/g, '<hr/>');
}

})( jQuery );
