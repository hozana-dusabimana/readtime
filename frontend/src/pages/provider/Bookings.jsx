// Provider: every booking of every day (the Schedule page only shows one day at a time).
import { api } from '../../api.js';
import { useLoad } from '../../auth/SessionContext.jsx';
import { Loading, StatCard } from '../../components/ui.jsx';
import { AppointmentsTable } from '../../components/AppointmentsTable.jsx';

export default function Bookings() {
    const { data: appointments, reload } = useLoad(() => api('GET', '/api/appointments'));

    if (!appointments) return <Loading />;

    const count = status => appointments.filter(a => a.status === status).length;

    return (
        <>
            <div className="grid cols-4" style={{ marginBottom: 20 }}>
                <StatCard label="All bookings" value={appointments.length} note="Every day, every status" icon="list" tone="blue" />
                <StatCard label="Booked" value={count('BOOKED')} note="Waiting for the visit" icon="clock" tone="green" />
                <StatCard label="Completed" value={count('COMPLETED')} note="Visits that took place" icon="calendar" tone="orange" />
                <StatCard label="Cancelled / no-show" value={count('CANCELLED') + count('NO_SHOW')} note="Did not take place" icon="alert" tone="red" />
            </div>
            <section className="card" id="bookings-table">
                <AppointmentsTable filterKey="provider-bookings" appointments={appointments} reload={reload} />
            </section>
        </>
    );
}
