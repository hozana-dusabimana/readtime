// Reports (System Admin: all appointments, Service Provider: own appointments).
// Pick a date range; see totals, a breakdown per provider and per service, and download a CSV file.
import { useState } from 'react';
import { api } from '../../api.js';
import { useLoad, useRun, useSession } from '../../auth/SessionContext.jsx';
import { Icon } from '../../components/Icon.jsx';
import { EmptyState, Loading, StatCard, StatusBadge } from '../../components/ui.jsx';
import { addDays, money, prettyDate, showTime, todayInKigali } from '../../utils.js';

let savedRange = null;   // the last period that loaded, remembered per user while logged in

function presets() {
    const today = todayInKigali();
    return [
        { key: 'today', label: 'Today', from: today, to: today },
        { key: '7', label: 'Last 7 days', from: addDays(today, -6), to: today },
        { key: 'month', label: 'This month', from: today.slice(0, 8) + '01', to: today },
        { key: '30', label: 'Last 30 days', from: addDays(today, -29), to: today },
        { key: 'next30', label: 'Next 30 days', from: today, to: addDays(today, 29) }
    ];
}

const loadReport = range => api('GET', `/api/reports/appointments?from=${range.from}&to=${range.to}`);

export default function Reports() {
    const { user } = useSession();
    const run = useRun();
    const isAdmin = user.role === 'SYSTEM_ADMIN';

    // { range, report }. Only a period that loaded is remembered as the current one.
    const { data, setData } = useLoad(async () => {
        if (!savedRange || savedRange.userId !== user.id) {
            const month = presets().find(p => p.key === 'month');
            savedRange = { userId: user.id, from: month.from, to: month.to };
        }
        const range = savedRange;
        return { range: range, report: await loadReport(range), seq: 0 };
    });

    if (!data) return <Loading />;

    // run() shows the error message if the backend refuses (e.g. end date before start date)
    const load = (from, to) => run(async () => {
        const wanted = { userId: user.id, from: from, to: to };
        const report = await loadReport(wanted);
        savedRange = wanted;
        setData(d => ({ range: wanted, report: report, seq: d.seq + 1 }));
    });

    // key: every loaded report starts with fresh From / To fields
    return <ReportView key={data.seq} range={data.range} report={data.report} isAdmin={isAdmin} load={load} />;
}

function ReportView({ range, report, isAdmin, load }) {
    const [from, setFrom] = useState(range.from);
    const [to, setTo] = useState(range.to);
    const t = report.totals;

    return (
        <>
            <section className="card">
                <div className="card-header" style={{ marginBottom: 0 }}>
                    <div className="row">
                        <label>From <input type="date" id="r-from" value={from} onChange={e => setFrom(e.target.value)} /></label>
                        <label>To <input type="date" id="r-to" value={to} onChange={e => setTo(e.target.value)} /></label>
                        <button id="r-run" onClick={() => load(from, to)}><Icon name="chart" /> Show report</button>
                    </div>
                    <div className="row">
                        <button className="secondary" id="r-csv" disabled={report.rows.length === 0}
                                onClick={() => downloadCsv(report, isAdmin)}><Icon name="download" /> Download CSV</button>
                        <button className="secondary" id="r-print" onClick={() => window.print()}><Icon name="printer" /> Print</button>
                    </div>
                </div>
                <div className="tabs" style={{ marginTop: 14 }}>
                    {presets().map(p => (
                        <button key={p.key} data-preset={p.key} className={p.from === range.from && p.to === range.to ? 'active' : ''}
                                onClick={() => load(p.from, p.to)}>{p.label}</button>
                    ))}
                </div>
            </section>

            <p className="muted" id="r-title">{isAdmin ? 'All appointments' : 'Your appointments'} starting{' '}
                {prettyDate(report.from)} - {prettyDate(report.to)}</p>

            <div className="grid cols-4" style={{ marginBottom: 20 }}>
                <StatCard label="Appointments" value={t.total} note={`${t.booked} still booked`} icon="calendar" tone="blue" />
                <StatCard label="Completed" value={t.completed} note={`${t.cancelled} cancelled`} icon="check" tone="green" />
                <StatCard label="No-shows" value={t.noShow} note={`No-show rate ${t.noShowRate}%`} icon="alert" tone="red" />
                <StatCard label="Revenue" value={money(t.revenue)} note="Price of completed visits" icon="tag" tone="purple" />
            </div>

            {isAdmin && <SummaryTable title="By provider" firstColumn="Provider" list={report.byProvider} id="by-provider" />}
            <SummaryTable title="By service" firstColumn="Service" list={report.byService} id="by-service" />

            <section className="card">
                <div className="card-header"><div><h2>Appointments</h2><p>{report.rows.length} in this period</p></div></div>
                {report.rows.length === 0 ? <EmptyState text="No appointments in this period." /> : (
                    <div className="table-wrap"><table id="r-rows"><tbody>
                        <tr><th>Ref</th><th>Date &amp; time</th><th>Client</th><th>Service</th>
                            {isAdmin && <><th>Provider</th><th>Business</th></>}<th>Price</th><th>Status</th></tr>
                        {report.rows.map(r => (
                            <tr key={r.id}><td className="muted">#{r.id}</td>
                                <td><strong>{showTime(r.startAt)}</strong><div className="muted">{prettyDate(r.startAt)}</div></td>
                                <td>{r.clientName}</td><td>{r.serviceName}</td>
                                {isAdmin && <><td>{r.providerName}</td><td>{r.businessName || '-'}</td></>}
                                <td>{money(r.price)}</td><td><StatusBadge status={r.status} /></td></tr>
                        ))}
                    </tbody></table></div>
                )}
            </section>
        </>
    );
}

function SummaryTable({ title, firstColumn, list, id }) {
    return (
        <section className="card">
            <div className="card-header"><div><h2>{title}</h2></div></div>
            {list.length === 0 ? <EmptyState text="Nothing to show." /> : (
                <div className="table-wrap"><table id={id}><tbody>
                    <tr><th>{firstColumn}</th><th>Total</th><th>Booked</th><th>Completed</th><th>Cancelled</th>
                        <th>No-shows</th><th>No-show rate</th><th>Revenue</th></tr>
                    {list.map(s => (
                        <tr key={s.name}><td><strong>{s.name}</strong></td><td>{s.total}</td><td>{s.booked}</td><td>{s.completed}</td>
                            <td>{s.cancelled}</td><td>{s.noShow}</td><td>{s.noShowRate}%</td><td>{money(s.revenue)}</td></tr>
                    ))}
                </tbody></table></div>
            )}
        </section>
    );
}

/** Builds a CSV file (opens in Excel) from the report rows and starts the download. */
function downloadCsv(report, isAdmin) {
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Ref', 'Date', 'Start', 'End', 'Client', 'Service', ...(isAdmin ? ['Provider', 'Business'] : []),
                    'Price (RWF)', 'Status'];
    const lines = report.rows.map(r => [r.id, r.startAt.slice(0, 10), showTime(r.startAt), showTime(r.endAt),
        r.clientName, r.serviceName, ...(isAdmin ? [r.providerName, r.businessName] : []), r.price, r.status]);
    const csv = [header, ...lines].map(row => row.map(cell).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `readytime-report-${report.from}-to-${report.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
}
