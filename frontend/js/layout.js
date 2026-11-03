// The parts around every page: sidebar, page title and the Kigali clock.
import { icon } from './icons.js';
import { session } from './session.js';
import { $, ROLE_NAMES, avatar, esc, nowInKigali, prettyDate, showTime } from './utils.js';

/** Draws the sidebar links for the user's role and highlights the current page. */
export function drawSidebar(routes, currentRoute, onLogout) {
    const user = session.user;
    const links = routes.map(r => {
        if (r.section) return `<div class="nav-section">${esc(r.section)}</div>`;
        if (r.hidden) return '';
        const active = r === currentRoute ? 'active' : '';
        return `<a class="nav-link ${active}" href="#${r.path}">${icon(r.icon)} ${esc(r.label)}</a>`;
    }).join('');

    $('sidebar').innerHTML = `
      <div class="brand"><span class="brand-logo">${icon('logo')}</span> ReadyTime</div>
      <nav>${links}</nav>
      <div class="sidebar-user">
        ${avatar(user.fullName)}
        <div class="who">
          <div class="name" id="current-user">${esc(user.fullName)}</div>
          <div class="role">${ROLE_NAMES[user.role]}</div>
        </div>
        <button class="secondary icon-only" id="logout-button" title="Log out" aria-label="Log out">${icon('logout')}</button>
      </div>`;
    $('logout-button').onclick = onLogout;
}

/** Draws the public top menu and footer (for visitors who are not logged in). */
export function drawPublicLayout(routes, currentRoute) {
    const links = routes.filter(r => r.inMenu).map(r =>
        `<a href="#${r.path}" class="${r === currentRoute ? 'active' : ''}">${esc(r.label)}</a>`).join('');

    $('public-nav').innerHTML = `
      <div class="container">
        <a class="brand" href="#/"><span class="brand-logo">${icon('logo')}</span> ReadyTime</a>
        <nav class="public-links">${links}</nav>
        <div class="public-actions">
          <a class="button secondary" href="#/login" id="nav-login">Log in</a>
          <a class="button" href="#/signup" id="nav-signup">Get started</a>
        </div>
      </div>`;

    $('public-footer').innerHTML = `
      <div class="container">
        <div>
          <div class="brand"><span class="brand-logo">${icon('logo')}</span> ReadyTime</div>
          <p>Smart appointment booking and scheduling for clinics, salons and service businesses.
             Real-time availability, no double-booking.</p>
        </div>
        <div>${routes.filter(r => r.inMenu).map(r => `<a href="#${r.path}">${esc(r.label)}</a>`).join('')}</div>
        <div><a href="#/login">Log in</a><a href="#/signup">Create an account</a></div>
        <div class="small-print">ReadyTime - student project (AUCA, Software Testing Techniques).
             All times are Africa/Kigali (UTC+2). Photos from Pexels.</div>
      </div>`;
}

export function setPageTitle(title, subtitle) {
    $('page-title').textContent = title;
    $('page-subtitle').textContent = subtitle || '';
    document.title = title + ' - ReadyTime';
}

/** Shows the current Kigali time in the top bar and updates it every 30 seconds. */
export function startClock() {
    const draw = () => {
        const now = nowInKigali();
        $('clock').innerHTML = `${icon('clock')} ${prettyDate(now)} · ${showTime(now)} Kigali (UTC+2)`;
    };
    draw();
    setInterval(draw, 30000);
}

/** On small screens the menu button opens and closes the sidebar. */
export function setupMenuButton() {
    $('menu-button').onclick = () => document.body.classList.toggle('menu-open');
}
