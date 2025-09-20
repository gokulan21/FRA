// NGO Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'ngo') {
        window.location.href = '../login.html';
        return;
    }
    
    // Display user info
    document.getElementById('ngo-name').textContent = user.profile?.name || user.email;
    
    // Initialize dashboard
    initializeNGODashboard();
    setupNavigation();
    loadDashboardData();
});

function initializeNGODashboard() {
    // Setup file upload for reports
    setupFileUpload();
    
    // Setup form handlers
    setupReportForm();
    
    // Setup filters and search
    setupFilters();
    
    // Load initial data
    loadAssignments();
    loadPolicies();
    loadReportAssignments();
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.ngo-content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.style.display = 'none');
            
            // Show selected section
            const sectionId = link.getAttribute('data-section') + '-section';
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
        });
    });
}

async function loadDashboardData() {
    try {
        fraSystem.showLoading();
        
        const dashboardData = await fraSystem.apiRequest('/ngo/dashboard');
        
        // Update statistics
        document.getElementById('total-assignments').textContent = dashboardData.stats.total;
        document.getElementById('active-assignments').textContent = dashboardData.stats.active;
        document.getElementById('completed-assignments').textContent = dashboardData.stats.completed;
        document.getElementById('overdue-assignments').textContent = dashboardData.stats.overdue;
        
        fraSystem.hideLoading();
    } catch (error) {
        fraSystem.hideLoading();
        fraSystem.showNotification('Error loading dashboard data: ' + error.message, 'error');
    }
}

async function loadAssignments(page = 1, filter = '', search = '') {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10'
        });
        
        if (filter) params.append('status', filter);
        if (search) params.append('search', search);
        
        const response = await fraSystem.apiRequest(`/assignment/my-assignments?${params}`);
        
        displayAssignments(response.assignments);
        displayPagination(response.pagination, 'assignments-pagination');
        
    } catch (error) {
        fraSystem.showNotification('Error loading assignments: ' + error.message, 'error');
    }
}

