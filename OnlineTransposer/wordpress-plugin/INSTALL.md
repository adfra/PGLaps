# PGLaps Task Transformer - WordPress Plugin Installation Guide

## Quick Start Installation

### Step 1: Build the Application

From the project root, build the JavaScript bundle:

```bash
cd OnlineTransposer
npm run build
```

This creates `dist/bundle.js` which is the compiled application.

### Step 2: Copy Files to Plugin Directory

Copy the built bundle to the plugin folder:

```bash
# Windows
copy OnlineTransposer\dist\bundle.js wordpress-plugin\pglaps-transformer\bundle.js

# Or manually copy:
# From: OnlineTransposer/dist/bundle.js
# To:   wordpress-plugin/pglaps-transformer/bundle.js
```

### Step 3: Create ZIP for Upload

Compress the plugin folder:

```bash
# Navigate to the wordpress-plugin directory
cd wordpress-plugin

# Create a ZIP file (Windows - right-click "pglaps-transformer" folder > Send to > Compressed folder)
# Or using PowerShell:
Compress-Archive -Path pglaps-transformer -DestinationPath pglaps-transformer.zip
```

### Step 4: Install in WordPress

1. Log in to your WordPress admin panel
2. Go to **Plugins > Add New**
3. Click **Upload Plugin**
4. Select `pglaps-transformer.zip`
5. Click **Install Now**
6. Click **Activate Plugin**

### Step 5: Use on a Page

1. Create a new page or edit an existing one
2. Add the shortcode: `[pglaps_transformer]`
3. Publish/update the page
4. View the page to see the transformer tool

## Alternative: Manual Installation via FTP/SFTP

1. Build the application (`npm run build` in `OnlineTransposer` folder)
2. Copy `bundle.js` to the `pglaps-transformer` plugin folder
3. Upload the entire `pglaps-transformer` folder to:
   ```
   /wp-content/plugins/pglaps-transformer/
   ```
4. Log in to WordPress admin
5. Go to **Plugins** and activate **PGLaps Task Transformer**

## File Structure

After installation, your plugin folder should contain:

```
/wp-content/plugins/pglaps-transformer/
├── pglaps-transformer.php    # Main plugin file
├── bundle.js                   # Compiled application (from build)
├── readme.txt                  # Plugin readme
└── INSTALL.md                  # This file
```

## Updating the Plugin

When you make changes to the application:

1. Make your changes in the `OnlineTransposer/src/` directory
2. Rebuild: `cd OnlineTransposer && npm run build`
3. Copy the new `bundle.js` to the plugin folder
4. Re-upload to WordPress (either via ZIP upload or replace via FTP)

## Troubleshooting

### Plugin doesn't appear on the page

- **Check the shortcode**: Make sure you've added `[pglaps_transformer]` to the page content
- **Check browser console**: Press F12 and look for JavaScript errors
- **Clear cache**: Clear your browser cache and any WordPress caching plugins

### Map doesn't load

- **Check Leaflet CSS**: The plugin loads Leaflet CSS from a CDN. If your site blocks external resources, you may need to download and host it locally
- **Check container height**: The plugin requires a minimum height. Try using `[pglaps_transformer height="800px"]`

### Files won't export

- **Check browser settings**: Some browsers block automatic file downloads
- **Check popup blockers**: Allow popups for your site

## Usage Guide

Once installed:

1. **Upload Task**: Click "Upload Task (.xctsk)" to load a task file
2. **Upload Airspace** (optional): Click "Upload Airspace (.txt)" to load airspace
3. **Move Start**: Click anywhere on the map OR drag the start marker
4. **Rotate**: Use the "Task Rotation" slider to rotate the task
5. **Export**: Click "Export Files" to download transformed .xctsk and .txt files

## Support

For issues or questions:
- Check the main project repository: https://github.com/yourusername/pglaps
- Open an issue on GitHub with details about your problem
