<?php
/**
 * WordPress GEOjson plugin main class
*
* @author yann@abc.fr
* @see: https://github.com/Celyan-SAS/WordPress-GEOjson
*
*/
class wpGEOjson {
	
	const CACHE_KEY_PREFIX	= 'wpgeojson';
	const CACHE_KEY_SEP		= '_';
	const CACHE_TTL			= 86400;	//seconds
	
	static $load_scripts = array();	// this will help adding scripts on pages containing a map shortcode
	
	/**
	 * Class constructor
	 *
	 */
	public function __construct() {
		
		/** Load front-end map JS where necessary **/
		add_action( 'init', array( $this, 'register_script' ) );
		add_action( 'wp_footer', array( $this, 'print_script' ) );
		
		/** Map Shortcode **/
		add_shortcode( 'wpgeojson_map', array( $this, 'shortcode_wpgeojson_map' ) );
		add_shortcode( 'su_wpgeojson_map', array( $this, 'shortcode_wpgeojson_map' ) );
		
		/** Map companion list shortcode **/
		add_shortcode( 'wpgeojson_list', array( $this, 'shortcode_wpgeojson_list' ) );
		add_shortcode( 'su_wpgeojson_list', array( $this, 'shortcode_wpgeojson_list' ) );
		
		/** Choropleth map colouring shortcode **/
		add_shortcode( 'wpgeojson_choropleth', array( $this, 'shortcode_wpgeojson_choropleth' ) );
		add_shortcode( 'su_wpgeojson_choropleth', array( $this, 'shortcode_wpgeojson_choropleth' ) );
		
		/** Ajax method to get all points of a given post_type **/
		add_action( 'wp_ajax_get_points_for_post_type', array( $this, 'ajax_get_points_for_post_type' ) );
		add_action( 'wp_ajax_nopriv_get_points_for_post_type', array( $this, 'ajax_get_points_for_post_type' ) );
		
		/** Shortcodes Ultimate shortcode to configure/insert map shortcodes **/
		add_filter( 'su/data/shortcodes', array( $this, 'su_shortcodes' ) );
		
		/** Plugin admin page for map defaults, etc. **/
		add_action( 'admin_menu', array( $this, 'plugin_admin_add_page' ) );
		add_action('admin_init', array( $this, 'plugin_admin_init' ) );
	}
		
