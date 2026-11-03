// System admin: business accounts and their admins.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { emptyState, esc, formData, optionsHtml, run } from '../../utils.js';
import { openModal } from '../../components/modal.js';

export async function renderBusinesses(container) {
    const businesses = await api('GET', '/api/businesses');
    const users = await api('GET', '/api/admin/users');
    const reload = () => renderBusinesses(container);

    const adminsOf = id => users.filter(u => u.role === 'BUSINESS_ADMIN' && u.businessId === id);
    const providerCount = id => users.filter(u => u.role === 'PROVIDER' && u.businessId === id).length;

    container.innerHTML = `
      <section class="card">
        <div class="card-header">
          <div><h2>Registered businesses</h2><p>${businesses.length} business account(s)</p></div>
          <button id="add-business">${icon('plus')} Add business</button>
        </div>
        ${businesses.length === 0 ? emptyState('No businesses yet. Add the first one.') : `
        <div class="table-wrap"><table>
          <tr><th>Business</th><th>Business admins</th><th>Providers</th><th>Status</th><th>Actions</th></tr>
          ${businesses.map(b => `
            <tr>
              <td><strong>${esc(b.name)}</strong><div class="muted">${esc(b.address)}</div></td>
              <td>${adminsOf(b.id).map(a => esc(a.fullName)).join('<br>') || '<span class="muted">None yet</span>'}</td>
              <td>${providerCount(b.id)}</td>
              <td><span class="badge ${b.active ? 'green' : 'red'}">${b.active ? 'Active' : 'Suspended'}</span></td>
              <td><div class="actions">
                <button class="small secondary" data-add-admin="${b.id}">${icon('user')} Add admin</button>
                <button class="small ${b.active ? 'danger' : 'success'}" data-business="${b.id}" data-value="${!b.active}">
                  ${b.active ? 'Suspend' : 'Activate'}</button>
              </div></td>
            </tr>`).join('')}
        </table></div>`}
      </section>
      <div class="notice">${icon('info')}<div>A suspended business stays in the system, but clients can no longer
        see it or book its providers.</div></div>`;

    container.querySelector('#add-business').onclick = () => openAddBusiness(reload);
    container.querySelectorAll('[data-add-admin]').forEach(b => {
        b.onclick = () => openAddAdmin(businesses, b.dataset.addAdmin, reload);
    });
    container.querySelectorAll('[data-business]').forEach(b => {
        b.onclick = () => run(async () => {
            await api('POST', `/api/admin/businesses/${b.dataset.business}/active`, { active: b.dataset.value === 'true' });
            await reload();
        }, 'Business updated.');
    });
}

function openAddBusiness(onDone) {
    const modal = openModal('Add a business', `
      <form novalidate>
        <label>Business name <input name="name"></label>
        <label>Address <input name="address"></label>
        <div class="modal-footer">
          <button type="button" class="secondary" data-close>Cancel</button>
          <button>Add business</button>
        </div>
      </form>`);
    modal.body.querySelector('form').onsubmit = event => {
        event.preventDefault();
        run(async () => {
            await api('POST', '/api/admin/businesses', formData(event.target));
            modal.close();
            await onDone();
        }, 'Business added.');
    };
}

function openAddAdmin(businesses, businessId, onDone) {
    const modal = openModal('Add a business admin', `
      <form novalidate>
        <label>Business <select name="businessId">
          ${optionsHtml(businesses, b => b.id, b => b.name, 'No businesses', businessId)}</select></label>
        <label>Full name <input name="fullName"></label>
        <label>Email <input name="email"></label>
        <label>Temporary password (8-64 characters) <input name="password" type="password"></label>
        <div class="modal-footer">
          <button type="button" class="secondary" data-close>Cancel</button>
          <button>Add business admin</button>
        </div>
      </form>`);
    modal.body.querySelector('form').onsubmit = event => {
        event.preventDefault();
        const f = formData(event.target);
        run(async () => {
            await api('POST', `/api/admin/businesses/${f.businessId}/admins`, f);
            modal.close();
            await onDone();
        }, 'Business admin added.');
    };
}
