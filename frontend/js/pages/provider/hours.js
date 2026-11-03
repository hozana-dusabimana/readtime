// Provider: my weekly working hours.
import { session } from '../../session.js';
import { drawHoursEditor } from '../../components/hours-editor.js';

export async function renderMyHours(container) {
    await drawHoursEditor(container, session.user.id);
}
