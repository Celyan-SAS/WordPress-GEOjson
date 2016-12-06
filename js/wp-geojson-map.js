/** WordPress GEOjson plugin by Celyan **/
/** Map and geolocation JavaScript functions **/

console.log( 'wp-geojson-map js script loaded.' );

var map;
var infowindow;
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
		
		var marker_icon = '';
		if( $('#map-canvas').attr('data-marker_icon') )
			marker_icon = $('#map-canvas').data('marker_icon');
		
		var big_cluster_icon = '';
		if( $('#map-canvas').attr('data-big_cluster_icon') )
			big_cluster_icon = $('#map-canvas').data('big_cluster_icon');
		
		var medium_cluster_icon = '';
		if( $('#map-canvas').attr('data-medium_cluster_icon') )
			medium_cluster_icon = $('#map-canvas').data('medium_cluster_icon');
		
		var small_cluster_icon = '';
		if( $('#map-canvas').attr('data-small_cluster_icon') )
			small_cluster_icon = $('#map-canvas').data('small_cluster_icon');
		
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
				marker_icon,
				big_cluster_icon,
				medium_cluster_icon,
				small_cluster_icon,
				map_type
			);
		
		$('.wpgeojson_choropleth input').on('click', function(e){
			console.log('clicked cp');
			process_choropleths();
		});
		
		$('.locate_button').live('click', function(e){
			center_map_on_feature( $(this).data('id') );
		});
		
		$('.more_button').live('click', function(e){
			console.log('clicked more_button');
			document.location='/?p=' + $(this).data('id');
		});
		
		$('.wpgeojson_locateme').click( function(e) {
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition( function( position ){
					console.log( 'position:' );
					console.log( position );
					locate_me( position );
				} );
			} else {
				console.log( 'Geolocation unavailable' );
				$('.wpgeojson_locateme').val('Geolocation unavailable');
			}
		});
	});
	
	/** 
	 * Ajax request to load needed points/features on the map
	 * 
	 */
	function load_points( post_type, selection, file, popup_fields, field_names, gray_if_no, marker_icon, big_cluster_icon, medium_cluster_icon, small_cluster_icon, map_type ) {
		console.log( 'Loading points...' );

		if( '' != file ) {
			/** get existing GEOjson file **/
			console.log('loading GEOjson file ' + file + '...');
			var fetures = new L.geoJson();
			$.ajax({
				dataType: "json",
				url: file,
				success: function(data) {
					add_markers( data, popup_fields, field_names, gray_if_no, marker_icon, big_cluster_icon, medium_cluster_icon, small_cluster_icon, map_type );
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
				add_markers( data, popup_fields, field_names, gray_if_no, marker_icon, big_cluster_icon, medium_cluster_icon, small_cluster_icon, map_type );
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
			var count = 0;
			visible.forEach( function( feature ){
				
				count ++;
				var color_number = ( count % 4 ) + 1;
				//console.log(feature);
				
				html += '<li ';
				if( feature.id )
					html += 'id="' + feature.id + '" ';
				html += 'class="color_' + color_number + '" ';
				html += '>';
				
				if( feature.properties['link'] )
					html += '<a href="' + feature.properties['link'] + '">';
				
				fields_arr.forEach( function( field ){
					
					html += '<div class="' + field + '">';
					html += feature.properties[field];
					html += '</div>';
					
				});
				
				if( feature.properties['link'] )
					html += '</a>';
				
				if( locate_button || more_button )
					html += '<div class="clear">';
				
				if( locate_button && feature.id )
					html += '<input type="button" class="locate_button" value="' + locate_text + '" data-id="' + feature.id + '"/>';

				if( locate_button && more_button )
					html += ' ';
				
				if( more_button && feature.id )
					html += '<input type="button" class="more_button" value="' + more_text + '" data-id="' + feature.id + '"/>';	
				
				if( locate_button || more_button )
					html += '</div>';
				
				html +='</li>';
			});
			
			html += '</ul>';
			
			list_box.html( html );
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
			html += '<div class="' + field + '">';
			if( 'link' == field ) {
				html += '<a href="' + feature.getProperty(field) + '">';
				html += more_text;
				html += '</a>';
			} else {
				html += feature.getProperty(field);
			}
			html += '</div>';
		});
	
		html += '</div>';
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
			html += '<span class="field" style="width:200px;padding:3px 10px;display:inline-block;">' + field + '</span>';
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
			fullscreenControl: true
		});
		
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
	//console.log( 'bounds changed' );
	var visible = get_visible_markers();
	
	if( nodes = document.getElementsByClassName("wpgeojson_list") ) {
		update_list_box( visible );	
	}
}

function get_visible_markers() {
	
	var visible = [];
	
	allFeatures.forEach( function( feature ) {
		console.log('feature:');
		console.log( feature );
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
function add_markers( geojson, popup_fields, field_names, gray_if_no, marker_icon, big_cluster_icon, medium_cluster_icon, small_cluster_icon, map_type ) {
	
	//console.log( 'popup_fields:' + popup_fields );
	//console.log( 'gray_if_no:' + gray_if_no );
	/* Turf test		
	var hull = turf.concave( geojson, 15, 'kilometers' );
	var hull2 = turf.convex( geojson );
	*/
	
	if( 'ggmap' == map_type ) {
		
		map.data.addGeoJson(geojson);
		
		if( marker_icon )
			map.data.setStyle({ icon: marker_icon });
		
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

function center_map_on_feature( id ) {
	console.log( 'feature id to center map on: ' + id );
	allFeatures.forEach( function( feature ) {
		if( 'Point' == feature.geometry.type ) {
			if( id == feature.id ) {
				position = new google.maps.LatLng( feature.geometry.coordinates[1], feature.geometry.coordinates[0] );
				map.setCenter( position );
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
	
	marker = new google.maps.Marker({
		position: pos,
		map: map,
		title: 'Your position',
		icon: '//www.google.com/mapfiles/dd-start.png'
	});
	
	console.log( 'marker ok' );
	
	map.panTo( pos );
	
	console.log( 'panTo ok' );
}