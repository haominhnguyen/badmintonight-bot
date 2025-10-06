/**
 * Authentication utility for API calls
 */

class AuthManager {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!this.token && !!this.userInfo.id;
  }

  // Alias for isLoggedIn (for compatibility)
  isAuthenticated() {
    return this.isLoggedIn();
  }

  // Get current user info
  getCurrentUser() {
    return this.userInfo;
  }

  // Get auth headers for API calls
  getAuthHeaders() {
    if (!this.token) {
      throw new Error('No authentication token found');
    }
    
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Make authenticated API call
  async authenticatedFetch(url, options = {}) {
    if (!this.isLoggedIn()) {
      throw new Error('User not authenticated');
    }

    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // If token expired, redirect to login
    if (response.status === 401) {
      this.logout();
      window.location.href = '/login.html';
      return;
    }

    return response;
  }

  // Login user
  async login(username, password) {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        this.token = result.data.token;
        this.userInfo = result.data.user;
        
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
        
        return result;
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  logout() {
    this.token = null;
    this.userInfo = {};
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    window.location.href = '/login.html';
  }

  // Verify token
  async verifyToken() {
    if (!this.token) {
      return false;
    }

    try {
      const response = await fetch('/api/v1/auth/verify', {
        headers: this.getAuthHeaders()
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  // Refresh authentication status from localStorage
  refreshAuthStatus() {
    this.token = localStorage.getItem('authToken');
    this.userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    console.log('Auth status refreshed:', {
      hasToken: !!this.token,
      hasUserInfo: !!this.userInfo.id,
      isLoggedIn: this.isLoggedIn()
    });
  }
}

// Create global instance
window.authManager = new AuthManager();

// Helper functions for easy use
window.authenticatedFetch = (url, options = {}) => {
  return window.authManager.authenticatedFetch(url, options);
};

window.requireAuth = () => {
  if (!window.authManager.isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
};
