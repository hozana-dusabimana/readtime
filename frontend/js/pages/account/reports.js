// Reports (System Admin: all appointments, Service Provider: own appointments).
// Pick a date range; see totals, a breakdown per provider and per service, and download a CSV file.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { session } from '../../session.js';
import { addDays, emptyState, esc, money, prettyDate, run, showTime, statCard, statusBadge, todayInKigali } from '../../utils.js';

let range = null;   // the last period that loaded, remembered per user while logged in

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

export async function renderReports(container) {
    if (!range || range.userId !== session.user.id) {
        const month = presets().find(p => p.key === 'month');
        range = { userId: session.user.id, from: month.from, to: month.to };
    }
    await drawReport(container, range);
}

/** Loads the report for "wanted". Only when that works is it remembered as the current period. */
async function drawReport(container, wanted) {
    const isAdmin = session.user.role === 'SYSTEM_ADMIN';
    const report = await api('GET', `/api/reports/appointments?from=${wanted.from}&to=${wanted.to}`);
    range = wanted;
    const t = report.totals;

    container.innerHTML = `
      <section class="card">
        <div class="card-header" style="margin-bottom: 0;">
          <div class="row">
            <label>From <input type="date" id="r-from" value="${range.from}"></label>
            <label>To <input type="date" id="r-to" value="${range.to}"></label>
            <button id="r-run">${icon('chart')} Show report</button>
          </div>
          <div class="row">
            <button class="secondary" id="r-csv" ${report.rows.length ? '' : 'disabled'}>${icon('download')} Download CSV</button>
            <button class="secondary" id="r-print">${icon('printer')} Print</button>
          </div>
        </div>
        <div class="tabs" style="margin-top: 14px;">
          ${presets().map(p => `<button data-preset="${p.key}"
             class="${p.from === range.from && p.to === range.to ? 'active' : ''}">${p.label}</button>`).join('')}
        </div>
      </section>

      <p class="muted" id="r-title">${isAdmin ? 'All appointments' : 'Your appointments'} starting
         ${prettyDate(report.from)} - ${prettyDate(report.to)}</p>

      <div class="grid cols-4" style="margin-bottom: 20px;">
        ${statCard('Appointments', t.total, `${t.booked} still booked`, 'calendar', 'blue')}
        ${statCard('Completed', t.completed, `${t.cancelled} cancelled`, 'check', 'green')}
        ${statCard('No-shows', t.noShow, `No-show rate ${t.noShowRate}%`, 'alert', 'red')}
        ${statCard('Revenue', money(t.revenue), 'Price of completed visits', 'tag', 'purple')}
      </div>

      ${isAdmin ? summaryTable('By provider', 'Provider', report.byProvider, 'by-provider') : ''}
      ${summaryTable('By service', 'Service', report.byService, 'by-service')}

      <section class="card">
        <div class="card-header"><div><h2>Appointments</h2><p>${report.rows.length} in this period</p></div></div>
        ${report.rows.length === 0 ? emptyState('No appointments in this period.') : `
        <div class="table-wrap"><table id="r-rows">
          <tr><th>Ref</th><th>Date &amp; time</th><th>Client</th><th>Service</th>
              ${isAdmin ? '<th>Provider</th><th>Business</th>' : ''}<th>Price</th><th>Status</th></tr>
          ${report.rows.map(r => `
            <tr><td class="muted">#${r.id}</td>
                <td><strong>${showTime(r.startAt)}</strong><div class="muted">${prettyDate(r.startAt)}</div></td>
                <td>${esc(r.clientName)}</td><td>${esc(r.serviceName)}</td>
                ${isAdmin ? `<td>${esc(r.providerName)}</td><td>${esc(r.businessName || '-')}</td>` : ''}
                <td>${money(r.price)}</td><td>${statusBadge(r.status)}</td></tr>`).join('')}
        </table></div>`}
      </section>`;

    // run() shows the error message if the backend refuses (e.g. end date before start date)
    const load = (from, to) => run(() => drawReport(container, { userId: session.user.id, from: from, to: to }));
    container.querySelector('#r-run').onclick = () =>
        load(container.querySelector('#r-from').value, container.querySelector('#r-to').value);
    container.querySelectorAll('[data-preset]').forEach(b => {
        b.onclick = () => {
            const p = presets().find(x => x.key === b.dataset.preset);
            load(p.from, p.to);
        };
    });
    container.querySelector('#r-csv').onclick = () => downloadCsv(report, isAdmin);
    container.querySelector('#r-print').onclick = () => window.print();
}

function summaryTable(title, firstColumn, list, id) {
    return `
      <section class="card">
        <div class="card-header"><div><h2>${title}</h2></div></div>
        ${list.length === 0 ? emptyState('Nothing to show.') : `
        <div class="table-wrap"><table id="${id}">
          <tr><th>${firstColumn}</th><th>Total</th><th>Booked</th><th>Completed</th><th>Cancelled</th>
              <th>No-shows</th><th>No-show rate</th><th>Revenue</th></tr>
          ${list.map(s => `
            <tr><td><strong>${esc(s.name)}</strong></td><td>${s.total}</td><td>${s.booked}</td><td>${s.completed}</td>
                <td>${s.cancelled}</td><td>${s.noShow}</td><td>${s.noShowRate}%</td><td>${money(s.revenue)}</td></tr>`).join('')}
        </table></div>`}
      </section>`;
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
