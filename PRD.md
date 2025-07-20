# MBTiles Viewer - Project Requirements Document

## Project Overview

**Project Name:** Multi-Format Tile Viewer with Interactive Controls  
**Version:** 1.0  
**Date:** July 2025  

### Summary
Build a full-stack web application to serve and visualize Colorado infrastructure datasets (power lines, railways, roads) with interactive layer controls, feature inspection, and data-driven styling. Primary implementation uses MBTiles with extensibility for PMTiles comparison.

### Goals
1. Serve MBTiles data via optimized tile infrastructure
2. Render multiple vector tile layers with interactive feature inspection
3. Provide intuitive UI controls for layer visibility, opacity, and styling
4. Support data-driven styling based on feature attributes
5. Enable feature interaction (hover info, click details)
6. Prepare architecture for PMTiles format comparison

## Technical Architecture

### Hybrid Backend Strategy
- **tileserver-gl-light:** Optimized tile serving (port 8080)
- **FastAPI:** Metadata coordination, feature queries, and frontend API (port 8000)

### File Structure
```
tile-viewer/
├── backend/
│   ├── main.py              # FastAPI coordination layer
│   ├── models.py            # Data models and schemas
│   ├── metadata_reader.py   # MBTiles/PMTiles metadata extraction
│   ├── feature_inspector.py # Feature data extraction for popups
│   ├── style_manager.py     # Dynamic style generation utilities
│   ├── requirements.txt     # Python dependencies
│   └── config/
│       ├── datasets.yaml    # Dataset configuration
│       └── tileserver.json  # Tileserver configuration
├── frontend/
│   ├── index.html           # MBTiles viewer (primary)
│   ├── pmtiles.html         # PMTiles comparison page
│   ├── js/
│   │   ├── app.js          # Main application logic
│   │   ├── layer-controls.js # UI controls and styling
│   │   ├── feature-popup.js # Feature inspection UI
│   │   ├── style-engine.js  # Dynamic styling logic
│   │   └── tile-source.js   # Abstracted tile source handling
│   ├── css/
│   │   ├── style.css        # Main application styles
│   │   └── components.css   # UI component styles
│   └── lib/
│       └── pmtiles.js       # PMTiles support library
├── data/
│   ├── mbtiles/
│   │   ├── co_power_lines.mbtiles
│   │   ├── co_railways.mbtiles
│   │   └── co_roads.mbtiles
│   ├── pmtiles/             # Future PMTiles versions
│   │   ├── co_power_lines.pmtiles
│   │   ├── co_railways.pmtiles
│   │   └── co_roads.pmtiles
│   └── styles/
│       ├── base/            # Your existing styles
│       │   ├── co_power_lines_style.json
│       │   ├── co_railways_style.json
│       │   └── co_roads_style.json
│       └── templates/       # Style templates for data-driven styling
│           ├── roads_by_type.json
│           ├── power_by_voltage.json
│           └── railways_by_usage.json
├── scripts/
│   ├── start_services.sh    # Combined service startup
│   └── convert_to_pmtiles.sh # MBTiles → PMTiles conversion
└── README.md
```

## Backend Specifications

### Technology Stack
- **Tile Server:** tileserver-gl-light (C++ optimized)
- **API Layer:** FastAPI (coordination + feature queries)
- **Dependencies:** 
  - `fastapi`
  - `uvicorn`
  - `sqlite3` (built-in)
  - `pydantic`
  - `aiofiles`
  - `tileserver-gl-light` (npm install -g)

### API Endpoints

#### 1. Dataset Discovery
```
GET /api/datasets
Response: {
  "datasets": [
    {
      "id": "co_power_lines",
      "name": "Colorado Power Lines",
      "type": "vector",
      "format": "mbtiles",
      "bounds": [-109.05, 36.99, -102.04, 41.00],
      "minzoom": 0,
      "maxzoom": 14,
      "vector_layers": [
        {
          "id": "power_lines",
          "fields": {
            "voltage": "number",
            "line_type": "string",
            "owner": "string"
          }
        }
      ],
      "styling_options": {
        "categorical_fields": ["line_type", "owner"],
        "numeric_fields": ["voltage"],
        "available_templates": ["power_by_voltage", "power_by_owner"]
      }
    }
  ]
}
```

#### 2. Tile Serving (via tileserver-gl-light)
```
GET http://localhost:8080/{dataset_id}/{z}/{x}/{y}.pbf
Note: Served directly by tileserver-gl-light for optimal performance
```

#### 3. Style Management
```
GET /api/styles/{dataset_id}?template={template_name}&field={field_name}
Parameters:
  - dataset_id: Dataset identifier
  - template: Optional style template (e.g., "roads_by_type")
  - field: Optional field for data-driven styling
Response: Complete MapLibre style.json with dynamic styling rules

Examples:
  /api/styles/co_roads → Base style from your existing JSON
  /api/styles/co_roads?template=roads_by_type&field=highway → Data-driven styling
```

