// Appointments table with status tabs and optional provider / date filters.
// Used by the provider schedule and the business admin appointments page.
import { esc, person, prettyDate, showDuration, showTime, minutesBetween, emptyState, statusBadge,
         optionsHtml, todayInKigali, addDays } from '../utils.js';
import { icon } from '../icons.js';
import { actionButtons, connectActionButtons } from './appointment-actions.js';

const TABS = [
    { key: 'ALL', label: 'All' },
    { key: 'BOOKED', label: 'Booked' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
    { key: 'NO_SHOW', label: 'No-show' }
];

// Remembers the chosen tab / provider / date per page, so they stay after a reload.
const savedFilters = {};

/**
 * options:
 *   key           - a name for this table (used to remember the filters)
 *   appointments  - the list to show (already loaded)
 *   reload        - function that reloads the data and draws again
 *   providers     - (optional) list of providers -> shows a provider filter
 *   byDate        - (optional) true -> shows a date picker and only that day's appointments
 *   showProvider  - (optional) true -> shows the provider column
 */
export function drawAppointmentsTable(container, options) {
    if (!savedFilters[options.key]) {
        savedFilters[options.key] = { tab: 'ALL', providerId: '', date: todayInKigali() };
    }
    const filters = savedFilters[options.key];

    function draw() {
        let list = options.appointments;
        if (filters.tab !== 'ALL') list = list.filter(a => a.status === filters.tab);
        if (filters.providerId) list = list.filter(a => String(a.providerId) === filters.providerId);
        if (options.byDate) list = list.filter(a => a.startAt.slice(0, 10) === filters.date);
        // Upcoming first when looking at one day; newest first otherwise
        list = [...list].sort((x, y) => options.byDate
            ? x.startAt.localeCompare(y.startAt) : y.startAt.localeCompare(x.startAt));

        container.innerHTML = `
          <div class="card-header">
            <div class="tabs">${TABS.map(t =>
              `<button data-tab="${t.key}" class="${filters.tab === t.key ? 'active' : ''}">${t.label}</button>`).join('')}</div>
            <div class="row">
              ${options.providers ? `<select class="provider-filter">
                  <option value="">All providers</option>
                  ${optionsHtml(options.providers, p => p.id, p => p.fullName, '', filters.providerId)}</select>` : ''}
              ${options.byDate ? `
                  <button class="secondary icon-only day-prev" aria-label="Previous day">${icon('left')}</button>
                  <input type="date" class="day-input" value="${filters.date}">
                  <button class="secondary icon-only day-next" aria-label="Next day">${icon('right')}</button>
                  <button class="secondary day-today">Today</button>` : ''}
            </div>
          </div>
          ${list.length === 0 ? emptyState('No appointments to show.') : `
          <div class="table-wrap"><table>
            <tr><th>Ref</th><th>Date &amp; time</th><th>Client</th><th>Service</th>
                ${options.showProvider ? '<th>Provider</th>' : ''}<th>Status</th><th>Actions</th></tr>
            ${list.map(a => `
              <tr>
                <td class="muted">#${a.id}</td>
                <td><strong>${showTime(a.startAt)} - ${showTime(a.endAt)}</strong>
                    <div class="muted">${prettyDate(a.startAt)}</div></td>
                <td>${person(a.clientName, 'Client #' + a.clientId)}</td>
                <td>${esc(a.serviceName)}<div class="muted">${showDuration(minutesBetween(showTime(a.startAt), showTime(a.endAt)))}</div></td>
                ${options.showProvider ? `<td>${esc(a.providerName)}</td>` : ''}
                <td>${statusBadge(a.status)}</td>
                <td><div class="actions">${actionButtons(a)}</div></td>
              </tr>`).join('')}
          </table></div>`}`;

        container.querySelectorAll('[data-tab]').forEach(b => {
            b.onclick = () => { filters.tab = b.dataset.tab; draw(); };
        });
        const providerFilter = container.querySelector('.provider-filter');
        if (providerFilter) providerFilter.onchange = () => { filters.providerId = providerFilter.value; draw(); };
        if (options.byDate) {
            container.querySelector('.day-input').onchange = e => { filters.date = e.target.value; draw(); };
            container.querySelector('.day-prev').onclick = () => { filters.date = addDays(filters.date, -1); draw(); };
            container.querySelector('.day-next').onclick = () => { filters.date = addDays(filters.date, 1); draw(); };
            container.querySelector('.day-today').onclick = () => { filters.date = todayInKigali(); draw(); };
        }
        connectActionButtons(container, list, options.reload);
    }

    draw();
}
