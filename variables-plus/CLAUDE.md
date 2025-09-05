# Variables Plus - Figma Plugin

A standalone Figma plugin for managing and updating design system variables with advanced search, bulk operations, and visual previews.

## Project Overview

Variables Plus is a marketplace-ready Figma plugin extracted from a larger design system tool. It provides designers with powerful variable management capabilities including:
- Advanced variable search and filtering
- Bulk variable updates with visual preview
- Alias creation and management
- Multi-mode support
- Responsive, resizable UI

## Technical Stack

- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Build Tool**: Vite with vite-plugin-singlefile
- **UI Components**: Custom Vue components (replaced Grimoire UI)
- **Icons**: Lucide Vue Next
- **Styling**: SCSS with CSS variables

## Key Features Implemented

### 1. Variable Table Display
- Hierarchical navigation tree for variable organization
- Multi-column table showing variables across different modes
- Color swatches, text values, and number displays
- Visual indicators for aliased variables

### 2. Search Functionality
- Fuzzy search across variable names
- Search by color values (hex, rgb)
- Search by numeric values
- Find variables with matching values across modes

### 3. Variable Update Modal
- Redesigned flow: "Update Variable Values" instead of confusing "Copy/Create Alias"
- Two update modes:
  - **Link as alias**: Creates dynamic references that update automatically
  - **Copy raw values**: Copies current values without creating references
- Visual preview table showing before/after states
- Bulk selection and update capabilities

### 4. UI/UX Enhancements
- Resizable window with smooth edge dragging
- Adaptive link icons that change color based on background luminance
- Proper handling of transparent colors with background compositing
- Navigation history with back/forward buttons
- Quick variable refresh on focus
- Tooltips with faster hover response

### 5. Performance Optimizations
- Throttled window resizing with requestAnimationFrame
- Debounced storage saves
- Efficient message passing between plugin and UI contexts

## Architecture Decisions

### File Structure
```
variables-plus/
├── src/
│   ├── plugin/          # Figma plugin context code
│   │   ├── main.ts      # Entry point
│   │   └── handlers/    # Message handlers
│   ├── ui/              # UI iframe code
│   │   ├── components/  # Vue components
│   │   ├── utils/       # Helper functions
│   │   └── main.ts      # Vue app entry
│   └── shared/          # Shared types and bridge
├── plugin/              # Built output
└── scripts/             # Build scripts
```

### Component Architecture
- **VariablesTable.vue**: Main component containing all functionality
- **Modal.vue**: Reusable modal with proper sizing (min 800x400px)
- **ResizableContainer.vue**: Window resize handling with edge detection
- **VariableDropdown.vue**: Smart dropdown with fuzzy search
- **Icon.vue**: Wrapper for Lucide icons

### Message Bridge Pattern
Implemented typed message passing system between sandboxed contexts:
```typescript
bridge.send(MessageType.ASSIGN_ALIAS_TO_VARIABLE, payload)
bridge.on(MessageType.COLLECTIONS_RESPONSE, handler)
```

## Recent Improvements

### Modal Redesign
- Unified "Update Variable Values" flow replacing separate "Copy" and "Create Alias" buttons
- Clear explanatory text for each mode
- Larger modals (800px+ width) to prevent content cramping

### Preview Table Enhancement
- Vertical stacking of current → new values with down arrow
- Consistent styling with main table
- Color swatches for visual variables
- Left-aligned content for better readability

### Adaptive Icon Colors
- Intelligent luminance calculation for color backgrounds
- Automatic switching between light/dark icons
- Proper handling of transparent colors with alpha blending
- WCAG formula for contrast calculation

## Development Commands

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Clean build artifacts
npm run clear
```

## Known Considerations

1. **Fixed Dark Theme**: Currently optimized for Figma's dark theme (rgb(34, 34, 34) background)
2. **Single Collection Focus**: Designed for "ENG VARIABLES" as primary use case
3. **Mode Limitations**: Alias creation uses first mode by default

## Future Enhancement Ideas

- Light theme support with dynamic background detection
- Export/import functionality for variable sets
- Batch operations across collections
- Keyboard shortcuts for power users
- Variable history/undo functionality

## Marketplace Preparation

The plugin is ready for Figma Community with:
- Clean, professional UI matching Figma's design language
- Comprehensive error handling
- Smooth performance even with large variable sets
- Intuitive UX that doesn't require documentation
- No external dependencies or API calls