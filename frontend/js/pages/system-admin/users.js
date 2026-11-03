// System admin: every user account, with a role filter and search.
import { api } from '../../api.js';
import { session } from '../../session.js';
import { icon } from '../../icons.js';
import { ROLE_NAMES, emptyState, esc, formData, optionsHtml, person, run } from '../../utils.js';
import { openModal } from '../../components/modal.js';

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
                <button id="add-user">${icon('plus')} Register account</button>
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
                  <td><div class="actions">
                    <button class="small secondary" data-edit-user="${u.id}">${icon('edit')} Edit</button>
                    ${u.id === session.user.id ? '<span class="muted">(you)</span>' :
                      `<button class="small ${u.active ? 'danger' : 'success'}" data-user="${u.id}" data-value="${!u.active}">
                         ${u.active ? 'Disable' : 'Enable'}</button>`}</div></td>
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
        container.querySelector('#add-user').onclick = () => openUserForm(null, businesses, reload);
        container.querySelectorAll('[data-edit-user]').forEach(b => {
            b.onclick = () => openUserForm(users.find(u => String(u.id) === b.dataset.editUser), businesses, reload);
        });
        container.querySelectorAll('[data-user]').forEach(b => {
            b.onclick = () => run(async () => {
                await api('POST', `/api/admin/users/${b.dataset.user}/active`, { active: b.dataset.value === 'true' });
                await reload();
            }, 'Account updated.');
        });
    }

    draw();
}

/**
 * user = null: register a new account of any role.
 * Otherwise edit name, email, business (providers only) and optionally set a new password.
 * The role is chosen when the account is created and cannot be changed later.
 */
function openUserForm(user, businesses, onDone) {
    const isNew = user === null;
    const role = isNew ? 'CLIENT' : user.role;
    const modal = openModal(isNew ? 'Register an account' : 'Edit account', `
      <form novalidate>
        ${isNew ? `<label>Role <select name="role" class="u-role">
            ${Object.keys(ROLE_NAMES).map(r => `<option value="${r}">${ROLE_NAMES[r]}</option>`).join('')}</select></label>`
          : `<p class="muted">Role: <strong>${ROLE_NAMES[role]}</strong></p>`}
        <label class="u-business" ${role === 'PROVIDER' ? '' : 'hidden'}>Business <select name="businessId">
          ${optionsHtml(businesses, b => b.id, b => b.name, 'Add a business first', isNew ? '' : user.businessId)}</select></label>
        <label>Full name <input name="fullName" value="${esc(isNew ? '' : user.fullName)}"></label>
        <label>Email <input name="email" value="${esc(isNew ? '' : user.email)}"></label>
        <label>${isNew ? 'Password (8-64 characters)' : 'New password (leave empty to keep the current one)'}
          <input name="${isNew ? 'password' : 'newPassword'}" type="password" autocomplete="new-password"></label>
        <div class="modal-footer">
          <button type="button" class="secondary" data-close>Cancel</button>
          <button>${isNew ? 'Register account' : 'Save changes'}</button>
        </div>
      </form>`);

    const roleSelect = modal.body.querySelector('.u-role');
    if (roleSelect) {
        roleSelect.onchange = () => { modal.body.querySelector('.u-business').hidden = roleSelect.value !== 'PROVIDER'; };
    }

    modal.body.querySelector('form').onsubmit = event => {
        event.preventDefault();
        const f = formData(event.target);
        const isProvider = (isNew ? f.role : role) === 'PROVIDER';
        const businessId = isProvider && f.businessId ? Number(f.businessId) : null;
        run(async () => {
            if (isNew) {
                await api('POST', '/api/admin/users', { fullName: f.fullName, email: f.email, password: f.password,
                                                        role: f.role, businessId: businessId });
            } else {
                await api('PUT', `/api/admin/users/${user.id}`, { fullName: f.fullName, email: f.email,
                                                                  businessId: businessId, newPassword: f.newPassword });
            }
            modal.close();
            await onDone();
        }, isNew ? 'Account registered.' : 'Account saved.');
    };
}
