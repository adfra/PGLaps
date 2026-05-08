<?php
/**
 * Plugin Name: PGLaps Task Transformer
 * Plugin URI: https://github.com/yourusername/pglaps
 * Description: Paragliding competition task transformation tool with interactive map. Upload XCTask files and OpenAir airspace, transform tasks to new locations with automatic airspace rotation.
 * Version: 1.2.0
 * Author: PGLaps
 * Author URI: https://pglaps.com
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: pglaps-transformer
 * Domain Path: /languages
 *
 * @package PGLaps_Transformer
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main PGLaps Transformer Plugin Class
 */
class PGLaps_Transformer {

    /**
     * Plugin version
     */
    private $version = '1.2.0';

    /**
     * Constructor
     */
    public function __construct() {
        $this->define_constants();
        $this->includes();
        $this->init_hooks();
    }

    /**
     * Define plugin constants
     */
    private function define_constants() {
        define('PGLAPS_VERSION', $this->version);
        define('PGLAPS_PLUGIN_DIR', plugin_dir_path(__FILE__));
        define('PGLAPS_PLUGIN_URL', plugin_dir_url(__FILE__));
    }

    /**
     * Include required files
     */
    private function includes() {
        // Admin functions if needed
        if (is_admin()) {
            // require_once PGLAPS_PLUGIN_DIR . 'includes/admin.php';
        }
    }

    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_shortcode('pglaps_transformer', array($this, 'render_shortcode'));

        // Allow the shortcode to run in text widgets
        add_filter('widget_text', 'do_shortcode');
    }

    /**
     * Enqueue frontend assets
     */
    public function enqueue_assets() {
        // Only load on frontend when not in admin
        if (is_admin()) {
            return;
        }

        // Check if shortcode is present on current page (lightweight check)
        global $post;
        if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'pglaps_transformer')) {
            // Leaflet CSS from CDN
            wp_enqueue_style(
                'leaflet-css',
                'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
                array(),
                '1.9.4'
            );

            // PGLaps bundle JS
            wp_enqueue_script(
                'pglaps-bundle',
                PGLAPS_PLUGIN_URL . 'bundle.js',
                array(),
                $this->version,
                true
            );

            // Add inline CSS for basic container styling
            wp_add_inline_style('leaflet-css', '
                #pglaps-task-transformer {
                    width: 100%;
                    height: auto !important;
                    overflow: hidden;
                    position: relative;
                    isolation: isolate;
                }
            ');
        }
    }

    /**
     * Render shortcode output
     *
     * @param array $atts Shortcode attributes
     * @return string HTML output
     */
    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'height' => '600px',
            'width'  => '100%',
        ), $atts);

        ob_start();
        ?>
        <div id="pglaps-task-transformer" style="width: <?php echo esc_attr($atts['width']); ?>;"></div>
        <?php
        return ob_get_clean();
    }

    /**
     * Plugin activation
     */
    public static function activate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation
     */
    public static function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

/**
 * Initialize the plugin
 */
function pglaps_transformer_init() {
    new PGLaps_Transformer();
}

// Hook into plugins_loaded
add_action('plugins_loaded', 'pglaps_transformer_init');

/**
 * Activation/Deactivation hooks
 */
register_activation_hook(__FILE__, array('PGLaps_Transformer', 'activate'));
register_deactivation_hook(__FILE__, array('PGLaps_Transformer', 'deactivate'));
