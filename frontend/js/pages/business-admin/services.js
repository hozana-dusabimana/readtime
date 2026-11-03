// Business admin: services of all providers in my business.
// The address #/services?provider=5 opens the page filtered to one provider.
import { api } from '../../api.js';
import { session } from '../../session.js';
import { drawServicesManager } from '../../components/services-manager.js';

export async function renderBusinessServices(container, params) {
    const providers = await api('GET', `/api/businesses/${session.user.businessId}/providers`);
    await drawServicesManager(container, providers, params.provider);
}
