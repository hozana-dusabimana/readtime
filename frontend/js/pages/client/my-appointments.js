// Client: My appointments as cards, with Active / Past tabs.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { avatar, emptyState, esc, nowInKigali, prettyDate, showTime, statusBadge } from '../../utils.js';
import { actionButtons, clientCanChange, connectActionButtons } from '../../components/appointment-actions.js';

const TABS = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'PAST', label: 'Past' }
];

let currentTab = 'ALL';

export async function renderMyAppointments(container) {
    const appointments = await api('GET', '/api/appointments');
    const now = nowInKigali();
    const isActive = a => a.status === 'BOOKED' && a.endAt > now;

    function draw() {
        let list = appointments;
        if (currentTab === 'ACTIVE') list = list.filter(isActive);
        if (currentTab === 'PAST') list = list.filter(a => !isActive(a));
        // Active ones first (soonest first), then the rest (newest first)
        list = [...list].sort((x, y) => {
            if (isActive(x) !== isActive(y)) return isActive(x) ? -1 : 1;
            return isActive(x) ? x.startAt.localeCompare(y.startAt) : y.startAt.localeCompare(x.startAt);
        });

        container.innerHTML = `
          <div class="card">
            <div class="card-header">
              <div><h2>My scheduled appointments</h2>
                   <p>${appointments.filter(isActive).length} active · ${appointments.length} in total</p></div>
              <div class="row">
                <div class="tabs">${TABS.map(t => `<button data-tab="${t.key}" class="${t.key === currentTab ? 'active' : ''}">${t.label}</button>`).join('')}</div>
                <a class="button" href="#/book">${icon('plus')} Book new</a>
              </div>
            </div>
            ${list.length === 0 ? emptyState('No appointments here yet.') : `
            <div class="grid cols-2">
              ${list.map(a => `
                <div class="appt-card">
                  <div class="top">
                    <span class="section-label" style="margin: 0;">${isActive(a) ? 'Active appointment' : 'Past appointment'}</span>
                    ${statusBadge(a.status)}
                  </div>
                  <div class="person">${avatar(a.providerName, true)}
                    <div><strong>${esc(a.providerName)}</strong><div class="sub">${esc(a.serviceName)}</div></div></div>
                  <div class="when">
                    <span>${icon('calendar')} ${prettyDate(a.startAt)}</span>
                    <span>${icon('clock')} ${showTime(a.startAt)} - ${showTime(a.endAt)}</span>
                  </div>
                  ${a.status === 'BOOKED' ? `
                    <div class="row" style="justify-content: space-between; align-items: center;">
                      <span class="muted">${clientCanChange(a)
                          ? icon('check') + ' Free cancellation until 2 hours before'
                          : icon('alert') + ' Less than 2 hours left - changes are closed'}</span>
                      <div class="actions">${actionButtons(a)}</div>
                    </div>` : `<span class="muted">Ref #${a.id}</span>`}
                </div>`).join('')}
            </div>`}
          </div>

          <div class="notice warning">${icon('info')}
            <div><strong>Cancellation and booking rules</strong>
              You can have at most 2 active appointments. Cancel or reschedule at least 2 hours before the start.
              After 3 no-shows your account is blocked from booking until a system admin unblocks it.</div></div>`;

        container.querySelectorAll('[data-tab]').forEach(b => {
            b.onclick = () => { currentTab = b.dataset.tab; draw(); };
        });
        connectActionButtons(container, list, () => renderMyAppointments(container));
    }

    draw();
}
