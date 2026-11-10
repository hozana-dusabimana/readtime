// The ONLY place that talks to the backend.
import { API_URL } from './config.js';
import { getToken } from './auth/token.js';

/** Calls the backend and returns the JSON answer. Throws an Error with the server's message on failure. */
export async function api(method, url, body) {
    const options = { method: method, headers: {} };
    if (getToken()) {
        options.headers['Authorization'] = 'Bearer ' + getToken();
    }
    if (body !== undefined) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(API_URL + url, options);
    } catch (e) {
        throw new Error('Cannot reach the backend at ' + API_URL + '. Is it running?');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || ('Error ' + response.status));
        error.status = response.status;   // e.g. 401, 403, 409 - pages can check it
        throw error;
    }
    return data;
}