#### 4. Feature Inspection
```
GET /api/features/{dataset_id}/{z}/{x}/{y}?layers={layer_names}
Parameters:
  - z, x, y: Tile coordinates for feature lookup
  - layers: Comma-separated layer names to query
Response: {
  "features": [
    {
      "layer": "power_lines",
      "properties": {
        "voltage": 345000,
        "line_type": "transmission",
        "owner": "Xcel Energy"
      },
      "geometry": {...}
    }
  ]
}

Note: Enables hover/click feature inspection without client-side queries
```

#### 5. Format Switching
```
GET /api/formats/{dataset_id}/available
Response: {
  "formats": ["mbtiles", "pmtiles"],
  "current": "mbtiles",
  "endpoints": {
    "mbtiles": "http://localhost:8080/{dataset_id}/{z}/{x}/{y}.pbf",
    "pmtiles": "/pmtiles/{dataset_id}.pmtiles"
  }
}
```

### Backend Implementation Requirements

1. **Tile Server Management**
   - Configure tileserver-gl-light with all datasets
   - Health monitoring for tile server availability
   - Auto-restart capabilities for development

2. **Feature Data Access**
   - Efficient SQLite queries for feature inspection
   - Tile-coordinate to feature mapping
   - Property filtering and formatting

3. **Dynamic Style Generation**
   - Template-based style generation from your base styles
   - Data-driven styling rules (categorical and numeric)
   - Style caching and invalidation

4. **Format Abstraction**
   - Unified interface for MBTiles and PMTiles
   - Metadata extraction across formats
   - Configuration-driven dataset management

## Frontend Specifications

### Core Features

#### 1. Interactive Map Component
- **Base Map:** Dark theme, minimal labels
- **Initial View:** Auto-centered on Colorado datasets bounds
- **Zoom Range:** 5-16 (state to street level)
- **Controls:** Zoom, attribution, fullscreen

#### 2. Advanced Layer Control Panel
```
Layer Controls:
├── Colorado Power Lines     [☑️] ────── 85% │ ⚙️ Style │ 📊 Info
│   └── Style: By Voltage (345kV, 230kV, 138kV...)
├── Colorado Railways        [☑️] ────── 75% │ ⚙️ Style │ 📊 Info  
│   └── Style: By Usage (freight, passenger, abandoned)
└── Colorado Roads           [☑️] ────── 60% │ ⚙️ Style │ 📊 Info
    └── Style: By Type (interstate, highway, arterial, local)

Features:
- Visibility toggles with smooth animations
- Opacity sliders with real-time preview
- Style dropdown for data-driven styling options
- Info button for dataset metadata
- Expandable sections for styling controls
```

#### 3. Feature Inspection System
```javascript
// Hover behavior
map.on('mouseenter', layerIds, (e) => {
  // Show tooltip with key properties
  showTooltip(e.point, {
    title: e.features[0].properties.name,
    subtitle: `${e.features[0].properties.type} - ${e.features[0].properties.owner}`
  });
});

// Click behavior  
map.on('click', layerIds, async (e) => {
  // Fetch detailed feature data
  const featureData = await fetchFeatureDetails(e.features[0]);
  showDetailPopup(e.lngLat, featureData);
});
```

#### 4. Dynamic Styling Interface
```
Styling Panel (expandable):
┌─────────────────────────────────┐
│ Colorado Roads - Style Options │
├─────────────────────────────────┤
│ Color By: [Highway Type    ▼]   │
│ Width By: [Traffic Volume ▼]    │
│                                 │
│ Categories:                     │
│ ■ Interstate    (red)           │
│ ■ US Highway    (orange)        │
│ ■ State Route   (yellow)        │
│ ■ Local Road    (gray)          │
│                                 │
│ [Apply Style] [Reset to Base]   │
└─────────────────────────────────┘
```

### Format Comparison Interface

#### PMTiles Test Page (`pmtiles.html`)
- **Side-by-side comparison** of MBTiles vs PMTiles rendering
- **Performance metrics** display (load time, memory usage)
- **Identical styling** applied to both formats
- **Switch toggle** between formats for same dataset

```
┌─────────────────┬─────────────────┐
│ MBTiles Viewer  │ PMTiles Viewer  │
├─────────────────┼─────────────────┤
│ [Map View A]    │ [Map View B]    │
│                 │                 │
│ Load: 1.2s      │ Load: 0.8s      │
│ Memory: 45MB    │ Memory: 32MB    │
│ Tiles: 234      │ Tiles: 234      │
└─────────────────┴─────────────────┘
```

## Implementation Tasks

### Phase 1: Core Infrastructure
- [ ] Install and configure tileserver-gl-light
- [ ] Set up FastAPI with dataset discovery
- [ ] Implement metadata extraction and feature inspection endpoints
- [ ] Create base map with layer loading from existing styles
- [ ] Build unified tile source abstraction for future PMTiles support

### Phase 2: Interactive Features  
- [ ] Implement feature hover tooltips and click popups
- [ ] Build layer control panel with visibility/opacity controls
- [ ] Add feature inspection UI components
- [ ] Create dataset metadata display
- [ ] Implement smooth layer toggle animations

