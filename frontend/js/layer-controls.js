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
                        <div class="legend-symbol railway-main dashed" style="color: #8B0000;"></div>
                        <span>Main Lines</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol railway-branch dashed" style="color: #A52A2A;"></div>
                        <span>Branch Lines</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-symbol railway-service dashed" style="color: #B22222;"></div>
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