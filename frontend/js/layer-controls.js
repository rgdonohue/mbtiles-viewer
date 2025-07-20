// Layer Controls Component
class LayerControls {
    constructor(map, datasets) {
        this.map = map;
        this.datasets = datasets;
        this.container = document.getElementById('layer-controls');
        
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        if (this.datasets.length === 0) {
            this.container.innerHTML = '<div class="loading">No datasets available</div>';
            return;
        }

        this.datasets.forEach(dataset => {
            const layerControl = this.createLayerControl(dataset);
            this.container.appendChild(layerControl);
        });
    }

    createLayerControl(dataset) {
        const control = document.createElement('div');
        control.className = 'layer-control fade-in';
        control.dataset.datasetId = dataset.id;

        control.innerHTML = `
            <div class="layer-header">
                <span class="layer-title">${dataset.name}</span>
                <div class="layer-actions">
                    <button class="info-btn" data-action="toggle-info" title="Dataset Info">i</button>
                </div>
            </div>

            <div class="layer-visibility">
                <label class="toggle-switch">
                    <input type="checkbox" data-action="toggle-visibility" checked>
                    <span class="toggle-slider"></span>
                </label>
                <label for="visibility">Layer Visible</label>
            </div>

            <div class="opacity-control">
                <div class="opacity-label">
                    <span>Opacity</span>
                    <span class="opacity-value">100%</span>
                </div>
                <input type="range" class="opacity-slider" 
                       data-action="change-opacity"
                       min="0" max="100" value="100" step="5">
            </div>

            <div class="style-control">
                <label for="style-select-${dataset.id}" class="text-small text-muted mb-1">Style Template</label>
                <select id="style-select-${dataset.id}" class="style-select" data-action="change-style">
                    <option value="default">Default Style</option>
                    ${this.createStyleOptions(dataset)}
                </select>
            </div>

            <div class="layer-legend">
                ${this.createLegend(dataset)}
            </div>

            <div class="dataset-info hidden">
                <h4>Dataset Information</h4>
                <dl>
                    <dt>Format:</dt>
                    <dd>${dataset.format.toUpperCase()}</dd>
                    <dt>Type:</dt>
                    <dd>${dataset.type}</dd>
                    <dt>Zoom Range:</dt>
                    <dd>${dataset.minzoom} - ${dataset.maxzoom}</dd>
                    <dt>Bounds:</dt>
                    <dd>${dataset.bounds.map(b => b.toFixed(2)).join(', ')}</dd>
                    ${dataset.vector_layers && dataset.vector_layers.length > 0 ? `
                        <dt>Layers:</dt>
                        <dd>${dataset.vector_layers.map(l => l.id || 'Unknown').join(', ')}</dd>
                    ` : ''}
                </dl>
            </div>
        `;

        return control;
    }

    createStyleOptions(dataset) {
        if (!dataset.styling_options || !dataset.styling_options.available_templates) {
            return '';
        }

        return dataset.styling_options.available_templates
            .map(template => `<option value="${template}">${this.formatTemplateName(template)}</option>`)
            .join('');
    }