	/**
	 * Shortcode generator
	 * (Shortcodes Ultimate plugin add-on)
	 * 
	 */
	public function su_shortcodes( $shortcodes ) {

		$shortcodes['wpgeojson_map'] = array(
				'name' => __( 'GEOjson map', 'textdomain' ),
				'type' => 'single',
				'group' => 'media content',
				'atts' => array(
						'map_type' => array(
								'type'		=> 'select',
								'values'	=> array(
									'leaflet'		=> __( 'Leaflet', 'textdomain' ),
									'openlayers'	=> __( 'Openlayers', 'textdomain' ),
									'google-maps'	=> __( 'Google Maps', 'textdomain' )		
								),
								'name'		=> __( 'Map type', 'textdomain' ),
								'desc'		=> __( 'Leaflet / Openlayers / Google-Maps', 'textdomain' ),
								'default'	=> 'leaflet'
						),
						'post_type' => array(
								'type' 		=> 'select',
								'values' 	=> Su_Tools::get_types(),
								'name'		=> __( 'Post type', 'textdomain' ),
								'desc'		=> __( 'Select geo-encoded post type', 'textdomain' ),
								'default'	=> 'post'
						),
						'selection' => array(
								'type'		=> 'text',
								'name'		=> __( 'Selection', 'textdomain' ),
								'desc'		=> __( 'See plugin documentation for data selector options', 'textdomain' ),
								'default'	=> 'all'
						),
						'file' => array(
								'type' 		=> 'upload',
								'name'		=> __( 'File', 'textdomain' ),
								'desc'		=> __( 'Please provide a GEOjson file', 'textdomain' ),
								'default'	=> ''
						),
						'height' => array(
								'type'		=> 'number',
								'min'		=> 50,
								'max'		=> 1000,
								'step'		=> 1,
								'default'	=> 250,
								'name'		=> __( 'Map height', 'textdomain' ),
								'desc'		=> __( 'in pixels', 'textdomain' )
						),
						'marker_icon' => array(
								'type'		=> 'image_source',
								'default'	=> 'none',
								'name'		=> __( 'Marker icon', 'textdomain' ),
								'desc'		=> __( 'Select a small image in the media library', 'textdomain' ),
						),
						'popup_fields' => array(
								'type'		=> 'text',
								'name'		=> __( 'Pop-up fields', 'textdomain' ),
								'desc'		=> __( 'Coma-separated list of fields to display in the bound pop-up', 'textdomain' ),
								'default'	=> ''
						),
						'field_names' => array(
								'type' 		=> 'bool',
								'default' 	=> 'no',
								'name'		=> __( 'Field names', 'textdomain' ),
								'desc'		=> __( 'Display the field names in the bound pop-up', 'textdomain' ),
						),
						'load_points' => array(
								'type' 		=> 'bool',
								'default' 	=> 'yes',
								'name'		=> __( 'Loid points', 'textdomain' ),
								'desc'		=> __( 'Uncheck to leave map blank', 'textdomain' ),
						)
				),
				// Shortcode description for cheatsheet and generator
				'desc' => __( 'GEOjson map', 'textdomain' ),
				// Custom icon (font-awesome)
				'icon' => 'map-marker',
				// Name of custom shortcode function
				'function' => 'wpgeojson_map'
		);
		
		$shortcodes['wpgeojson_list'] = array(
				'name' => __( 'GEOjson list', 'textdomain' ),
				'type' => 'single',
				'group' => 'media content',
				'atts' => array(
						'height' => array(
								'type'		=> 'number',
								'min'		=> 50,
								'max'		=> 1000,
								'step'		=> 1,
								'default'	=> 250,
								'name'		=> __( 'List height', 'textdomain' ),
								'desc'		=> __( 'in pixels', 'textdomain' )
						),
						'list_fields' => array(
								'type'		=> 'text',
								'name'		=> __( 'List fields', 'textdomain' ),
								'desc'		=> __( 'Coma-separated list of fields to display in the list', 'textdomain' ),
								'default'	=> ''
						),
						'field_names' => array(
								'type' 		=> 'bool',
								'default' 	=> 'no',
								'name'		=> __( 'Field names', 'textdomain' ),
								'desc'		=> __( 'Display the field names in the list', 'textdomain' ),
						)
				),
				// Shortcode description for cheatsheet and generator
				'desc' => __( 'Dynamic list of the points displayed on the corresponding map', 'textdomain' ),
				// Custom icon (font-awesome)
				'icon' => 'map-marker',
				// Name of custom shortcode function
				'function' => 'wpgeojson_list'
		);
		
		$shortcodes['wpgeojson_choropleth'] = array(
				'name' => __( 'GEOjson choropleth', 'textdomain' ),
				'type' => 'single',
				'group' => 'media content',
				'atts' => array(
						'color' => array(
								'type'		=> 'select',
								'values'	=> array(
									'ffff**'	=> __( 'Blue', 'textdomain' ),
									'ff**ff'	=> __( 'Green', 'textdomain' ),
									'**ffff'	=> __( 'Red', 'textdomain' ),
									'****ff'	=> __( 'Yellow', 'textdomain' ),
									'ff****'	=> __( 'Cyan', 'textdomain' ),
									'**ff**'	=> __( 'Magenta', 'textdomain' ),
									'ffffff'	=> __( 'Grey', 'textdomain' )
								),
								'name'		=> __( 'Color', 'textdomain' ),
								'desc'		=> __( 'Base color', 'textdomain' ),
								'default'	=> 'ffff**'
						),
						'property' => array(
								'type'		=> 'text',
								'name'		=> __( 'Property', 'textdomain' ),
								'desc'		=> __( 'Property to use for coloring', 'textdomain' ),
								'default'	=> ''
						),
						'checked' => array(
								'type' 		=> 'bool',
								'default' 	=> 'no',
								'name'		=> __( 'Default colors', 'textdomain' ),
								'desc'		=> __( 'Apply this scheme as a default', 'textdomain' ),
						),
				),
				// Shortcode description for cheatsheet and generator
				'desc' => __( 'Dynamic list of the points displayed on the corresponding map', 'textdomain' ),
				// Custom icon (font-awesome)
				'icon' => 'map-marker',
				// Name of custom shortcode function
				'function' => 'wpgeojson_choropleth'
		);
		
		return $shortcodes;
	}
	
