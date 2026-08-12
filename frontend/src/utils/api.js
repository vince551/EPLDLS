/* ==========================================================================
   GAMEVERSE HUB - API CLIENT WRAPPER
   Supports relative paths & production API fallback
   ========================================================================== */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : 'https://api.sokomtaa.co.ke/epldls';

export async function apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const rawText = await response.text();
        let data = null;

        if (rawText) {
            try {
                data = JSON.parse(rawText);
            } catch (parseErr) {
                throw new Error(`Server returned invalid JSON: ${rawText.slice(0, 160)}`);
            }
        }

        if (!response.ok) {
            throw new Error(data?.error || `Server request failed (${response.status})`);
        }

        return data ?? {};
    } catch (err) {
        console.warn('API Fetch Warning/Fallback:', err.message);
        throw err;
    }
}

export async function uploadAvatar(userId, fileOrBase64) {
    const url = `${API_BASE_URL}/upload.php`;
    let body;
    let headers = {};

    if (fileOrBase64 instanceof File) {
        body = new FormData();
        body.append('userId', userId);
        body.append('avatar', fileOrBase64);
        // Browser sets Content-Type to multipart/form-data with boundary automatically
    } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ userId, base64: fileOrBase64 });
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload profile avatar');
    }
    return data;
}

export async function uploadImage(file, context) {
    const url = `${API_BASE_URL}/upload.php`;
    const body = new FormData();
    body.append('image', file);
    body.append('context', context);

    const response = await fetch(url, {
        method: 'POST',
        body
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image');
    }
    return { url: data.url };
}

