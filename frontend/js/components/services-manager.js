// Services table with add / edit pop-ups and an active switch.
// Provider: manages only their own services. Business admin: services of all their providers.
import { api } from '../api.js';
import { icon } from '../icons.js';
import { esc, emptyState, formData, money, optionsHtml, run, showDuration } from '../utils.js';
import { openModal } from './modal.js';

/**
 * providers: list of providers whose services are shown (one item for a provider, many for a business admin).
 * selectedProviderId: (optional) pre-selected provider filter.
 */
export async function drawServicesManager(container, providers, selectedProviderId) {
    const many = providers.length > 1;
    let filter = selectedProviderId ? String(selectedProviderId) : '';

    // Load the services of every provider
    let services = [];
    for (const p of providers) {
        services = services.concat(await api('GET', `/api/providers/${p.id}/services`));
    }
    const reload = () => drawServicesManager(container, providers, filter);

    const shown = filter ? services.filter(s => String(s.providerId) === filter) : services;
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div><h2>Service offerings</h2><p>${services.filter(s => s.active).length} active of ${services.length}.
               Inactive services cannot be booked.</p></div>
          <div class="row">
            ${many ? `<select class="provider-filter"><option value="">All providers</option>
                      ${optionsHtml(providers, p => p.id, p => p.fullName, '', filter)}</select>` : ''}
            <button class="add-service" ${providers.length === 0 ? 'disabled' : ''}>${icon('plus')} New service</button>
          </div>
        </div>
        ${shown.length === 0 ? emptyState(providers.length === 0 ? 'Add a provider first.' : 'No services yet.') : `
        <div class="table-wrap"><table>
          <tr><th>Service</th><th>Duration</th><th>Price</th>${many ? '<th>Provider</th>' : ''}<th>Available</th><th></th></tr>
          ${shown.map(s => `
            <tr>
              <td><strong>${esc(s.name)}</strong></td>
              <td><span class="badge blue">${showDuration(s.durationMinutes)}</span></td>
              <td>${money(s.price)}</td>
              ${many ? `<td>${esc(s.providerName)}</td>` : ''}
              <td><label class="switch" title="Active"><input type="checkbox" data-toggle="${s.id}" ${s.active ? 'checked' : ''}><span></span></label></td>
              <td><button class="secondary small" data-edit="${s.id}">${icon('edit')} Edit</button></td>
            </tr>`).join('')}
        </table></div>`}
      </div>`;

    const providerFilter = container.querySelector('.provider-filter');
    if (providerFilter) {
        providerFilter.onchange = () => { filter = providerFilter.value; reload(); };
    }
    container.querySelector('.add-service').onclick = () => openServiceForm(null, providers, filter, reload);
    container.querySelectorAll('[data-edit]').forEach(b => {
        b.onclick = () => openServiceForm(services.find(s => String(s.id) === b.dataset.edit), providers, filter, reload);
    });
    container.querySelectorAll('[data-toggle]').forEach(box => {
        box.onchange = () => {
            const s = services.find(x => String(x.id) === box.dataset.toggle);
            run(async () => {
                await api('PUT', `/api/services/${s.id}`,
                    { name: s.name, durationMinutes: s.durationMinutes, price: s.price, active: box.checked });
                await reload();
            }, box.checked ? 'Service is now available.' : 'Service is now hidden from clients.');
        };
    });
}

/** Pop-up form. service = null means "add a new one". */
function openServiceForm(service, providers, filter, reload) {
    const isNew = service === null;
    const modal = openModal(isNew ? 'New service' : 'Edit service', `
      <form novalidate>
        ${isNew && providers.length > 1 ? `<label>Provider <select name="providerId">
             ${optionsHtml(providers, p => p.id, p => p.fullName, '', filter)}</select></label>` : ''}
        <label>Service name <input name="name" value="${esc(service ? service.name : '')}"></label>
        <div class="grid cols-2" style="gap: 12px;">
          <label>Duration (minutes) <input name="durationMinutes" type="number" min="5" max="480"
                 value="${service ? service.durationMinutes : 30}"></label>
          <label>Price (RWF) <input name="price" type="number" min="0" value="${service ? service.price : 0}"></label>
        </div>
        <div class="modal-footer">
          <button type="button" class="secondary" data-close>Cancel</button>
          <button>${isNew ? 'Add service' : 'Save changes'}</button>
        </div>
      </form>`);

    modal.body.querySelector('form').onsubmit = event => {
        event.preventDefault();
        const f = formData(event.target);
        const data = { name: f.name, durationMinutes: Number(f.durationMinutes), price: Number(f.price) };
        run(async () => {
            if (isNew) {
                const providerId = f.providerId || providers[0].id;
                await api('POST', `/api/providers/${providerId}/services`, data);
            } else {
                await api('PUT', `/api/services/${service.id}`, { ...data, active: service.active });
            }
            modal.close();
            await reload();
        }, isNew ? 'Service added.' : 'Service saved.');
    };
}
