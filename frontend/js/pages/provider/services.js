// Provider: my services.
import { session } from '../../session.js';
import { drawServicesManager } from '../../components/services-manager.js';

export async function renderMyServices(container) {
    await drawServicesManager(container, [session.user]);
}
