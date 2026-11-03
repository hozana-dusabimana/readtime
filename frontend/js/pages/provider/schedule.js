// Provider: today's schedule and attendance (mark completed / no-show).
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { nowInKigali, statCard, todayInKigali } from '../../utils.js';
import { drawAppointmentsTable } from '../../components/appointments-table.js';

export async function renderSchedule(container) {
    const appointments = await api('GET', '/api/appointments');
    const now = nowInKigali();
    const today = todayInKigali();

    const todayCount = appointments.filter(a => a.startAt.slice(0, 10) === today && a.status !== 'CANCELLED').length;
    const upcoming = appointments.filter(a => a.status === 'BOOKED' && a.startAt > now).length;
    const waiting = appointments.filter(a => a.status === 'BOOKED' && a.startAt <= now).length;
    const noShows = appointments.filter(a => a.status === 'NO_SHOW').length;

    container.innerHTML = `
      <div class="grid cols-4" style="margin-bottom: 20px;">
        ${statCard("Today's appointments", todayCount, 'Not counting cancelled ones', 'calendar', 'blue')}
        ${statCard('Upcoming', upcoming, 'Booked and not started yet', 'clock', 'green')}
        ${statCard('Pending attendance', waiting, 'Started - mark completed or no-show', 'alert', 'orange')}
        ${statCard('No-shows recorded', noShows, '3 no-shows block a client', 'shield', 'red')}
      </div>
      ${waiting > 0 ? `<div class="notice warning">${icon('alert')}<div><strong>${waiting} appointment(s) need attendance</strong>
          They have started. Use "Mark completed" or "Mark no-show" (pick the day in the table below).</div></div>` : ''}
      <section class="card" id="schedule-table"></section>`;

    drawAppointmentsTable(container.querySelector('#schedule-table'), {
        key: 'provider-schedule',
        appointments: appointments,
        byDate: true,
        reload: () => renderSchedule(container)
    });
}
