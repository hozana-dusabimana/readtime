// System admin: every user account, with a role filter and search.
import { api } from '../../api.js';
import { session } from '../../session.js';
import { ROLE_NAMES, emptyState, esc, person, run } from '../../utils.js';

let roleFilter = '';
let search = '';

export async function renderUsers(container) {
    const users = await api('GET', '/api/admin/users');
    const businesses = await api('GET', '/api/businesses');
    const businessName = id => {
        const b = businesses.find(x => x.id === id);
        return b ? b.name : '';
    };
    const reload = () => renderUsers(container);

    function draw() {
        let list = users;
        if (roleFilter) list = list.filter(u => u.role === roleFilter);
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(u => u.fullName.toLowerCase().includes(s) || u.email.includes(s));
        }

        container.innerHTML = `
          <section class="card">
            <div class="card-header">
              <div><h2>All accounts</h2><p>${users.length} accounts · ${users.filter(u => !u.active).length} disabled</p></div>
              <div class="row">
                <select class="role-filter">
                  <option value="">All roles</option>
                  ${Object.keys(ROLE_NAMES).map(r => `<option value="${r}" ${r === roleFilter ? 'selected' : ''}>${ROLE_NAMES[r]}</option>`).join('')}
                </select>
                <input class="search" placeholder="Search name or email" value="${search.replace(/"/g, '&quot;')}">
              </div>
            </div>
            ${list.length === 0 ? emptyState('No accounts match.') : `
            <div class="table-wrap"><table>
              <tr><th>User</th><th>Role</th><th>Business</th><th>No-shows</th><th>Login</th><th>Actions</th></tr>
              ${list.map(u => `
                <tr>
                  <td>${person(u.fullName, u.email)}</td>
                  <td><span class="badge blue">${ROLE_NAMES[u.role]}</span></td>
                  <td>${esc(businessName(u.businessId)) || '<span class="muted">-</span>'}</td>
                  <td>${u.role === 'CLIENT' ? u.noShowCount + (u.blocked ? ' <span class="badge red">Blocked</span>' : '') : '<span class="muted">-</span>'}</td>
                  <td>${u.active ? '<span class="badge green">Enabled</span>' : '<span class="badge gray">Disabled</span>'}</td>
                  <td>${u.id === session.user.id ? '<span class="muted">(you)</span>' :
                      `<button class="small ${u.active ? 'danger' : 'success'}" data-user="${u.id}" data-value="${!u.active}">
                         ${u.active ? 'Disable' : 'Enable'}</button>`}</td>
                </tr>`).join('')}
            </table></div>`}
          </section>`;

        container.querySelector('.role-filter').onchange = e => { roleFilter = e.target.value; draw(); };
        const searchBox = container.querySelector('.search');
        searchBox.oninput = () => {
            search = searchBox.value;
            draw();
            const box = container.querySelector('.search');
            box.focus();
            box.setSelectionRange(search.length, search.length);
        };
        container.querySelectorAll('[data-user]').forEach(b => {
            b.onclick = () => run(async () => {
                await api('POST', `/api/admin/users/${b.dataset.user}/active`, { active: b.dataset.value === 'true' });
                await reload();
            }, 'Account updated.');
        });
    }

    draw();
}
