// System admin: businesses and their service providers.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { emptyState, esc, formData, optionsHtml, run } from '../../utils.js';
import { openModal } from '../../components/modal.js';

export async function renderBusinesses(container) {
    const businesses = await api('GET', '/api/businesses');
    const users = await api('GET', '/api/admin/users');
    const reload = () => renderBusinesses(container);

    const providersOf = id => users.filter(u => u.role === 'PROVIDER' && u.businessId === id);

    container.innerHTML = `
      <section class="card">
        <div class="card-header">
          <div><h2>Registered businesses</h2><p>${businesses.length} business account(s)</p></div>
          <button id="add-business">${icon('plus')} Add business</button>
        </div>
        ${businesses.length === 0 ? emptyState('No businesses yet. Add the first one.') : `
        <div class="table-wrap"><table>
          <tr><th>Business</th><th>Service providers</th><th>Status</th><th>Actions</th></tr>
          ${businesses.map(b => `
            <tr>
              <td><strong>${esc(b.name)}</strong><div class="muted">${esc(b.address)}</div></td>
              <td>${providersOf(b.id).map(p => esc(p.fullName)).join('<br>') || '<span class="muted">None yet</span>'}</td>
              <td><span class="badge ${b.active ? 'green' : 'red'}">${b.active ? 'Active' : 'Suspended'}</span></td>
              <td><div class="actions">
                <button class="small secondary" data-edit-business="${b.id}">${icon('edit')} Edit</button>
                <button class="small secondary" data-add-provider="${b.id}">${icon('user')} Add provider</button>
                <button class="small ${b.active ? 'danger' : 'success'}" data-business="${b.id}" data-value="${!b.active}">
                  ${b.active ? 'Suspend' : 'Activate'}</button>
              </div></td>
            </tr>`).join('')}
        </table></div>`}
      </section>
      <div class="notice">${icon('info')}<div>A suspended business stays in the system, but clients can no longer
        see it or book its providers.</div></div>`;

    container.querySelector('#add-business').onclick = () => openBusinessForm(null, reload);
    container.querySelectorAll('[data-edit-business]').forEach(b => {
        b.onclick = () => openBusinessForm(businesses.find(x => String(x.id) === b.dataset.editBusiness), reload);
    });
    container.querySelectorAll('[data-add-provider]').forEach(b => {
        b.onclick = () => openAddProvider(businesses, b.dataset.addProvider, reload);
    });
    container.querySelectorAll('[data-business]').forEach(b => {
        b.onclick = () => run(async () => {
            await api('POST', `/api/admin/businesses/${b.dataset.business}/active`, { active: b.dataset.value === 'true' });
            await reload();
        }, 'Business updated.');
    });
}

/** business = null means "add a new business"; otherwise the business is edited. */
function openBusinessForm(business, onDone) {
    const isNew = business === null;
    const modal = openModal(isNew ? 'Add a business' : 'Edit business', `
      <form novalidate>
        <label>Business name <input name="name" value="${esc(isNew ? '' : business.name)}"></label>
        <label>Address <input name="address" value="${esc(isNew ? '' : business.address)}"></label>
        <div class="modal-footer">
          <button type="button" class="secondary" data-close>Cancel</button>
          <button>${isNew ? 'Add business' : 'Save changes'}</button>
        </div>
      </form>`);
    modal.body.querySelector('form').onsubmit = event => {
        event.preventDefault();
        run(async () => {
            if (isNew) await api('POST', '/api/admin/businesses', formData(event.target));
            else await api('PUT', `/api/admin/businesses/${business.id}`, formData(event.target));
            modal.close();
            await onDone();
        }, isNew ? 'Business added.' : 'Business saved.');
    };
}

function openAddProvider(businesses, businessId, onDone) {
    const modal = openModal('Add a service provider', `
      <form novalidate>
        <label>Business <select name="businessId">
          ${optionsHtml(businesses, b => b.id, b => b.name, 'No businesses', businessId)}</select></label>
        <label>Full name <input name="fullName"></label>
        <label>Email <input name="email"></label>
        <label>Temporary password (8-64 characters) <input name="password" type="password"></label>
        <div class="modal-footer">
          <button type="button" class="secondary" data-close>Cancel</button>
          <button>Add provider</button>
        </div>
      </form>`);
    modal.body.querySelector('form').onsubmit = event => {
        event.preventDefault();
        const f = formData(event.target);
        run(async () => {
            await api('POST', `/api/admin/businesses/${f.businessId}/providers`, f);
            modal.close();
            await onDone();
        }, 'Service provider added.');
    };
}
