function getAuthToken() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    return user && user.token ? user.token : null;
}

async function handleUnauthorized() {
    try {
        if (typeof logoutUser === 'function') {
            await logoutUser({ redirect: true });
            return;
        }

        if (typeof clearCurrentUser === 'function') {
            clearCurrentUser();
        }
    } catch (error) {
        console.error('Error while handling unauthorized state:', error);
    }
}

async function apiRequest(path, { method = 'GET', body, headers = {}, auth = false } = {}) {
    const requestHeaders = { ...headers };
    const options = { method, headers: requestHeaders };

    if (body !== undefined) {
        options.body = JSON.stringify(body);
        requestHeaders['Content-Type'] = 'application/json';
    }

    if (auth) {
        const token = getAuthToken();
        if (!token) {
            await handleUnauthorized();
            throw new Error('Authentication required.');
        }
        requestHeaders.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(path, options);
    } catch (error) {
        console.error(`Request to ${path} failed:`, error);
        throw new Error('Network error. Please try again shortly.');
    }

    if (response.status === 401) {
        await handleUnauthorized();
        throw new Error('Session expired. Please log in again.');
    }

    let payload = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        try {
            payload = await response.json();
        } catch (error) {
            console.error('Failed to parse JSON response:', error);
            throw new Error('Invalid response from server.');
        }
    } else {
        payload = await response.text();
    }

    if (!response.ok) {
        const message = payload && typeof payload === 'object' && payload.message ? payload.message : 'Request failed.';
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return payload;
}

async function fetchArticles({ scope, status, limit } = {}) {
    const params = new URLSearchParams();

    if (scope) {
        params.set('scope', scope);
    }

    if (status) {
        params.set('status', status);
    }

    if (limit) {
        params.set('limit', String(limit));
    }

    const url = params.size ? `/api/articles?${params.toString()}` : '/api/articles';
    const response = await apiRequest(url, { auth: scope === 'admin' });

    return {
        articles: Array.isArray(response.articles) ? response.articles : []
    };
}

async function createArticle(article) {
    const response = await apiRequest('/api/articles', {
        method: 'POST',
        body: article,
        auth: true
    });

    return response.article || null;
}

async function updateArticle(id, changes) {
    const response = await apiRequest(`/api/articles/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: changes,
        auth: true
    });

    return response.article || null;
}

async function deleteArticle(id) {
    await apiRequest(`/api/articles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        auth: true
    });
}

async function fetchEvidence({ scope } = {}) {
    const params = new URLSearchParams();

    if (scope) {
        params.set('scope', scope);
    }

    const url = params.size ? `/api/evidence?${params.toString()}` : '/api/evidence';
    const response = await apiRequest(url, { auth: scope === 'admin' });

    return {
        evidence: Array.isArray(response.evidence) ? response.evidence : []
    };
}

async function submitEvidence(evidence) {
    const response = await apiRequest('/api/evidence', {
        method: 'POST',
        body: evidence
    });

    return response.evidence || null;
}

async function cleanupDuplicateEvidence() {
    const response = await apiRequest('/api/evidence/cleanup', {
        method: 'POST',
        auth: true
    });

    return typeof response.removed === 'number' ? response.removed : 0;
}

async function fetchEvidenceBans() {
    const response = await apiRequest('/api/evidence/ip-bans', {
        auth: true
    });

    return {
        bans: Array.isArray(response.bans) ? response.bans : []
    };
}

async function banEvidenceIp(ipAddress, reason) {
    const response = await apiRequest('/api/evidence/ip-bans', {
        method: 'POST',
        body: { ipAddress, reason },
        auth: true
    });

    return response.ban || null;
}

async function unbanEvidenceIp(ipAddress) {
    await apiRequest('/api/evidence/ip-bans', {
        method: 'DELETE',
        body: { ipAddress },
        auth: true
    });
}

async function fetchEvidenceChallenge() {
    const response = await apiRequest('/api/auth/config');
    return response || {};
}

async function updateEvidence(id, changes) {
    const response = await apiRequest(`/api/evidence/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: changes,
        auth: true
    });

    return response.evidence || null;
}

async function deleteEvidenceItem(id) {
    await apiRequest(`/api/evidence/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        auth: true
    });
}

async function fetchAdminStats() {
    return apiRequest('/api/admin/stats', { auth: true });
}

async function fetchAdminUsers() {
    const response = await apiRequest('/api/admin/users', { auth: true });
    return {
        users: Array.isArray(response.users) ? response.users : []
    };
}

async function createUser(userData) {
    const response = await apiRequest('/api/admin/users', {
        method: 'POST',
        body: userData,
        auth: true
    });

    return response;
}

async function fetchArticleById(id) {
    if (!id) {
        throw new Error('Article id is required.');
    }

    const response = await apiRequest(`/api/articles/${encodeURIComponent(id)}`);
    return {
        article: response.article || null
    };
}

async function fetchArticleBySlug(slug, { scope } = {}) {
    if (!slug) {
        throw new Error('Article slug is required.');
    }

    const params = new URLSearchParams({ slug });

    if (scope) {
        params.set('scope', scope);
    }

    const response = await apiRequest(`/api/articles?${params.toString()}`, {
        auth: scope === 'admin'
    });

    return {
        article: response.article || null
    };
}

// Events API
async function fetchEvents({ scope } = {}) {
    const params = new URLSearchParams();

    if (scope) {
        params.set('scope', scope);
    }

    const url = params.size ? `/api/events?${params.toString()}` : '/api/events';
    const response = await apiRequest(url, { auth: scope === 'admin' });

    return {
        events: Array.isArray(response.events) ? response.events : []
    };
}

async function createEvent(event) {
    const response = await apiRequest('/api/events', {
        method: 'POST',
        body: event,
        auth: true
    });

    return response.event || null;
}

async function updateEvent(id, changes) {
    const response = await apiRequest(`/api/events/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: changes,
        auth: true
    });

    return response.event || null;
}

async function deleteEvent(id) {
    await apiRequest(`/api/events/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        auth: true
    });
}

async function fetchEventById(id) {
    if (!id) {
        throw new Error('Event id is required.');
    }

    const response = await apiRequest(`/api/events/${encodeURIComponent(id)}`, {
        auth: true
    });
    return {
        event: response.event || null
    };
}

// Wanted List API
async function fetchWantedList({ scope } = {}) {
    const params = new URLSearchParams();

    if (scope) {
        params.set('scope', scope);
    }

    const url = params.size ? `/api/wanted?${params.toString()}` : '/api/wanted';
    const response = await apiRequest(url, { auth: scope === 'admin' });

    return {
        wanted: Array.isArray(response.wanted) ? response.wanted : []
    };
}

async function createWantedEntry(entry) {
    const response = await apiRequest('/api/wanted', {
        method: 'POST',
        body: entry,
        auth: true
    });

    return response.wanted || null;
}

async function updateWantedEntry(id, changes) {
    const response = await apiRequest(`/api/wanted/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: changes,
        auth: true
    });

    return response.wanted || null;
}

async function deleteWantedEntry(id) {
    await apiRequest(`/api/wanted/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        auth: true
    });
}

async function fetchWantedById(id) {
    if (!id) {
        throw new Error('Wanted id is required.');
    }

    const response = await apiRequest(`/api/wanted/${encodeURIComponent(id)}`, {
        auth: true
    });
    return {
        wanted: response.wanted || null
    };
}
