// Weekly working hours editor: one row per day, each day can have several periods.
// Two periods on one day = a break between them (e.g. 09:00-12:00 and 13:00-17:00).
import { api } from '../api.js';
import { icon } from '../icons.js';
import { DAYS, esc, minutesBetween, prettyDate, run, showDuration, showTime } from '../utils.js';

export async function drawHoursEditor(container, providerId) {
    const saved = await api('GET', `/api/providers/${providerId}/hours`);

    // week[1] ... week[7] = list of {startTime, endTime} for that day
    const week = {};
    for (let d = 1; d <= 7; d++) week[d] = [];
    saved.forEach(h => week[h.dayOfWeek].push({ startTime: h.startTime.slice(0, 5), endTime: h.endTime.slice(0, 5) }));

    let warnings = [];

    function totalMinutes(periods) {
        return periods.reduce((sum, p) => sum + Math.max(0, minutesBetween(p.startTime, p.endTime)), 0);
    }

    function draw() {
        let weekTotal = 0;
        for (let d = 1; d <= 7; d++) weekTotal += totalMinutes(week[d]);

        container.innerHTML = `
          <div class="notice">${icon('shield')}
            <div><strong>Existing bookings are kept</strong>
            Changing your hours never cancels booked appointments. After saving, any booking that falls
            outside the new hours is listed so you can decide what to do.</div></div>
          ${warnings.length ? `<div class="notice danger">${icon('alert')}<div>
              <strong>These bookings are now outside the working hours (they were kept):</strong>
              ${warnings.map(a => `${prettyDate(a.startAt)} ${showTime(a.startAt)} - ${esc(a.clientName)} (${esc(a.serviceName)})`).join('<br>')}
            </div></div>` : ''}
          <div class="card">
            <div class="card-header">
              <div><h2>Weekly recurring schedule</h2><p>Total: <strong>${showDuration(weekTotal)}</strong> per week</p></div>
            </div>
            ${[1, 2, 3, 4, 5, 6, 7].map(d => `
              <div class="week-row">
                <div class="week-day">
                  <label class="switch"><input type="checkbox" data-day-toggle="${d}" ${week[d].length ? 'checked' : ''}><span></span></label>
                  <div><div class="name">${DAYS[d]}</div>
                       <div class="total">${week[d].length ? showDuration(totalMinutes(week[d])) : 'Off duty'}</div></div>
                </div>
                <div class="periods">
                  ${week[d].length === 0 ? '<div class="closed">Not working</div>' : week[d].map((p, i) => `
                    <div class="period">
                      <input type="time" value="${p.startTime}" data-day="${d}" data-index="${i}" data-field="startTime">
                      <span class="muted">to</span>
                      <input type="time" value="${p.endTime}" data-day="${d}" data-index="${i}" data-field="endTime">
                      ${i > 0 ? '<span class="badge orange">after break</span>' : ''}
                      <button class="secondary icon-only small" data-remove-day="${d}" data-remove-index="${i}" aria-label="Remove period">${icon('x')}</button>
                    </div>`).join('')}
                </div>
                ${week[d].length ? `<button class="secondary small" data-add="${d}">${icon('plus')} Add period after a break</button>` : ''}
              </div>`).join('')}
            <div class="row" style="justify-content: flex-end; margin-top: 16px;">
              <button class="secondary discard">Discard changes</button>
              <button class="save">Save schedule</button>
            </div>
          </div>`;

        // Typing a time updates the week object (and the totals)
        container.querySelectorAll('[data-field]').forEach(input => {
            input.onchange = () => {
                week[input.dataset.day][input.dataset.index][input.dataset.field] = input.value;
                draw();
            };
        });
        container.querySelectorAll('[data-day-toggle]').forEach(box => {
            box.onchange = () => {
                week[box.dataset.dayToggle] = box.checked ? [{ startTime: '09:00', endTime: '17:00' }] : [];
                draw();
            };
        });
        container.querySelectorAll('[data-add]').forEach(b => {
            b.onclick = () => {
                const periods = week[b.dataset.add];
                const last = periods[periods.length - 1];
                periods.push({ startTime: last.endTime, endTime: last.endTime < '23:00' ? addHour(last.endTime) : '23:59' });
                draw();
            };
        });
        container.querySelectorAll('[data-remove-day]').forEach(b => {
            b.onclick = () => {
                week[b.dataset.removeDay].splice(Number(b.dataset.removeIndex), 1);
                draw();
            };
        });
        container.querySelector('.discard').onclick = () => drawHoursEditor(container, providerId);
        container.querySelector('.save').onclick = save;
    }

    function save() {
        const hours = [];
        for (let d = 1; d <= 7; d++) {
            week[d].forEach(p => hours.push({ dayOfWeek: d, startTime: p.startTime, endTime: p.endTime }));
        }
        run(async () => {
            const result = await api('PUT', `/api/providers/${providerId}/hours`, { hours: hours });
            warnings = result.outsideNewHours;
            draw();
        }, 'Working hours saved.');
    }

    draw();
}

/** "13:00" -> "14:00" */
function addHour(time) {
    const [h, m] = time.split(':').map(Number);
    return String(h + 1).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
