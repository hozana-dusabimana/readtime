// The login token is kept in the browser's localStorage, so a page refresh keeps you logged in.
const KEY = 'readytimeToken';

export function getToken() {
    return localStorage.getItem(KEY);
}

export function setToken(token) {
    if (token) {
        localStorage.setItem(KEY, token);
    } else {
        localStorage.removeItem(KEY);
    }
}
