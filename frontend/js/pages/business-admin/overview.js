// Business admin: overview of my business.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { session } from '../../session.js';
import { emptyState, esc, nowInKigali, person, prettyDate, showTime, statCard } from '../../utils.js';

export async function renderBusinessOverview(container) {
    const businessId = session.user.businessId;
    const businesses = await api('GET', '/api/businesses');
    const business = businesses.find(b => b.id === businessId);
    const providers = await api('GET', `/api/businesses/${businessId}/providers`);
    const appointments = await api('GET', '/api/appointments');
    const servicesPerProvider = await Promise.all(providers.map(p => api('GET', `/api/providers/${p.id}/services`)));
    const services = servicesPerProvider.flat();

    const now = nowInKigali();
    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
    const noShows = appointments.filter(a => a.status === 'NO_SHOW').length;
    const attended = completed + noShows;
    const noShowRate = attended === 0 ? 0 : Math.round((noShows / attended) * 1000) / 10;
    const upcoming = appointments.filter(a => a.status === 'BOOKED' && a.startAt > now)
        .sort((x, y) => x.startAt.localeCompare(y.startAt)).slice(0, 6);

    container.innerHTML = `
      <section class="card">
        <div class="card-header" style="margin: 0;">
          <div class="person">
            <span class="stat-icon" style="background: var(--blue-soft); color: var(--blue);">${icon('building')}</span>
            <div><h2>${esc(business ? business.name : 'My business')}</h2>
                 <div class="muted">${icon('pin')} ${esc(business ? business.address : '')}</div></div>
          </div>
          <span class="badge ${business && business.active ? 'green' : 'red'}">${business && business.active ? 'Active business' : 'Inactive'}</span>
        </div>
      </section>

      <div class="grid cols-4" style="margin-bottom: 20px;">
        ${statCard('Active providers', providers.length, 'Providers who can be booked', 'users', 'blue')}
        ${statCard('Services', services.filter(s => s.active).length, `${services.length} in total (incl. inactive)`, 'tag', 'purple')}
        ${statCard('Completed bookings', completed, `${appointments.length} appointments in total`, 'check', 'green')}
        ${statCard('No-show rate', noShowRate + '%', `${noShows} no-shows of ${attended} attended`, 'alert', 'orange')}
      </div>

      <div class="grid cols-2">
        <section class="card">
          <div class="card-header"><div><h2>Next appointments</h2><p>Booked, not started yet</p></div>
            <a href="#/appointments">See all</a></div>
          ${upcoming.length === 0 ? emptyState('No upcoming appointments.') : `
          <table>${upcoming.map(a => `
            <tr><td>${person(a.clientName, a.serviceName)}</td>
                <td><strong>${showTime(a.startAt)}</strong><div class="muted">${prettyDate(a.startAt)}</div></td>
                <td class="muted">${esc(a.providerName)}</td></tr>`).join('')}</table>`}
        </section>
        <section class="card">
          <div class="card-header"><div><h2>Providers</h2><p>Services per provider</p></div>
            <a href="#/providers">Manage</a></div>
          ${providers.length === 0 ? emptyState('No providers yet.') : `
          <table>${providers.map((p, i) => `
            <tr><td>${person(p.fullName, p.email)}</td>
                <td><span class="badge blue">${servicesPerProvider[i].filter(s => s.active).length} services</span></td></tr>`).join('')}</table>`}
        </section>
      </div>`;
}
