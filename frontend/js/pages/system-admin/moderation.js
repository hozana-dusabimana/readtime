// System admin: client moderation - no-shows, blocked clients, unblocking.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { emptyState, person, run } from '../../utils.js';

const MAX_NO_SHOWS = 3;
const TABS = [
    { key: 'FLAGGED', label: 'Flagged' },
    { key: 'BLOCKED', label: 'Blocked' },
    { key: 'ALL', label: 'All clients' }
];

let currentTab = 'FLAGGED';
let search = '';

export async function renderModeration(container) {
    const users = await api('GET', '/api/admin/users');
    const clients = users.filter(u => u.role === 'CLIENT');
    const reload = () => renderModeration(container);

    function draw() {
        let list = clients;
        if (currentTab === 'FLAGGED') list = list.filter(u => u.blocked || u.noShowCount > 0);
        if (currentTab === 'BLOCKED') list = list.filter(u => u.blocked);
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(u => u.fullName.toLowerCase().includes(s) || u.email.includes(s));
        }
        list = [...list].sort((x, y) => y.noShowCount - x.noShowCount);

        container.innerHTML = `
          <div class="notice">${icon('shield')}
            <div><strong>Rule: ${MAX_NO_SHOWS} no-shows block a client</strong>
            A blocked client cannot make new bookings. Only a system admin can unblock a client;
            unblocking resets the no-show count to 0. Appeals are handled outside the app.</div></div>

          <section class="card">
            <div class="card-header">
              <div class="tabs">${TABS.map(t => `<button data-tab="${t.key}" class="${t.key === currentTab ? 'active' : ''}">${t.label}
                 (${t.key === 'FLAGGED' ? clients.filter(u => u.blocked || u.noShowCount > 0).length
                   : t.key === 'BLOCKED' ? clients.filter(u => u.blocked).length : clients.length})</button>`).join('')}</div>
              <input class="search" placeholder="Search name or email" value="${search.replace(/"/g, '&quot;')}">
            </div>
            ${list.length === 0 ? emptyState('No clients to show.') : `
            <div class="table-wrap"><table>
              <tr><th>Client</th><th>No-shows</th><th>Account status</th><th>Login</th><th>Actions</th></tr>
              ${list.map(u => `
                <tr>
                  <td>${person(u.fullName, u.email)}</td>
                  <td><span class="badge ${u.noShowCount >= MAX_NO_SHOWS ? 'red' : u.noShowCount > 0 ? 'orange' : 'gray'}">
                      ${u.noShowCount} / ${MAX_NO_SHOWS}</span></td>
                  <td>${u.blocked ? '<span class="badge red">Blocked</span>'
                       : u.noShowCount > 0 ? `<span class="badge orange">Warning (${u.noShowCount}/${MAX_NO_SHOWS})</span>`
                       : '<span class="badge green">Good standing</span>'}</td>
                  <td>${u.active ? '<span class="badge green">Enabled</span>' : '<span class="badge gray">Disabled</span>'}</td>
                  <td><div class="actions">
                    ${u.blocked ? `<button class="small" data-unblock="${u.id}">Unblock &amp; reset</button>` : ''}
                    <button class="small secondary" data-active="${u.id}" data-value="${!u.active}">${u.active ? 'Disable login' : 'Enable login'}</button>
                  </div></td>
                </tr>`).join('')}
            </table></div>`}
          </section>`;

        container.querySelectorAll('[data-tab]').forEach(b => {
            b.onclick = () => { currentTab = b.dataset.tab; draw(); };
        });
        const searchBox = container.querySelector('.search');
        searchBox.oninput = () => {
            search = searchBox.value;
            draw();
            const box = container.querySelector('.search');
            box.focus();
            box.setSelectionRange(search.length, search.length);
        };
        container.querySelectorAll('[data-unblock]').forEach(b => {
            b.onclick = () => run(async () => {
                await api('POST', `/api/admin/users/${b.dataset.unblock}/unblock`);
                await reload();
            }, 'Client unblocked and no-show count reset.');
        });
        container.querySelectorAll('[data-active]').forEach(b => {
            b.onclick = () => run(async () => {
                await api('POST', `/api/admin/users/${b.dataset.active}/active`, { active: b.dataset.value === 'true' });
                await reload();
            }, 'Account updated.');
        });
    }

    draw();
}