	/**
	 * Shortcode to insert a map
	 * 
	 * @param array $atts
	 * @return string - html markup for map div
	 */
	public function shortcode_wpgeojson_map( $atts ) {
				
		$map_type_class = 'leaflet';
		if( !empty( $atts['map_type'] ) ) {
			if( 'openlayers' == $atts['map_type'] )
				$map_type_class = 'openlayers';
			if( 'google-maps' == $atts['map_type'] )
				$map_type_class = 'ggmap';
		}
		array_push( self::$load_scripts, $map_type_class );
		
		$html = '';
		$html .= '<div id="map-canvas" ';
		$html .= 'class="wpgeojson_map ' . $map_type_class . '" ';
		
		if( !empty( $atts['selection'] ) ) {
			
			/** If the relation value is given by a query_var, find it **/
			if( preg_match( '/\_query\_var\(([^\)]+)\)/', $atts['selection'], $matches ) ) {
				$value = get_query_var( $matches[1] );
				
				$atts['selection'] = preg_replace( '/\_query\_var\(([^\)]+)\)/', $value, $atts['selection'] );
			}
			$html .= 'data-selection="' . $atts['selection'] . '" ';
		}
		
		if( !empty( $atts['post_type'] ) )
			$html .= 'data-post_type="' . $atts['post_type'] . '" ';
			
		if( !empty( $atts['file'] ) )
			$html .= 'data-file="' . $atts['file'] . '" ';
		
		if( !empty( $atts['load_points'] ) && 'no' == $atts['load_points'] )
			$html .= 'data-load_points="' . $atts['load_points'] . '" ';
		
		if( !empty( $atts['popup_fields'] ) )
			$html .= 'data-popup_fields="' . $atts['popup_fields'] . '" ';
		
		if( !empty( $atts['more_text'] ) )
			$html .= 'data-more_text="' . $atts['more_text'] . '" ';
		
		if( !empty( $atts['field_names'] ) )
			$html .= 'data-field_names="' . $atts['field_names'] . '" ';
		
		if( !empty( $atts['gray_if_no'] ) )
			$html .= 'data-gray_if_no="' . $atts['gray_if_no'] . '" ';
		
		if( function_exists( 'get_field' ) ) {
			
			if( $marker_icon = get_field( 'marker_icon', 'option' ) )
				$html .= 'data-marker_icon="' . $marker_icon . '" ';
			
			if( $big_cluster_icon = get_field( 'big_cluster_icon', 'option' ) )
				$html .= 'data-big_cluster_icon="' . $big_cluster_icon . '" ';
			
			if( $medium_cluster_icon = get_field( 'medium_cluster_icon', 'option' ) )
				$html .= 'data-medium_cluster_icon="' . $medium_cluster_icon . '" ';
			
			if( $small_cluster_icon = get_field( 'small_cluster_icon', 'option' ) )
				$html .= 'data-small_cluster_icon="' . $small_cluster_icon . '" ';
			
		}
		
		if( !empty( $atts['height'] ) )
			$html .= 'style="min-height:' . $atts['height'] . 'px;" ';
		
		$html .= '>';
		$html .= '</div>';
		return $html;
	}
	
	/**
	 * Shortcode to insert companion dynamic list box to the map
	 *
	 * @param array $atts
	 * @return string - html markup for list div
	 */
	public function shortcode_wpgeojson_list( $atts ) {
		
		$html = '';
		$html .= '<div class="wpgeojson_list" ';
		
		if( !empty( $atts['field_names'] ) )
			$html .= 'data-field_names="' . $atts['field_names'] . '" ';
		
		$html .= '>';
		$html .= '</div>';
		
		return $html;
	}
	
