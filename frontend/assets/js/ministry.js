// Ministry Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'ministry') {
        window.location.href = '../login.html';
        return;
    }
    
    // Display user email
    document.getElementById('user-email').textContent = user.email;
    
    // Load dashboard statistics
    loadDashboardStats();
    
    // Setup sidebar navigation
    setupSidebarNavigation();
    
    // Setup file upload handlers
    setupFileUploads();
    
    // Load NGO data
    loadNGOData();
});

function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            menuItems.forEach(mi => mi.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.style.display = 'none');
            
            // Show selected section
            const sectionId = item.getAttribute('data-section') + '-section';
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
            
            // Update page title
            const titles = {
                'home': 'Dashboard Overview',
                'upload-patta': 'Upload FRA Pattas',
                'maps': 'Interactive Maps',
                'policy-management': 'Policy Management',
                'ngo-assignment': 'NGO Assignments',
                'settings': 'System Settings'
            };
            
            const sectionKey = item.getAttribute('data-section');
            document.getElementById('page-title').textContent = titles[sectionKey] || 'Dashboard';
        });
    });
}

async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        
        // Load patta statistics
        const pattaResponse = await fetch('/api/patta/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (pattaResponse.ok) {
            const pattaStats = await pattaResponse.json();
            document.getElementById('total-pattas').textContent = pattaStats.total || 0;
            document.getElementById('verified-pattas').textContent = pattaStats.verified || 0;
        }
        
        // Load NGO statistics
        const ngoResponse = await fetch('/api/ngo/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (ngoResponse.ok) {
            const ngoStats = await ngoResponse.json();
            document.getElementById('active-ngos').textContent = ngoStats.active || 0;
            document.getElementById('pending-assignments').textContent = ngoStats.pendingAssignments || 0;
        }
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function setupFileUploads() {
    // Patta file upload
    const pattaFileInput = document.getElementById('patta-file');
    const uploadArea = document.querySelector('.upload-area');
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handlePattaUpload(files);
        }
    });
    
    pattaFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePattaUpload(e.target.files);
        }
    });
    
    // Policy file upload
    const policyFileInput = document.getElementById('policy-file');
    policyFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handlePolicyUpload(e.target.files[0]);
        }
    });
}

