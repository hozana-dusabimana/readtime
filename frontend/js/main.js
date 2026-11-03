// Starting point of the frontend.
//  - Not logged in -> public pages (home, how it works, for businesses, login, signup) with a top menu.
//  - Logged in     -> the pages of the user's role with a sidebar.
// IMPORTANT: the BACKEND checks every permission. Showing different pages per role
// here only makes the screen tidier; it is not the security.
import { api } from './api.js';
import { getToken, session, setToken } from './session.js';
import { $, run } from './utils.js';
import { PUBLIC_ROUTES, ROUTES } from './routes.js';
import { drawPublicLayout, drawSidebar, setPageTitle, setupMenuButton, startClock } from './layout.js';

/** Reads "#/provider-hours?id=5" into { path: '/provider-hours', params: {id: '5'} }. */
function readAddress() {
    const hash = location.hash.slice(1) || '/';
    const [path, query] = hash.split('?');
    return { path: path, params: Object.fromEntries(new URLSearchParams(query || '')) };
}

/** Shows the page that matches the address in the browser. */
function showPage() {
    if (session.user) {
        showAppPage();
    } else {
        showPublicPage();
    }
}

function showPublicPage() {
    const { path, params } = readAddress();
    const route = PUBLIC_ROUTES.find(r => r.path === path);
    if (!route) {
        location.hash = '#/';   // unknown address -> home page
        return;
    }
    document.body.classList.add('logged-out');
    document.title = route.title + ' - ReadyTime';
    drawPublicLayout(PUBLIC_ROUTES, route);
    window.scrollTo(0, 0);
    run(() => route.render(newPageBox(), params));
}

/**
 * Each page gets its own new box inside <main id="app">. If the user switches pages while
 * the old page is still loading, the old page can only draw into its old box (no longer on
 * screen), so it never covers the new page.
 */
function newPageBox() {
    const box = document.createElement('div');
    $('app').replaceChildren(box);
    return box;
}

function showAppPage() {
    const routes = ROUTES[session.user.role];
    const pages = routes.filter(r => r.path);
    const { path, params } = readAddress();
    const route = pages.find(r => r.path === path);

    if (!route) {
        location.hash = '#' + pages[0].path;   // unknown or public address -> first page of this role
        return;
    }

    document.body.classList.remove('logged-out');
    drawSidebar(routes, route, logout);
    setPageTitle(route.title, route.subtitle);
    document.body.classList.remove('menu-open');
    const box = newPageBox();
    box.innerHTML = '<div class="empty">Loading...</div>';
    run(() => route.render(box, params));
}

/** Called by the login and signup pages after a successful login. */
session.afterLogin = () => {
    const firstPage = ROUTES[session.user.role].find(r => r.path);
    location.hash = '#' + firstPage.path;   // changing the address shows that page
};

function logout() {
    run(async () => {
        await api('POST', '/api/logout');
        setToken(null);
        session.user = null;
        location.hash = '#/login';
    }, 'You are logged out.');
}

async function start() {
    setupMenuButton();
    startClock();
    window.onhashchange = showPage;

    if (getToken()) {
        try {
            session.user = await api('GET', '/api/me');
        } catch (e) {
            setToken(null);   // token expired or invalid
        }
    }
    showPage();
}

start();