	public function shortcode_wpgeojson_choropleth( $atts ) {
		
		$html = '';
		$html .= '<div class="wpgeojson_choropleth" ';
		
		if( !empty( $atts['property'] ) )
			$html .= 'data-property="' . $atts['property'] . '" ';
		
		if( !empty( $atts['color'] ) )
			$html .= 'data-color="' . $atts['color'] . '" ';
		
		$html .= '>';
		$html .= '<input type="radio" name="wpgeojson_choropleth" value="1" ';
		
		if( !empty( $atts['checked'] ) && 'yes' == $atts['checked'] )
			$html .= 'checked="checked" ';
		
		$html .= '>';
		$html .= '<label></label>';
		$html .= '</div>';
		
		return $html;
	}
	
	/** 
	 * Ajax method to get all points of a given post_type
	 *
	 */
	public function ajax_get_points_for_post_type() {
				
		session_write_close();
		
		/** Get the ajax request parameters **/
		$post_type = 'post';	//default
		if( !empty( $_REQUEST['post_type'] ) )
			$post_type = sanitize_text_field( $_REQUEST['post_type'] );
		
		if( !empty( $_REQUEST['acf_field_id'] ) )
			$acf_field_id = sanitize_text_field( $_REQUEST['acf_field_id'] );
		
		$selection = 'all';
		if( !empty( $_REQUEST['selection'] ) )
			$selection = sanitize_text_field( $_REQUEST['selection'] );
		
		if( !$acf_field_id )
			if( !$acf_field_id = $this->find_acf_ggmap_field( $post_type ) )
				$this->send_ajax_error( 'geo field not found' );
		
		//if( $this->in_cache( $post_type, $acf_field_id, $selection ) )
		//	$this->send_ajax_response( $this->from_cache( $post_type, $acf_field_id, $selection ) );
		
		if( !function_exists( 'get_field' ) )
			$this->send_ajax_error( 'ACF plugin is not active' );
		
		$geojson = array(
				'type'      	=> 'FeatureCollection',
				'features'  	=> array(),
				'properties'	=> array()
		);
		
		$args = array(
				'post_type'	=> $post_type,
				'posts_per_page'=> -1,
				'offset'	=> 0
		);
		
		/** Selection of one specific post id **/
		if( !empty( $selection ) && preg_match( '/^\d+$/', $selection ) )
			$args['p'] = $selection;
		
		/** 
		 * Selection based on an ACF relationship field 
		 * @see: https://www.advancedcustomfields.com/resources/querying-relationship-fields/
		 */
		if( !empty( $selection ) && preg_match( '/^relation\:([^\:]+)\:(.+)$/', $selection, $matches ) ) {
			
			$key = $matches[1];
			$value = $matches[2];
			
			$geojson['properties']['key']	= $key;
			$geojson['properties']['value']	= $value;
			
			/** Find the other part of the relationship field **/
			$oth_post_type = $this->find_acf_rel_pt( $post_type, $key );
										
			/** If the relation value was passed by path, find the post ID **/
			if( !preg_match( '/^\d+$/', $value ) ) {
				$post = get_page_by_path( $value, OBJECT, $oth_post_type );
				$value = $post->ID;
			}
			
			$geojson['properties']['value2']	= $value;
		
			$args['meta_query'] = array(
				array(
					'key'		=> $key, 				// name of custom field
					'value'		=> '"' . $value . '"',	// matches exaclty "123", not just 123. This prevents a match for "1234"
					'compare'	=> 'LIKE'
				)
			);
		}
		
		$geojson['properties']['wp_query']	= $args;
		
		$the_query = new WP_Query( $args );
		
		if ( $the_query->have_posts() ) {
			while ( $the_query->have_posts() ) {
				$the_query->the_post();
				
				$acf_data = get_field( $acf_field_id, $the_query->post->ID );
				
				$feature = array(
					'ID'	=> $the_query->post->ID,
					'type' 			=> 'Feature',
					'geometry' 		=> array(
						'type' => 'Point',
						'coordinates' => array( $acf_data['lng'], $acf_data['lat'] )
					),
					'properties' => array(
						'address'	=> $acf_data['address'],
						'post_id'	=> $the_query->post->ID,
						'title'		=> get_the_title( $the_query->post->ID ),
						'link'		=> get_permalink( $the_query->post->ID )
					)
				);
				array_push( $geojson['features'], $feature );
			}
		}
		
		if( $json = json_encode( $geojson, JSON_NUMERIC_CHECK ) )
			$this->store_cache( $post_type, $acf_field_id, 'all', $json );
		
		$this->send_ajax_response( $json );
	}
	
