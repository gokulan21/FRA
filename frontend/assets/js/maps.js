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

        // Since we don't have access to external mapping libraries in this setup,
        // we'll create a placeholder map interface
        this.createPlaceholderMap(config);
        
        // Load patta data
        await this.loadPattaData();
    }

    createPlaceholderMap(config) {
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
                    </div>
                </div>
                
                <div class="map-display">
                    <div class="map-placeholder">
                        <div class="map-info">
                            <h3>Interactive Map View</h3>
                            <p>This area would display an interactive map showing FRA patta locations.</p>
                            <p>Features would include:</p>
                            <ul>
                                <li>Patta location markers</li>
                                <li>Cluster visualization for dense areas</li>
                                <li>Filter by verification status</li>
                                <li>District-wise data visualization</li>
                                <li>Click-to-view patta details</li>
                            </ul>
                            <div class="integration-note">
                                <strong>Integration Note:</strong> This would integrate with mapping services like:
                                <br>• Google Maps API
                                <br>• OpenStreetMap with Leaflet
                                <br>• Mapbox GL JS
                                <br>• ISRO Bhuvan API (for Indian government projects)
                            </div>
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

        // Add styles
        this.addMapStyles();
        
        // Setup event listeners
        this.setupMapControls();
    }

    addMapStyles() {
        if (document.getElementById('map-styles')) return;

        const style = document.createElement('style');
        style.id = 'map-styles';
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
            
            .map-control-group select,
            .map-control-group button {
                min-width: 120px;
            }
            
            .map-display {
                flex: 1;
                position: relative;
                min-height: 400px;
            }
            
            .map-placeholder {
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                color: var(--text-dark);
            }
            
            .map-info {
                text-align: center;
                max-width: 600px;
                padding: 2rem;
            }
            
            .map-info h3 {
                color: var(--primary-green);
                margin-bottom: 1rem;
            }
            
            .map-info ul {
                text-align: left;
                margin: 1rem 0;
            }
            
            .integration-note {
                background: var(--background-green);
                padding: 1rem;
                border-radius: 8px;
                margin-top: 1.5rem;
                border-left: 4px solid var(--primary-green);
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
            
            @media (max-width: 768px) {
                .map-controls {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .map-control-group {
                    justify-content: space-between;
                }
                
                .legend-items {
                    justify-content: center;
                }
                
                .map-statistics {
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .stat-item {
                    flex-direction: row;
                    justify-content: space-between;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    setupMapControls() {
        const layerSelector = document.getElementById('layer-selector');
        const districtFilter = document.getElementById('district-filter');
        const refreshButton = document.getElementById('refresh-map');

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
    }

    async loadPattaData() {
        try {
            fraSystem.showLoading();
            
            // Load map data
            const mapData = await fraSystem.apiRequest('/patta/map-data');
            this.processMapData(mapData);
            
            // Load districts for filter
            const pattaData = await fraSystem.apiRequest('/patta?limit=1000');
            this.populateDistrictFilter(pattaData.pattas);
            
            fraSystem.hideLoading();
            
        } catch (error) {
            fraSystem.hideLoading();
            fraSystem.showNotification('Error loading map data: ' + error.message, 'error');
        }
    }

    processMapData(mapData) {
        this.markers = mapData;
        this.updateMapStatistics();
        
        // In a real implementation, this would add markers to the actual map
        console.log('Processing map data:', mapData);
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

        // In a real implementation, this would update the map display
        console.log('Filtered markers:', filteredMarkers);
        
        // Update statistics based on filtered data
        this.updateFilteredStatistics(filteredMarkers);
    }

    updateFilteredStatistics(filteredMarkers) {
        const totalElement = document.getElementById('total-markers');
        const verifiedElement = document.getElementById('verified-markers');
        const pendingElement = document.getElementById('pending-markers');

        if (totalElement) totalElement.textContent = filteredMarkers.length;
        if (verifiedElement) verifiedElement.textContent = filteredMarkers.filter(m => m.verified).length;
        if (pendingElement) pendingElement.textContent = filteredMarkers.filter(m => !m.verified).length;
    }

    filterByDistrict(district) {
        let filteredMarkers = this.markers;
        
        if (district) {
            filteredMarkers = this.markers.filter(m => m.district === district);
        }

        // In a real implementation, this would update the map display
        console.log('Filtered by district:', district, filteredMarkers);
        
        this.updateFilteredStatistics(filteredMarkers);
    }

    async refreshMapData() {
        await this.loadPattaData();
        fraSystem.showNotification('Map data refreshed successfully!', 'success');
    }

    // Utility method to create marker popup content
    createMarkerPopup(pattaData) {
        return `
            <div class="marker-popup">
                <h4>${pattaData.name}</h4>
                <p><strong>District:</strong> ${pattaData.district}</p>
                <p><strong>Village:</strong> ${pattaData.village}</p>
                <p><strong>Status:</strong> ${pattaData.verified ? 'Verified' : 'Pending'}</p>
                ${pattaData.approvalDate ? `<p><strong>Approved:</strong> ${fraSystem.formatDate(pattaData.approvalDate)}</p>` : ''}
                <div class="popup-actions">
                    <button onclick="viewPattaDetails('${pattaData.id}')" class="btn btn-primary btn-small">View Details</button>
                </div>
            </div>
        `;
    }

    // Method to integrate with external mapping libraries
    integrateWithMapLibrary(library) {
        switch (library) {
            case 'leaflet':
                return this.setupLeafletMap();
            case 'google':
                return this.setupGoogleMap();
            case 'mapbox':
                return this.setupMapboxMap();
            default:
                console.warn('Map library not supported:', library);
        }
    }

    // Placeholder methods for different map libraries
    setupLeafletMap() {
        // Integration with Leaflet would go here
        console.log('Setting up Leaflet map...');
    }

    setupGoogleMap() {
        // Integration with Google Maps would go here
        console.log('Setting up Google Maps...');
    }

    setupMapboxMap() {
        // Integration with Mapbox would go here
        console.log('Setting up Mapbox map...');
    }
}

// Global map instance
let fraMap = null;

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    fraMap = new FRAMaps();
});

// Global function to view patta details from map popup
window.viewPattaDetails = async (pattaId) => {
    try {
        const patta = await fraSystem.apiRequest(`/patta/${pattaId}`);
        
        // Create modal or navigate to details page
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
