// Business admin: provider roster (cards) and adding providers.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { session } from '../../session.js';
import { avatar, emptyState, esc, formData, minutesBetween, nowInKigali, run, showDuration } from '../../utils.js';
import { openModal } from '../../components/modal.js';

export async function renderProviders(container) {
    const providers = await api('GET', `/api/businesses/${session.user.businessId}/providers`);
    const appointments = await api('GET', '/api/appointments');
    const now = nowInKigali();

    // For each provider: their services and working hours
    const details = await Promise.all(providers.map(async p => ({
        services: await api('GET', `/api/providers/${p.id}/services`),
        hours: await api('GET', `/api/providers/${p.id}/hours`)
    })));

    container.innerHTML = `
      <section class="card">
        <div class="card-header">
          <div><h2>Provider roster &amp; schedules</h2><p>${providers.length} provider(s) in your business</p></div>
          <button id="add-provider">${icon('plus')} Add provider</button>
        </div>
        ${providers.length === 0 ? emptyState('No providers yet. Add the first one.') : `
        <div class="grid cols-3">
          ${providers.map((p, i) => {
              const { services, hours } = details[i];
              const weeklyMinutes = hours.reduce((sum, h) => sum + minutesBetween(h.startTime.slice(0, 5), h.endTime.slice(0, 5)), 0);
              const workingDays = new Set(hours.map(h => h.dayOfWeek)).size;
              const upcoming = appointments.filter(a => a.providerId === p.id && a.status === 'BOOKED' && a.startAt > now).length;
              return `
                <div class="roster-card">
                  <div class="card-header" style="margin: 0;">
                    <div class="person">${avatar(p.fullName, true)}
                      <div><strong>${esc(p.fullName)}</strong><div class="sub">${esc(p.email)}</div></div></div>
                    <span class="badge green">Active</span>
                  </div>
                  <dl>
                    <dt>Weekly hours</dt><dd>${weeklyMinutes ? showDuration(weeklyMinutes) : 'Not set'}</dd>
                    <dt>Working days</dt><dd>${workingDays} / 7</dd>
                    <dt>Active services</dt><dd>${services.filter(s => s.active).length}</dd>
                    <dt>Upcoming bookings</dt><dd>${upcoming}</dd>
                  </dl>
                  <div class="grid cols-2" style="gap: 8px;">
                    <a class="button secondary small" href="#/provider-hours?id=${p.id}">${icon('clock')} Schedule</a>
                    <a class="button secondary small" href="#/services?provider=${p.id}">${icon('tag')} Services</a>
                  </div>
                </div>`;
          }).join('')}
        </div>`}
      </section>`;

    container.querySelector('#add-provider').onclick = () => openAddProvider(() => renderProviders(container));
}

function openAddProvider(onDone) {
    const modal = openModal('Add a provider', `
      <form novalidate>
        <label>Full name <input name="fullName"></label>
        <label>Email <input name="email"></label>
        <label>Temporary password (8-64 characters) <input name="password" type="password"></label>
        <p class="muted">The provider logs in with this email and password.</p>
        <div class="modal-footer">
          <button type="button" class="secondary" data-close>Cancel</button>
          <button>Add provider</button>
        </div>
      </form>`);

    modal.body.querySelector('form').onsubmit = event => {
        event.preventDefault();
        run(async () => {
            await api('POST', '/api/providers', formData(event.target));
            modal.close();
            await onDone();
        }, 'Provider added.');
    };
}
