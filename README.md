# Design System Checker for Figma

A powerful Figma plugin that checks design system compliance across your files. It detects issues with components, styles, and variables, and provides suggestions to fix them.

## Features

- **Design System Detection**: Automatically detects design system libraries in your file
- **Component Checking**: Identifies detached components, modified instances, and non-library components
- **Style Checking**: Finds missing style references for fills, strokes, effects, and text styles
- **Variable/Token Checking**: Validates usage of design tokens and suggests alternatives
- **Coverage Analysis**: Calculates design system adoption metrics across your file
- **Visual Issue Highlighting**: Highlights issues directly on the canvas for easy identification
- **Fix Suggestions**: Provides one-click fixes for common compliance issues
- **Coverage Report**: Generates a visual coverage report

## Installation

1. Clone this repository
2. Install dependencies
   ```
   npm install
   ```
3. Build the plugin
   ```
   npm run build
   ```
4. In Figma, go to Plugins > Development > Import plugin from manifest...
5. Select the `manifest.json` file from this repository

## Usage

### Running the Plugin

1. Open a Figma file you want to check
2. Run the plugin from Plugins > Design System Checker > Check Design System Usage
3. The plugin will analyze your design and show a report of issues

### Understanding the Results

The plugin checks for several types of issues:

- **Component Issues**: Detached instances, modified components, or local components
- **Style Issues**: Missing style references for fills, strokes, effects, and text
- **Variable Issues**: Missing or incorrect variable usage

### Fixing Issues

For most issues, the plugin provides suggested fixes:

1. Click on the "Locate" button to find the element in your design
2. Choose from available fixes to apply automatically
3. Re-run the check to verify the fix

### Settings

Configure the plugin behavior in the Settings tab:

- **Visualize Issues**: Enable/disable highlighting issues on the canvas
- **Generate Report**: Enable/disable creating a visual coverage report
- **Design System Libraries**: Select which libraries to check against

## Development

### Project Structure

- `code.ts`: Main plugin entry point
- `ui.html`: User interface
- `utils.ts`: Helper functions for node traversal and color comparison
- `styleChecker.ts`: Style usage checks
- `tokenChecker.ts`: Variable/token validation
- `componentChecker.ts`: Component usage checks
- `coverageCalculator.ts`: Metrics calculation
- `libraryDetector.ts`: Design library detection

### Building

```
npm run build
```

### Watching for Changes

```
npm run watch
```

## Credits

This plugin was inspired by design linting tools and built to help teams maintain consistent design system usage.

## License

MIT License