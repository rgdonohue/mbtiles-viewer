// Tile Source Management
class TileSource {
    constructor() {
        this.sources = new Map();
        this.baseUrl = 'http://localhost:8080';
        this.apiUrl = 'http://localhost:8000/api';
    }

    // Get tile URL for a dataset
    getTileUrl(datasetId) {
        return `${this.baseUrl}/data/${datasetId}/{z}/{x}/{y}.pbf`;
    }

    // Get style URL for a dataset
    getStyleUrl(datasetId, template = null, field = null) {
        let url = `${this.apiUrl}/styles/${datasetId}`;
        const params = new URLSearchParams();
        
        if (template) {
            params.append('template', template);
        }
        if (field) {
            params.append('field', field);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        return url;
    }

    // Create MapLibre source configuration
    createSourceConfig(dataset) {
        return {
            type: 'vector',
            tiles: [this.getTileUrl(dataset.id)],
            minzoom: dataset.minzoom || 0,
            maxzoom: dataset.maxzoom || 14,
            bounds: dataset.bounds
        };
    }

    // Load and parse style from API
    async loadStyle(datasetId, template = null, field = null) {
        try {
            const url = this.getStyleUrl(datasetId, template, field);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const style = await response.json();
            
            // Validate style format
            if (!style.version || !style.layers) {
                throw new Error('Invalid style format');
            }
            
            return style;
            
        } catch (error) {
            console.error(`Failed to load style for ${datasetId}:`, error);
            throw error;
        }
    }

    // Create a complete MapLibre style object
    async createMapStyle(datasets) {
        const sources = {};
        const layers = [];
        
        // Add background layer
        layers.push({
            id: 'background',
            type: 'background',
            paint: {
                'background-color': '#2C3E50'
            }
        });

        // Add each dataset
        for (const dataset of datasets) {
            const sourceId = `${dataset.id}-source`;
            sources[sourceId] = this.createSourceConfig(dataset);
            
            try {
                const style = await this.loadStyle(dataset.id);
                
                // Add layers from style (excluding background)
                const styleLayers = style.layers.filter(layer => layer.id !== 'background');
                styleLayers.forEach(layer => {
                    layers.push({
                        ...layer,
                        id: `${dataset.id}-${layer.id}`,
                        source: sourceId
                    });
                });
                
            } catch (error) {
                console.warn(`Failed to load style for ${dataset.id}, using fallback`);
                
                // Add fallback layer
                layers.push({
                    id: `${dataset.id}-fallback`,
                    source: sourceId,
                    'source-layer': this.guessSourceLayer(dataset),
                    type: 'line',
                    paint: {
                        'line-color': '#95a5a6',
                        'line-width': 2,
                        'line-opacity': 0.8
                    }
                });
            }
        }

        return {
            version: 8,
            name: 'Colorado Infrastructure',
            sources,
            layers
        };
    }

    // Guess source layer name from dataset
    guessSourceLayer(dataset) {
        if (dataset.vector_layers && dataset.vector_layers.length > 0) {
            return dataset.vector_layers[0].id;
        }
        
        // Fallback based on dataset name
        if (dataset.id.includes('road')) return 'roads';
        if (dataset.id.includes('power')) return 'power_lines';
        if (dataset.id.includes('rail')) return 'railways';
        
        return 'default';
    }

    // Health check for tile server
    async checkTileServerHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.warn('Tile server health check failed:', error);
            return false;
        }
    }

    // Health check for API server
    async checkApiServerHealth() {
        try {
            const response = await fetch(`${this.apiUrl.replace('/api', '')}/health`, {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.warn('API server health check failed:', error);
            return false;
        }
    }

    // Get available formats for a dataset
    async getAvailableFormats(datasetId) {
        try {
            const response = await fetch(`${this.apiUrl}/formats/${datasetId}/available`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.warn(`Failed to get formats for ${datasetId}:`, error);
            return {
                formats: ['mbtiles'],
                current: 'mbtiles',
                endpoints: {
                    mbtiles: this.getTileUrl(datasetId)
                }
            };
        }
    }

    // Switch tile format (for future PMTiles support)
    async switchFormat(datasetId, format) {
        try {
            const formats = await this.getAvailableFormats(datasetId);
            
            if (!formats.formats.includes(format)) {
                throw new Error(`Format ${format} not available for ${datasetId}`);
            }
            
            const endpoint = formats.endpoints[format];
            if (!endpoint) {
                throw new Error(`No endpoint available for format ${format}`);
            }
            
            return endpoint;
            
        } catch (error) {
            console.error(`Failed to switch format for ${datasetId}:`, error);
            throw error;
        }
    }

    // Performance monitoring
    startPerformanceMonitoring() {
        if (window.performance && window.performance.mark) {
            const sources = this.sources.keys();
            
            // Monitor tile load times
            for (const sourceId of sources) {
                window.performance.mark(`tile-load-start-${sourceId}`);
            }
        }
    }

    measurePerformance(sourceId, eventType) {
        if (window.performance && window.performance.measure) {
            try {
                const markName = `tile-load-start-${sourceId}`;
                const measureName = `tile-${eventType}-${sourceId}`;
                window.performance.measure(measureName, markName);
                
                const measure = window.performance.getEntriesByName(measureName)[0];
                if (measure) {
                    console.log(`Tile ${eventType} for ${sourceId}: ${measure.duration.toFixed(2)}ms`);
                    return measure.duration;
                }
            } catch (error) {
                console.warn('Performance measurement failed:', error);
            }
        }
        return null;
    }
}