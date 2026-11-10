// System admin: client moderation - no-shows, blocked clients, unblocking.
import { useState } from 'react';
import { api } from '../../api.js';
import { useLoad, useRun } from '../../auth/SessionContext.jsx';
import { Icon } from '../../components/Icon.jsx';
import { EmptyState, Loading, Person } from '../../components/ui.jsx';

const MAX_NO_SHOWS = 3;
const TABS = [
    { key: 'FLAGGED', label: 'Flagged' },
    { key: 'BLOCKED', label: 'Blocked' },
    { key: 'ALL', label: 'All clients' }
];

// Remembered while the app is open
const saved = { tab: 'FLAGGED', search: '' };

export default function Moderation() {
    const run = useRun();
    const [tab, setTabState] = useState(saved.tab);
    const [search, setSearchState] = useState(saved.search);
    const setTab = t => { saved.tab = t; setTabState(t); };
    const setSearch = s => { saved.search = s; setSearchState(s); };

    const { data: users, reload } = useLoad(() => api('GET', '/api/admin/users'));
    if (!users) return <Loading />;

    const clients = users.filter(u => u.role === 'CLIENT');
    const isFlagged = u => u.blocked || u.noShowCount > 0;
    const counts = { FLAGGED: clients.filter(isFlagged).length, BLOCKED: clients.filter(u => u.blocked).length, ALL: clients.length };

    let list = clients;
    if (tab === 'FLAGGED') list = list.filter(isFlagged);
    if (tab === 'BLOCKED') list = list.filter(u => u.blocked);
    if (search) {
        const s = search.toLowerCase();
        list = list.filter(u => u.fullName.toLowerCase().includes(s) || u.email.includes(s));
    }
    list = [...list].sort((x, y) => y.noShowCount - x.noShowCount);

    const unblock = u => run(async () => {
        await api('POST', `/api/admin/users/${u.id}/unblock`);
        await reload();
    }, 'Client unblocked and no-show count reset.');

    const setActive = u => run(async () => {
        await api('POST', `/api/admin/users/${u.id}/active`, { active: !u.active });
        await reload();
    }, 'Account updated.');

    return (
        <>
            <div className="notice"><Icon name="shield" />
                <div><strong>Rule: {MAX_NO_SHOWS} no-shows block a client</strong>
                    A blocked client cannot make new bookings. Only a system admin can unblock a client;
                    unblocking resets the no-show count to 0. Appeals are handled outside the app.</div></div>

            <section className="card">
                <div className="card-header">
                    <div className="tabs">
                        {TABS.map(t => (
                            <button key={t.key} data-tab={t.key} className={t.key === tab ? 'active' : ''}
                                    onClick={() => setTab(t.key)}>{t.label} ({counts[t.key]})</button>
                        ))}
                    </div>
                    <input className="search" placeholder="Search name or email" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {list.length === 0 ? <EmptyState text="No clients to show." /> : (
                    <div className="table-wrap"><table><tbody>
                        <tr><th>Client</th><th>No-shows</th><th>Account status</th><th>Login</th><th>Actions</th></tr>
                        {list.map(u => (
                            <tr key={u.id}>
                                <td><Person name={u.fullName} sub={u.email} /></td>
                                <td><span className={'badge ' + (u.noShowCount >= MAX_NO_SHOWS ? 'red' : u.noShowCount > 0 ? 'orange' : 'gray')}>
                                    {u.noShowCount} / {MAX_NO_SHOWS}</span></td>
                                <td>{u.blocked ? <span className="badge red">Blocked</span>
                                    : u.noShowCount > 0 ? <span className="badge orange">Warning ({u.noShowCount}/{MAX_NO_SHOWS})</span>
                                    : <span className="badge green">Good standing</span>}</td>
                                <td>{u.active ? <span className="badge green">Enabled</span> : <span className="badge gray">Disabled</span>}</td>
                                <td><div className="actions">
                                    {u.blocked && <button className="small" data-unblock={u.id} onClick={() => unblock(u)}>Unblock &amp; reset</button>}
                                    <button className="small secondary" data-active={u.id} onClick={() => setActive(u)}>
                                        {u.active ? 'Disable login' : 'Enable login'}</button>
                                </div></td>
                            </tr>
                        ))}
                    </tbody></table></div>
                )}
            </section>
        </>
    );
}