    formatTemplateName(template) {
        return template
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    createLegend(dataset) {
        const legends = {
            'co_power_lines': `
                <div class="legend-title">Power Lines by Voltage</div>
                <div class="legend-items">
                    <div class="legend-item">
                        <div class="legend-symbol" style="background-color: #FFD700; height: 4px;"></div>
                        <span>345kV+ (Extra High Voltage)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol" style="background-color: #FFD700; height: 3px;"></div>
                        <span>230kV+ (High Voltage)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol" style="background-color: #FFD700; height: 2px;"></div>
                        <span>138kV+ (Sub-transmission)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol" style="background-color: #FFD700; height: 2px;"></div>
                        <span>69kV+ (Distribution)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol" style="background-color: #FFD700; height: 1px;"></div>
                        <span>&lt;69kV (Local Distribution)</span>
                    </div>
                </div>
            `,
            'co_railways': `
                <div class="legend-title">Railway Lines</div>
                <div class="legend-items">
                    <div class="legend-item">
                        <div class="legend-symbol railway-main dashed" style="color: #9E9E9E;"></div>
                        <span>Main Lines</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol railway-branch dashed" style="color: #757575;"></div>
                        <span>Branch Lines</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol railway-service dashed" style="color: #616161;"></div>
                        <span>Service/Yard</span>
                    </div>
                </div>
            `,
            'co_roads': `
                <div class="legend-title">Road Classification</div>
                <div class="legend-items">
                    <div class="legend-item">
                        <div class="legend-symbol road-motorway"></div>
                        <span>Interstate/Motorway</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol road-trunk"></div>
                        <span>US Highways/Trunk</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol road-primary"></div>
                        <span>Primary Roads</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol road-secondary"></div>
                        <span>Secondary Roads</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol road-tertiary"></div>
                        <span>Tertiary Roads</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol road-residential"></div>
                        <span>Residential Streets</span>
                    </div>
                </div>
            `
        };

        return legends[dataset.id] || `
            <div class="legend-title">Legend</div>
            <div class="legend-items">
                <div class="legend-item">
                    <div class="legend-symbol" style="background-color: #95A5A6;"></div>
                    <span>Features</span>
                </div>
            </div>
        `;
    }

    bindEvents() {
        if (!this.container) return;

        this.container.addEventListener('change', (e) => {
            const action = e.target.dataset.action;
            const control = e.target.closest('.layer-control');
            const datasetId = control?.dataset.datasetId;

            if (!datasetId) return;

            switch (action) {
                case 'toggle-visibility':
                    this.handleVisibilityChange(datasetId, e.target.checked);
                    break;
                case 'change-opacity':
                    this.handleOpacityChange(datasetId, e.target.value);
                    break;
                case 'change-style':
                    this.handleStyleChange(datasetId, e.target.value);
                    break;
            }
        });

        this.container.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const control = e.target.closest('.layer-control');
            const datasetId = control?.dataset.datasetId;

            switch (action) {
                case 'toggle-info':
                    this.handleInfoToggle(control);
                    break;
            }
        });
    }

    handleVisibilityChange(datasetId, visible) {
        console.log(`Toggle visibility for ${datasetId}: ${visible}`);
        
        if (window.app) {
            window.app.toggleLayerVisibility(datasetId, visible);
        }
    }

    handleOpacityChange(datasetId, opacity) {
        const opacityValue = parseInt(opacity) / 100;
        console.log(`Change opacity for ${datasetId}: ${opacityValue}`);
        
        // Update opacity display
        const control = this.container.querySelector(`[data-dataset-id="${datasetId}"]`);
        if (control) {
            const opacityDisplay = control.querySelector('.opacity-value');
            if (opacityDisplay) {
                opacityDisplay.textContent = `${opacity}%`;
            }
        }

        if (window.app) {
            window.app.setLayerOpacity(datasetId, opacityValue);
        }
    }

    async handleStyleChange(datasetId, template) {
        console.log(`Change style for ${datasetId}: ${template}`);
        
        try {
            // Show loading state
            const control = this.container.querySelector(`[data-dataset-id="${datasetId}"]`);
            if (control) {
                control.style.opacity = '0.7';
            }

            // Build API URL with template parameter
            let styleUrl = `http://localhost:8000/api/styles/${datasetId}`;
            if (template !== 'default') {
                styleUrl += `?template=${template}`;
            }

            // Fetch new style
            const response = await fetch(styleUrl);
            if (!response.ok) {
                throw new Error(`Failed to load style: ${response.status}`);
            }
            const style = await response.json();

            // Update map layers with new style
            this.updateLayerStyle(datasetId, style);

            // Restore control opacity
            if (control) {
                control.style.opacity = '1';
            }

        } catch (error) {
            console.error(`Failed to change style for ${datasetId}:`, error);
            
            // Reset select to previous value on error
            const control = this.container.querySelector(`[data-dataset-id="${datasetId}"]`);
            if (control) {
                const select = control.querySelector('.style-select');
                if (select) {
                    select.value = 'default';
                }
                control.style.opacity = '1';
            }
        }
    }

    updateLayerStyle(datasetId, style) {
        if (!window.app || !window.app.currentLayers.has(datasetId)) {
            return;
        }

        const layerInfo = window.app.currentLayers.get(datasetId);
        const styleLayers = style.layers.filter(layer => layer.id !== 'background');

        // Update paint properties for existing layers
        layerInfo.layerIds.forEach((layerId, index) => {
            if (index < styleLayers.length) {
                const styleLayer = styleLayers[index];
                
                // Update paint properties
                if (styleLayer.paint) {
                    Object.entries(styleLayer.paint).forEach(([property, value]) => {
                        this.map.setPaintProperty(layerId, property, value);
                    });
                }

                // Update layout properties
                if (styleLayer.layout) {
                    Object.entries(styleLayer.layout).forEach(([property, value]) => {
                        this.map.setLayoutProperty(layerId, property, value);
                    });
                }
            }
        });
    }

    handleInfoToggle(control) {
        const infoPanel = control.querySelector('.dataset-info');
        if (infoPanel) {
            infoPanel.classList.toggle('hidden');
        }
    }

    // Public method to update layer state
    updateLayerState(datasetId, state) {
        const control = this.container.querySelector(`[data-dataset-id="${datasetId}"]`);
        if (!control) return;

        // Update visibility checkbox
        const visibilityCheckbox = control.querySelector('[data-action="toggle-visibility"]');
        if (visibilityCheckbox) {
            visibilityCheckbox.checked = state.visible;
        }

        // Update opacity slider
        const opacitySlider = control.querySelector('[data-action="change-opacity"]');
        const opacityDisplay = control.querySelector('.opacity-value');
        if (opacitySlider && opacityDisplay) {
            const opacityPercent = Math.round(state.opacity * 100);
            opacitySlider.value = opacityPercent;
            opacityDisplay.textContent = `${opacityPercent}%`;
        }
    }
}