=== PGLaps Task Transformer ===
Contributors: pglaps
Tags: paragliding, task transformer, xctask, airspace, map, leaflet
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.5.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.txt

Paragliding competition task transformation tool with interactive map. Transform XCTask files to new locations with automatic airspace rotation.

== Description ==

The PGLaps Task Transformer provides an interactive tool for paragliding competition organizers to transform task definitions to new geographic locations while preserving task geometry.

Features:

* Official task templates from pglaps.com (one-click load)
* Upload XCTask files (.xctsk) for task visualization
* Upload OpenAir airspace files (.txt) for airspace overlay
* Drag-and-drop or click-to-reposition the task start point
* Rotate tasks with real-time bearing display
* Automatic airspace transformation with task repositioning
* Export transformed tasks and airspace files
* Interactive Leaflet map with optimized route visualization
* Fully responsive design for desktop and mobile

== Installation ==

=== Automatic Installation ===

1. Log in to your WordPress admin panel
2. Navigate to Plugins > Add New
3. Click "Upload Plugin"
4. Choose the `pglaps-transformer.zip` file
5. Click "Install Now" and activate the plugin

=== Manual Installation ===

1. Upload the `pglaps-transformer` folder to the `/wp-content/plugins/` directory
2. Log in to your WordPress admin panel
3. Navigate to Plugins
4. Find "PGLaps Task Transformer" and click "Activate"

== Usage ==

=== Using the Shortcode ===

On any page or post, add the shortcode:

    [pglaps_transformer]

With custom dimensions:

    [pglaps_transformer height="700px" width="100%"]

=== Using in Page Templates ===

```php
<?php echo do_shortcode('[pglaps_transformer]'); ?>
```

=== Using in Text Widgets ===

The shortcode works in text widgets and will automatically render.

== Development ==

To build the JavaScript bundle:

1. Navigate to the OnlineTransposer directory
2. Run `npm install` (first time only)
3. Run `npm run build`
4. Copy `dist/bundle.js` to the plugin directory

== Changelog ==

= 1.5.0 =
* Fixed task templates loading for WordPress integration
* Added fallback mechanism for loading tasks.json when WordPress data unavailable
* Improved error handling and user feedback for template loading issues

= 1.4.0 =
* Added official task templates dropdown with one-click loading
* Redesigned UI with 3-column header (templates, upload buttons, drop zone)
* Moved rotation controls and export to footer
* Both task and airspace files load together when selecting a template

= 1.3.0 =
* Fixed airspace drift bug during task rotation
* Improved coordinate transformation accuracy

= 1.2.0 =
* Bug fixes and stability improvements

= 1.0.0 =
* Initial release
* XCTask file upload and visualization
* OpenAir airspace upload and transformation
* Click-to-move and drag-and-drop start pin repositioning
* Task rotation with real-time bearing display
* Export functionality for transformed tasks and airspace
* Responsive design

== Upgrade Notice ==

== Screenshots ==

== Frequently Asked Questions ==

= Does this plugin collect any data? =

No. All processing happens client-side in your browser. No data is sent to external servers.

= What file formats are supported? =

* Tasks: .xctsk files (XCTrack format)
* Airspace: .txt files (OpenAir format)

= Can I use multiple instances on one page? =

Currently only one instance per page is supported due to the unique container ID requirement.
