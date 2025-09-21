// Maps functionality for FRA Patta Management System
class FRAMaps {
    constructor() {
        this.map = null;
        this.markers = [];
        this.currentLayer = 'all';
        this.mapContainer = null;
    }

    // Initialize map
    async initMap(containerId, options = {}) {
        this.mapContainer = document.getElementById(containerId);
        
        if (!this.mapContainer) {
            console.error('Map container not found');
            return;
        }

        // Default options
        const defaultOptions = {
            center: [20.5937, 78.9629], // Center of India
            zoom: 5,
            enableSearch: true,
            enableLayers: true,
            enableClustering: true
        };

        const config = { ...defaultOptions, ...options };

        // Create functional map interface
        this.createInteractiveMap(config);
        
        // Load patta data
        await this.loadPattaData();
    }

    createInteractiveMap(config) {
        this.mapContainer.innerHTML = `
            <div class="map-interface">
                <div class="map-controls">
                    <div class="map-control-group">
                        <label>Layer:</label>
                        <select id="layer-selector" class="form-control">
                            <option value="all">All Pattas</option>
                            <option value="verified">Verified Only</option>
                            <option value="pending">Pending Verification</option>
                            <option value="recent">Recent Uploads</option>
                        </select>
                    </div>
                    <div class="map-control-group">
                        <label>District:</label>
                        <select id="district-filter" class="form-control">
                            <option value="">All Districts</option>
                        </select>
                    </div>
                    <div class="map-control-group">
                        <button id="refresh-map" class="btn btn-secondary">Refresh Data</button>
                        <button id="add-to-map" class="btn btn-primary">Add to Map</button>
                    </div>
                </div>
                
                <div class="map-display">
                    <div class="map-canvas" id="map-canvas">
                        <!-- Interactive map markers will be displayed here -->
                        <div class="map-markers-container" id="map-markers"></div>
                        <div class="map-overlay">
                            <h3>Interactive Patta Location Map</h3>
                            <p>Showing patta locations across districts</p>
                        </div>
                    </div>
                </div>

                <div class="map-legend">
                    <h4>Legend</h4>
                    <div class="legend-items">
                        <div class="legend-item">
                            <span class="legend-marker verified"></span>
                            <span>Verified Pattas</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-marker pending"></span>
                            <span>Pending Verification</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-marker recent"></span>
                            <span>Recently Added</span>
                        </div>
                    </div>
                </div>

                <div class="map-statistics">
                    <div class="stat-item">
                        <span class="stat-value" id="total-markers">0</span>
                        <span class="stat-label">Total Pattas</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="verified-markers">0</span>
                        <span class="stat-label">Verified</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="pending-markers">0</span>
                        <span class="stat-label">Pending</span>
                    </div>
                </div>
            </div>
        `;

        // Add enhanced styles
        this.addEnhancedMapStyles();
        
        // Setup event listeners
        this.setupMapControls();
    }