	/**
	 * Check if a selection is already in the response cache
	 * 
	 * @param unknown $post_type
	 * @param unknown $af_field
	 * @param unknown $selection
	 */
	private function in_cache( $post_type, $af_field, $selection ) {
				
		if( get_transient( $this->get_cache_key( $post_type, $af_field, $selection ) ) )
			return true;
		
		return false;
	}
	
	/**
	 * Retrieve selection from cache
	 * 
	 * @param string $post_type
	 * @param string $af_field
	 * @param string $selection
	 */
	private function from_cache( $post_type, $af_field, $selection ) {
		
		return get_transient( $this->get_cache_key( $post_type, $af_field, $selection ) );
	}
	
	/**
	 * Store selection into cache
	 * 
	 * @param string $post_type
	 * @param string $acf_field_id
	 * @param string $selection
	 * @param string $content
	 */
	private function store_cache( $post_type, $acf_field_id, $selection, $content ) {
		
		set_transient( 
			$this->get_cache_key( $post_type, $af_field, $selection ), 
			$content, 
			self::CACHE_TTL
		);
	}
	
	/**
	 * Calculate cache key for this selection
	 * 
	 * @param string $post_type
	 * @param string $af_field
	 * @param string $selection
	 * @return string cache_key
	 */
	private function get_cache_key( $post_type, $af_field, $selection ) {
		return 
			self::CACHE_KEY_PREFIX . 
			self::CACHE_KEY_SEP .
			$post_type .
			self::CACHE_KEY_SEP .
			$af_field .
			self::CACHE_KEY_SEP .
			$selection;
	}
	
	/**
	 * Try to guess which ACF field contains the geographic points data
	 * 
	 * @param string $post_type
	 * @return boolean|string - false if not found, field_id if found
	 */
	private function find_acf_ggmap_field( $post_type ) {
		
		if( !function_exists( 'get_field_objects' ) )
			return false;
		
		if( !$posts = get_posts( array( 'post_type'=>$post_type ) ) )
			return false;
		
		if( !$fields = get_field_objects( $posts[0]->ID ) )
			return false;
		
		foreach( $fields as $field )
			if( 'google_map' == $field['type'] )
				return $field['name'];
		
		return false;
	}
	
	private function find_acf_rel_pt( $post_type, $key ) {
		
		
		if( !function_exists( 'get_field_objects' ) )
			return false;
		
		if( !$posts = get_posts( array( 'post_type'=>$post_type ) ) )
			return false;
		
		if( !$fields = get_field_objects( $posts[0]->ID ) )
			return false;
		
		foreach( $fields as $field )
			if( $key == $field['name'] )
				return $field['post_type'];
	}
	
	/**
	 * Returns a json-encoded ajax error code
	 * 
	 * @param string $error
	 */
	private function send_ajax_error( $error ) {
		header( "Content-Type: application/json" );
		echo json_encode( array(
			'error' => 	$error
		) );
		exit;
	}
	
	/**
	 * Returns a json-encoded ajax response
	 * 
	 * @param string $response - json-encoded
	 */
	private function send_ajax_response( $response ) {
		header( "Content-Type: application/json" );
		echo $response;
		exit;
	}
	
