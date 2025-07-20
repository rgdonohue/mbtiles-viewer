// Feature Popup Component
class FeaturePopup {
    constructor(map) {
        this.map = map;
        this.popup = document.getElementById('feature-popup');
        this.currentFeature = null;
        this.hoveredFeatures = new Set();
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupMapInteractions();
    }

    bindEvents() {
        if (!this.popup) return;

        // Close button
        const closeBtn = this.popup.querySelector('.popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.popup && !this.popup.contains(e.target) && !this.popup.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    setupMapInteractions() {
        if (!this.map) return;

        // Wait for map to load
        if (this.map.loaded()) {
            this.addMapListeners();
        } else {
            this.map.on('load', () => {
                this.addMapListeners();
            });
        }
    }

    addMapListeners() {
        // Get all layer IDs that we want to interact with
        const getInteractiveLayers = () => {
            if (!window.app || !window.app.currentLayers) return [];
            
            const layerIds = [];
            window.app.currentLayers.forEach((layerInfo) => {
                layerIds.push(...layerInfo.layerIds);
            });
            return layerIds;
        };

        // Mouse move for hover effects
        this.map.on('mousemove', (e) => {
            const layers = getInteractiveLayers();
            if (layers.length === 0) return;

            const features = this.map.queryRenderedFeatures(e.point, { layers });
            
            if (features.length > 0) {
                this.map.getCanvas().style.cursor = 'pointer';
                this.showHoverTooltip(e, features[0]);
            } else {
                this.map.getCanvas().style.cursor = '';
                this.hideHoverTooltip();
            }
        });

        // Mouse leave to clear hover
        this.map.on('mouseleave', () => {
            this.map.getCanvas().style.cursor = '';
            this.hideHoverTooltip();
        });

        // Click for detailed popup
        this.map.on('click', (e) => {
            const layers = getInteractiveLayers();
            if (layers.length === 0) return;

            const features = this.map.queryRenderedFeatures(e.point, { layers });
            
            if (features.length > 0) {
                this.showFeaturePopup(e, features[0]);
            } else {
                this.hide();
            }
        });
    }

    showHoverTooltip(e, feature) {
        // Simple tooltip - could be enhanced with a separate tooltip element
        const properties = feature.properties;
        const mainProperty = this.getMainProperty(feature, properties);
        
        if (mainProperty) {
            this.map.getCanvas().title = `${mainProperty.label}: ${mainProperty.value}`;
        }
    }

    hideHoverTooltip() {
        this.map.getCanvas().title = '';
    }

    showFeaturePopup(e, feature) {
        if (!this.popup) return;

        this.currentFeature = feature;
        const properties = feature.properties || {};

        // Determine feature title and subtitle
        const { title, subtitle } = this.getFeatureTitle(feature, properties);

        // Update popup content
        const titleElement = this.popup.querySelector('.popup-title');
        const contentElement = this.popup.querySelector('.popup-content');

        if (titleElement) {
            titleElement.textContent = title;
        }

        if (contentElement) {
            contentElement.innerHTML = this.renderFeatureProperties(properties, subtitle);
        }

        // Position popup
        this.positionPopup(e.point);

        // Show popup
        this.popup.classList.remove('hidden');
    }

    getFeatureTitle(feature, properties) {
        const sourceLayer = feature.sourceLayer || feature.layer?.['source-layer'] || '';
        
        // Try to determine a good title based on common property names
        const titleFields = ['name', 'title', 'label', 'highway', 'voltage', 'type', 'owner'];
        const subtitleFields = ['type', 'class', 'subtype', 'highway', 'surface'];

        let title = 'Feature';
        let subtitle = sourceLayer;

        // Find title
        for (const field of titleFields) {
            if (properties[field]) {
                title = String(properties[field]);
                break;
            }
        }

        // Find subtitle
        for (const field of subtitleFields) {
            if (properties[field] && properties[field] !== title) {
                subtitle = String(properties[field]);
                break;
            }
        }

        // If no good title found, use layer name
        if (title === 'Feature') {
            if (sourceLayer.includes('power')) {
                title = 'Power Line';
            } else if (sourceLayer.includes('road')) {
                title = 'Road';
            } else if (sourceLayer.includes('rail')) {
                title = 'Railway';
            } else {
                title = sourceLayer || 'Feature';
            }
        }

        return { title, subtitle };
    }

    getMainProperty(feature, properties) {
        const sourceLayer = feature.sourceLayer || '';
        
        // Define priority properties for different layer types
        const priorityFields = {
            road: ['highway', 'name', 'surface'],
            power: ['voltage', 'line_type', 'owner'],
            rail: ['usage', 'type', 'name']
        };

        let fields = [];
        if (sourceLayer.includes('road')) {
            fields = priorityFields.road;
        } else if (sourceLayer.includes('power')) {
            fields = priorityFields.power;
        } else if (sourceLayer.includes('rail')) {
            fields = priorityFields.rail;
        }

        // Find first available property
        for (const field of fields) {
            if (properties[field]) {
                return {
                    label: this.formatFieldName(field),
                    value: properties[field]
                };
            }
        }

        return null;
    }

    renderFeatureProperties(properties, subtitle) {
        const propertyItems = [];

        // Add subtitle as first item if available
        if (subtitle) {
            propertyItems.push(`
                <div class="property-item">
                    <span class="property-label">Type</span>
                    <span class="property-value">${subtitle}</span>
                </div>
            `);
        }

        // Add other properties
        const excludeFields = ['id', '_id', 'osm_id', 'way_id'];
        
        Object.entries(properties)
            .filter(([key, value]) => 
                value !== null && 
                value !== undefined && 
                value !== '' && 
                !excludeFields.includes(key)
            )
            .slice(0, 8) // Limit to 8 properties to avoid overwhelming
            .forEach(([key, value]) => {
                propertyItems.push(`
                    <div class="property-item">
                        <span class="property-label">${this.formatFieldName(key)}</span>
                        <span class="property-value">${this.formatFieldValue(key, value)}</span>
                    </div>
                `);
            });

        if (propertyItems.length === 0) {
            return '<p class="text-muted text-center">No properties available</p>';
        }

        return `<div class="feature-properties">${propertyItems.join('')}</div>`;
    }

    formatFieldName(fieldName) {
        return fieldName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    formatFieldValue(fieldName, value) {
        // Handle specific field types
        if (fieldName === 'voltage' && typeof value === 'number') {
            return `${value.toLocaleString()} V`;
        }
        
        if (fieldName.includes('length') || fieldName.includes('distance')) {
            if (typeof value === 'number') {
                return value > 1000 ? `${(value/1000).toFixed(1)} km` : `${value.toFixed(0)} m`;
            }
        }
        
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        
        // Truncate long strings
        const str = String(value);
        return str.length > 50 ? str.substring(0, 47) + '...' : str;
    }

    positionPopup(point) {
        if (!this.popup) return;

        const mapContainer = this.map.getContainer();
        const mapRect = mapContainer.getBoundingClientRect();
        
        // Calculate position relative to map container
        const x = point.x;
        const y = point.y;
        
        // Set initial position
        this.popup.style.left = `${x}px`;
        this.popup.style.top = `${y}px`;
        
        // Show popup to calculate dimensions
        this.popup.style.visibility = 'hidden';
        this.popup.classList.remove('hidden');
        
        const popupRect = this.popup.getBoundingClientRect();
        const popupWidth = popupRect.width;
        const popupHeight = popupRect.height;
        
        // Adjust position to keep popup within map bounds
        let adjustedX = x;
        let adjustedY = y;
        
        // Check right boundary
        if (x + popupWidth > mapRect.width - 20) {
            adjustedX = x - popupWidth;
        }
        
        // Check top boundary  
        if (y - popupHeight < 20) {
            adjustedY = y + 20;
            // Remove the arrow pointing up, since popup is now below the point
            this.popup.style.transform = 'translateY(0)';
        } else {
            this.popup.style.transform = 'translateY(-100%)';
        }
        
        // Apply final position
        this.popup.style.left = `${Math.max(10, adjustedX)}px`;
        this.popup.style.top = `${adjustedY}px`;
        this.popup.style.visibility = 'visible';
    }

    hide() {
        if (this.popup) {
            this.popup.classList.add('hidden');
            this.currentFeature = null;
        }
    }

    isVisible() {
        return this.popup && !this.popup.classList.contains('hidden');
    }
}