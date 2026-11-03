// Who is logged in, shared by all pages.

export const session = {
    user: null,          // the logged-in user object from the API, or null
    afterLogin: null     // set by main.js: shows the user's first page after login
};

// The login token is kept in the browser's localStorage, so a page refresh keeps you logged in.
export function getToken() {
    return localStorage.getItem('readytimeToken');
}

export function setToken(token) {
    if (token) {
        localStorage.setItem('readytimeToken', token);
    } else {
        localStorage.removeItem('readytimeToken');
    }
}
