// Actions on one appointment, shared by all pages that list appointments.
// The backend checks every rule (2-hour cutoff, who may do what); the frontend only asks.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useRun, useSession } from '../auth/SessionContext.jsx';
import { minusHours, nowInKigali, prettyDate, showTime, todayInKigali } from '../utils.js';
import { Modal } from './Modal.jsx';

export const CANCEL_CUTOFF_HOURS = 2;

/** True if the appointment's start time has passed (then it can be marked completed / no-show). */
export function hasStarted(appointment) {
    return appointment.startAt <= nowInKigali();
}

/** Clients may cancel/reschedule only until 2 hours before the start (exactly 2:00 is still allowed). */
export function clientCanChange(appointment) {
    return nowInKigali() <= minusHours(appointment.startAt, CANCEL_CUTOFF_HOURS);
}

/**
 * The buttons for one appointment, depending on its status and the user's role.
 * onDone: called after a change (usually "reload").
 */
export function AppointmentActions({ appointment: a, onDone }) {
    const { user } = useSession();
    const run = useRun();
    const [rescheduling, setRescheduling] = useState(false);
    const role = user.role;

    function cancel() {
        if (!window.confirm(`Cancel ${a.serviceName} on ${prettyDate(a.startAt)} at ${showTime(a.startAt)}?`)) return;
        run(async () => {
            await api('POST', `/api/appointments/${a.id}/cancel`);
            await onDone();
        }, 'Appointment cancelled.');
    }

    function markStatus(status) {
        const text = status === 'NO_SHOW' ? 'no-show (this counts towards blocking the client)' : 'completed';
        if (!window.confirm(`Mark ${a.clientName}'s appointment as ${text}?`)) return;
        run(async () => {
            await api('POST', `/api/appointments/${a.id}/status`, { status: status });
            await onDone();
        }, status === 'NO_SHOW' ? 'Marked as no-show.' : 'Marked as completed.');
    }

    if (a.status !== 'BOOKED' || role === 'SYSTEM_ADMIN') {
        return <span className="muted">-</span>;
    }

    let buttons;
    if (role === 'CLIENT') {
        const allowed = clientCanChange(a);
        buttons = (
            <>
                <button className="small secondary" data-action="reschedule" disabled={!allowed} onClick={() => setRescheduling(true)}>Reschedule</button>
                <button className="small danger" data-action="cancel" disabled={!allowed} onClick={cancel}>Cancel</button>
            </>
        );
    } else if (hasStarted(a)) {
        // Provider, after the start time
        buttons = (
            <>
                <button className="small success" data-action="COMPLETED" onClick={() => markStatus('COMPLETED')}>Mark completed</button>
                <button className="small danger" data-action="NO_SHOW" onClick={() => markStatus('NO_SHOW')}>Mark no-show</button>
            </>
        );
    } else {
        buttons = (
            <>
                <button className="small secondary" data-action="reschedule" onClick={() => setRescheduling(true)}>Reschedule</button>
                <button className="small danger" data-action="cancel" onClick={cancel}>Cancel</button>
            </>
        );
    }

    return (
        <>
            {buttons}
            {rescheduling && <RescheduleModal appointment={a} onClose={() => setRescheduling(false)} onDone={onDone} />}
        </>
    );
}

/** Pop-up with a date picker and the free slots; clicking a slot moves the appointment. */
function RescheduleModal({ appointment: a, onClose, onDone }) {
    const run = useRun();
    const [date, setDate] = useState(a.startAt.slice(0, 10));
    const [slots, setSlots] = useState(null);   // null = loading

    useEffect(() => {
        let current = true;
        setSlots(null);
        run(async () => {
            const list = await api('GET', `/api/services/${a.serviceId}/slots?date=${date}`);
            if (current) setSlots(list);
        });
        return () => { current = false; };
    }, [run, a.serviceId, date]);

    function move(start) {
        run(async () => {
            await api('POST', `/api/appointments/${a.id}/reschedule`, { startAt: start });
            onClose();
            await onDone();
        }, `Moved to ${prettyDate(start)} at ${showTime(start)}.`);
    }

    return (
        <Modal title="Reschedule appointment" onClose={onClose}>
            <p className="muted">{a.serviceName} with {a.providerName}<br />
                Now: {prettyDate(a.startAt)} at {showTime(a.startAt)}</p>
            <label>New date <input type="date" className="r-date" min={todayInKigali()} value={date}
                                   onChange={e => setDate(e.target.value)} /></label>
            <div className="section-label">Free times</div>
            <div className="slot-grid r-slots">
                {slots === null ? <span className="muted">Loading...</span>
                    : slots.length === 0 ? <span className="muted">No free times on this day.</span>
                    : slots.map(s => <button key={s} className="slot" data-start={s} onClick={() => move(s)}>{showTime(s)}</button>)}
            </div>
            <div className="modal-footer"><button className="secondary" onClick={onClose}>Close</button></div>
        </Modal>
    );
}
