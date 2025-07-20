# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a tile viewer project for Colorado infrastructure datasets (power lines, railways, roads) using MBTiles format. The project is planned as a full-stack web application with interactive layer controls, feature inspection, and data-driven styling capabilities.

## Current State

This is a **planning/setup phase** repository containing:
- **PRD.md**: Comprehensive project requirements document with technical specifications
- **Data assets**: 3 MBTiles files (power lines, railways, roads) in `/tiles/` directory
- **Style configurations**: MapLibre style JSON files for each dataset in `/styles/` directory

## Planned Architecture

According to PRD.md, the project will implement a hybrid backend strategy:

### Backend Components
- **tileserver-gl-light**: Optimized tile serving (port 8080)
- **FastAPI**: Metadata coordination, feature queries, and frontend API (port 8000)

### Key Commands (Planned)
```bash
# Install global dependencies
npm install -g tileserver-gl-light

# Start combined services
./scripts/start_services.sh

# Convert MBTiles to PMTiles (future)
./scripts/convert_to_pmtiles.sh
```

### Service Architecture (Planned)
- Frontend: localhost:3000
- FastAPI: localhost:8000  
- Tileserver: localhost:8080

## Data Structure

### MBTiles Files
- `tiles/co_power_lines.mbtiles`
- `tiles/co_railways.mbtiles` 
- `tiles/co_roads.mbtiles`

### Style Files
- `styles/co_power_lines_style.json`
- `styles/co_railways_style.json`
- `styles/co_roads_style.json`

All styles follow MapLibre style specification with:
- Dark background theme (#2C3E50)
- Vector tile sources referencing MBTiles files
- Basic styling with zoom-based interpolation

## Implementation Phases

The PRD outlines 5 implementation phases:
1. **Core Infrastructure**: Tileserver setup, FastAPI, basic map
2. **Interactive Features**: Feature inspection, layer controls  
3. **Dynamic Styling**: Data-driven styling system
4. **Format Extensibility**: PMTiles comparison
5. **Polish & Deploy**: Performance optimization, responsive design

## API Endpoints (Planned)

- `GET /api/datasets` - Dataset discovery with metadata
- `GET /api/styles/{dataset_id}` - Dynamic style generation
- `GET /api/features/{dataset_id}/{z}/{x}/{y}` - Feature inspection
- `GET /api/formats/{dataset_id}/available` - Format switching

## Development Notes

- No package.json or build system currently exists
- No backend code has been implemented yet
- No frontend code has been implemented yet
- This appears to be a greenfield project in early planning stage
- Implementation should follow the detailed specifications in PRD.md