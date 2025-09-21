// NGO Sidebar Dashboard JavaScript
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
    document.getElementById('ngo-organization').textContent = user.profile?.organization || 'FRA Field Operations';
    
    // Initialize dashboard
    initializeNGODashboard();
    setupNavigation();
    loadDashboardData();
});

function initializeNGODashboard() {
    // Setup form handlers
    setupReportForm();
    setupProfileForm();
    
    // Setup filters and search
    setupFilters();
    
    // Load initial data
    loadAssignments();
    loadPolicies();
    loadReportAssignments();
    loadUserProfile();
}

function setupNavigation() {
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
                'overview': 'Dashboard Overview',
                'assignments': 'My Assignments',
                'reports': 'Submit Reports',
                'policies': 'Policy Documents',
                'profile': 'Profile Settings'
            };
            
            const sectionKey = item.getAttribute('data-section');
            document.getElementById('page-title').textContent = titles[sectionKey] || 'Dashboard';
        });
    });
}

async function loadDashboardData() {
    try {
        const dashboardData = await fraSystem.apiRequest('/ngo/dashboard');
        
        // Update statistics
        document.getElementById('total-assignments').textContent = dashboardData.stats.total;
        document.getElementById('active-assignments').textContent = dashboardData.stats.active;
        document.getElementById('completed-assignments').textContent = dashboardData.stats.completed;
        document.getElementById('overdue-assignments').textContent = dashboardData.stats.overdue;
        
    } catch (error) {
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
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <h3 style="color: var(--primary-green); margin: 0;">${assignment.title || assignment.area.district}</h3>
                <span style="background: ${getStatusColor(assignment.status)}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem;">
                    ${assignment.status.toUpperCase()}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <strong>Area:</strong> ${assignment.area.district}
                </div>
                <div>
                    <strong>Deadline:</strong> ${fraSystem.formatDate(assignment.deadline)}
                </div>
                <div>
                    <strong>Progress:</strong> ${assignment.progress || 0}%
                </div>
                <div>
                    <strong>Priority:</strong> ${assignment.priority.toUpperCase()}
                </div>
            </div>
            
            <div style="background: var(--white); padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <strong>Instructions:</strong>
                <p style="margin: 0.5rem 0 0 0;">${assignment.instructions}</p>
            </div>
            
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${assignment.status === 'active' ? `
                    <button class="btn btn-primary btn-small" onclick="startAssignment('${assignment._id}')">
                        Start Work
                    </button>
                ` : ''}
                ${assignment.status === 'completed' && assignment.report ? `
                    <button class="btn btn-secondary btn-small" onclick="viewReport('${assignment._id}')">
                        View Report
                    </button>
                ` : ''}
                <button class="btn btn-secondary btn-small" onclick="viewAssignmentDetails('${assignment._id}')">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

function isOverdue(deadline) {
    return new Date(deadline) < new Date();
}

function getStatusColor(status) {
    const colors = {
        'active': '#17a2b8',
        'in-progress': '#ffc107',
        'completed': '#28a745',
        'overdue': '#dc3545'
    };
    return colors[status] || '#6c757d';
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

async function loadReportAssignments() {
    try {
        const response = await fraSystem.apiRequest('/assignment/my-assignments?status=active,in-progress');
        const select = document.getElementById('report-assignment');
        
        select.innerHTML = '<option value="">Choose an assignment to report on</option>';
        
        response.assignments.forEach(assignment => {
            const option = document.createElement('option');
            option.value = assignment._id;
            option.textContent = `${assignment.title || assignment.area.district} - Deadline: ${fraSystem.formatDate(assignment.deadline)}`;
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

function setupProfileForm() {
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile(e);
    });
}

function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (user.profile) {
        document.getElementById('profile-name').value = user.profile.name || '';
        document.getElementById('profile-organization').value = user.profile.organization || '';
        document.getElementById('profile-district').value = user.profile.district || '';
        document.getElementById('profile-contact').value = user.profile.contactNumber || '';
        document.getElementById('profile-area').value = user.profile.areaOfOperation || '';
    }
    document.getElementById('profile-email').value = user.email || '';
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
        
        // Add form data
        formData.append('report', document.getElementById('report-summary').value);
        formData.append('findings', JSON.stringify([document.getElementById('key-findings').value]));
        formData.append('recommendations', JSON.stringify([document.getElementById('recommendations').value]));
        formData.append('challenges', JSON.stringify([document.getElementById('challenges-faced').value]));
        
        const villagesVisited = document.getElementById('villages-visited').value;
        if (villagesVisited) {
            formData.append('villagesVisited', villagesVisited);
        }
        
        const beneficiaries = document.getElementById('beneficiaries-reached').value;
        if (beneficiaries) {
            formData.append('beneficiariesReached', beneficiaries);
        }
        
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
            document.getElementById('report-form').style.display = 'none';
            document.getElementById('report-assignment').value = '';
            
            // Refresh data
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

async function updateProfile(e) {
    try {
        const formData = new FormData(e.target);
        const profileData = {
            name: formData.get('name'),
            organization: formData.get('organization'),
            district: formData.get('district'),
            contactNumber: formData.get('contactNumber'),
            areaOfOperation: formData.get('areaOfOperation')
        };
        
        // In a real implementation, this would make an API call
        fraSystem.showNotification('Profile updated successfully!', 'success');
        
        // Update local storage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.profile = { ...user.profile, ...profileData };
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update display
        document.getElementById('ngo-name').textContent = profileData.name || user.email;
        document.getElementById('ngo-organization').textContent = profileData.organization || 'FRA Field Operations';
        
    } catch (error) {
        fraSystem.showNotification('Error updating profile: ' + error.message, 'error');
    }
}

function setupFilters() {
    const assignmentFilter = document.getElementById('assignment-filter');
    const assignmentSearch = document.getElementById('assignment-search');
    const policySearch = document.getElementById('policy-search');
    const policyCategoryFilter = document.getElementById('policy-category-filter');
    
    if (assignmentFilter) {
        assignmentFilter.addEventListener('change', (e) => {
            loadAssignments(1, e.target.value);
        });
    }
    
    if (assignmentSearch) {
        assignmentSearch.addEventListener('input', debounce((e) => {
            loadAssignments(1, assignmentFilter.value, e.target.value);
        }, 500));
    }
    
    if (policySearch) {
        policySearch.addEventListener('input', debounce((e) => {
            searchPolicies(e.target.value, policyCategoryFilter.value);
        }, 500));
    }
    
    if (policyCategoryFilter) {
        policyCategoryFilter.addEventListener('change', (e) => {
            searchPolicies(policySearch.value, e.target.value);
        });
    }
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
        
        alert(`Assignment Details:\n\nArea: ${assignment.area.district}\nInstructions: ${assignment.instructions}\nDeadline: ${fraSystem.formatDate(assignment.deadline)}`);
        
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
