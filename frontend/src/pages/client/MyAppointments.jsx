// Client: My appointments as cards, with Active / Past tabs.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useLoad } from '../../auth/SessionContext.jsx';
import { Icon } from '../../components/Icon.jsx';
import { Avatar, EmptyState, Loading, StatusBadge } from '../../components/ui.jsx';
import { AppointmentActions, clientCanChange } from '../../components/AppointmentActions.jsx';
import { nowInKigali, prettyDate, showTime } from '../../utils.js';

const TABS = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'PAST', label: 'Past' }
];

let savedTab = 'ALL';   // remembered while the app is open

export default function MyAppointments() {
    const [tab, setTabState] = useState(savedTab);
    const setTab = t => { savedTab = t; setTabState(t); };
    const { data, reload } = useLoad(async () => ({ appointments: await api('GET', '/api/appointments'), now: nowInKigali() }));

    if (!data) return <Loading />;
    const { appointments, now } = data;
    const isActive = a => a.status === 'BOOKED' && a.endAt > now;

    let list = appointments;
    if (tab === 'ACTIVE') list = list.filter(isActive);
    if (tab === 'PAST') list = list.filter(a => !isActive(a));
    // Active ones first (soonest first), then the rest (newest first)
    list = [...list].sort((x, y) => {
        if (isActive(x) !== isActive(y)) return isActive(x) ? -1 : 1;
        return isActive(x) ? x.startAt.localeCompare(y.startAt) : y.startAt.localeCompare(x.startAt);
    });

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <div><h2>My scheduled appointments</h2>
                        <p>{appointments.filter(isActive).length} active · {appointments.length} in total</p></div>
                    <div className="row">
                        <div className="tabs">
                            {TABS.map(t => (
                                <button key={t.key} data-tab={t.key} className={t.key === tab ? 'active' : ''}
                                        onClick={() => setTab(t.key)}>{t.label}</button>
                            ))}
                        </div>
                        <Link className="button" to="/book"><Icon name="plus" /> Book new</Link>
                    </div>
                </div>
                {list.length === 0 ? <EmptyState text="No appointments here yet." /> : (
                    <div className="grid cols-2">
                        {list.map(a => (
                            <div className="appt-card" key={a.id}>
                                <div className="top">
                                    <span className="section-label" style={{ margin: 0 }}>{isActive(a) ? 'Active appointment' : 'Past appointment'}</span>
                                    <StatusBadge status={a.status} />
                                </div>
                                <div className="person"><Avatar name={a.providerName} large />
                                    <div><strong>{a.providerName}</strong><div className="sub">{a.serviceName}</div></div></div>
                                <div className="when">
                                    <span><Icon name="calendar" /> {prettyDate(a.startAt)}</span>
                                    <span><Icon name="clock" /> {showTime(a.startAt)} - {showTime(a.endAt)}</span>
                                </div>
                                {a.status === 'BOOKED' ? (
                                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="muted">{clientCanChange(a)
                                            ? <><Icon name="check" /> Free cancellation until 2 hours before</>
                                            : <><Icon name="alert" /> Less than 2 hours left - changes are closed</>}</span>
                                        <div className="actions"><AppointmentActions appointment={a} onDone={reload} /></div>
                                    </div>
                                ) : <span className="muted">Ref #{a.id}</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="notice warning"><Icon name="info" />
                <div><strong>Cancellation and booking rules</strong>
                    You can have at most 2 active appointments. Cancel or reschedule at least 2 hours before the start.
                    After 3 no-shows your account is blocked from booking until a system admin unblocks it.</div></div>
        </>
    );
}
