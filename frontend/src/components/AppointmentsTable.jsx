// Appointments table with status tabs and optional provider / date filters.
// Used by the provider schedule page.
import { useState } from 'react';
import { addDays, minutesBetween, prettyDate, showDuration, showTime, todayInKigali } from '../utils.js';
import { Icon } from './Icon.jsx';
import { EmptyState, Options, Person, StatusBadge } from './ui.jsx';
import { AppointmentActions } from './AppointmentActions.jsx';

const TABS = [
    { key: 'ALL', label: 'All' },
    { key: 'BOOKED', label: 'Booked' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
    { key: 'NO_SHOW', label: 'No-show' }
];

// Remembers the chosen tab / provider / date per table, so they stay after a reload or a page change.
const savedFilters = {};

/**
 * Props:
 *   filterKey     - a name for this table (used to remember the filters)
 *   appointments  - the list to show (already loaded)
 *   reload        - function that reloads the data (awaited after a change)
 *   providers     - (optional) list of providers -> shows a provider filter
 *   byDate        - (optional) true -> shows a date picker and only that day's appointments
 *   showProvider  - (optional) true -> shows the provider column
 */
export function AppointmentsTable({ filterKey, appointments, reload, providers, byDate, showProvider }) {
    const [filters, setFiltersState] = useState(() =>
        savedFilters[filterKey] || { tab: 'ALL', providerId: '', date: todayInKigali() });

    const setFilters = change => {
        setFiltersState(f => {
            const next = { ...f, ...change };
            savedFilters[filterKey] = next;
            return next;
        });
    };

    let list = appointments;
    if (filters.tab !== 'ALL') list = list.filter(a => a.status === filters.tab);
    if (filters.providerId) list = list.filter(a => String(a.providerId) === filters.providerId);
    if (byDate) list = list.filter(a => a.startAt.slice(0, 10) === filters.date);
    // Upcoming first when looking at one day; newest first otherwise
    list = [...list].sort((x, y) => byDate ? x.startAt.localeCompare(y.startAt) : y.startAt.localeCompare(x.startAt));

    return (
        <>
            <div className="card-header">
                <div className="tabs">
                    {TABS.map(t => (
                        <button key={t.key} data-tab={t.key} className={filters.tab === t.key ? 'active' : ''}
                                onClick={() => setFilters({ tab: t.key })}>{t.label}</button>
                    ))}
                </div>
                <div className="row">
                    {providers && (
                        <select className="provider-filter" value={filters.providerId} onChange={e => setFilters({ providerId: e.target.value })}>
                            <option value="">All providers</option>
                            <Options list={providers} valueOf={p => p.id} labelOf={p => p.fullName} emptyText="" />
                        </select>
                    )}
                    {byDate && (
                        <>
                            <button className="secondary icon-only day-prev" aria-label="Previous day"
                                    onClick={() => setFilters({ date: addDays(filters.date, -1) })}><Icon name="left" /></button>
                            <input type="date" className="day-input" value={filters.date} onChange={e => setFilters({ date: e.target.value })} />
                            <button className="secondary icon-only day-next" aria-label="Next day"
                                    onClick={() => setFilters({ date: addDays(filters.date, 1) })}><Icon name="right" /></button>
                            <button className="secondary day-today" onClick={() => setFilters({ date: todayInKigali() })}>Today</button>
                        </>
                    )}
                </div>
            </div>
            {list.length === 0 ? <EmptyState text="No appointments to show." /> : (
                <div className="table-wrap"><table><tbody>
                    <tr><th>Ref</th><th>Date &amp; time</th><th>Client</th><th>Service</th>
                        {showProvider && <th>Provider</th>}<th>Status</th><th>Actions</th></tr>
                    {list.map(a => (
                        <tr key={a.id}>
                            <td className="muted">#{a.id}</td>
                            <td><strong>{showTime(a.startAt)} - {showTime(a.endAt)}</strong>
                                <div className="muted">{prettyDate(a.startAt)}</div></td>
                            <td><Person name={a.clientName} sub={'Client #' + a.clientId} /></td>
                            <td>{a.serviceName}<div className="muted">{showDuration(minutesBetween(showTime(a.startAt), showTime(a.endAt)))}</div></td>
                            {showProvider && <td>{a.providerName}</td>}
                            <td><StatusBadge status={a.status} /></td>
                            <td><div className="actions"><AppointmentActions appointment={a} onDone={reload} /></div></td>
                        </tr>
                    ))}
                </tbody></table></div>
            )}
        </>
    );
}