async function handlePattaUpload(files) {
    const token = localStorage.getItem('token');
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    const extractedDataContainer = document.getElementById('extracted-data');
    const extractionResults = document.getElementById('extraction-results');
    
    progressContainer.style.display = 'block';
    extractedDataContainer.style.display = 'none';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('pattaFile', file);
        
        try {
            uploadStatus.textContent = `Uploading ${file.name}...`;
            progressBar.style.width = '50%';
            
            const response = await fetch('/api/patta/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                progressBar.style.width = '100%';
                uploadStatus.textContent = `Successfully processed ${file.name}`;
                
                // Display extracted data
                displayExtractedData(result.extractedData, extractionResults);
                extractedDataContainer.style.display = 'block';
                
                // Refresh stats
                loadDashboardStats();
            } else {
                const error = await response.json();
                uploadStatus.textContent = `Error uploading ${file.name}: ${error.message}`;
                progressBar.style.width = '0%';
                progressBar.style.backgroundColor = '#dc3545';
            }
        } catch (error) {
            uploadStatus.textContent = `Network error uploading ${file.name}`;
            progressBar.style.width = '0%';
            progressBar.style.backgroundColor = '#dc3545';
        }
        
        // Wait a moment before processing next file
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

function displayExtractedData(data, container) {
    const fields = [
        { key: 'claimantName', label: 'Claimant Name' },
        { key: 'district', label: 'District' },
        { key: 'village', label: 'Village' },
        { key: 'state', label: 'State' },
        { key: 'landArea', label: 'Land Area' },
        { key: 'approvalDate', label: 'Approval Date' }
    ];
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">';
    
    fields.forEach(field => {
        const value = data[field.key] || 'Not extracted';
        html += `
            <div style="background: var(--light-gray); padding: 1rem; border-radius: 8px;">
                <strong style="color: var(--primary-green);">${field.label}:</strong><br>
                <span>${value}</span>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function loadNGOData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/ngo/list', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const ngos = await response.json();
            displayNGOList(ngos);
            populateNGOSelect(ngos);
        }
    } catch (error) {
        console.error('Error loading NGO data:', error);
    }
}

function displayNGOList(ngos) {
    const ngoListContainer = document.getElementById('ngo-list');
    
    if (ngos.length === 0) {
        ngoListContainer.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 2rem;">No NGOs registered yet</div>';
        return;
    }
    
    let html = '';
    ngos.forEach(ngo => {
        const statusColor = ngo.isApproved ? 'var(--primary-green)' : '#ffc107';
        const statusText = ngo.isApproved ? 'Approved' : 'Pending';
        
        html += `
            <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid ${statusColor};">
                <h4 style="color: var(--primary-green); margin-bottom: 0.5rem;">${ngo.profile.name || ngo.email}</h4>
                <p style="margin-bottom: 0.5rem;"><strong>Email:</strong> ${ngo.email}</p>
                <p style="margin-bottom: 0.5rem;"><strong>District:</strong> ${ngo.profile.district || 'Not specified'}</p>
                <p style="margin-bottom: 0.5rem;"><strong>Area:</strong> ${ngo.profile.areaOfOperation || 'Not specified'}</p>
                <p style="margin-bottom: 1rem;"><strong>Status:</strong> <span style="color: ${statusColor};">${statusText}</span></p>
                ${!ngo.isApproved ? '<button class="btn btn-primary" onclick="approveNGO(\'' + ngo._id + '\')">Approve</button>' : ''}
            </div>
        `;
    });
    
    ngoListContainer.innerHTML = html;
}

function populateNGOSelect(ngos) {
    const ngoSelect = document.getElementById('ngo-select');
    ngoSelect.innerHTML = '<option value="">Choose NGO</option>';
    
    ngos.filter(ngo => ngo.isApproved).forEach(ngo => {
        const option = document.createElement('option');
        option.value = ngo._id;
        option.textContent = `${ngo.profile.name || ngo.email} - ${ngo.profile.district || 'No district'}`;
        ngoSelect.appendChild(option);
    });
}

async function approveNGO(ngoId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/ngo/approve/${ngoId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            alert('NGO approved successfully!');
            loadNGOData(); // Refresh the list
        } else {
            const error = await response.json();
            alert('Error approving NGO: ' + error.message);
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// Assignment form handler
document.getElementById('assignment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const formData = new FormData(e.target);
    
    const assignmentData = {
        ngoId: formData.get('ngo-select') || document.getElementById('ngo-select').value,
        area: formData.get('assignment-area') || document.getElementById('assignment-area').value,
        instructions: formData.get('assignment-instructions') || document.getElementById('assignment-instructions').value,
        deadline: formData.get('assignment-deadline') || document.getElementById('assignment-deadline').value
    };
    
    try {
        const response = await fetch('/api/assignment/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assignmentData)
        });
        
        if (response.ok) {
            alert('Assignment created successfully!');
            e.target.reset();
            loadDashboardStats(); // Refresh stats
        } else {
            const error = await response.json();
            alert('Error creating assignment: ' + error.message);
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
});

// Settings form handler
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    alert('Settings saved successfully!');
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../login.html';
}

async function handlePolicyUpload(file) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('policyFile', file);
    
    try {
        const response = await fetch('/api/policy/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            alert('Policy uploaded successfully!');
            loadPolicies(); // Refresh policy list
        } else {
            const error = await response.json();
            alert('Error uploading policy: ' + error.message);
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

async function loadPolicies() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/policy/list', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const policies = await response.json();
            displayPolicies(policies);
        }
    } catch (error) {
        console.error('Error loading policies:', error);
    }
}

function displayPolicies(policies) {
    const tableBody = document.getElementById('policy-table-body');
    
    if (policies.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light);">No policies uploaded yet</td></tr>';
        return;
    }
    
    let html = '';
    policies.forEach(policy => {
        html += `
            <tr>
                <td>${policy.name}</td>
                <td>${policy.category || 'General'}</td>
                <td>${new Date(policy.createdAt).toLocaleDateString()}</td>
                <td><span style="color: var(--primary-green);">Active</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="viewPolicy('${policy._id}')">View</button>
                    <button class="btn btn-primary" onclick="downloadPolicy('${policy._id}')">Download</button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function viewPolicy(policyId) {
    window.open(`/api/policy/view/${policyId}`, '_blank');
}

function downloadPolicy(policyId) {
    const token = localStorage.getItem('token');
    const link = document.createElement('a');
    link.href = `/api/policy/download/${policyId}`;
    link.setAttribute('Authorization', `Bearer ${token}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}