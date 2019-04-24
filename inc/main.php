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
		
		/** Display GEOjson data as a table **/
		add_shortcode( 'wpgeojson_table', array( $this, 'shortcode_wpgeojson_table' ) );
		add_shortcode( 'su_wpgeojson_table', array( $this, 'shortcode_wpgeojson_table' ) );
		
		/** Choropleth map colouring shortcode **/
		add_shortcode( 'wpgeojson_choropleth', array( $this, 'shortcode_wpgeojson_choropleth' ) );
		add_shortcode( 'su_wpgeojson_choropleth', array( $this, 'shortcode_wpgeojson_choropleth' ) );
		
		/** "Locate me" button shortcode **/
		add_shortcode( 'wpgeojson_locateme', array( $this, 'shortcode_wpgeojson_locateme' ) );
		add_shortcode( 'su_wpgeojson_locateme', array( $this, 'shortcode_wpgeojson_locateme' ) );
		
		/** Ajax method to get all points of a given post_type **/
		add_action( 'wp_ajax_get_points_for_post_type', array( $this, 'ajax_get_points_for_post_type' ));
		add_action( 'wp_ajax_nopriv_get_points_for_post_type', array( $this, 'ajax_get_points_for_post_type' ));
		
		/** Ajax method to get filter html of the list result **/
		add_action( 'wp_ajax_geojson_html_result_build_filter', array( $this, 'ajax_geojson_html_result_build_filter' ) );
		add_action( 'wp_ajax_nopriv_geojson_html_result_build_filter', array( $this, 'ajax_geojson_html_result_build_filter' ) );
				
		/** Shortcodes Ultimate shortcode to configure/insert map shortcodes **/
		add_filter( 'su/data/shortcodes', array( $this, 'su_shortcodes' ) );
		
		/** Plugin admin page for map defaults, etc. **/
		add_action( 'admin_menu', array( $this, 'plugin_admin_add_page' ) );
		add_action('admin_init', array( $this, 'plugin_admin_init' ) );
		
		/** Allow uloads of GeoJSON files in the WP Media library **/
		add_filter( 'upload_mimes', array( $this, 'allow_json_upload' ), 20, 1 );
		add_filter( 'media_send_to_editor', array( $this, 'media_send_to_editor' ), 20, 3 );
		
		/** Direct support of geojson URLs with WP's embed API **/
		wp_embed_register_handler( 'geojson', '#^https?://[^/]+/.+\.geojson$#', array( $this, 'geojson_embed_handler' ) );
		
		/** Direct support of Umap map URLs with WP's embed API **/
		wp_embed_register_handler( 'umap', '#^https?://umap.openstreetmap.fr/fr/map/(.+)$#', array( $this, 'umap_embed_handler' ) );

		/** Customization of WP-GeoJSON ACF option page in the admin **/
		//add_action( 'acf/input/form_data', array( $this, 'option_page' ), 20, 1 );
		//TODO: use add_meta_box( 'acf_options_page', 'normal' );
	}
	
	/**
	 * Let the possibility to change the html showed as the list
	 */
	public function ajax_geojson_html_result_build_filter(){
				
		$list_visible = json_decode(stripslashes($_POST['visible']));
		$general_data = json_decode(stripslashes($_POST['general_data']));
		
		$html = $_POST['html'];				
		$html = apply_filters('geojson_html_result_build_filter',$html,$list_visible,$general_data);
				
		echo $html;
		wp_die();
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
								'type' 		=> 'post_type',
								'values' 	=> array(),
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
								'name'		=> __( 'Load points', 'textdomain' ),
								'desc'		=> __( 'Uncheck to leave map blank', 'textdomain' ),
						),
						'cluster_points' => array(
								'type' 		=> 'bool',
								'default' 	=> 'yes',
								'name'		=> __( 'Marker clustering', 'textdomain' ),
								'desc'		=> __( 'Uncheck to avoid marker clustering', 'textdomain' ),								
						),
						'more_text' => array(
								'type'		=> 'text',
								'name'		=> __( 'More button text', 'textdomain' ),
								'desc'		=> __( 'Text for the "More..." button', 'textdomain' ),
								'default'	=> ''
						),
						'more_blank' => array(
								'type'		=> 'bool',
								'default'	=> 'no',
								'name'		=> __( 'Open in blank', 'textdomain' ),
								'desc'		=> __( 'Open the link of the "More..." button in a new tab', 'textdomain' ),
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
						),
						'locate_button' => array(
								'type' 		=> 'bool',
								'default' 	=> 'yes',
								'name'		=> __( 'Locate button', 'textdomain' ),
								'desc'		=> __( 'Add a "locate on map" button after each list item', 'textdomain' ),
						),
						'locate_text' => array(
								'type'		=> 'text',
								'name'		=> __( 'Locate button text', 'textdomain' ),
								'desc'		=> __( 'Text for the "Locate on map" button', 'textdomain' ),
								'default'	=> ''
						),
						'more_button' => array(
								'type' 		=> 'bool',
								'default' 	=> 'yes',
								'name'		=> __( 'Open button', 'textdomain' ),
								'desc'		=> __( 'Add a "More..." button after each list item', 'textdomain' ),
						),
						'more_text' => array(
								'type'		=> 'text',
								'name'		=> __( 'More button text', 'textdomain' ),
								'desc'		=> __( 'Text for the "More..." button', 'textdomain' ),
								'default'	=> ''
						),
						'more_blank' => array(
								'type'		=> 'bool',
								'default'	=> 'no',
								'name'		=> __( 'Open in blank', 'textdomain' ),
								'desc'		=> __( 'Open the link of the "More..." button in a new tab', 'textdomain' ),
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
				'desc' => __( 'Interface to switch between different coloration schemes based on data on a map', 'textdomain' ),
				// Custom icon (font-awesome)
				'icon' => 'map-marker',
				// Name of custom shortcode function
				'function' => 'wpgeojson_choropleth'
		);
		
		$shortcodes['wpgeojson_locateme'] = array(
				'name' => __( 'Locate button', 'textdomain' ),
				'type' => 'single',
				'group' => 'media content',
				'atts' => array(
						'button_text' => array(
								'type'		=> 'text',
								'name'		=> __( 'Button text', 'textdomain' ),
								'desc'		=> __( 'Text of the button', 'textdomain' ),
								'default'	=> ''
						)
				),
				// Shortcode description for cheatsheet and generator
				'desc' => __( '"Locate me" geolocation button', 'textdomain' ),
				// Custom icon (font-awesome)
				'icon' => 'map-marker',
				// Name of custom shortcode function
				'function' => 'wpgeojson_locateme'
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
		
		if( !empty( $atts['cluster_points'] ) && 'no' == $atts['cluster_points'] )
			$html .= 'data-cluster_points="' . $atts['cluster_points'] . '" ';
		
		if( !empty( $atts['popup_fields'] ) )
			$html .= 'data-popup_fields="' . $atts['popup_fields'] . '" ';
		
		if( !empty( $atts['more_text'] ) )
			$html .= 'data-more_text="' . $atts['more_text'] . '" ';
		
		if( !empty( $atts['more_blank'] ) )
			$html .= 'data-more_blank="' . $atts['more_blank'] . '" ';
		
		if( !empty( $atts['field_names'] ) )
			$html .= 'data-field_names="' . $atts['field_names'] . '" ';
		
		if( !empty( $atts['gray_if_no'] ) )
			$html .= 'data-gray_if_no="' . $atts['gray_if_no'] . '" ';
		
		if( function_exists( 'get_field' ) ) {
			
			if( $marker_icon = get_field( 'marker_icon', 'option' ) )
				$html .= 'data-marker_icon="' . $marker_icon . '" ';
			
			if( $marker_icon_2 = get_field( 'marker_icon_2', 'option' ) )
				$html .= 'data-marker_icon_2="' . $marker_icon_2 . '" ';
			
			if( $marker_icon_3 = get_field( 'marker_icon_3', 'option' ) )
				$html .= 'data-marker_icon_3="' . $marker_icon_3 . '" ';
			
			if( $marker_icon_4 = get_field( 'marker_icon_4', 'option' ) )
				$html .= 'data-marker_icon_4="' . $marker_icon_4 . '" ';
			
			if( $big_cluster_icon = get_field( 'big_cluster_icon', 'option' ) )
				$html .= 'data-big_cluster_icon="' . $big_cluster_icon . '" ';
			
			if( $medium_cluster_icon = get_field( 'medium_cluster_icon', 'option' ) )
				$html .= 'data-medium_cluster_icon="' . $medium_cluster_icon . '" ';
			
			if( $small_cluster_icon = get_field( 'small_cluster_icon', 'option' ) )
				$html .= 'data-small_cluster_icon="' . $small_cluster_icon . '" ';
			
		}
		
		/**
		 * If marker icons are specified in shortcode atts, they override ACF option values
		 * 
		 */
		if( !empty( $atts['marker_icon'] ) )
			$html .= 'data-marker_icon="' . $atts['marker_icon'] . '" ';
		
		if( !empty( $atts['big_cluster_icon'] ) )
			$html .= 'data-big_cluster_icon="' . $atts['big_cluster_icon'] . '" ';
		/** **/
		
		if( !empty( $atts['height'] ) ) {
			$html .= 'style="min-height:' . $atts['height'] . 'px;" ';
		} else {
			$html .= 'style="min-height:250px;" ';
		}
		
		if( !empty( $atts['map_options'] ) )
			$html .= 'data-map_options="' . $atts['map_options'] . '" ';
		
		if( !empty( $atts['load_tiles'] ) )
			$html .= 'data-load_tiles="' . $atts['load_tiles'] . '" ';
		
		if( !empty( $atts['fit_bounds'] ) )
			$html .= 'data-fit_bounds="' . $atts['fit_bounds'] . '" ';
		
		if( !empty( $atts['force_load_points'] ) )
			$html .= 'data-force_load_points="' . $atts['force_load_points'] . '" ';
		
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
		
		if( !empty( $atts['locate_button'] ) )
			$html .= 'data-locate_button="' . $atts['locate_button'] . '" ';
		
		if( !empty( $atts['locate_text'] ) )
			$html .= 'data-locate_text="' . $atts['locate_text'] . '" ';
		
		if( !empty( $atts['more_button'] ) )
			$html .= 'data-more_button="' . $atts['more_button'] . '" ';
		
		if( !empty( $atts['more_text'] ) )
			$html .= 'data-more_text="' . $atts['more_text'] . '" ';
		
		if( !empty( $atts['more_blank'] ) )
			$html .= 'data-more_blank="' . $atts['more_blank'] . '" ';
		
		if( !empty( $atts['no_link'] ) )
			$html .= 'data-no_link="no_link" ';
		
		$html .= '>';
		$html .= '</div>';
		
		return $html;
	}
	
	/**
	 * Display GEOjson data as a table
	 * 
	 * @param array $atts
	 * @return string html to display
	 */
	public function shortcode_wpgeojson_table( $atts ) {
		
		$fields = array();
		if( !empty( $atts['list_fields'] ) )
			$fields = explode( ',', $atts['list_fields'] );
		
		$html = '';
		
		$html .= "
<style>
.wpgeojson_table table {
    margin: 1em 0;
    min-width: 300px;
    font-size: 13px;
}
.wpgeojson_table table th {
    display: none;
}
.wpgeojson_table table td {
    display: block;
    text-align: center;
}
.wpgeojson_table table td:first-child {
    padding-top: .5em;
    text-align: left;
}
.wpgeojson_table table td:last-child {
    padding-bottom: .5em;
}
.wpgeojson_table table td:before {
    content: attr(data-th) ': ';
    font-weight: bold;
    width: 6.5em;
    display: inline-block;
}
.wpgeojson_table table {
    color: #79737f;
    overflow: hidden;
}
.wpgeojson_table table th, .wpgeojson_table table td {
    margin: .5em 1em;
}
.wpgeojson_table table tr:nth-child(even) {
    background-color: #e9e9e9;
}
.wpgeojson_table table tbody tr:nth-child(odd) {
    background-color: #fff;
}
.wpgeojson_table table th {
    text-align: center;
    vertical-align: middle;
    text-transform: uppercase;
    background-color: #79737f;
    color: #005e84;
}
.wpgeojson_table table td:before {
    color: #005e84;
}

@media all and (min-width:992px){
    
    .wpgeojson_table table td:before {
        display: none;
    }
    .wpgeojson_table table th, .wpgeojson_table table td {
        display: table-cell;
        padding: .25em .5em;
    }
    .wpgeojson_table table th:first-child, .wpgeojson_table table td:first-child {
        padding-left: 0;
    }
    .wpgeojson_table table th:last-child, .wpgeojson_table table td:last-child {
        padding-right: 0;
    }
    .wpgeojson_table table th {
        padding: 0.8em !important;
    }
    .wpgeojson_table table td {
        padding: 0.3em !important;
        vertical-align: middle;
    }

}

@media all and (max-width:991px){
    

    .wpgeojson_table table{
        width:100%;
        border:1px solid #E9E9E9;
    }
    .wpgeojson_table table th, .wpgeojson_table table td {
        margin:0;
        padding: .5em 1em;
        border-bottom:1px solid #E9E9E9;
        vertical-align: middle;
    }
    .wpgeojson_table table td{
        text-align: left;
        font-size:16px;
    }
    .wpgeojson_table table td:before {
        width: 50%;
        padding-right:15px;
        color:#000;
    }
    .wpgeojson_table table thead {
		display: none;
    }

@media all and (max-width:480px){
    
    .wpgeojson_table table td{
        font-size:14px;
    }
    .wpgeojson_table table thead {
		display: none;
    }
}
</style>						
		";
				
		$html .= '<div class="wpgeojson_table" ><table>';
		
		$html .= '<thead><tr>';
		foreach( $fields as $field ) {
			
			$display = preg_replace( '/^res\./', '', $field );
			if( preg_match( '/^.+\%.+$/', $field ) ) {
				$fielda = explode( '%', $field );
				//$display = $fielda[0] . '&nbsp;(&nbsp;%&nbsp;' . $fielda[1] . '&nbsp;)';
				$display = preg_replace( '/^res\./', '', $fielda[0] ) . ' (' . preg_replace( '/^res\./', '', $fielda[1] ) . ')';
			}
			
			$html .= '<td>' . $display . '</td>';
		}
		$html .= '</tr></thead>';
		
		if( !empty( $atts['file'] ) ) {
			if( $response = wp_remote_get( $atts['file'], array( 'timeout' => 3 ) ) ) {
				if( $geojson = json_decode( $response['body'] ) ) {
					if( isset( $geojson->features ) && is_array( $geojson->features) ) {
						
						$html .= '<tbody>';
						foreach( $geojson->features as $feature ) {
							if( isset( $feature->properties ) ) {
								$html .= '<tr>';
								foreach( $fields as $field ) {

									$perc = false;
									if( preg_match( '/^.+\%.+$/', $field ) ) {
										$fielda = explode( '%', $field );
										$field = $fielda[0];
										$perc = true;
									}
									
									if( isset( $feature->properties->$field ) ) {
										$html .= '<td data-th="' . preg_replace( '/^res\./', '', $field ) . '">' . $feature->properties->$field; 
										
										if( 
											$perc && 
											isset( $feature->properties->{$fielda[1]} ) && 
											$feature->properties->{$fielda[1]} > 0 
										) {
											$v1 = $feature->properties->$field;
											$v2 = $feature->properties->{$fielda[1]};
											$p = ( floor( ( $v1 * 1000 / $v2 ) + 0.5 ) / 10 );
											//$html .= '&nbsp;(&nbsp;' . $p . '%&nbsp;)'; 
											$html .= ' (' . $p . '%)'; 
										}
										
										$html .= '</td>';
									}
								}
								$html .= '</tr>';
							}
						}
						$html .= '</tbody>';
					}
				}
			}
		}
		
		$html .= '</table></div>';
		
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
	 * Shortcode to insert a "Locate me" geolocation button
	 *
	 * @param array $atts
	 * @return string - html markup for button
	 */
	public function shortcode_wpgeojson_locateme( $atts ) {
	
		$html = '';
		$html .= '<input type="button" class="wpgeojson_locateme" ';
	
		if( !empty( $atts['button_text'] ) )
			$html .= 'value="' . $atts['button_text'] . '" ';
		
		if( !empty( $atts['auto'] ) && 'yes' == $atts['auto']  )
			$html .= 'data-auto="yes" ';
	
		$html .= '/>';
	
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
		if( !empty( $_REQUEST['post_type'] ) ){
			$post_type = sanitize_text_field( $_REQUEST['post_type'] );
		}
		
		if($post_type == "users"){
			$this->get_points_for_users();
		}else{
			$this->get_points_for_post_type();
		}
		
	}
	
	public function get_points_for_users() {
		
		$geojson = array(
			'type'      	=> 'FeatureCollection',
			'features'  	=> array(),
			'properties'	=> array()
		);
				
		if( !empty( $_REQUEST['acf_field_id'] ) ){
			$acf_field_id = sanitize_text_field( $_REQUEST['acf_field_id'] );
		}
		
		if( empty( $acf_field_id ) ){
			$acf_field_id = $this->find_acf_ggmap_field_users();			
			$acf_field_id = apply_filters('wpgj_getpointsforusers_acffieldid',$acf_field_id,$_REQUEST);
		}
		
		$selection = 'all';
		if( !empty( $_REQUEST['selection'] ) ){
			$selection = sanitize_text_field( $_REQUEST['selection'] );
		}
		
		$fields = array();
		if( !empty( $_REQUEST['fields'] ) ){
			$fields = explode( ',', sanitize_text_field( $_REQUEST['fields'] ) );
		}
		
		$args =  array ( 'orderby' => 'registered', 'order' => 'ASC' );
		$args = apply_filters('wpgj_getpointsforusers_query_args',$args,$_REQUEST);
		$user_query = new WP_User_Query( $args );
		
		$all_users = $user_query->get_results();
		$all_users = apply_filters('wpgj_getpointsforusers_allusers',$all_users,$_REQUEST);
		
		if ( ! empty( $all_users ) ) {
			foreach ( $all_users as $user ) {
				
				$acf_data = false;
				if(!empty($acf_field_id)){
					$acf_data = get_field( $acf_field_id, 'user_'.$user->ID );	
				}				
				$acf_data = apply_filters('wpgj_getpointsforusers_coord',$acf_data,$user->ID,$_REQUEST);
				
				if( !isset($acf_data['lng']) 
					|| !isset($acf_data['lng']) 
					|| !$acf_data['lng'] 
					|| !$acf_data['lat'] ){
					continue;
				}				
				$feature = array(
					'id'			=> $user->ID,
					'type' 			=> 'Feature',
					'geometry' 		=> array(
						'type'			=> 'Point',
						'coordinates'	=> array( $acf_data['lng'], $acf_data['lat'] )
					),
					'properties' => array(
						'address'	=> $acf_data['address'],
						'post_id'	=> $user->ID,
						'title'		=> $user->display_name
					)
				);
				
				if( $fields ){
					foreach( $fields as $field ){
						if( $value = apply_filters( 'wpgj_getval_' . $field, get_field( $field, 'user_'.$user->ID ), $user->ID ) ){
							$feature['properties'][$field] = $value;
						}
					}
				}
				$feature = apply_filters('wpgj_getpointsforusers_feature',$feature,$user->ID,$_REQUEST);
				array_push( $geojson['features'], $feature );
				
			}
		}
		
		if( $json = json_encode( $geojson, JSON_NUMERIC_CHECK ) ){
			$this->store_cache( 'users', $acf_field_id, 'all', $json );
		}
		
		$this->send_ajax_response( $json );		
	}
	
	public function get_points_for_post_type() {
		
		/** Get the ajax request parameters **/
		$post_type = 'post';	//default
		if( !empty( $_REQUEST['post_type'] ) ){
			$post_type = sanitize_text_field( $_REQUEST['post_type'] );
		}
								
		if( !empty( $_REQUEST['acf_field_id'] ) )
			$acf_field_id = sanitize_text_field( $_REQUEST['acf_field_id'] );
		
		$selection = 'all';
		if( !empty( $_REQUEST['selection'] ) )
			$selection = sanitize_text_field( $_REQUEST['selection'] );
		
		if( empty( $acf_field_id ) ){
			$acf_field_id = $this->find_acf_ggmap_field( $post_type );
			$acf_field_id = apply_filters('geojson_getpointsforposttype_geofieldid',$acf_field_id,$post_type);
			if( !$acf_field_id ){				
				$this->send_ajax_error( 'geo field not found' );
			}
		}

		$fields = array();
		if( !empty( $_REQUEST['fields'] ) )
			$fields = explode( ',', sanitize_text_field( $_REQUEST['fields'] ) );
		
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
		
		/**
		 * Selection based on an ACF standard field
		 * 
		 */
		if( !empty( $selection ) && preg_match( '/^acf\:([^\:]+)\:(.+)$/', $selection, $matches ) ) {
			
			$key = $matches[1];
			$value = $matches[2];
			if( 'false' == strtolower( $value ) ) {
				$value = 0;
			}
			if( 'true' == strtolower( $value ) ) {
				$value = 1;
			}
			
			$geojson['properties']['key']	= $key;
			$geojson['properties']['value']	= $value;
				
			$args['meta_query'] = array(
					array(
							'key'		=> $key, 	// name of custom field
							'value'		=> $value,
							'compare'	=> 'LIKE'
					)
			);
		}
		
		$geojson['properties']['wp_query']	= $args;
		
		$args = apply_filters('geojson_getpointsforposttype_args',$args,$_REQUEST);
		
//echo "<pre>", print_r("ARGS --- ", 1), "</pre>";
//echo "<pre>", print_r($args, 1), "</pre>";
		
		$the_query = new WP_Query( $args );
		
		if ( $the_query->have_posts() ) {
			while ( $the_query->have_posts() ) {
				$the_query->the_post();
				
				$acf_data = get_field( $acf_field_id, $the_query->post->ID );
				
				if( !$acf_data['lng'] || !$acf_data['lat'] )
					continue;
				
				$feature = array(
					'id'	=> $the_query->post->ID,
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
				
				if( $fields )
					foreach( $fields as $field )
						if( $value = apply_filters( 'wpgj_getval_' . $field, get_field( $field, $the_query->post->ID ), $the_query->post->ID ) )
							$feature['properties'][$field] = $value;
				
				array_push( $geojson['features'], $feature );
			}
		}
		
		$geojson = apply_filters('geojson_getpointsforposttype_geojson_final_list',$geojson,$_REQUEST);
		
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
	private function store_cache( $post_type, $af_field, $selection, $content ) {
		
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
	
	private function find_acf_ggmap_field_users() {
		
		if( !function_exists( 'get_field_objects' ) ){
			return false;
		}
		
		$args = array('orderby' => 'registered', 'order' => 'ASC');		
		$user_query = new WP_User_Query( $args );
		if ( ! empty( $user_query->get_results() ) ) {
			$results = $user_query->get_results();			
		}else{
			return false;
		}
		
		$fields = false;
		foreach($results as $user){
			if( $fields = get_field_objects('user_'.$results[0]->ID)){
				break;
			}
		}		
		if( !$fields ){
			return false;	
		}
				
		foreach( $fields as $field ){
			if( 'google_map' == $field['type'] ){
				return $field['name'];
			}
		}
		
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
			'3.6',
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
		/*
		wp_register_script(
			'leaflet-label',
			plugins_url( '/leaflet/plugins/leaflet-label/dist/leaflet.label.js', dirname( __FILE__ ) ),
			array('leaflet'),
			'1.0.1',
			true
		);
		wp_register_style(
			'leaflet-label',
			plugins_url( '/leaflet/plugins/leaflet-label/dist/leaflet.label.css', dirname( __FILE__ ) ),
			array(),
			'1.0.1'
		);
		wp_enqueue_style( 'leaflet-label' );
		*/
		
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
		$key = '';
		if( function_exists( 'get_field' ) && $google_maps_key = get_field( 'google_maps_key', 'option' ) ) {
			$key = '&key=' . $google_maps_key;
		}
		$language = '';
		if( function_exists( 'qtrans_getLanguage' ) && ( 'en' == qtrans_getLanguage() ) ) {
			$language = '&language=en';
		}
		wp_register_script(
			'ggmap-api',
			'//maps.google.com/maps/api/js?libraries=places,geometry' . $key . $language,
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
		wp_register_script(
			'ggmap-geojson-clusterer',
			plugins_url( '/js/datalayerclusterer.js', dirname( __FILE__ ) ),
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
		
		/** Leaflet.pattern.js 
		 * @see: https://github.com/teastman/Leaflet.pattern
		 * 
		 */
		wp_register_script(
			'pattern',
			plugins_url( '/js/leaflet.pattern.js', dirname( __FILE__ ) ),
			array('leaflet'),
			'1.0',
			true
		);
		/** **/
		
		/** Leaflet.markercluster.js
		 * @see: https://github.com/Leaflet/Leaflet.markercluster
		 *
		 */
		wp_register_script(
			'leaflet-clusterer',
			plugins_url( '/js/leaflet.markercluster.js', dirname( __FILE__ ) ),
			array('leaflet'),
			'1.0',
			true
		);
		wp_register_style(
			'leaflet-clusterer',
			plugins_url( '/css/MarkerCluster.css', dirname( __FILE__ ) ),
			array(),
			'1.0',
			true
		);
		wp_enqueue_style( 'leaflet-clusterer' );			//TODO: only if clustering needed?
		wp_register_style(
			'leaflet-clusterer-default',
			plugins_url( '/css/MarkerCluster.Default.css', dirname( __FILE__ ) ),
			array(),
			'1.0',
			true
		);
		wp_enqueue_style( 'leaflet-clusterer-default' );	//TODO: only if clustering needed?
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
			wp_print_scripts('ggmap-geojson-clusterer');
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
			wp_print_scripts('pattern');			//TODO: only if patterns?
			wp_print_scripts('leaflet-clusterer');	//TODO: only if clustering needed?
			
			//wp_print_scripts('leaflet-label');
		}
		/** **/
		
		wp_print_scripts('turf');					//TODO: only if turf needed?
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
	
	/**
	 * Allow upload of GeoJSON files in the WP Media Library
	 * Such files should have the .geojson extension
	 * @see: https://tools.ietf.org/html/rfc7946 for offocial mime type
	 * 
	 * @param array $mime_types
	 * @return array
	 */
	public function allow_json_upload( $mime_types ) {
		$mime_types['geojson'] = 'application/geo+json';
		$mime_types['geo.json'] = 'application/geo+json';
		return $mime_types;
	}
	public function media_send_to_editor( $html, $send_id, $attachment ) {
		if( !preg_match( '/\.geojson$/', $attachment['url'] ) )
			return $html;
		
		return( '[su_wpgeojson_map file="' . $attachment['url'] . '"]' );
	}
	/** **/
	
	/** 
	 * Direct support of geojson URLs with WP's embed API 
	 * 
	 */
	public function geojson_embed_handler( $matches, $attr, $url, $rawattr ) {
		return( do_shortcode( '[su_wpgeojson_map file="' . $url . '"]' ) );
	}
	
	/** 
	 * Direct support of Umap map URLs with WP's embed API
	 * @see: https://umap.openstreetmap.fr/fr/
	 * 
	 */
	public function umap_embed_handler( $matches, $attr, $url, $rawattr ) {
		$html = '';
		$html .= '<iframe width="100%" height="300px" frameBorder="0" src="';
		$html .= $url;
		$html .= '?scaleControl=false&miniMap=false&scrollWheelZoom=false&zoomControl=true&allowEdit=false';
		$html .= '&moreControl=true&searchControl=null&tilelayersControl=null&embedControl=null';
		$html .= '&datalayersControl=true&onLoadPanel=undefined&captionBar=false';
		$html .= '"></iframe><p>';
		$html .= '<a href="' . $url . '">';
		$html .= __( 'Voir en plein écran', 'wpgeojson' );
		$html .= '</a></p>';
		return $html;
	}
	
	/* UNUSED
	public function option_page( $args ) {

		if( !is_admin() )
			return;
		
		//var_dump( $args ); exit();
		
		if( empty( $args ) || !is_array( $args ) )
			return;
		
		if( empty( $args['post_id'] ) || 'options' != $args['post_id'] )
			return;
		
		if( empty( $args['nonce'] ) || 'options' != $args['nonce'] )
			return;
		
		if( empty( $_GET['page'] ) || 'wpgeojson' != $_GET['page'] )
			return;
		
		echo '***';
	}
	*/
}
?>