function displayAssignments(assignments) {
    const container = document.getElementById('assignments-list');
    
    if (assignments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-light);">
                <h3>No assignments found</h3>
                <p>You don't have any assignments matching the current filter.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = assignments.map(assignment => `
        <div class="assignment-card ${assignment.status} ${isOverdue(assignment.deadline) && assignment.status === 'active' ? 'overdue' : ''}">
            <div class="assignment-header">
                <h3 class="assignment-title">${assignment.area}</h3>
                <span class="assignment-status status-${assignment.status}">${assignment.status}</span>
            </div>
            
            <div class="assignment-details">
                <div class="assignment-detail">
                    <label>Deadline</label>
                    <span>${fraSystem.formatDate(assignment.deadline)}</span>
                </div>
                <div class="assignment-detail">
                    <label>Priority</label>
                    <span>${assignment.priority.toUpperCase()}</span>
                </div>
                <div class="assignment-detail">
                    <label>Assigned By</label>
                    <span>${assignment.assignedBy.email}</span>
                </div>
                <div class="assignment-detail">
                    <label>Progress</label>
                    <span>${assignment.progress || 0}%</span>
                </div>
            </div>
            
            <div class="assignment-instructions">
                <h4>Instructions:</h4>
                <p>${assignment.instructions}</p>
            </div>
            
            <div class="assignment-actions">
                ${assignment.status === 'active' ? `
                    <button class="btn btn-primary btn-small" onclick="startAssignment('${assignment._id}')">
                        Start Work
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="viewAssignmentDetails('${assignment._id}')">
                        View Details
                    </button>
                ` : ''}
                ${assignment.status === 'completed' && assignment.report ? `
                    <button class="btn btn-secondary btn-small" onclick="viewReport('${assignment._id}')">
                        View Report
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function isOverdue(deadline) {
    return new Date(deadline) < new Date();
}

async function loadPolicies() {
    try {
        const response = await fraSystem.apiRequest('/policy/list');
        displayPolicies(response.policies);
        
        // Load categories for filter
        const categories = await fraSystem.apiRequest('/policy/categories');
        populatePolicyCategories(categories);
        
    } catch (error) {
        fraSystem.showNotification('Error loading policies: ' + error.message, 'error');
    }
}

function displayPolicies(policies) {
    const container = document.getElementById('policies-list');
    
    if (policies.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-light);">
                <h3>No policies found</h3>
                <p>No policy documents are available at the moment.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = policies.map(policy => `
        <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid var(--primary-green);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <div>
                    <h3 style="color: var(--primary-green); margin-bottom: 0.5rem;">${policy.name}</h3>
                    <p style="color: var(--text-light); margin-bottom: 0.5rem;">Category: ${policy.category}</p>
                    <p style="color: var(--text-light); font-size: 0.9rem;">Uploaded: ${fraSystem.formatDate(policy.createdAt)}</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-small" onclick="viewPolicy('${policy._id}')">View</button>
                    <button class="btn btn-primary btn-small" onclick="downloadPolicy('${policy._id}')">Download</button>
                </div>
            </div>
            ${policy.description ? `<p style="margin-bottom: 0;">${policy.description}</p>` : ''}
        </div>
    `).join('');
}

function populatePolicyCategories(categories) {
    const select = document.getElementById('policy-category-filter');
    select.innerHTML = '<option value="">All Categories</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function setupFileUpload() {
    const fileInput = document.getElementById('report-files');
    const uploadArea = document.querySelector('.file-upload-area');
    const fileList = document.getElementById('file-list');
    let selectedFiles = [];
    
    // Drag and drop
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
        
        const files = Array.from(e.dataTransfer.files);
        handleFileSelection(files);
    });
    
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFileSelection(files);
    });
    
    function handleFileSelection(files) {
        selectedFiles = [...selectedFiles, ...files].slice(0, 5); // Max 5 files
        displayFileList();
    }
    
    function displayFileList() {
        fileList.innerHTML = selectedFiles.map((file, index) => `
            <div class="file-item">
                <span>${file.name} (${fraSystem.formatFileSize(file.size)})</span>
                <button type="button" onclick="removeFile(${index})" style="background: none; border: none; color: #dc3545; cursor: pointer;">×</button>
            </div>
        `).join('');
    }
    
    window.removeFile = (index) => {
        selectedFiles.splice(index, 1);
        displayFileList();
    };
    
    window.getSelectedFiles = () => selectedFiles;
}

async function loadReportAssignments() {
    try {
        const response = await fraSystem.apiRequest('/assignment/my-assignments?status=active');
        const select = document.getElementById('report-assignment');
        
        select.innerHTML = '<option value="">Choose an assignment to report on</option>';
        
        response.assignments.forEach(assignment => {
            const option = document.createElement('option');
            option.value = assignment._id;
            option.textContent = `${assignment.area} - Deadline: ${fraSystem.formatDate(assignment.deadline)}`;
            select.appendChild(option);
        });
        
    } catch (error) {
        fraSystem.showNotification('Error loading assignments for report: ' + error.message, 'error');
    }
}

function setupReportForm() {
    const assignmentSelect = document.getElementById('report-assignment');
    const reportForm = document.getElementById('report-form');
    
    assignmentSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            reportForm.style.display = 'block';
        } else {
            reportForm.style.display = 'none';
        }
    });
    
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitReport(e);
    });
}

async function submitReport(e) {
    const submitButton = e.target.querySelector('button[type="submit"]');
    const submitText = document.getElementById('submit-report-text');
    const submitLoading = document.getElementById('submit-report-loading');
    
    try {
        // Show loading
        submitText.style.display = 'none';
        submitLoading.style.display = 'inline-block';
        submitButton.disabled = true;
        
        const assignmentId = document.getElementById('report-assignment').value;
        const formData = new FormData();
        
        // Add text fields
        formData.append('report', document.getElementById('report-summary').value);
        formData.append('findings', JSON.stringify([document.getElementById('key-findings').value]));
        formData.append('recommendations', JSON.stringify([document.getElementById('recommendations').value]));
        formData.append('challenges', JSON.stringify([document.getElementById('challenges-faced').value]));
        
        // Add optional fields
        const villagesVisited = document.getElementById('villages-visited').value;
        if (villagesVisited) {
            formData.append('villagesVisited', villagesVisited);
        }
        
        const beneficiaries = document.getElementById('beneficiaries-reached').value;
        if (beneficiaries) {
            formData.append('beneficiariesReached', beneficiaries);
        }
        
        const additionalNotes = document.getElementById('additional-notes').value;
        if (additionalNotes) {
            formData.append('additionalNotes', additionalNotes);
        }
        
        // Add files
        const selectedFiles = window.getSelectedFiles();
        selectedFiles.forEach(file => {
            formData.append('reportFiles', file);
        });
        
        const response = await fetch(`/api/assignment/${assignmentId}/report`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (response.ok) {
            fraSystem.showNotification('Report submitted successfully!', 'success');
            e.target.reset();
            document.getElementById('file-list').innerHTML = '';
            document.getElementById('report-form').style.display = 'none';
            document.getElementById('report-assignment').value = '';
            
            // Refresh assignments and dashboard
            loadAssignments();
            loadDashboardData();
        } else {
            const error = await response.json();
            throw new Error(error.message);
        }
        
    } catch (error) {
        fraSystem.showNotification('Error submitting report: ' + error.message, 'error');
    } finally {
        // Reset loading state
        submitText.style.display = 'inline';
        submitLoading.style.display = 'none';
        submitButton.disabled = false;
    }
}

function setupFilters() {
    const assignmentFilter = document.getElementById('assignment-filter');
    const assignmentSearch = document.getElementById('assignment-search');
    const policySearch = document.getElementById('policy-search');
    const policyCategoryFilter = document.getElementById('policy-category-filter');
    
    assignmentFilter.addEventListener('change', (e) => {
        loadAssignments(1, e.target.value);
    });
    
    assignmentSearch.addEventListener('input', debounce((e) => {
        loadAssignments(1, assignmentFilter.value, e.target.value);
    }, 500));
    
    policySearch.addEventListener('input', debounce((e) => {
        // Implement policy search
        searchPolicies(e.target.value, policyCategoryFilter.value);
    }, 500));
    
    policyCategoryFilter.addEventListener('change', (e) => {
        searchPolicies(policySearch.value, e.target.value);
    });
}

async function searchPolicies(searchTerm, category) {
    try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (category) params.append('category', category);
        
        const response = await fraSystem.apiRequest(`/policy/list?${params}`);
        displayPolicies(response.policies);
        
    } catch (error) {
        fraSystem.showNotification('Error searching policies: ' + error.message, 'error');
    }
}

function displayPagination(pagination, containerId) {
    const container = document.getElementById(containerId);
    if (!container || pagination.pages <= 1) return;
    
    let html = '<div style="display: flex; justify-content: center; gap: 0.5rem; align-items: center;">';
    
    // Previous button
    if (pagination.current > 1) {
        html += `<button class="btn btn-secondary btn-small" onclick="loadAssignments(${pagination.current - 1})">Previous</button>`;
    }
    
    // Page numbers
    for (let i = Math.max(1, pagination.current - 2); i <= Math.min(pagination.pages, pagination.current + 2); i++) {
        const isActive = i === pagination.current;
        html += `<button class="btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-small" 
                 onclick="loadAssignments(${i})" ${isActive ? 'disabled' : ''}>${i}</button>`;
    }
    
    // Next button
    if (pagination.current < pagination.pages) {
        html += `<button class="btn btn-secondary btn-small" onclick="loadAssignments(${pagination.current + 1})">Next</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global functions for button actions
window.startAssignment = async (assignmentId) => {
    try {
        await fraSystem.apiRequest(`/assignment/${assignmentId}/status`, {
            method: 'PUT',
            body: { status: 'in-progress' }
        });
        
        fraSystem.showNotification('Assignment started successfully!', 'success');
        loadAssignments();
        loadDashboardData();
        
    } catch (error) {
        fraSystem.showNotification('Error starting assignment: ' + error.message, 'error');
    }
};

window.viewAssignmentDetails = async (assignmentId) => {
    try {
        const assignment = await fraSystem.apiRequest(`/assignment/${assignmentId}`);
        
        // Create modal or navigate to details page
        alert(`Assignment Details:\n\nArea: ${assignment.area}\nInstructions: ${assignment.instructions}\nDeadline: ${fraSystem.formatDate(assignment.deadline)}`);
        
    } catch (error) {
        fraSystem.showNotification('Error loading assignment details: ' + error.message, 'error');
    }
};

window.viewReport = async (assignmentId) => {
    try {
        const assignment = await fraSystem.apiRequest(`/assignment/${assignmentId}`);
        
        if (assignment.report) {
            alert(`Report Summary:\n\n${assignment.report.summary}`);
        }
        
    } catch (error) {
        fraSystem.showNotification('Error loading report: ' + error.message, 'error');
    }
};

window.viewPolicy = (policyId) => {
    window.open(`/api/policy/view/${policyId}`, '_blank');
};

window.downloadPolicy = (policyId) => {
    const link = document.createElement('a');
    link.href = `/api/policy/download/${policyId}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../login.html';
}
