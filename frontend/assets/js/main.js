// Main JavaScript utilities and common functions
class FRASystem {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
    }

    // API request helper
    async apiRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        const config = { ...defaultOptions, ...options };
        if (config.headers['Content-Type'] === 'application/json' && config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Authentication helpers
    isAuthenticated() {
        return !!this.token && !!this.user.id;
    }

    hasRole(role) {
        return this.user.role === role;
    }

    // Utility functions
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // File size formatter
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Show notification
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);

        // Manual close
        notification.querySelector('.notification-close').onclick = () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        };
    }

    // Loading overlay
    showLoading() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// Global instance
const fraSystem = new FRASystem();

// Common DOM utilities
const DOM = {
    createElement(tag, className, innerHTML) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    },

    show(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) element.style.display = 'block';
    },

    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) element.style.display = 'none';
    },

    toggle(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }
};

// Form validation utilities
const Validator = {
    email(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    phone(phone) {
        const re = /^[6-9]\d{9}$/;
        return re.test(phone);
    },

    required(value) {
        return value && value.toString().trim().length > 0;
    },

    minLength(value, min) {
        return value && value.toString().length >= min;
    },

    maxLength(value, max) {
        return value && value.toString().length <= max;
    }
};

// Initialize common functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add loading styles if not present
    if (!document.getElementById('loading-styles')) {
        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            #loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            .loading-spinner {
                text-align: center;
                color: var(--primary-green);
            }
            .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid var(--primary-green);
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                min-width: 300px;
                padding: 1rem;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                z-index: 9999;
                animation: slideIn 0.3s ease;
            }
            .notification-info { background: #e7f3ff; border-left: 4px solid #004085; }
            .notification-success { background: #d4edda; border-left: 4px solid #155724; }
            .notification-error { background: #f8d7da; border-left: 4px solid #721c24; }
            .notification-warning { background: #fff3cd; border-left: 4px solid #856404; }
            .notification-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                margin-left: 1rem;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // Check authentication on protected pages
    const protectedPaths = ['/pages/ministry/', '/pages/ngo/'];
    const currentPath = window.location.pathname;
    
    if (protectedPaths.some(path => currentPath.includes(path))) {
        if (!fraSystem.isAuthenticated()) {
            window.location.href = '/pages/login.html';
        }
    }
});
