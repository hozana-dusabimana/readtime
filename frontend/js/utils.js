// Small helpers used by many pages.
import { icon } from './icons.js';
import { session } from './session.js';

export const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const ROLE_NAMES = {
    CLIENT: 'Client',
    PROVIDER: 'Service Provider',
    SYSTEM_ADMIN: 'System Admin'
};

export const STATUS_NAMES = {
    BOOKED: 'Booked',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
    NO_SHOW: 'No-show'
};

export function $(id) {
    return document.getElementById(id);
}

/** Makes text safe to put inside HTML (stops people injecting scripts through names). */
export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Reads all fields of a form into an object, e.g. { email: '...', password: '...' }. */
export function formData(form) {
    return Object.fromEntries(new FormData(form));
}

// ---------------- Dates and times (the whole system uses Kigali time) ----------------
// Dates travel as text: "2026-11-05" (date) and "2026-11-05T09:30" (date + time).
// Text in this format can be compared with < and >, which keeps the code simple.

/** Current Kigali date and time as "YYYY-MM-DDTHH:MM". */
export function nowInKigali() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Kigali', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const p = {};
    parts.forEach(x => { p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function todayInKigali() {
    return nowInKigali().slice(0, 10);
}

/** "2026-11-05" + 3 days -> "2026-11-08" */
export function addDays(date, days) {
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** Subtracts hours from "YYYY-MM-DDTHH:MM" (used for the 2-hour cancellation rule). */
export function minusHours(dateTime, hours) {
    const d = new Date(dateTime + ':00Z');
    d.setUTCHours(d.getUTCHours() - hours);
    return d.toISOString().slice(0, 16);
}

function asDate(dateOrDateTime) {
    return new Date(dateOrDateTime.slice(0, 10) + 'T00:00:00Z');
}

/** "2026-11-05" -> "Thu" */
export function weekdayShort(date) {
    return asDate(date).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

/** "2026-11-05" -> "Nov" */
export function monthShort(date) {
    return asDate(date).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

/** "2026-11-05T09:30" -> "Thu, Nov 5, 2026" */
export function prettyDate(dateOrDateTime) {
    return asDate(dateOrDateTime).toLocaleDateString('en-US',
        { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** "2026-11-05T09:30" -> "09:30" */
export function showTime(dateTime) {
    return dateTime.slice(11, 16);
}

/** Minutes between two "HH:MM" times. */
export function minutesBetween(startTime, endTime) {
    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
}

/** 90 -> "1h 30m" */
export function showDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return m + ' min';
    return m === 0 ? h + 'h' : `${h}h ${m}m`;
}

export function money(amount) {
    return Number(amount).toLocaleString('en-US') + ' RWF';
}

// ---------------- Small HTML pieces ----------------

export function initials(name) {
    return String(name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export function avatar(name, large) {
    return `<div class="avatar ${large ? 'large' : ''}">${esc(initials(name))}</div>`;
}

/** Name with a small grey line under it, e.g. an email. */
export function person(name, subText) {
    return `<div class="person">${avatar(name)}<div><div><strong>${esc(name)}</strong></div>
            <div class="sub">${esc(subText || '')}</div></div></div>`;
}

export function statusBadge(status) {
    return `<span class="badge ${status}">${STATUS_NAMES[status] || status}</span>`;
}

/** A number card for the top of a page. tone: blue, green, red, orange or purple. */
export function statCard(label, value, note, iconName, tone) {
    return `
      <div class="stat tone-${tone}">
        <div class="stat-top"><span class="stat-label">${esc(label)}</span>
          <span class="stat-icon">${icon(iconName)}</span></div>
        <div class="stat-value">${esc(value)}</div>
        <div class="stat-note">${esc(note)}</div>
      </div>`;
}

export function emptyState(text) {
    return `<div class="empty">${esc(text)}</div>`;
}

/** Builds <option> tags for a <select>. selected = the value to pre-select. */
export function optionsHtml(list, valueOf, labelOf, emptyText, selected) {
    if (list.length === 0) {
        return `<option value="">${esc(emptyText)}</option>`;
    }
    return list.map(x => {
        const value = String(valueOf(x));
        return `<option value="${esc(value)}" ${value === String(selected) ? 'selected' : ''}>${esc(labelOf(x))}</option>`;
    }).join('');
}

// ---------------- Messages ----------------

let messageTimer = null;

/** Shows a green (ok) or red (error) message in the top-right corner for a few seconds. */
export function showMessage(text, isError) {
    const box = $('message');
    box.textContent = text;
    box.className = 'message ' + (isError ? 'error' : 'ok');
    box.hidden = false;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { box.hidden = true; }, 5000);
}

/** Runs an action; shows successText if it works, or the error message if it fails. */
export async function run(action, successText) {
    try {
        await action();
        if (successText) showMessage(successText, false);
        return true;
    } catch (e) {
        // A page that was still loading when the user logged out gets "401 not logged in".
        // That is expected, so we do not show it.
        if (e.status === 401 && !session.user) return false;
        showMessage(e.message, true);
        return false;
    }
}
