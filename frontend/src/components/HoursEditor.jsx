// Weekly working hours editor: one row per day, each day can have several periods.
// Two periods on one day = a break between them (e.g. 09:00-12:00 and 13:00-17:00).
import { Fragment, useState } from 'react';
import { api } from '../api.js';
import { useLoad, useRun } from '../auth/SessionContext.jsx';
import { DAYS, minutesBetween, prettyDate, showDuration, showTime } from '../utils.js';
import { Icon } from './Icon.jsx';
import { Loading } from './ui.jsx';

const WEEK = [1, 2, 3, 4, 5, 6, 7];

/** The saved hours from the API -> { 1: [{startTime, endTime}], ..., 7: [...] } */
function toWeek(saved) {
    const week = {};
    WEEK.forEach(d => { week[d] = []; });
    saved.forEach(h => week[h.dayOfWeek].push({ startTime: h.startTime.slice(0, 5), endTime: h.endTime.slice(0, 5) }));
    return week;
}

function totalMinutes(periods) {
    return periods.reduce((sum, p) => sum + Math.max(0, minutesBetween(p.startTime, p.endTime)), 0);
}

/** "13:00" -> "14:00" */
function addHour(time) {
    const [h, m] = time.split(':').map(Number);
    return String(h + 1).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function HoursEditor({ providerId }) {
    const run = useRun();
    const { data: week, setData: setWeek, reload } = useLoad(
        async () => toWeek(await api('GET', `/api/providers/${providerId}/hours`)));
    const [warnings, setWarnings] = useState([]);

    if (!week) return <Loading />;

    const changeDay = (day, periods) => setWeek(w => ({ ...w, [day]: periods }));

    function changeTime(day, index, field, value) {
        changeDay(day, week[day].map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    }

    function addPeriod(day) {
        const periods = week[day];
        const last = periods[periods.length - 1];
        changeDay(day, [...periods, { startTime: last.endTime, endTime: last.endTime < '23:00' ? addHour(last.endTime) : '23:59' }]);
    }

    function discard() {
        run(async () => {
            await reload();
            setWarnings([]);
        });
    }

    function save() {
        const hours = [];
        WEEK.forEach(d => {
            week[d].forEach(p => hours.push({ dayOfWeek: d, startTime: p.startTime, endTime: p.endTime }));
        });
        run(async () => {
            const result = await api('PUT', `/api/providers/${providerId}/hours`, { hours: hours });
            setWarnings(result.outsideNewHours || []);
        }, 'Working hours saved.');
    }

    const weekTotal = WEEK.reduce((sum, d) => sum + totalMinutes(week[d]), 0);

    return (
        <>
            <div className="notice"><Icon name="shield" />
                <div><strong>Existing bookings are kept</strong>
                    Changing your hours never cancels booked appointments. After saving, any booking that falls
                    outside the new hours is listed so you can decide what to do.</div></div>
            {warnings.length > 0 && (
                <div className="notice danger"><Icon name="alert" /><div>
                    <strong>These bookings are now outside the working hours (they were kept):</strong>
                    {warnings.map((a, i) => (
                        <Fragment key={a.id ?? i}>
                            {i > 0 && <br />}
                            {prettyDate(a.startAt)} {showTime(a.startAt)} - {a.clientName} ({a.serviceName})
                        </Fragment>
                    ))}
                </div></div>
            )}
            <div className="card">
                <div className="card-header">
                    <div><h2>Weekly recurring schedule</h2><p>Total: <strong>{showDuration(weekTotal)}</strong> per week</p></div>
                </div>
                {WEEK.map(d => (
                    <div className="week-row" key={d}>
                        <div className="week-day">
                            <label className="switch">
                                <input type="checkbox" data-day-toggle={d} checked={week[d].length > 0}
                                       onChange={e => changeDay(d, e.target.checked ? [{ startTime: '09:00', endTime: '17:00' }] : [])} />
                                <span></span>
                            </label>
                            <div><div className="name">{DAYS[d]}</div>
                                <div className="total">{week[d].length ? showDuration(totalMinutes(week[d])) : 'Off duty'}</div></div>
                        </div>
                        <div className="periods">
                            {week[d].length === 0 ? <div className="closed">Not working</div> : week[d].map((p, i) => (
                                <div className="period" key={i}>
                                    <input type="time" value={p.startTime} data-day={d} data-index={i} data-field="startTime"
                                           onChange={e => changeTime(d, i, 'startTime', e.target.value)} />
                                    <span className="muted">to</span>
                                    <input type="time" value={p.endTime} data-day={d} data-index={i} data-field="endTime"
                                           onChange={e => changeTime(d, i, 'endTime', e.target.value)} />
                                    {i > 0 && <span className="badge orange">after break</span>}
                                    <button className="secondary icon-only small" aria-label="Remove period"
                                            onClick={() => changeDay(d, week[d].filter((_, j) => j !== i))}><Icon name="x" /></button>
                                </div>
                            ))}
                        </div>
                        {week[d].length > 0 && (
                            <button className="secondary small" data-add={d} onClick={() => addPeriod(d)}><Icon name="plus" /> Add period after a break</button>
                        )}
                    </div>
                ))}
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                    <button className="secondary discard" onClick={discard}>Discard changes</button>
                    <button className="save" onClick={save}>Save schedule</button>
                </div>
            </div>
        </>
    );
}
