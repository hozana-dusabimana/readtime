// Provider: today's schedule and attendance (mark completed / no-show).
import { api } from '../../api.js';
import { useLoad } from '../../auth/SessionContext.jsx';
import { Icon } from '../../components/Icon.jsx';
import { Loading, StatCard } from '../../components/ui.jsx';
import { AppointmentsTable } from '../../components/AppointmentsTable.jsx';
import { nowInKigali, todayInKigali } from '../../utils.js';

export default function Schedule() {
    const { data, reload } = useLoad(async () => ({
        appointments: await api('GET', '/api/appointments'),
        now: nowInKigali(),
        today: todayInKigali()
    }));

    if (!data) return <Loading />;
    const { appointments, now, today } = data;

    const todayCount = appointments.filter(a => a.startAt.slice(0, 10) === today && a.status !== 'CANCELLED').length;
    const upcoming = appointments.filter(a => a.status === 'BOOKED' && a.startAt > now).length;
    const waiting = appointments.filter(a => a.status === 'BOOKED' && a.startAt <= now).length;
    const noShows = appointments.filter(a => a.status === 'NO_SHOW').length;

    return (
        <>
            <div className="grid cols-4" style={{ marginBottom: 20 }}>
                <StatCard label="Today's appointments" value={todayCount} note="Not counting cancelled ones" icon="calendar" tone="blue" />
                <StatCard label="Upcoming" value={upcoming} note="Booked and not started yet" icon="clock" tone="green" />
                <StatCard label="Pending attendance" value={waiting} note="Started - mark completed or no-show" icon="alert" tone="orange" />
                <StatCard label="No-shows recorded" value={noShows} note="3 no-shows block a client" icon="shield" tone="red" />
            </div>
            {waiting > 0 && (
                <div className="notice warning"><Icon name="alert" /><div><strong>{waiting} appointment(s) need attendance</strong>
                    They have started. Use &quot;Mark completed&quot; or &quot;Mark no-show&quot; (pick the day in the table below).</div></div>
            )}
            <section className="card" id="schedule-table">
                <AppointmentsTable filterKey="provider-schedule" appointments={appointments} byDate reload={reload} />
            </section>
        </>
    );
}
