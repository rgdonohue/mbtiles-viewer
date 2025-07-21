// Main Application Controller
class TileViewerApp {
    constructor() {
        this.map = null;
        this.datasets = [];
        this.layerControls = null;
        this.featurePopup = null;
        this.tileSource = null;
        this.currentLayers = new Map();
        
        this.init();
    }

    async init() {
        try {
            // Show loading overlay
            this.showLoading(true);
            
            // Initialize components
            this.initializeEventListeners();
            
            // Load datasets from API
            await this.loadDatasets();
            
            // Initialize map
            this.initializeMap();
            
            // Initialize layer controls
            this.layerControls = new LayerControls(this.map, this.datasets);
            
            // Initialize feature popup
            this.featurePopup = new FeaturePopup(this.map);
            
            // Initialize tile source manager
            this.tileSource = new TileSource();
            
            // Load initial layers
            await this.loadInitialLayers();
            
            // Hide loading overlay
            this.showLoading(false);
            
            console.log('Tile Viewer App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    async loadDatasets() {
        try {
            const response = await fetch('http://localhost:8000/api/datasets');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.datasets = data.datasets;
            console.log('Loaded datasets:', this.datasets);
        } catch (error) {
            console.error('Failed to load datasets:', error);
            throw error;
        }
    }

    initializeMap() {
        // Default bounds for initial view (Colorado as example)
        const defaultBounds = [-109.05, 36.99, -102.04, 41.00];
        const center = [
            (defaultBounds[0] + defaultBounds[2]) / 2,
            (defaultBounds[1] + defaultBounds[3]) / 2
        ];

        this.map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {},
                layers: [
                    {
                        id: 'background',
                        type: 'background',
                        paint: {
                            'background-color': '#2C3E50'
                        }
                    }
                ]
            },
            center: center,
            zoom: 7,
            minZoom: 5,
            maxZoom: 16
        });

        // Add navigation controls
        this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
        this.map.addControl(new maplibregl.FullscreenControl(), 'top-right');

        // Add scale control
        this.map.addControl(new maplibregl.ScaleControl({
            maxWidth: 100,
            unit: 'metric'
        }), 'bottom-left');

        this.map.on('load', () => {
            console.log('Map loaded successfully');
            this.onMapLoad();
        });

        this.map.on('error', (e) => {
            console.error('Map error:', e);
        });
    }

    async onMapLoad() {
        // Map is ready, load layers will be handled by layer controls
    }

    async loadInitialLayers() {
        // Load all datasets by default
        for (const dataset of this.datasets) {
            await this.loadDatasetLayer(dataset);
        }
    }

    async loadDatasetLayer(dataset) {
        try {
            // Get style from API
            const styleResponse = await fetch(`http://localhost:8000/api/styles/${dataset.id}`);
            if (!styleResponse.ok) {
                throw new Error(`Failed to load style for ${dataset.id}`);
            }
            const style = await styleResponse.json();

            // Add source to map
            const sourceId = `${dataset.id}-source`;
            if (!this.map.getSource(sourceId)) {
                // Extract source configuration from style
                const sourceConfig = Object.values(style.sources)[0];
                this.map.addSource(sourceId, sourceConfig);
            }

            // Add layers from style
            const layers = style.layers.filter(layer => layer.id !== 'background');
            for (const layer of layers) {
                const layerId = `${dataset.id}-${layer.id}`;
                if (!this.map.getLayer(layerId)) {
                    this.map.addLayer({
                        ...layer,
                        id: layerId,
                        source: sourceId
                    });
                }
            }

            // Store layer info
            this.currentLayers.set(dataset.id, {
                dataset,
                sourceId,
                layerIds: layers.map(layer => `${dataset.id}-${layer.id}`),
                visible: true,
                opacity: 1.0
            });

            console.log(`Loaded layer for ${dataset.name}`);

        } catch (error) {
            console.error(`Failed to load layer for ${dataset.id}:`, error);
        }
    }

    toggleLayerVisibility(datasetId, visible) {
        const layerInfo = this.currentLayers.get(datasetId);
        if (layerInfo) {
            layerInfo.layerIds.forEach(layerId => {
                this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
            });
            layerInfo.visible = visible;
        }
    }

    setLayerOpacity(datasetId, opacity) {
        const layerInfo = this.currentLayers.get(datasetId);
        if (layerInfo) {
            layerInfo.layerIds.forEach(layerId => {
                const layer = this.map.getLayer(layerId);
                if (layer) {
                    if (layer.type === 'line') {
                        this.map.setPaintProperty(layerId, 'line-opacity', opacity);
                    } else if (layer.type === 'fill') {
                        this.map.setPaintProperty(layerId, 'fill-opacity', opacity);
                    } else if (layer.type === 'circle') {
                        this.map.setPaintProperty(layerId, 'circle-opacity', opacity);
                    }
                }
            });
            layerInfo.opacity = opacity;
        }
    }

    initializeEventListeners() {
        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    document.documentElement.requestFullscreen();
                }
            });
        }

        // Panel toggle
        const toggleBtn = document.getElementById('toggle-panel');
        const panel = document.getElementById('layer-panel');
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('collapsed');
                toggleBtn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
            });
        }

        // Escape key to close popups
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.featurePopup) {
                    this.featurePopup.hide();
                }
            }
        });
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }
    }

    showError(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align: center;">
                    <h3 style="color: #e74c3c; margin-bottom: 1rem;">Error</h3>
                    <p style="margin-bottom: 2rem;">${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
                </div>
            `;
            overlay.classList.remove('hidden');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TileViewerApp();
});