from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import sqlite3
import json
import os
from typing import Dict, List, Any
from pydantic import BaseModel

app = FastAPI(title="MBTiles Viewer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Dataset(BaseModel):
    id: str
    name: str
    type: str
    format: str
    bounds: List[float]
    minzoom: int
    maxzoom: int
    vector_layers: List[Dict[str, Any]]
    styling_options: Dict[str, Any]

class DatasetsResponse(BaseModel):
    datasets: List[Dataset]

MBTILES_PATH = "../data/mbtiles"
STYLES_PATH = "../data/styles"

DATASET_CONFIG = {
    "co_power_lines": {
        "name": "Power Lines",
        "styling_options": {
            "categorical_fields": ["voltage", "line_type"],
            "numeric_fields": ["voltage"],
            "available_templates": ["power_by_voltage"]
        }
    },
    "co_railways": {
        "name": "Railways", 
        "styling_options": {
            "categorical_fields": ["usage", "type"],
            "numeric_fields": [],
            "available_templates": ["railways_by_usage"]
        }
    },
    "co_roads": {
        "name": "Roads",
        "styling_options": {
            "categorical_fields": ["highway", "surface"],
            "numeric_fields": ["lanes"],
            "available_templates": ["roads_by_type"]
        }
    }
}

def extract_mbtiles_metadata(mbtiles_path: str) -> Dict[str, Any]:
    """Extract metadata from MBTiles file"""
    try:
        conn = sqlite3.connect(mbtiles_path)
        cursor = conn.cursor()
        
        # Get metadata
        cursor.execute("SELECT name, value FROM metadata")
        metadata = dict(cursor.fetchall())
        
        # Get bounds
        bounds = [-109.05, 36.99, -102.04, 41.00]  # Default bounds (Colorado example)
        if 'bounds' in metadata:
            bounds = [float(x) for x in metadata['bounds'].split(',')]
        
        # Get zoom levels
        minzoom = int(metadata.get('minzoom', 0))
        maxzoom = int(metadata.get('maxzoom', 14))
        
        # Get vector layers info
        vector_layers = []
        if 'json' in metadata:
            try:
                vector_info = json.loads(metadata['json'])
                if 'vector_layers' in vector_info:
                    vector_layers = vector_info['vector_layers']
            except json.JSONDecodeError:
                pass
        
        conn.close()
        
        return {
            'bounds': bounds,
            'minzoom': minzoom,
            'maxzoom': maxzoom,
            'vector_layers': vector_layers,
            'metadata': metadata
        }
    except Exception as e:
        print(f"Error reading {mbtiles_path}: {e}")
        return {
            'bounds': [-109.05, 36.99, -102.04, 41.00],
            'minzoom': 0,
            'maxzoom': 14,
            'vector_layers': [],
            'metadata': {}
        }

@app.get("/api/datasets", response_model=DatasetsResponse)
async def get_datasets():
    """Get all available datasets with metadata"""
    datasets = []
    
    for dataset_id, config in DATASET_CONFIG.items():
        mbtiles_file = f"{MBTILES_PATH}/{dataset_id}.mbtiles"
        
        if os.path.exists(mbtiles_file):
            metadata = extract_mbtiles_metadata(mbtiles_file)
            
            dataset = Dataset(
                id=dataset_id,
                name=config["name"],
                type="vector",
                format="mbtiles",
                bounds=metadata["bounds"],
                minzoom=metadata["minzoom"],
                maxzoom=metadata["maxzoom"],
                vector_layers=metadata["vector_layers"],
                styling_options=config["styling_options"]
            )
            datasets.append(dataset)
    
    return DatasetsResponse(datasets=datasets)

@app.get("/api/styles/{dataset_id}")
async def get_style(dataset_id: str, template: str = None, field: str = None):
    """Get style for a dataset, optionally with data-driven styling"""
    style_file = f"{STYLES_PATH}/{dataset_id}_style.json"
    
    if not os.path.exists(style_file):
        raise HTTPException(status_code=404, detail="Style not found")
    
    with open(style_file, 'r') as f:
        style = json.load(f)
    
    # Update tile source URL to point to tileserver
    for source_id, source in style.get("sources", {}).items():
        if source.get("type") == "vector":
            style["sources"][source_id] = {
                "type": "vector",
                "tiles": [f"http://localhost:8080/data/{dataset_id}/{{z}}/{{x}}/{{y}}.pbf"],
                "minzoom": 0,
                "maxzoom": 14
            }
    
    return style

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "MBTiles Viewer API",
        "version": "1.0.0",
        "description": "Backend API for MBTiles Viewer",
        "endpoints": {
            "datasets": "/api/datasets",
            "styles": "/api/styles/{dataset_id}",
            "health": "/health"
        },
        "frontend": "http://localhost:3000",
        "tileserver": "http://localhost:8080"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)