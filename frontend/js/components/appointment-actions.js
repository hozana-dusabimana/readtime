// Actions on one appointment, shared by all pages that list appointments.
// The backend checks every rule (2-hour cutoff, who may do what); the frontend only asks.
import { api } from '../api.js';
import { session } from '../session.js';
import { esc, minusHours, nowInKigali, prettyDate, run, showTime, todayInKigali } from '../utils.js';
import { openModal } from './modal.js';

export const CANCEL_CUTOFF_HOURS = 2;

/** True if the appointment's start time has passed (then it can be marked completed / no-show). */
export function hasStarted(appointment) {
    return appointment.startAt <= nowInKigali();
}

/** Clients may cancel/reschedule only until 2 hours before the start (exactly 2:00 is still allowed). */
export function clientCanChange(appointment) {
    return nowInKigali() <= minusHours(appointment.startAt, CANCEL_CUTOFF_HOURS);
}

/** The buttons for one appointment, depending on its status and the user's role. */
export function actionButtons(a) {
    const role = session.user.role;
    if (a.status !== 'BOOKED' || role === 'SYSTEM_ADMIN') {
        return '<span class="muted">-</span>';
    }
    if (role === 'CLIENT') {
        const allowed = clientCanChange(a);
        return `
          <button class="small secondary" data-action="reschedule" data-id="${a.id}" ${allowed ? '' : 'disabled'}>Reschedule</button>
          <button class="small danger" data-action="cancel" data-id="${a.id}" ${allowed ? '' : 'disabled'}>Cancel</button>`;
    }
    // Provider
    if (hasStarted(a)) {
        return `
          <button class="small success" data-action="COMPLETED" data-id="${a.id}">Mark completed</button>
          <button class="small danger" data-action="NO_SHOW" data-id="${a.id}">Mark no-show</button>`;
    }
    return `
      <button class="small secondary" data-action="reschedule" data-id="${a.id}">Reschedule</button>
      <button class="small danger" data-action="cancel" data-id="${a.id}">Cancel</button>`;
}

/**
 * Connects all action buttons inside a container.
 * appointments: the list that was drawn; onDone: called after a change (usually "reload").
 */
export function connectActionButtons(container, appointments, onDone) {
    container.querySelectorAll('[data-action]').forEach(button => {
        const appointment = appointments.find(a => String(a.id) === button.dataset.id);
        const action = button.dataset.action;
        button.onclick = () => {
            if (action === 'cancel') cancelAppointment(appointment, onDone);
            else if (action === 'reschedule') openReschedule(appointment, onDone);
            else markStatus(appointment, action, onDone);
        };
    });
}

export function cancelAppointment(a, onDone) {
    if (!confirm(`Cancel ${a.serviceName} on ${prettyDate(a.startAt)} at ${showTime(a.startAt)}?`)) return;
    run(async () => {
        await api('POST', `/api/appointments/${a.id}/cancel`);
        await onDone();
    }, 'Appointment cancelled.');
}

export function markStatus(a, status, onDone) {
    const text = status === 'NO_SHOW' ? 'no-show (this counts towards blocking the client)' : 'completed';
    if (!confirm(`Mark ${a.clientName}'s appointment as ${text}?`)) return;
    run(async () => {
        await api('POST', `/api/appointments/${a.id}/status`, { status: status });
        await onDone();
    }, status === 'NO_SHOW' ? 'Marked as no-show.' : 'Marked as completed.');
}

/** Pop-up with a date picker and the free slots; clicking a slot moves the appointment. */
export function openReschedule(a, onDone) {
    const modal = openModal('Reschedule appointment', `
      <p class="muted">${esc(a.serviceName)} with ${esc(a.providerName)}<br>
         Now: ${prettyDate(a.startAt)} at ${showTime(a.startAt)}</p>
      <label>New date <input type="date" class="r-date" min="${todayInKigali()}" value="${a.startAt.slice(0, 10)}"></label>
      <div class="section-label">Free times</div>
      <div class="slot-grid r-slots"></div>
      <div class="modal-footer"><button class="secondary" data-close>Close</button></div>`);

    const dateInput = modal.body.querySelector('.r-date');
    const slotsBox = modal.body.querySelector('.r-slots');

    const loadSlots = () => run(async () => {
        slotsBox.innerHTML = '<span class="muted">Loading...</span>';
        const slots = await api('GET', `/api/services/${a.serviceId}/slots?date=${dateInput.value}`);
        if (slots.length === 0) {
            slotsBox.innerHTML = '<span class="muted">No free times on this day.</span>';
            return;
        }
        slotsBox.innerHTML = slots.map(s => `<button class="slot" data-start="${s}">${showTime(s)}</button>`).join('');
        slotsBox.querySelectorAll('[data-start]').forEach(button => {
            button.onclick = () => run(async () => {
                await api('POST', `/api/appointments/${a.id}/reschedule`, { startAt: button.dataset.start });
                modal.close();
                await onDone();
            }, `Moved to ${prettyDate(button.dataset.start)} at ${showTime(button.dataset.start)}.`);
        });
    });
    dateInput.onchange = loadSlots;
    loadSlots();
}