    addEnhancedMapStyles() {
        if (document.getElementById('enhanced-map-styles')) return;

        const style = document.createElement('style');
        style.id = 'enhanced-map-styles';
        style.textContent = `
            .map-interface {
                height: 100%;
                display: flex;
                flex-direction: column;
                border: 2px solid var(--accent-green);
                border-radius: 12px;
                overflow: hidden;
                background: var(--white);
            }
            
            .map-controls {
                background: var(--light-gray);
                padding: 1rem;
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
                align-items: center;
                border-bottom: 1px solid var(--border-color);
            }
            
            .map-control-group {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .map-control-group label {
                font-weight: 600;
                color: var(--primary-green);
                white-space: nowrap;
            }
            
            .map-display {
                flex: 1;
                position: relative;
                min-height: 400px;
                background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
            }
            
            .map-canvas {
                height: 100%;
                position: relative;
                overflow: hidden;
            }
            
            .map-markers-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2;
            }
            
            .map-marker {
                position: absolute;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid var(--white);
                cursor: pointer;
                transition: transform 0.2s ease;
                z-index: 3;
            }
            
            .map-marker:hover {
                transform: scale(1.5);
                z-index: 4;
            }
            
            .map-marker.verified {
                background: var(--primary-green);
            }
            
            .map-marker.pending {
                background: #ffc107;
            }
            
            .map-marker.recent {
                background: #17a2b8;
            }
            
            .map-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: var(--primary-green);
                z-index: 1;
            }
            
            .marker-popup {
                position: absolute;
                background: var(--white);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                z-index: 5;
                min-width: 200px;
                display: none;
            }
            
            .marker-popup.show {
                display: block;
            }
            
            .marker-popup h4 {
                color: var(--primary-green);
                margin-bottom: 0.5rem;
            }
            
            .marker-popup .popup-actions {
                margin-top: 1rem;
                display: flex;
                gap: 0.5rem;
            }
            
            .map-legend {
                background: var(--white);
                padding: 1rem;
                border-top: 1px solid var(--border-color);
            }
            
            .map-legend h4 {
                color: var(--primary-green);
                margin-bottom: 0.5rem;
                font-size: 1rem;
            }
            
            .legend-items {
                display: flex;
                gap: 1.5rem;
                flex-wrap: wrap;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .legend-marker {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 2px solid var(--white);
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            .legend-marker.verified {
                background: var(--primary-green);
            }
            
            .legend-marker.pending {
                background: #ffc107;
            }
            
            .legend-marker.recent {
                background: #17a2b8;
            }
            
            .map-statistics {
                background: var(--primary-green);
                color: var(--white);
                padding: 1rem;
                display: flex;
                justify-content: space-around;
                text-align: center;
            }
            
            .stat-item {
                display: flex;
                flex-direction: column;
            }
            
            .stat-value {
                font-size: 1.5rem;
                font-weight: bold;
            }
            
            .stat-label {
                font-size: 0.9rem;
                opacity: 0.9;
            }
        `;
        
        document.head.appendChild(style);
    }

    setupMapControls() {
        const layerSelector = document.getElementById('layer-selector');
        const districtFilter = document.getElementById('district-filter');
        const refreshButton = document.getElementById('refresh-map');
        const addToMapButton = document.getElementById('add-to-map');

        if (layerSelector) {
            layerSelector.addEventListener('change', (e) => {
                this.currentLayer = e.target.value;
                this.filterMarkers();
            });
        }

        if (districtFilter) {
            districtFilter.addEventListener('change', (e) => {
                this.filterByDistrict(e.target.value);
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshMapData();
            });
        }

        if (addToMapButton) {
            addToMapButton.addEventListener('click', () => {
                this.showAddToMapDialog();
            });
        }
    }

    async loadPattaData() {
        try {
            // Load map data
            const mapData = await fraSystem.apiRequest('/patta/map-data');
            this.processMapData(mapData);
            
            // Load districts for filter
            const pattaData = await fraSystem.apiRequest('/patta?limit=1000');
            this.populateDistrictFilter(pattaData.pattas);
            
        } catch (error) {
            console.error('Error loading map data:', error);
            fraSystem.showNotification('Error loading map data: ' + error.message, 'error');
        }
    }

    processMapData(mapData) {
        this.markers = mapData;
        this.updateMapStatistics();
        this.renderMarkers();
        
        console.log('Processing map data:', mapData);
    }

    renderMarkers() {
        const markersContainer = document.getElementById('map-markers');
        if (!markersContainer) return;

        markersContainer.innerHTML = '';
        
        this.markers.forEach((marker, index) => {
            const markerElement = document.createElement('div');
            markerElement.className = `map-marker ${marker.verified ? 'verified' : 'pending'}`;
            
            // Position marker (simulate coordinates)
            const x = (index % 10) * 10 + Math.random() * 80; // Random positioning for demo
            const y = Math.floor(index / 10) * 15 + Math.random() * 70;
            
            markerElement.style.left = `${x}%`;
            markerElement.style.top = `${y}%`;
            
            markerElement.addEventListener('click', () => {
                this.showMarkerPopup(marker, markerElement);
            });
            
            markersContainer.appendChild(markerElement);
        });
    }

