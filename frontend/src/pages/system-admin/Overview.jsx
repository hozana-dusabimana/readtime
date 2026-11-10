// System admin: platform overview.
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useLoad } from '../../auth/SessionContext.jsx';
import { EmptyState, Loading, Person, StatCard } from '../../components/ui.jsx';

export default function PlatformOverview() {
    const { data } = useLoad(async () => ({
        users: await api('GET', '/api/admin/users'),
        businesses: await api('GET', '/api/businesses'),
        appointments: await api('GET', '/api/appointments')
    }));

    if (!data) return <Loading />;
    const { users, businesses, appointments } = data;

    const count = role => users.filter(u => u.role === role).length;
    const clients = users.filter(u => u.role === 'CLIENT');
    const blocked = clients.filter(u => u.blocked).length;
    const warnings = clients.filter(u => !u.blocked && u.noShowCount > 0).length;
    const activeBusinesses = businesses.filter(b => b.active).length;
    const booked = appointments.filter(a => a.status === 'BOOKED').length;
    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
    const flagged = clients.filter(u => u.blocked || u.noShowCount > 0)
        .sort((x, y) => y.noShowCount - x.noShowCount).slice(0, 5);

    return (
        <>
            <div className="grid cols-4" style={{ marginBottom: 20 }}>
                <StatCard label="Platform users" value={users.length} icon="users" tone="blue"
                          note={`${count('CLIENT')} clients · ${count('PROVIDER')} providers · ${count('SYSTEM_ADMIN')} admins`} />
                <StatCard label="Businesses" value={businesses.length} icon="building" tone="green"
                          note={`${activeBusinesses} active · ${businesses.length - activeBusinesses} inactive`} />
                <StatCard label="Blocked clients" value={blocked} note={`${warnings} more with 1-2 no-shows`} icon="shield" tone="red" />
                <StatCard label="Appointments" value={appointments.length} note={`${booked} booked · ${completed} completed`} icon="calendar" tone="purple" />
            </div>

            <div className="grid cols-2">
                <section className="card">
                    <div className="card-header"><div><h2>Flagged clients</h2><p>Clients with no-shows</p></div>
                        <Link to="/moderation">Open moderation</Link></div>
                    {flagged.length === 0 ? <EmptyState text="No flagged clients." /> : (
                        <table><tbody>{flagged.map(u => (
                            <tr key={u.id}><td><Person name={u.fullName} sub={u.email} /></td>
                                <td><span className={'badge ' + (u.blocked ? 'red' : 'orange')}>{u.noShowCount} no-shows</span></td>
                                <td>{u.blocked ? <span className="badge red">Blocked</span> : <span className="badge orange">Warning</span>}</td></tr>
                        ))}</tbody></table>
                    )}
                </section>
                <section className="card">
                    <div className="card-header"><div><h2>Businesses</h2><p>Registered business accounts</p></div>
                        <Link to="/businesses">Manage</Link></div>
                    {businesses.length === 0 ? <EmptyState text="No businesses yet." /> : (
                        <table><tbody>{businesses.slice(0, 6).map(b => (
                            <tr key={b.id}><td><strong>{b.name}</strong><div className="muted">{b.address}</div></td>
                                <td><span className={'badge ' + (b.active ? 'green' : 'red')}>{b.active ? 'Active' : 'Suspended'}</span></td></tr>
                        ))}</tbody></table>
                    )}
                </section>
            </div>
        </>
    );
}
