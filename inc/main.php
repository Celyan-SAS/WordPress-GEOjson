<?php
/**
 * MANGOPAY WordPress GEOjson plugin main class
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
		
		/** Ajax method to get all points of a given post_type **/
		add_action( 'wp_ajax_get_points_for_post_type', array( $this, 'ajax_get_points_for_post_type' ) );
		add_action( 'wp_ajax_nopriv_get_points_for_post_type', array( $this, 'ajax_get_points_for_post_type' ) );
		
		/** Shortcodes Ultimate shortcode to configure/insert map shortcode **/
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
								'desc'		=> __( 'inpixels', 'textdomain' )
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
								'default'	=> 'all'
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
		
		if( !empty( $atts['selection'] ) )
			$html .= 'data-selection="' . $atts['selection'] . '" ';

		if( !empty( $atts['post_type'] ) )
			$html .= 'data-post_type="' . $atts['post_type'] . '" ';
			
		if( !empty( $atts['file'] ) )
			$html .= 'data-file="' . $atts['file'] . '" ';
		
		if( !empty( $atts['load_points'] ) && 'no' == $atts['load_points'] )
			$html .= 'data-load_points="' . $atts['load_points'] . '" ';
		
		if( !empty( $atts['popup_fields'] ) )
			$html .= 'data-popup_fields="' . $atts['popup_fields'] . '" ';

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
		
		//TODO: handle a 'fields' attribute to choose which data field(s) we 
		// extract (title, content, excerpt, daet, author, ACF fields, etc)
		// - implement title and address ACF field as default
		// all this should be made available to the JS through data- attributes in the HTML markup
		
		$html = '';
		$html .= '<div class="wpgeojson_list">';
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
		if( !empty( $selection ) && preg_match( '/^relation\:([^\:]+)\:(\d+)$/', $selection, $matches ) )
			$args['meta_query'] = array(
				array(
					'key'	=> $matches[1], 			// name of custom field
					'value'	=> '"' . $matches[2] . '"', // matches exaclty "123", not just 123. This prevents a match for "1234"
					'compare' => 'LIKE'
				)
			);
		
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
						'post_id'	=> $the_query->post->ID
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
			'1.0',
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
		add_options_page(
			__( 'WP GEOjson Settings', 'wpgeojson' ),	// Page title
			__( 'WP GEOjson', 'wpgeojson' ), 			// Menu title
			'manage_options', 							// Capability
			'plugin', 									// Menu slug
			array( $this, 'plugin_options_page'	)		// Method
		);
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
		<?php settings_fields('plugin_options'); ?>
		<?php do_settings_sections('plugin'); ?>
		<input name="Submit" type="submit" value="<?php esc_attr_e('Save Changes'); ?>" />
		</form>
		</div> 
		<?php
	}
	
	public function plugin_admin_init() {
		register_setting( 
			'plugin_options',							// Options group
			'plugin_options', 							// Option name
			array( $this, 'plugin_options_validate'	)	// Sanitize callback
		);
		add_settings_section(
			'plugin_main', 								// ID
			'Main Settings',							// Title 
			array( $this, 'plugin_section_text' ),		// Callback 'plugin'
			'plugin'									// Page
		);
		add_settings_field(
			'plugin_text_string', 						// ID
			'Plugin Text Input', 						// Title
			array( $this, 'plugin_setting_string' ), 	// Callback
			'plugin', 									// Page
			'plugin_main'								// Section
		);
	}
	
	public function plugin_options_validate( $input ) {
		$options = get_option('plugin_options');
		$options['text_string'] = trim($input['text_string']);
		if(!preg_match('/^[a-z0-9]{32}$/i', $options['text_string']))
			$options['text_string'] = '';
		return $options;
	}
	
	public function plugin_section_text() {
		echo '<p>Main description of this section here.</p>';	//TODO
	}
	
	public function plugin_setting_string() {
		$options = get_option( 'plugin_options' );
		echo '<input id="plugin_text_string" name="plugin_options[text_string]" size="40" type="text" value="' . $options['text_string'] . '" />';
	}
}
?>