    showMarkerPopup(marker, markerElement) {
        // Remove existing popups
        document.querySelectorAll('.marker-popup').forEach(p => p.remove());
        
        const popup = document.createElement('div');
        popup.className = 'marker-popup show';
        popup.innerHTML = `
            <h4>${marker.name || marker.claimantName}</h4>
            <p><strong>District:</strong> ${marker.district}</p>
            <p><strong>Village:</strong> ${marker.village}</p>
            <p><strong>Status:</strong> ${marker.verified ? 'Verified' : 'Pending'}</p>
            ${marker.approvalDate ? `<p><strong>Approved:</strong> ${fraSystem.formatDate(marker.approvalDate)}</p>` : ''}
            <div class="popup-actions">
                <button onclick="viewPattaDetails('${marker.id}')" class="btn btn-primary btn-small">View Details</button>
            </div>
        `;
        
        // Position popup
        const rect = markerElement.getBoundingClientRect();
        const containerRect = this.mapContainer.getBoundingClientRect();
        
        popup.style.position = 'absolute';
        popup.style.left = `${rect.left - containerRect.left + 20}px`;
        popup.style.top = `${rect.top - containerRect.top - 10}px`;
        
        this.mapContainer.appendChild(popup);
        
        // Close popup when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', function closePopup(e) {
                if (!popup.contains(e.target) && e.target !== markerElement) {
                    popup.remove();
                    document.removeEventListener('click', closePopup);
                }
            });
        }, 100);
    }

    showAddToMapDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.style.display = 'flex';
        dialog.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Patta to Map</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="add-to-map-form">
                        <div class="form-group">
                            <label>Claimant Name *</label>
                            <input type="text" name="claimantName" class="form-control" required>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>District *</label>
                                <input type="text" name="district" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label>Village *</label>
                                <input type="text" name="village" class="form-control" required>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>State</label>
                                <input type="text" name="state" class="form-control">
                            </div>
                            <div class="form-group">
                                <label>Land Area (hectares)</label>
                                <input type="number" name="landArea" class="form-control" step="0.01">
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <label>Latitude</label>
                                <input type="number" name="latitude" class="form-control" step="any">
                            </div>
                            <div class="form-group">
                                <label>Longitude</label>
                                <input type="number" name="longitude" class="form-control" step="any">
                            </div>
                        </div>
                        <div class="form-group">
                            <button type="button" class="btn btn-secondary" onclick="getCurrentLocation()">
                                Get Current Location
                            </button>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="addPattaToMap()">Add to Map</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    populateDistrictFilter(pattas) {
        const districtFilter = document.getElementById('district-filter');
        if (!districtFilter) return;

        const districts = [...new Set(pattas.map(p => p.district))].sort();
        
        districtFilter.innerHTML = '<option value="">All Districts</option>';
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtFilter.appendChild(option);
        });
    }

    updateMapStatistics() {
        const totalElement = document.getElementById('total-markers');
        const verifiedElement = document.getElementById('verified-markers');
        const pendingElement = document.getElementById('pending-markers');

        if (totalElement) totalElement.textContent = this.markers.length;
        if (verifiedElement) verifiedElement.textContent = this.markers.filter(m => m.verified).length;
        if (pendingElement) pendingElement.textContent = this.markers.filter(m => !m.verified).length;
    }

    filterMarkers() {
        let filteredMarkers = this.markers;

        switch (this.currentLayer) {
            case 'verified':
                filteredMarkers = this.markers.filter(m => m.verified);
                break;
            case 'pending':
                filteredMarkers = this.markers.filter(m => !m.verified);
                break;
            case 'recent':
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filteredMarkers = this.markers.filter(m => new Date(m.approvalDate) > thirtyDaysAgo);
                break;
        }

        console.log('Filtered markers:', filteredMarkers);
        this.updateFilteredStatistics(filteredMarkers);
        this.renderFilteredMarkers(filteredMarkers);
    }

    renderFilteredMarkers(filteredMarkers) {
        const markersContainer = document.getElementById('map-markers');
        if (!markersContainer) return;

        markersContainer.innerHTML = '';
        
        filteredMarkers.forEach((marker, index) => {
            const markerElement = document.createElement('div');
            markerElement.className = `map-marker ${marker.verified ? 'verified' : 'pending'}`;
            
            const x = (index % 10) * 10 + Math.random() * 80;
            const y = Math.floor(index / 10) * 15 + Math.random() * 70;
            
            markerElement.style.left = `${x}%`;
            markerElement.style.top = `${y}%`;
            
            markerElement.addEventListener('click', () => {
                this.showMarkerPopup(marker, markerElement);
            });
            
            markersContainer.appendChild(markerElement);
        });
    }

    updateFilteredStatistics(filteredMarkers) {
        const totalElement = document.getElementById('total-markers');
        const verifiedElement = document.getElementById('verified-markers');
        const pendingElement = document.getElementById('pending-markers');

        if (totalElement) totalElement.textContent = filteredMarkers.length;
        if (verifiedElement) verifiedElement.textContent = filteredMarkers.filter(m => m.verified).length;
        if (pendingElement) pendingElement.textContent = filteredMarkers.filter(m => !m.verified).length;
    }

    async refreshMapData() {
        await this.loadPattaData();
        fraSystem.showNotification('Map data refreshed successfully!', 'success');
    }
}

