# Colorado Infrastructure Tile Viewer

A full-stack web application for visualizing Colorado infrastructure datasets (power lines, railways, roads) with interactive layer controls, feature inspection, and data-driven styling capabilities.

## Features

### Phase 1 (Implemented)
✅ **Core Infrastructure**
- tileserver-gl-light for optimized tile serving
- FastAPI backend for metadata and coordination  
- MapLibre GL JS frontend with interactive map
- Dataset discovery and metadata extraction
- Unified tile source abstraction

✅ **Interactive Map**
- Dark theme optimized for infrastructure visualization
- Auto-centered on Colorado bounds
- Navigation and fullscreen controls
- Responsive layer control panel

✅ **Layer Management**
- Toggle layer visibility with smooth animations
- Opacity controls with real-time preview
- Dataset information display
- Basic feature inspection on click/hover

## Quick Start

### Prerequisites

1. **Node.js** (for tileserver-gl-light)
   ```bash
   npm install -g tileserver-gl-light
   ```

2. **Python 3.8+** (for FastAPI backend)
   ```bash
   python3 --version
   ```

### Installation & Setup

1. **Install dependencies and start all services:**
   ```bash
   ./scripts/start_services.sh
   ```

   This will:
   - Install Python dependencies in a virtual environment
   - Start tileserver-gl-light on port 8080
   - Start FastAPI backend on port 8000  
   - Start frontend development server on port 3000

2. **Access the application:**
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:8000
   - **Tileserver:** http://localhost:8080

## Project Structure

```
tileserver-test/
├── backend/                     # FastAPI backend
│   ├── main.py                 # API endpoints and coordination
│   ├── requirements.txt        # Python dependencies
│   └── venv/                   # Virtual environment (created automatically)
├── frontend/                   # Frontend application
│   ├── index.html             # Main application page
│   ├── css/                   # Stylesheets
│   │   ├── style.css          # Main application styles
│   │   └── components.css     # UI component styles
│   └── js/                    # JavaScript modules
│       ├── app.js             # Main application controller
│       ├── layer-controls.js  # Layer management UI
│       ├── feature-popup.js   # Feature inspection
│       └── tile-source.js     # Tile source abstraction
├── data/                      # Data assets
│   ├── mbtiles/              # MBTiles datasets
│   │   ├── co_power_lines.mbtiles
│   │   ├── co_railways.mbtiles
│   │   └── co_roads.mbtiles
│   └── styles/               # MapLibre style configurations
│       ├── co_power_lines_style.json
│       ├── co_railways_style.json
│       └── co_roads_style.json
├── config/                   # Service configurations
│   └── tileserver.json      # Tileserver-gl configuration
├── scripts/                 # Utility scripts
│   └── start_services.sh   # Combined service startup
├── logs/                   # Service logs (created automatically)
└── CLAUDE.md              # Development guidance
```

## API Endpoints

### Dataset Discovery
```
GET /api/datasets
```
Returns metadata for all available datasets including bounds, zoom levels, and vector layer information.

### Style Management  
```
GET /api/styles/{dataset_id}
```
Returns MapLibre style configuration for a dataset. Future support for dynamic styling with template and field parameters.

### Health Check
```
GET /health
```
Backend service health status.

## Development

### Manual Service Management

If you prefer to start services individually:

```bash
# 1. Start tileserver (port 8080)
tileserver-gl-light --config config/tileserver.json --port 8080

# 2. Start backend API (port 8000)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. Start frontend (port 3000)
cd frontend
python3 -m http.server 3000
```

### Log Monitoring

```bash
# Backend logs
tail -f logs/backend.log

# Tileserver logs  
tail -f logs/tileserver.log

# Frontend logs
tail -f logs/frontend.log
```

### Data File Locations

The application expects MBTiles files in `data/mbtiles/`:
- `co_power_lines.mbtiles` - Colorado power transmission lines
- `co_railways.mbtiles` - Colorado railway infrastructure  
- `co_roads.mbtiles` - Colorado road networks

Style files in `data/styles/` should match the MBTiles names with `_style.json` suffix.

## Troubleshooting

### Port Conflicts
The startup script will detect port conflicts and offer to kill existing processes. You can also manually free ports:

```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:8000 | xargs kill -9  # Backend  
lsof -ti:8080 | xargs kill -9  # Tileserver
```

### Missing Dependencies
```bash
# Install tileserver globally
npm install -g tileserver-gl-light

# Verify Python version
python3 --version  # Should be 3.8+
```

### Data File Issues
Ensure your MBTiles files are:
- Located in `data/mbtiles/`
- Named exactly as configured (co_power_lines.mbtiles, etc.)
- Valid MBTiles format with vector tile data

## Next Steps (Planned Phases)

### Phase 2: Enhanced Interactions
- Feature hover tooltips with key properties
- Detailed click popups with all attributes
- Layer control animations and improved UX
- Dataset metadata display

### Phase 3: Dynamic Styling  
- Data-driven styling based on feature attributes
- Style templates for roads by type, power by voltage
- Categorical and numeric styling options
- Style preview and reset functionality

### Phase 4: Format Extensibility
- PMTiles format support and comparison
- Side-by-side format performance testing
- Format switching in tile source abstraction
- Performance monitoring and metrics

### Phase 5: Polish & Deploy
- Performance optimizations and loading states
- Mobile responsive design
- Comprehensive error handling
- Production deployment configuration

## Architecture Notes

The application uses a hybrid backend strategy:
- **tileserver-gl-light**: Optimized C++ tile serving for performance
- **FastAPI**: Python API for coordination, metadata, and future feature queries
- **MapLibre GL JS**: Modern vector tile rendering with WebGL acceleration

This architecture provides optimal tile serving performance while maintaining flexibility for metadata operations and future enhancements like feature inspection and dynamic styling.