	/**
	 * Register JS scripts
	 *
	 */
	public function register_script() {
		wp_register_script(
			'wp-geojson-map',
			plugins_url( '/js/wp-geojson-map.js', dirname( __FILE__ ) ),
			array('jquery'), 
			'3.0',
			true
		);
		
		/** Leaflet **/
		wp_register_style(
			'leaflet',
			plugins_url( '/leaflet/leaflet.css', dirname( __FILE__ ) ),
			array(),
			'1.0.1'
		);
		wp_enqueue_style( 'leaflet' );
		wp_register_script(
			'leaflet',
			plugins_url( '/leaflet/leaflet.js', dirname( __FILE__ ) ),
			array('jquery'), 
			'1.0.1',
			true
		);
		/** **/
		
		/** Openlayers **/
		wp_register_script(
			'openlayers',
			plugins_url( '/openlayers/ol.js', dirname( __FILE__ ) ),
			array('jquery'), 
			'1.0',
			true
		);
		/** **/
		
		/** Google Maps specific **/
		wp_register_script(
			'ggmap-api',
			'//maps.google.com/maps/api/js?libraries=places,geometry&key=AIzaSyCqT9oozbXDPphT-__n4OTPGWxBGPYVreg',
			array('jquery'), 
			'1.0',
			true
		);
		wp_register_script(
			'ggmap-clusterer',
			plugins_url( '/js/markerclusterer.js', dirname( __FILE__ ) ),
			array('ggmap-api'), 
			'1.0',
			true
		);
		/** **/
		
		/** Turf.js **/
		wp_register_script(
			'turf',
			plugins_url( '/js/turf.min.js', dirname( __FILE__ ) ),
			array('jquery'),
			'3.5.1',
			true
		);
		/** **/
	}
	
	/**
	 * On-demand loading of JS scripts in the page footer
	 * (only if map shortcode is present)
	 *
	 */
	public function print_script() {
		if ( empty( self::$load_scripts ) )
			return;
		
		/** Google maps **/
		if( in_array( 'ggmap', self::$load_scripts ) ) {
			wp_print_scripts('ggmap-api');
			wp_print_scripts('ggmap-clusterer');	
		}
		/** **/
		
		/** Openlayers **/
		if( in_array( 'openlayers', self::$load_scripts ) ) {
			wp_print_scripts('openlayers');
		}
		/** **/
		
		/** Leaflet **/
		if( in_array( 'leaflet', self::$load_scripts ) ) {
			wp_print_scripts('leaflet');
		}
		/** **/
		
		wp_print_scripts('turf');
		wp_print_scripts('wp-geojson-map');
				
		?>
			<script type="text/javascript">
			var ajaxurl = '<?php echo admin_url('admin-ajax.php'); ?>';
			</script>
		<?php
	}
	
	/**
	 * Adds the plugin settings page
	 * 
	 */
	public function plugin_admin_add_page() {

		add_menu_page( 
			__( 'WP GEOjson Settings', 'wpgeojson' ),	// Page title
			__( 'WP GEOjson', 'wpgeojson' ), 			// Menu title
			'manage_options', 							// Capability
			'wpgeojson' 								// Menu slug
			//, array( $this, 'plugin_options_page'	)		// Method
		);
		
		if( !function_exists('acf_add_options_sub_page') )
			return;
		
		add_submenu_page ( 'wpgeojson', '', '', 'manage_options', 'wpgeojson', '__return_null' );
		remove_submenu_page('wpgeojson','wpgeojson');
		
		acf_add_options_sub_page(array(
			'title' 		=> __( 'WP GEOjson Settings', 'wpgeojson' ),
			'menu'			=> __( 'WP GEOjson', 'wpgeojson' ),
			'parent'		=> 'wpgeojson',
			'slug'			=> 'wpgeojson',
			'capability'	=> 'manage_options',
		));
		
		/*
		add_options_page(
			__( 'WP GEOjson Settings', 'wpgeojson' ),	// Page title
			__( 'WP GEOjson', 'wpgeojson' ), 			// Menu title
			'manage_options', 							// Capability
			'wpgeojson', 								// Menu slug
			array( $this, 'plugin_options_page'	)		// Method
		);
		*/
	}
	
	/**
	 * Plugin settings page display
	 * 
	 */
	public function plugin_options_page() {
		?>
		<div>
		<h2><?php echo __( 'WP GEOjson Settings', 'wpgeojson' ); ?></h2>
		<?php echo __( 'Options relating to the WP GEOjson Plugin.', 'wpgeojson' ); ?>
		<form action="options.php" method="post">
		<?php settings_fields('wpgeojson_options'); ?>
		<?php do_settings_sections('wpgeojson'); ?>
		<input name="Submit" type="submit" value="<?php esc_attr_e('Save Changes'); ?>" />
		</form>
		</div> 
		<?php
	}
	