// Global map instance
let fraMap = null;

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    fraMap = new FRAMaps();
});

// Global functions
window.getCurrentLocation = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.querySelector('input[name="latitude"]').value = position.coords.latitude.toFixed(6);
                document.querySelector('input[name="longitude"]').value = position.coords.longitude.toFixed(6);
                fraSystem.showNotification('Location captured successfully!', 'success');
            },
            (error) => {
                fraSystem.showNotification('Unable to get location: ' + error.message, 'error');
            }
        );
    } else {
        fraSystem.showNotification('Geolocation is not supported by this browser', 'error');
    }
};

window.addPattaToMap = async function() {
    const form = document.getElementById('add-to-map-form');
    const formData = new FormData(form);
    
    const pattaData = {
        claimantName: formData.get('claimantName'),
        district: formData.get('district'),
        village: formData.get('village'),
        state: formData.get('state'),
        landArea: formData.get('landArea'),
        coordinates: {
            latitude: parseFloat(formData.get('latitude')),
            longitude: parseFloat(formData.get('longitude'))
        }
    };
    
    try {
        const response = await fraSystem.apiRequest('/patta/manual-add', {
            method: 'POST',
            body: pattaData
        });
        
        fraSystem.showNotification('Patta added to map successfully!', 'success');
        form.closest('.modal').remove();
        fraMap.refreshMapData();
        
    } catch (error) {
        fraSystem.showNotification('Error adding patta to map: ' + error.message, 'error');
    }
};

window.viewPattaDetails = async function(pattaId) {
    try {
        const patta = await fraSystem.apiRequest(`/patta/${pattaId}`);
        
        const details = `
            Patta Details:
            
            Claimant: ${patta.claimantName}
            District: ${patta.district}
            Village: ${patta.village}
            State: ${patta.state}
            Land Area: ${patta.landArea || 'Not specified'}
            Status: ${patta.isVerified ? 'Verified' : 'Pending Verification'}
            Upload Date: ${fraSystem.formatDate(patta.createdAt)}
        `;
        
        alert(details);
        
    } catch (error) {
        fraSystem.showNotification('Error loading patta details: ' + error.message, 'error');
    }
};
