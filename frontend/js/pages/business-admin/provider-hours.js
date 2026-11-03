// Business admin: working hours of ONE provider. Opened from the roster: #/provider-hours?id=5
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { session } from '../../session.js';
import { avatar, esc } from '../../utils.js';
import { drawHoursEditor } from '../../components/hours-editor.js';

export async function renderProviderHours(container, params) {
    const providers = await api('GET', `/api/businesses/${session.user.businessId}/providers`);
    const provider = providers.find(p => String(p.id) === params.id);
    if (!provider) {
        container.innerHTML = `<div class="notice danger">${icon('alert')}<div>Provider not found.
            <a href="#/providers">Back to providers</a></div></div>`;
        return;
    }

    container.innerHTML = `
      <section class="card">
        <div class="card-header" style="margin: 0;">
          <div class="person">${avatar(provider.fullName, true)}
            <div><h2>${esc(provider.fullName)}</h2><div class="sub">${esc(provider.email)}</div></div></div>
          <a class="button secondary" href="#/providers">${icon('left')} Back to providers</a>
        </div>
      </section>
      <div id="hours-editor"></div>`;

    await drawHoursEditor(container.querySelector('#hours-editor'), provider.id);
}
