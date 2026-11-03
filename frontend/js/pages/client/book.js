// Client: Book an appointment.
// Steps: pick a practice -> a practitioner -> a service -> a day -> a free time -> confirm.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { session } from '../../session.js';
import { addDays, avatar, esc, money, monthShort, nowInKigali, optionsHtml, prettyDate, run,
         showDuration, showTime, todayInKigali, weekdayShort } from '../../utils.js';

const MAX_ACTIVE = 2;
const MAX_DAYS_AHEAD = 30;
const MAX_NO_SHOWS = 3;

export async function renderBook(container) {
    // Everything the page shows lives in this one "state" object. draw() turns it into HTML.
    const state = {
        businesses: [], businessId: '',
        providers: [], providerId: '',
        services: [], serviceId: '',
        weekStart: todayInKigali(), date: todayInKigali(),
        dayCounts: {}, slots: [], slot: null,
        activeCount: 0
    };

    const selectedService = () => state.services.find(s => String(s.id) === String(state.serviceId));
    const selectedProvider = () => state.providers.find(p => String(p.id) === String(state.providerId));
    const selectedBusiness = () => state.businesses.find(b => String(b.id) === String(state.businessId));

    // ---------- Loading data ----------

    async function loadMyStatus() {
        session.user = await api('GET', '/api/me');   // fresh no-show count / blocked flag
        const mine = await api('GET', '/api/appointments');
        const now = nowInKigali();
        state.activeCount = mine.filter(a => a.status === 'BOOKED' && a.endAt > now).length;
    }

    async function chooseBusiness(id) {
        state.businessId = id;
        state.providers = id ? await api('GET', `/api/businesses/${id}/providers`) : [];
        await chooseProvider(state.providers.length ? state.providers[0].id : '');
    }

    async function chooseProvider(id) {
        state.providerId = id;
        state.services = id ? await api('GET', `/api/providers/${id}/services`) : [];
        await chooseService(state.services.length ? state.services[0].id : '');
    }

    async function chooseService(id) {
        state.serviceId = id;
        await loadWeek();
    }

    /** Counts the free times of each of the 7 visible days (shown under each day). */
    async function loadWeek() {
        state.dayCounts = {};
        if (state.serviceId) {
            const days = weekDays().filter(d => d <= lastBookableDay());
            const lists = await Promise.all(days.map(d => api('GET', `/api/services/${state.serviceId}/slots?date=${d}`)));
            days.forEach((d, i) => { state.dayCounts[d] = lists[i].length; });
        }
        await loadSlots();
    }

    async function loadSlots() {
        state.slot = null;
        state.slots = state.serviceId ? await api('GET', `/api/services/${state.serviceId}/slots?date=${state.date}`) : [];
        draw();
    }

    function weekDays() {
        return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(state.weekStart, i));
    }

    function lastBookableDay() {
        return addDays(todayInKigali(), MAX_DAYS_AHEAD);
    }

    // ---------- Drawing ----------

    function draw() {
        const user = session.user;
        const service = selectedService();
        const provider = selectedProvider();
        const business = selectedBusiness();
        const limitReached = state.activeCount >= MAX_ACTIVE;
        const morning = state.slots.filter(s => showTime(s) < '12:00');
        const afternoon = state.slots.filter(s => showTime(s) >= '12:00');

        container.innerHTML = `
          ${user.blocked ? `<div class="notice danger">${icon('alert')}<div><strong>Booking blocked</strong>
              You have ${user.noShowCount} no-shows. Please contact the system admin to be unblocked.</div></div>` : ''}

          <div class="grid cols-3" style="margin-bottom: 20px;">
            <div class="stat tone-blue"><div class="stat-top"><span class="stat-label">Active bookings</span>
              <span class="stat-icon">${icon('calendar')}</span></div>
              <div class="stat-value">${state.activeCount} / ${MAX_ACTIVE}</div>
              <div class="stat-note">${limitReached ? 'Limit reached - cancel one to book again' : 'You can book ' + (MAX_ACTIVE - state.activeCount) + ' more'}</div></div>
            <div class="stat ${user.noShowCount > 0 ? 'tone-orange' : 'tone-green'}"><div class="stat-top"><span class="stat-label">No-shows</span>
              <span class="stat-icon">${icon('shield')}</span></div>
              <div class="stat-value">${user.noShowCount} / ${MAX_NO_SHOWS}</div>
              <div class="stat-note">${user.blocked ? 'Account blocked from booking' : 'Account in good standing'}</div></div>
            <div class="stat tone-purple"><div class="stat-top"><span class="stat-label">Free cancellation</span>
              <span class="stat-icon">${icon('clock')}</span></div>
              <div class="stat-value">2 hours</div>
              <div class="stat-note">Cancel or reschedule up to 2 hours before the start</div></div>
          </div>

          <div class="grid book">
            <div>
              <section class="card">
                <div class="section-label" style="margin-top: 0;">${icon('building')} Practice</div>
                <select id="b-business" style="width: 100%;">
                  ${optionsHtml(state.businesses, b => b.id, b => b.name, 'No practices yet', state.businessId)}
                </select>
                ${business ? `<p class="muted" style="margin: 8px 0 0;">${icon('pin')} ${esc(business.address)}</p>` : ''}
              </section>

              <section class="card">
                <div class="card-header"><h2>Available practitioner</h2><span class="muted">${state.providers.length} total</span></div>
                ${state.providers.length === 0 ? '<p class="muted">No practitioners in this practice yet.</p>' :
                  state.providers.map(p => `
                    <button class="choice ${String(p.id) === String(state.providerId) ? 'selected' : ''}" data-provider="${p.id}">
                      ${avatar(p.fullName)}
                      <span class="grow"><span class="title">${esc(p.fullName)}</span><br><span class="muted">Service provider</span></span>
                    </button>`).join('')}
              </section>

              <section class="card">
                <div class="card-header"><h2>Select service</h2><span class="muted">${state.services.length} total</span></div>
                ${state.services.length === 0 ? '<p class="muted">This practitioner has no services yet.</p>' :
                  state.services.map(s => `
                    <button class="choice ${String(s.id) === String(state.serviceId) ? 'selected' : ''}" data-service="${s.id}">
                      <span class="grow"><span class="title">${esc(s.name)}</span><br>
                        <span class="muted">${showDuration(s.durationMinutes)}</span></span>
                      <span class="price">${money(s.price)}</span>
                    </button>`).join('')}
              </section>
            </div>

            <div>
              <section class="card">
                <div class="card-header">
                  <div><h2>Select date &amp; time</h2><p>All times are Kigali time (UTC+2).</p></div>
                  <div class="row">
                    <button class="secondary icon-only" id="week-prev" aria-label="Previous week"
                            ${state.weekStart <= todayInKigali() ? 'disabled' : ''}>${icon('left')}</button>
                    <button class="secondary icon-only" id="week-next" aria-label="Next week"
                            ${addDays(state.weekStart, 7) > lastBookableDay() ? 'disabled' : ''}>${icon('right')}</button>
                  </div>
                </div>

                <div class="date-strip">
                  ${weekDays().map(d => {
                      const count = state.dayCounts[d];
                      const tooFar = d > lastBookableDay();
                      return `<button class="day ${d === state.date ? 'selected' : ''}" data-date="${d}" ${tooFar ? 'disabled' : ''}>
                        <span class="dow">${weekdayShort(d)}</span>
                        <span class="num">${Number(d.slice(8))}</span>
                        <span class="dow">${monthShort(d)}</span>
                        <span class="open ${count ? '' : 'none'}">${count === undefined ? '-' : count + ' open'}</span>
                      </button>`;
                  }).join('')}
                </div>

                ${!service ? '<p class="muted" style="margin-top: 16px;">Choose a service to see free times.</p>' : `
                  <div class="section-label">${icon('sun')} Morning (before 12:00)</div>
                  ${slotButtons(morning)}
                  <div class="section-label">${icon('moon')} Afternoon (from 12:00)</div>
                  ${slotButtons(afternoon)}`}
              </section>

              <section class="card">
                <div class="card-header"><div><div class="section-label" style="margin: 0;">Appointment summary</div>
                  <h2>${service ? esc(service.name) + ' with ' + esc(provider.fullName) : 'Nothing selected yet'}</h2></div></div>
                ${state.slot ? `
                  <div class="summary">
                    <div><div class="k">Date &amp; time</div><div class="v">${prettyDate(state.slot)}</div>
                         <div class="muted">${showTime(state.slot)} (${showDuration(service.durationMinutes)})</div></div>
                    <div><div class="k">Location</div><div class="v">${esc(business.name)}</div>
                         <div class="muted">${esc(business.address)}</div></div>
                    <div><div class="k">Price</div><div class="v">${money(service.price)}</div>
                         <div class="muted">Pay at the practice</div></div>
                  </div>
                  <div class="row" style="justify-content: space-between; align-items: center;">
                    <span class="muted">${icon('shield')} Protected by double-booking prevention</span>
                    <button id="confirm-booking" ${user.blocked || limitReached ? 'disabled' : ''}>Confirm appointment</button>
                  </div>
                  ${limitReached ? '<p class="muted">You already have 2 active appointments.</p>' : ''}`
                : '<p class="muted">Pick a free time above to see the summary.</p>'}
              </section>
            </div>
          </div>`;

        connectEvents();
    }

    function slotButtons(slots) {
        if (slots.length === 0) return '<p class="muted">No free times.</p>';
        return `<div class="slot-grid">${slots.map(s =>
            `<button class="slot ${s === state.slot ? 'selected' : ''}" data-slot="${s}">${showTime(s)}</button>`).join('')}</div>`;
    }

    // ---------- Events ----------

    function connectEvents() {
        container.querySelector('#b-business').onchange = e => run(() => chooseBusiness(e.target.value));
        container.querySelectorAll('[data-provider]').forEach(b => {
            b.onclick = () => run(() => chooseProvider(b.dataset.provider));
        });
        container.querySelectorAll('[data-service]').forEach(b => {
            b.onclick = () => run(() => chooseService(b.dataset.service));
        });
        container.querySelectorAll('[data-date]').forEach(b => {
            b.onclick = () => { state.date = b.dataset.date; run(loadSlots); };
        });
        container.querySelectorAll('[data-slot]').forEach(b => {
            b.onclick = () => { state.slot = b.dataset.slot; draw(); };
        });
        container.querySelector('#week-prev').onclick = () => moveWeek(-7);
        container.querySelector('#week-next').onclick = () => moveWeek(7);
        const confirmButton = container.querySelector('#confirm-booking');
        if (confirmButton) confirmButton.onclick = book;
    }

    function moveWeek(days) {
        const start = addDays(state.weekStart, days);
        state.weekStart = start < todayInKigali() ? todayInKigali() : start;
        state.date = state.weekStart;
        run(loadWeek);
    }

    function book() {
        const slot = state.slot;
        run(async () => {
            await api('POST', '/api/appointments', { serviceId: Number(state.serviceId), startAt: slot });
            location.hash = '#/appointments';
        }, `Booked for ${prettyDate(slot)} at ${showTime(slot)}.`);
    }

    // ---------- Start ----------
    await loadMyStatus();
    state.businesses = await api('GET', '/api/businesses');
    await chooseBusiness(state.businesses.length ? state.businesses[0].id : '');
}