### Phase 3: Dynamic Styling
- [ ] Build style template system for data-driven styling
- [ ] Create styling UI controls (color by field, style by attribute)
- [ ] Implement categorical and numeric styling options
- [ ] Add style preview and reset functionality
- [ ] Create road type, power voltage, and railway usage styling

### Phase 4: Format Extensibility
- [ ] Create PMTiles comparison page
- [ ] Implement format switching in tile source abstraction
- [ ] Add performance monitoring and metrics display
- [ ] Build side-by-side format comparison interface
- [ ] Create conversion utilities and documentation

### Phase 5: Polish & Deploy
- [ ] Optimize performance and add loading states
- [ ] Implement responsive design for mobile devices
- [ ] Add comprehensive error handling and user feedback
- [ ] Create documentation and deployment configuration
- [ ] Set up monitoring and analytics

## Advanced Feature Specifications

### Data-Driven Styling Rules

**Roads Dataset Example:**
```json
{
  "highway_type_styling": {
    "field": "highway",
    "type": "categorical",
    "stops": [
      ["interstate", {"color": "#e74c3c", "width": 8}],
      ["primary", {"color": "#f39c12", "width": 6}],
      ["secondary", {"color": "#f1c40f", "width": 4}],
      ["residential", {"color": "#95a5a6", "width": 2}]
    ]
  },
  "traffic_volume_styling": {
    "field": "aadt",
    "type": "numeric", 
    "stops": [
      [0, {"width": 1}],
      [10000, {"width": 3}],
      [50000, {"width": 6}],
      [100000, {"width": 10}]
    ]
  }
}
```

### Feature Inspection Data Structure
```json
{
  "feature_popup": {
    "title": "I-25 North",
    "subtitle": "Interstate Highway",
    "properties": [
      {"label": "Highway Type", "value": "Interstate", "type": "category"},
      {"label": "Speed Limit", "value": "75 mph", "type": "text"},
      {"label": "Traffic Volume", "value": "87,500 vehicles/day", "type": "number"},
      {"label": "Surface Type", "value": "Asphalt", "type": "category"}
    ],
    "actions": [
      {"label": "View Details", "action": "open_detail_panel"},
      {"label": "Filter Similar", "action": "filter_by_type"}
    ]
  }
}
```

## Success Criteria

### Functional Requirements
✅ All Colorado datasets render with interactive controls  
✅ Feature hover/click provides detailed property information  
✅ Data-driven styling works for roads, power lines, and railways  
✅ Layer controls enable visibility, opacity, and styling changes  
✅ Map auto-centers on Colorado with smooth user interactions  
✅ PMTiles comparison page demonstrates format differences  

### Performance Requirements
- Initial map load < 2 seconds
- Feature inspection response < 200ms
- Style switching < 500ms
- Smooth 60fps interactions on desktop
- Responsive performance on mobile devices

### User Experience Requirements
- Intuitive layer controls with clear visual feedback
- Informative feature popups with relevant data
- Smooth animations and transitions
- Clear error states and loading indicators
- Accessible design following WCAG guidelines

## Future Extensibility

### Anticipated Enhancements
- **Spatial Analysis:** Measure tools, buffer analysis, intersection queries
- **Data Export:** Feature filtering and export to GeoJSON/CSV
- **Time Series:** Support for temporal data and animation
- **Custom Styling:** User-defined color ramps and symbology
- **Collaboration:** Shared maps and annotation tools

### Architecture Considerations
- **Plugin System:** Modular architecture for custom analysis tools
- **API Versioning:** Backward compatibility for frontend/backend evolution
- **Multi-format Support:** Extensible tile source system for new formats
- **Performance Monitoring:** Built-in metrics for optimization
- **Configuration Management:** YAML-based dataset and styling configuration

## Development Environment

### Setup Requirements
```bash
# Install global dependencies
npm install -g tileserver-gl-light

# Start combined services
./scripts/start_services.sh

# Services will run on:
# - Frontend: localhost:3000
# - FastAPI: localhost:8000  
# - Tileserver: localhost:8080
```

### Service Architecture
```
Frontend (localhost:3000)
    │
    ├─── API calls ────→ FastAPI (localhost:8000)
    │                    ├── /api/datasets (metadata)
    │                    ├── /api/styles/{id} (styling)
    │                    ├── /api/features/{id} (inspection)
    │                    └── /api/formats/{id} (format info)
    │
    └─── Tile requests ──→ tileserver-gl (:8080)
                           └── /{dataset}/{z}/{x}/{y}.pbf
```

### PMTiles Integration
```bash
# Convert existing MBTiles to PMTiles
./scripts/convert_to_pmtiles.sh

# PMTiles served statically (no backend required)
# Frontend directly accesses: /data/pmtiles/{dataset}.pmtiles
```

---

**Ready for Implementation:** This comprehensive PRD provides detailed specifications for building a feature-rich, extensible tile viewer that starts with your existing MBTiles data and scales to support advanced interactions, dynamic styling, and multiple tile formats.