	/**
	 * Register our plugin settings
	 * 
	 */
	public function plugin_admin_init() {
		register_setting( 
			'wpgeojson_options',						// Options group
			'wpgeojson_options', 						// Option name
			array( $this, 'plugin_options_validate'	)	// Sanitize callback
		);
		add_settings_section(
			'wpgeojson_main', 							// ID
			'Default map settings',						// Title 
			array( $this, 'plugin_section_text' ),		// Callback 'plugin'
			'wpgeojson'									// Page
		);
		add_settings_field(
			'plugin_text_string', 						// ID
			'Plugin Text Input', 						// Title
			array( $this, 'plugin_setting_string' ), 	// Callback
			'wpgeojson', 								// Page
			'wpgeojson_main'							// Section
		);
	}
	
	/**
	 * Validate our settings (callback)
	 * 
	 * @param string $input
	 * @return array options
	 */
	public function plugin_options_validate( $input ) {
		$options = get_option('plugin_options');
		$options['text_string'] = trim($input['text_string']);
		if(!preg_match('/^[a-z0-9]{32}$/i', $options['text_string']))
			$options['text_string'] = '';
		return $options;
	}
	
	/**
	 * Display settings section text (callback)
	 * 
	 */
	public function plugin_section_text() {
		echo '<p>Default settings for maps</p>';	//TODO
	}
	
	/**
	 * Settings string field (callback)
	 */
	public function plugin_setting_string() {
		$options = get_option( 'plugin_options' );
		echo '<input id="plugin_text_string" name="plugin_options[text_string]" size="40" type="text" value="' . $options['text_string'] . '" />';
	}
	
	public function acf_add_options_page() {
		if( !function_exists('acf_add_options_sub_page') )
			return;

		acf_add_options_sub_page(array(
			'page_title' 	=> __( 'WP GEOjson Settings 3', 'wpgeojson' ),
			'menu_title'	=> __( 'WP GEOjson 3', 'wpgeojson' ),
			'parent_slug'	=> 'wpgeojson',
			
			'title' 		=> __( 'WP GEOjson Settings 3', 'wpgeojson' ),
			'menu'			=> __( 'WP GEOjson 3', 'wpgeojson' ),
			'parent'		=> 'wpgeojson',
			'slug'			=> 'wpjslug',
			'capability'	=> 'manage_options',
		));
		
		acf_add_options_sub_page(array(
			//'page_title' 	=> __( 'WP GEOjson Settings 4', 'wpgeojson' ),
			//'menu_title'	=> __( 'WP GEOjson 4', 'wpgeojson' ),
			//'parent_slug'	=> 'admin.php?page=wpgeojson',
				
			'title' 		=> __( 'WP GEOjson Settings 4', 'wpgeojson' ),
			'menu'			=> __( 'WP GEOjson 4', 'wpgeojson' ),
			'slug'			=> 'wpjslugg',
			'parent'		=> 'wpgeojson',
			
			//'parent'		=> 'admin.php?page=wpgeojson',
			//'parent' => 'edit.php?post_type=page',
			//'slug'			=> 'wpjslugg',
			'capability'	=> 'manage_options',
		));
		
		/* */
		if( !function_exists('acf_add_options_page') )
			return;
		
		acf_add_options_page(array(
			'page_title' 	=> __( 'WP GEOjson Settings 2', 'wpgeojson' ),
			'menu_title'	=> __( 'WP GEOjson 2', 'wpgeojson' ),
			'menu_slug' 	=> 'wpgeojson-settings',
			'capability'	=> 'manage_options',
			'redirect'		=> false,
			
			'title' 		=> __( 'WP GEOjson Settings 2', 'wpgeojson' ),
			'menu'			=> __( 'WP GEOjson 2', 'wpgeojson' ),
			'slug' 			=> 'wpgeojson-settings',
		));
		/* */
	}
}
?>