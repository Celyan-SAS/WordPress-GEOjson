/** WordPress GEOjson plugin by Celyan **/
/** Map and geolocation JavaScript functions **/

clog( 'wp-geojson-map js script loaded.' );

var map;
var infowindow;
var additionalFeatures = [];
var allFeatures = [];
var allLayers = [];
var allMarkers = [];
var list_limit = 50;	// Maximum number of point data to return in the list box
var field_names;
var gray_if_no;
var last_params_used;

function clog(data){
	if(false){
		console.log(data);
	}
}
	
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
		
		var custom_cluster_icons = 'no';
		if( $('#map-canvas').attr('data-custom_cluster_icons') )
			custom_cluster_icons = $('#map-canvas').data('custom_cluster_icons');	
		
		var user_personnal_icon = 'no';
		if( $('#map-canvas').attr('data-user_personnal_icon') )
			user_personnal_icon = $('#map-canvas').data('user_personnal_icon');	
		
		var spideroverlaping = 'no';
		if( $('#map-canvas').attr('data-spideroverlaping') )
			spideroverlaping = $('#map-canvas').data('spideroverlaping');	
		
		var spideroverlaping_zoom = 'no';
		if( $('#map-canvas').attr('data-spideroverlaping_zoom') )
			spideroverlaping_zoom = $('#map-canvas').data('spideroverlaping_zoom');			
		
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
			fit_bounds = $('#map-canvas').data('fit_bounds');
		
		var v_load_points = 'yes';
		if( $('#map-canvas').attr('data-load_points') )
			v_load_points = $('#map-canvas').data('load_points');
		
		var cluster_points = 'no';
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
		last_params_used = { 
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
			user_personnal_icon : user_personnal_icon,
			custom_cluster_icons : custom_cluster_icons,
			big_cluster_icon: big_cluster_icon,
			medium_cluster_icon: medium_cluster_icon,
			small_cluster_icon: small_cluster_icon,
			map_type: map_type,
			fit_bounds: fit_bounds,
			force_load_points: force_load_points,
			cluster_points: cluster_points,
			spideroverlaping:spideroverlaping,
			spideroverlaping_zoom:spideroverlaping_zoom
		}
		
		if( 'yes'==v_load_points ) {
			load_points(last_params_used);
		}
		
		$('.wpgeojson_choropleth input').on('click', function(e){
			clog('clicked cp');
			process_choropleths();
		});
		
		$('.locate_button').live('click', function(e){
			center_map_on_feature( $(this).data('id') );
		});
		
		$('.more_button').live('click', function(e){
			clog('clicked more_button');
			if( $(this).data('link') ) {
				if( 'yes' == $(this).data('blank') ) {
					var win = window.open( $(this).data('link'), '_blank' );
					if( win ) {
						win.focus();
					} else {
						alert('Please allow popups for this website');
					}
				} else {
					document.location=$(this).data('link');
				}
			} else {
				document.location='/?p=' + $(this).data('id');
			}
		});
		
		$('.wpgeojson_locateme').click( function(e) {
			clog( 'Trying out geolocation...' );
			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition( 
					function( position ){
						clog( 'position:' );
						clog( position );
						locate_me( position );
					},
					function (err){
						clog( 'navigator.geolocation.getCurrentPosition error:' );
						clog( err );
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
				clog( 'Geolocation unavailable' );
				$('.wpgeojson_locateme').val('Geolocation unavailable');
			}
		});
		
		/** Autocomplete Place search **/
		if( document.getElementById('ggsearch') ) {
			
			if(typeof google === 'undefined'){
				clog( 'GOOGLE Missing !!!!! ' );
				return;
			}
			
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
					clog( 'closest marker:' );
					clog( closest_m );
					//map.setZoom( 15 );
					
					if(typeof closest_m != 'undefined'){
						//var bounds = new google.maps.LatLngBounds();
						var position = new google.maps.LatLng( closest_m.geometry.coordinates[1], closest_m.geometry.coordinates[0] );
						//bounds.extend(position);
						//bounds.extend(place.geometry.location);
						getCity( place.geometry.location, position );
						//map.fitBounds(bounds);

						clog( place );
						initialZoom = true;
					}else{
						console.log("no closest");
					}
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
	window.load_points = function( params ) {
		clog( 'Loading points...' );

		if(map != undefined){
			/**reset map features **/
			map.data.forEach(function(feature) {
				// If you want, check here for some constraints.
				map.data.remove(feature);
			});	
		}
		/** reset data printed **/
		allFeatures = [];
		allLayers = [];
		
		/**save params in case of external use **/
		last_params_used = params;

		if( '' != params.file ) {
			/** get existing GEOjson file **/
			clog('loading GEOjson file ' + params.file + '...');
			
			var data_ajax = {};
			if(params.data_ajax != undefined && params.data_ajax != '' ){
				data_ajax = params.data_ajax;
			}
			
			//var features = new L.geoJson();
			$.ajax({
				dataType: "json",
				url: params.file,
				data:data_ajax,
				success: function(data) {
					add_markers( data, params );
					if( $('.wpgeojson_choropleth').length > 0 )
						process_choropleths();
				}
			});
		}
		if( '' == params.file || 'yes'==params.force_load_points ) {
			/** get GEOjson list of selected points **/
			clog('loading GEOjson points...');
			var data_filters = {};
			if(params.data_filters!=undefined && params.data_filters!=''){
				data_filters = params.data_filters;
			}
			$.post( ajaxurl, {
				action: 'get_points_for_post_type',
				post_type: params.post_type,
				selection: params.selection,
				fields: params.popup_fields,
				datafilters:data_filters
			}, function( data ) {
				if( data ) {
					clog( 'Ajax get_points_for_post_type data length: ' + data.length );					
				} else {
					clog( 'No data :(' );
					
					$.event.trigger({
						type:		"wpGeoJSON_loadpoints_empty",
						time:		new Date()
					});
					return false;
				}
				add_markers( data, params );
				
				$.event.trigger({
					type:		"wpGeoJSON_loadpoints",
					time:		new Date()
				});
				
			}).done(function() {
				clog( "Ajax get_points_for_post_type success" );
			}).fail(function() {
				clog( "Ajax get_points_for_post_type error" );
			}).always(function() {
				clog( "Ajax get_points_for_post_type finished" );
				$.event.trigger({
					type:		"wpGeoJSON_loadpoints_finished",
					time:		new Date()
				});				
			});
		}
	}
	
	/** Google Maps function **/
	window.update_list_box = function( visible ) {
		
		if( !$('.wpgeojson_list').length > 0 )
			return;
		
		/* DEBUG *
		clog( 'visible:' );
		clog( visible );
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
			var more_blank = 'no';
			if( list_box.attr('data-more_button') && 'yes' == list_box.data('more_button') ) {
				more_button = true;
				if( list_box.attr('data-more_text') )
					more_text = list_box.data('more_text');
				if( list_box.attr('data-more_blank') )
					more_blank = list_box.data('more_blank');
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
				//clog(feature);
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
					html += 'data-blank="' + more_blank + '" ';
					html += '/>';	
				}
				
				if( locate_button || more_button )
					html += '</div>';
				
				html +='</li>';
			});
			
			html += '</ul>';
			
			/** add ajax call to do a filter **/
			var general_data = {
				'locate_button':locate_button,
				'locate_text':locate_text,
				'more_text':more_text,
				'more_button':more_button,
				'more_blank':more_blank,
				'fields_arr':fields_arr,
				'data_no_link':list_box.attr('data-no_link')
			};
			$.post( ajaxurl, {
				action: 'geojson_html_result_build_filter',
				visible: JSON.stringify(visible),
				general_data: JSON.stringify(general_data),
				html:html,
			}, function( data ) {
				if( data ) {					
					html = data;
				}				
			}).always(function() {
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
					clog( 'feature_id: ' + feature_id );
					clog( 'marker_colors[feature_id]: ' + marker_colors[feature_id] );
					clog( 'my_feature: ' + my_feature.getId() );
					clog( 'color_number: ' + color_number );
					/* */

					return({icon: marker_icon});
				});				
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
				clog( 'highlight ' + id );
			} else {
				$( 'li#' + id, this ).removeClass( 'highlight' );
				clog( 'unlight ' + id );
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
		more_blank = 'no';
		if( $('#map-canvas').attr('data-more_text') )
			more_text = $('#map-canvas').data('more_text');
		if( $('#map-canvas').attr('data-more_blank') )
			more_blank = $('#map-canvas').data('more_blank');
		
		fields_arr.forEach( function ( field ) {
			if( typeof feature.getProperty(field) !== "undefined" ) {
				html += '<div class="' + field + '">';
				if( 'link' == field ) {
					if( 'no_link' != feature.getProperty(field) ) {
						html += '<a href="' + feature.getProperty(field) + '" ';
						if( 'yes' == more_blank ) {
							html += 'target="_blank" ';
						}
						html += '>';
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
					
					//clog( layer.feature );
					
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
			clog( 'min_value:' + min_value );
			clog( 'max_value:' + max_value );
			clog( 'interval:' + interval );
			clog( 'step:' + step );
			clog( 'max_color:' + max_color );
			
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
					//clog( 'shade new:' + shade );
					var invshade = parseInt( (255-shade) );
					invshade = invshade.toString(16);
					while (invshade.length < 2)
						invshade = '0' + invshade;
					
					clog( 'invshade new:' + invshade );
					
					shade = '#' + base_color.replace( /ff/g, invshade );
					shade = shade.replace( /\*/g, 'f' );
					clog( 'shade new:' + shade );
					
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
	//clog( 'leaflet_init()' );
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
	
	//clog( 'map_options:' ); clog( options );
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
		//clog( 'map has options' );
		aoptions = map_options.split(',');
		while( aoptions.length ) {
			okv = aoptions.shift();
			//clog( 'okv: ' + okv );
			if( okv.length ) {
				kv = okv.split(':');
				if( kv[0].length && kv[1].length ) {
					if( 'false' == kv[1] ) {
						kv[1] = false;
					}
					if( 'center' == kv[0] ) {
						kv[1] = kv[1].split(';');
					}
					if( 'calculate_google_center' == kv[0] ) {
						a = kv[1].split(';');
						kv[1] = new google.maps.LatLng( a[0], a[1] );
					}
					if( 'maxBounds' == kv[0] ) {
						a = kv[1].split(';');
						kv[1] = [[a[0],a[1]],[a[2],a[3]]];
					}					
					if( 'zoom' == kv[0] ) {
						kv[1] = parseInt(kv[1]);
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
	clog( 'ol_init()' );
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
	
	clog( 'ggmap_init()' );
	
	if( document.getElementById("map-canvas") ) {
		
		clog( 'found map-canvas' );

		var options = {
			center: new google.maps.LatLng( '47', '1.6' ),
			zoom: 5,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			mapTypeControlOptions: { mapTypeIds: [] },
			fullscreenControl: true
		};
		
		var map_options = '';
		if( $('#map-canvas').attr('data-map_options') ){
			map_options = $('#map-canvas').data('map_options');		
			options = get_map_options_object( options, map_options );	
		}		
				
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
			clog( 'highlighting:' + event.feature.getId() );
		});
		map.data.addListener('mouseout', function(event) {
			list_highlight( event.feature.getId(), false );
			clog( 'unlighting:' + event.feature.getId() );
		});
		
		// Set click event on each feature
		map.data.addListener('click', function(event) {
			open_infowindow( event.feature );
			clog( 'infowindow:' + event.feature.getId() );
		});
	
		google.maps.event.addListener( map, 'bounds_changed', on_bounds_changed );
		
		$.event.trigger({
			type:		"wpGeoJSON",
			status:		"map_after_init",
			maptype:	"ggmap",
			time:		new Date()
		});
		
	} else {
		clog( 'No map canvas on this page.' );
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
	//clog( 'bounds changed' );
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
	clog( 'searching closest marker...' );
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
  				clog(results);

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
			clog( 'city_bounds:' );
			clog( city_bounds );
			city_bounds.extend( closest_position );
			map.fitBounds( city_bounds );

    			if (results[1]) {
     				//formatted address
    				clog( results[0].formatted_address );
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
				clog( "getCity: No results found" );
				return false;
			}
		} else {
			clog( "Geocoder failed due to: " + status );
			return false;
		}
	});
}

function get_visible_markers() {
	
	var visible = [];
	
	allFeatures.forEach( function( feature ) {
		//clog('feature:');
		//clog( feature );
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
	
	clog( 'add_markers params:' );
	clog( params );
	//clog( 'popup_fields:' + popup_fields );
	//clog( 'gray_if_no:' + gray_if_no );
	/* Turf test		
	var hull = turf.concave( geojson, 15, 'kilometers' );
	var hull2 = turf.convex( geojson );
	*/
	if( !geojson ) {
		clog( 'No geojson data for markers :(' );
		return false;
	}
	
	if( 'ggmap' == params.map_type ) {
		
		//map.data.addGeoJson(geojson);		
		var last_spider_format = '';
		
		if('yes' == params.spideroverlaping){
			var oms = new OverlappingMarkerSpiderfier(map, {
				markersWontMove: true,
				markersWontHide: true,
				basicFormatEvents: false,
//			spiralFootSeparation:500,
//				spiralLengthStart:0,
//			spiralLengthFactor:5,
				nearbyDistance:40,				
				circleSpiralSwitchover: "Infinity",
				circleFootSeparation: 50
			});	
			
				console.log("version 1");
		}
		
		/** This code allows clustering **/		
		var flmarkers = geojson.features.map(function (feature) {
			var position = new google.maps.LatLng( feature.geometry.coordinates[1], feature.geometry.coordinates[0] );

			/** if we are in user type and we want the user thumb **/
			var defaulticon = true;
			var icon_1 = '';
			var icon_2 = '';
			if(typeof params.user_personnal_icon!= 'undefined' &&  params.user_personnal_icon=='yes'){						
				if(typeof icons != "undefined" 
					&& typeof icons[feature.id] != "undefined" 
					&& icons[feature.id].icon ){
					var icon_user = icons[feature.id].icon;
					var marker = new google.maps.Marker({ 
						'position': position, 
						'map': map,
						'icon': { 
							url:icon_user,
							scaledSize: new google.maps.Size(40, 40)
						}, //for css look for customoverlay.draw "markerLayer" a few lines down
						optimized:false
					});	
					icon_1 = icon_user;
					defaulticon = false;
				}
			}				
			if(defaulticon){					
				if(typeof params.marker_icon!= 'undefined' &&  params.marker_icon!=''){
					var marker = new google.maps.Marker({ 'position': position, 'icon':params.marker_icon });
					icon_1 = params.marker_icon;
				}else{
					var marker = new google.maps.Marker({ 'position': position});
				}
			}
			
			if(icon_1!='' && typeof params.marker_icon!= 'undefined' && params.marker_icon_2!=''){
				google.maps.event.addListener(marker, 'mouseover', function() {
					marker.setIcon(params.marker_icon_2);
				});
				google.maps.event.addListener(marker, 'mouseout', function() {
					marker.setIcon(icon_1);
				});
			}
			
			if('yes' == params.spideroverlaping){
				google.maps.event.addListener(marker, 'spider_click', function(event) {  // 'spider_click', not plain 'click'
					//infowindow.setContent(markerData.text);
					//infowindow.open(map, marker);
					$.event.trigger({
						type:	"wpGeoJSON_marker_clicked",
						marker_clicked: event,
						marker:marker,
						feature:feature,
						time:	new Date()
					});				
				});
				

				/** listen to the status of the marker to know what icon for the spider **/
				google.maps.event.addListener(marker, 'spider_format', function(status) {
					last_spider_format = status;
					/** spiderfied clicked and changed to round thing, we reset imges to their original **/
					if(status == OverlappingMarkerSpiderfier.markerStatus.SPIDERFIED){
						marker.setIcon({
							url:icon_user,
							scaledSize: new google.maps.Size(40, 40),
							anchor: new google.maps.Point(20, 20)
							//scaledSize: new google.maps.Size(32, 32)  // makes SVG icons work in IE
						});
					}					
					/** if we are in the zoom zone that cluster does not cover and we have not clicked on the spider **/
					if(status == OverlappingMarkerSpiderfier.markerStatus.SPIDERFIABLE){
						var regroup_spider_url = '';
						if(params.big_cluster_icon != ''){
							regroup_spider_url = params.medium_cluster_icon;
						}else if(params.medium_cluster_icon != ''){
							regroup_spider_url = params.small_cluster_icon;
						}else if(params.small_cluster_icon != ''){
							regroup_spider_url = params.big_cluster_icon;
						}
						marker.setIcon({
							url: regroup_spider_url,
							scaledSize: new google.maps.Size(40, 40)  // makes SVG icons work in IE
						});
					}					
				});	
			}
		
			/** other listener when we do not have spider **/
			if('no' == params.spideroverlaping){
				/** add event listener **/
				marker.addListener('click', function(event) {
					$.event.trigger({
						type:	"wpGeoJSON_marker_clicked",
						marker_clicked: event,
						marker:marker,
						feature:feature,
						time:	new Date()
					});
				});
			}
			
			if('yes' == params.spideroverlaping){
				oms.addMarker(marker);
			}
			
			return marker;
		});
				
		google.maps.event.addListenerOnce(map, 'idle', function() {
			if(map.getZoom() > 14){
				map.setZoom(map.getZoom());
			}
		});
		
		map.addListener('zoom_changed', function() {
				clog('Zoom: ' + map.getZoom());
		});

		if( 'yes' == params.cluster_points ) {
			if(typeof params.custom_cluster_icons!= 'undefined' &&  params.custom_cluster_icons!='no'){
				var clusterStyles = [
					{
						textColor: 'black',
						url: params.big_cluster_icon,
						height: 32,
						width: 32
					},
					{
						textColor: 'black',
						url: params.medium_cluster_icon,
						height: 32,
						width: 32
					},
					{
						textColor: 'black',
						url: params.small_cluster_icon,
						height: 32,
						width: 32
					}
				];
				var mcOptions = {
					maxZoom: 10,
					styles: clusterStyles
				}				
				var markerCluster = new MarkerClusterer(
				map, 
				flmarkers,
				mcOptions);
			}else{
				var markerCluster = new MarkerClusterer(
				map, 
				flmarkers,
				{ imagePath: 'https://cdn.rawgit.com/googlemaps/js-marker-clusterer/gh-pages/images/m' });
			}
			if('yes' == params.spideroverlaping){
				if(params.spideroverlaping_zoom != '' && params.spideroverlaping_zoom != 'no'){
					markerCluster.setMaxZoom(params.spideroverlaping_zoom);
				}else{
					markerCluster.setMaxZoom(15);
				}
			}
		}
		
		if( params.marker_icon ){
			map.data.setStyle({icon: params.marker_icon});
		}
		
		geojson.features.forEach( function( item ) {
			allFeatures.push( item );
		});
		
		// Set mouseover event for each feature.
        map.data.addListener('click', function(event) {
			$.event.trigger({
				type:	"wpGeoJSON_feature_clicked",
				feature_clicked: event,
				time:	new Date()
			});				
        });
		
		/* hull test
		map.data.addGeoJson(hull);
		map.data.addGeoJson(hull2, { fillColor: 'red', style: {color: 'red', fillColor: 'red'} });
		*/
	   
		/** allow customisation of icons by css, target #markerLayer **/
		var customoverlay = new google.maps.OverlayView();
		customoverlay.draw = function () {
			if(last_spider_format!='' && 
				last_spider_format == OverlappingMarkerSpiderfier.markerStatus.SPIDERFIABLE)
			{
				this.getPanes().markerLayer.id='markerLayer_spider';
			}else{
				this.getPanes().markerLayer.id='markerLayer';
			}			
		};
		customoverlay.setMap(map);
	   
	}
	
	if( 'leaflet' == params.map_type ) {
		
		if( 'yes' == params.cluster_points ) {
			var clustered_markers = L.markerClusterGroup({
				showCoverageOnHover: false,
				iconCreateFunction: function(cluster) {
					if( params.big_cluster_icon )
						return L.icon({
							iconUrl: params.big_cluster_icon,
							iconSize: [32, 32],
							iconAnchor: [16, 7],
							popupAnchor: [0, 0]
						});	//TODO: don't specify size?
					if( params.marker_icon )
						return L.icon({ 
							iconUrl: params.marker_icon,
							iconSize: [32, 32],
							iconAnchor: [16, 16],
							popupAnchor: [0, 0]
						});	//TODO: don't specify size?
					return L.divIcon({ html: '<b>' + cluster.getChildCount() + '</b>' });
				},
				maxClusterRadius: 32,
				spiderfyDistanceMultiplier: 1.1		//TODO: don't specify size?
			});
		}
	
        if((field_names == undefined || field_names == '') && $('#map-canvas').attr('data-popup_fields') ) {            
			field_names = $('#map-canvas').data('popup_fields');
		}
        
        var more_text = '[More...]';
        var more_blank = 'no';
		if( $('#map-canvas').attr('data-more_text') )
			more_text = $('#map-canvas').data('more_text');
		if( $('#map-canvas').attr('data-more_blank') )
			more_blank = $('#map-canvas').data('more_blank');
		
		popup_arr = params.popup_fields.split(",");
		//clog( 'popup_arr:' + popup_arr );
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
								popupcontent += '<a href="' + feature.properties[field] + '" ';
								if( 'yes' == more_blank ) {
									popupcontent += 'target="_blank" ';
								}
								popupcontent += '>';
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
						layer.setIcon( 
							L.icon({ 
								iconUrl: params.marker_icon,
								iconSize: [32, 32],
								iconAnchor: [16, 16],
								popupAnchor: [0, 0]
							})	//TODO: don't specify size?
						);
						//clog( 'layer.setIcon: ' + params.marker_icon );
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
                clog(e);
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
		clog( 'Trying out auto geolocation...' );
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition( 
				function( position ){
					clog( 'position:' );
					clog( position );
					locate_me( position );
				},
				function (err){
					clog( 'navigator.geolocation.getCurrentPosition error:' );
					clog( err );
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
			clog( 'Geolocation unavailable' );
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
	clog( 'feature id to center map on: ' + id );
	allFeatures.forEach( function( feature ) {
		if( 'Point' == feature.geometry.type ) {
			if( id == feature.id ) {
				position = new google.maps.LatLng( feature.geometry.coordinates[1], feature.geometry.coordinates[0] );
				map.setCenter( position );
				clog( 'centered feature:' );
				clog( feature );
				open_infowindow( map.data.getFeatureById( id ) );
				
				$.event.trigger({
					type:	"wpGeoJSON",
					status:	"center_map_on_feature",
					position: position,
					feature_id : feature.id,
					time:	new Date()
				});				
			}
		}
	});
}

function locate_me( position ) {
	
	clog( 'locate me!' );
	
	if( 'undefined' == typeof map || !map )
		return false;
	
	clog( 'map ok' );
	
	var pos = new google.maps.LatLng(position.coords.latitude,
        	position.coords.longitude);
	
	clog( 'pos ok' );
	clog( pos );
	
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
	
	clog( 'marker ok' );
	
	map.panTo( pos );
	clog( 'panTo ok' );
	
	var closest_m = find_closest_marker( pos );
	clog( 'closest marker:' );
	clog( closest_m );
	//map.setZoom( 15 );
	
	var bounds = new google.maps.LatLngBounds();
	var position = new google.maps.LatLng( closest_m.geometry.coordinates[1], closest_m.geometry.coordinates[0] );
	//bounds.extend(position);
	//bounds.extend(place.geometry.location);
	getCity( pos, position );
}

/** See: https://stackoverflow.com/questions/2919337/jquery-convert-line-breaks-to-br-nl2br-equivalent **/
function nl2br (str, is_xhtml) {   
	//clog( 'nl2br' );
	//clog( str );
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';    
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
}

function markup2html( str ) {
	str = (str + '').replace(/([^>\r\n]?)#(.+)\r?\n/g, '$1' + '<h3>' + '$2' + '</h3>');
	return (str + '').replace(/---/g, '<hr/>');
}

})( jQuery );
