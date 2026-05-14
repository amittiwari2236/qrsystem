// api.js - Helper utility for API interactions (could be expanded later)

const API_BASE_URL = window.location.origin;

// Generic fetch wrapper to handle errors consistently
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API Error');
        }
        
        return data;
    } catch (error) {
        console.error('API Call Failed:', error);
        throw error;
    }
}
