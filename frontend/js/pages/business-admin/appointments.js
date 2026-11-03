// Business admin: every appointment in my business, with status tabs and a provider filter.
import { api } from '../../api.js';
import { session } from '../../session.js';
import { drawAppointmentsTable } from '../../components/appointments-table.js';

export async function renderBusinessAppointments(container) {
    const appointments = await api('GET', '/api/appointments');
    const providers = await api('GET', `/api/businesses/${session.user.businessId}/providers`);

    container.innerHTML = '<section class="card" id="business-table"></section>';
    drawAppointmentsTable(container.querySelector('#business-table'), {
        key: 'business-appointments',
        appointments: appointments,
        providers: providers,
        showProvider: true,
        reload: () => renderBusinessAppointments(container)
    });
}
