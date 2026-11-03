// System admin: platform overview.
import { api } from '../../api.js';
import { emptyState, esc, person, statCard } from '../../utils.js';

export async function renderPlatformOverview(container) {
    const users = await api('GET', '/api/admin/users');
    const businesses = await api('GET', '/api/businesses');
    const appointments = await api('GET', '/api/appointments');

    const count = role => users.filter(u => u.role === role).length;
    const clients = users.filter(u => u.role === 'CLIENT');
    const blocked = clients.filter(u => u.blocked).length;
    const warnings = clients.filter(u => !u.blocked && u.noShowCount > 0).length;
    const activeBusinesses = businesses.filter(b => b.active).length;
    const booked = appointments.filter(a => a.status === 'BOOKED').length;
    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
    const flagged = clients.filter(u => u.blocked || u.noShowCount > 0)
        .sort((x, y) => y.noShowCount - x.noShowCount).slice(0, 5);

    container.innerHTML = `
      <div class="grid cols-4" style="margin-bottom: 20px;">
        ${statCard('Platform users', users.length,
            `${count('CLIENT')} clients · ${count('PROVIDER')} providers · ${count('BUSINESS_ADMIN') + count('SYSTEM_ADMIN')} admins`, 'users', 'blue')}
        ${statCard('Businesses', businesses.length, `${activeBusinesses} active · ${businesses.length - activeBusinesses} inactive`, 'building', 'green')}
        ${statCard('Blocked clients', blocked, `${warnings} more with 1-2 no-shows`, 'shield', 'red')}
        ${statCard('Appointments', appointments.length, `${booked} booked · ${completed} completed`, 'calendar', 'purple')}
      </div>

      <div class="grid cols-2">
        <section class="card">
          <div class="card-header"><div><h2>Flagged clients</h2><p>Clients with no-shows</p></div>
            <a href="#/moderation">Open moderation</a></div>
          ${flagged.length === 0 ? emptyState('No flagged clients.') : `
          <table>${flagged.map(u => `
            <tr><td>${person(u.fullName, u.email)}</td>
                <td><span class="badge ${u.blocked ? 'red' : 'orange'}">${u.noShowCount} no-shows</span></td>
                <td>${u.blocked ? '<span class="badge red">Blocked</span>' : '<span class="badge orange">Warning</span>'}</td></tr>`).join('')}
          </table>`}
        </section>
        <section class="card">
          <div class="card-header"><div><h2>Businesses</h2><p>Registered business accounts</p></div>
            <a href="#/businesses">Manage</a></div>
          ${businesses.length === 0 ? emptyState('No businesses yet.') : `
          <table>${businesses.slice(0, 6).map(b => `
            <tr><td><strong>${esc(b.name)}</strong><div class="muted">${esc(b.address)}</div></td>
                <td><span class="badge ${b.active ? 'green' : 'red'}">${b.active ? 'Active' : 'Suspended'}</span></td></tr>`).join('')}
          </table>`}
        </section>
      </div>`;
}
