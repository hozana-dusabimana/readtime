// Client: Book an appointment.
// Steps: pick a practice -> a practitioner -> a service -> a day -> a free time -> confirm.
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useLoad, useRun, useSession } from '../../auth/SessionContext.jsx';
import { Icon } from '../../components/Icon.jsx';
import { Avatar, Loading, Options } from '../../components/ui.jsx';
import { addDays, money, monthShort, nowInKigali, prettyDate, showDuration, showTime, todayInKigali,
         weekdayShort } from '../../utils.js';

const MAX_ACTIVE = 2;
const MAX_DAYS_AHEAD = 30;
const MAX_NO_SHOWS = 3;

// ---------- Loading data ----------
// Each step takes the page state and returns a new state with the data of that choice loaded
// (choosing a practice also picks its first practitioner, that one's first service, and so on).

async function withBusiness(state, id) {
    const providers = id ? await api('GET', `/api/businesses/${id}/providers`) : [];
    return withProvider({ ...state, businessId: id, providers: providers }, providers.length ? providers[0].id : '');
}

async function withProvider(state, id) {
    const services = id ? await api('GET', `/api/providers/${id}/services`) : [];
    return withService({ ...state, providerId: id, services: services }, services.length ? services[0].id : '');
}

async function withService(state, id) {
    return withWeek({ ...state, serviceId: id });
}

/** Counts the free times of each of the 7 visible days (shown under each day). */
async function withWeek(state) {
    const dayCounts = {};
    if (state.serviceId) {
        const days = weekDays(state.weekStart).filter(d => d <= lastBookableDay());
        const lists = await Promise.all(days.map(d => api('GET', `/api/services/${state.serviceId}/slots?date=${d}`)));
        days.forEach((d, i) => { dayCounts[d] = lists[i].length; });
    }
    return withSlots({ ...state, dayCounts: dayCounts });
}

async function withSlots(state) {
    const slots = state.serviceId ? await api('GET', `/api/services/${state.serviceId}/slots?date=${state.date}`) : [];
    return { ...state, slots: slots, slot: null };
}

function weekDays(weekStart) {
    return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i));
}

function lastBookableDay() {
    return addDays(todayInKigali(), MAX_DAYS_AHEAD);
}

export default function Book() {
    const { user, setUser } = useSession();
    const run = useRun();
    const navigate = useNavigate();

    const { data: state, setData: setState } = useLoad(async () => {
        setUser(await api('GET', '/api/me'));   // fresh no-show count / blocked flag
        const mine = await api('GET', '/api/appointments');
        const now = nowInKigali();
        const businesses = await api('GET', '/api/businesses');
        const start = {
            businesses: businesses, businessId: '',
            providers: [], providerId: '',
            services: [], serviceId: '',
            weekStart: todayInKigali(), date: todayInKigali(),
            dayCounts: {}, slots: [], slot: null,
            activeCount: mine.filter(a => a.status === 'BOOKED' && a.endAt > now).length
        };
        return withBusiness(start, businesses.length ? businesses[0].id : '');
    });

    if (!state) return <Loading />;

    const service = state.services.find(s => String(s.id) === String(state.serviceId));
    const provider = state.providers.find(p => String(p.id) === String(state.providerId));
    const business = state.businesses.find(b => String(b.id) === String(state.businessId));
    const limitReached = state.activeCount >= MAX_ACTIVE;
    const morning = state.slots.filter(s => showTime(s) < '12:00');
    const afternoon = state.slots.filter(s => showTime(s) >= '12:00');

    // ---------- Events ----------

    const update = step => run(async () => setState(await step()));

    function moveWeek(days) {
        const start = addDays(state.weekStart, days);
        const weekStart = start < todayInKigali() ? todayInKigali() : start;
        update(() => withWeek({ ...state, weekStart: weekStart, date: weekStart }));
    }

    function book() {
        const slot = state.slot;
        run(async () => {
            await api('POST', '/api/appointments', { serviceId: Number(state.serviceId), startAt: slot });
            navigate('/appointments');
        }, `Booked for ${prettyDate(slot)} at ${showTime(slot)}.`);
    }

    function slotButtons(slots) {
        if (slots.length === 0) return <p className="muted">No free times.</p>;
        return (
            <div className="slot-grid">
                {slots.map(s => (
                    <button key={s} className={'slot ' + (s === state.slot ? 'selected' : '')} data-slot={s}
                            onClick={() => setState(st => ({ ...st, slot: s }))}>{showTime(s)}</button>
                ))}
            </div>
        );
    }

    return (
        <>
            {user.blocked && (
                <div className="notice danger"><Icon name="alert" /><div><strong>Booking blocked</strong>
                    You have {user.noShowCount} no-shows. Please contact the system admin to be unblocked.</div></div>
            )}

            <div className="grid cols-3" style={{ marginBottom: 20 }}>
                <div className="stat tone-blue"><div className="stat-top"><span className="stat-label">Active bookings</span>
                    <span className="stat-icon"><Icon name="calendar" /></span></div>
                    <div className="stat-value">{state.activeCount} / {MAX_ACTIVE}</div>
                    <div className="stat-note">{limitReached ? 'Limit reached - cancel one to book again' : 'You can book ' + (MAX_ACTIVE - state.activeCount) + ' more'}</div></div>
                <div className={'stat ' + (user.noShowCount > 0 ? 'tone-orange' : 'tone-green')}><div className="stat-top"><span className="stat-label">No-shows</span>
                    <span className="stat-icon"><Icon name="shield" /></span></div>
                    <div className="stat-value">{user.noShowCount} / {MAX_NO_SHOWS}</div>
                    <div className="stat-note">{user.blocked ? 'Account blocked from booking' : 'Account in good standing'}</div></div>
                <div className="stat tone-purple"><div className="stat-top"><span className="stat-label">Free cancellation</span>
                    <span className="stat-icon"><Icon name="clock" /></span></div>
                    <div className="stat-value">2 hours</div>
                    <div className="stat-note">Cancel or reschedule up to 2 hours before the start</div></div>
            </div>

            <div className="grid book">
                <div>
                    <section className="card">
                        <div className="section-label" style={{ marginTop: 0 }}><Icon name="building" /> Practice</div>
                        <select id="b-business" style={{ width: '100%' }} value={String(state.businessId)}
                                onChange={e => { const id = e.target.value; update(() => withBusiness(state, id)); }}>
                            <Options list={state.businesses} valueOf={b => b.id} labelOf={b => b.name} emptyText="No practices yet" />
                        </select>
                        {business && <p className="muted" style={{ margin: '8px 0 0' }}><Icon name="pin" /> {business.address}</p>}
                    </section>

                    <section className="card">
                        <div className="card-header"><h2>Available practitioner</h2><span className="muted">{state.providers.length} total</span></div>
                        {state.providers.length === 0 ? <p className="muted">No practitioners in this practice yet.</p> :
                            state.providers.map(p => (
                                <button key={p.id} className={'choice ' + (String(p.id) === String(state.providerId) ? 'selected' : '')}
                                        data-provider={p.id} onClick={() => update(() => withProvider(state, p.id))}>
                                    <Avatar name={p.fullName} />
                                    <span className="grow"><span className="title">{p.fullName}</span><br /><span className="muted">Service provider</span></span>
                                </button>
                            ))}
                    </section>

                    <section className="card">
                        <div className="card-header"><h2>Select service</h2><span className="muted">{state.services.length} total</span></div>
                        {state.services.length === 0 ? <p className="muted">This practitioner has no services yet.</p> :
                            state.services.map(s => (
                                <button key={s.id} className={'choice ' + (String(s.id) === String(state.serviceId) ? 'selected' : '')}
                                        data-service={s.id} onClick={() => update(() => withService(state, s.id))}>
                                    <span className="grow"><span className="title">{s.name}</span><br />
                                        <span className="muted">{showDuration(s.durationMinutes)}</span></span>
                                    <span className="price">{money(s.price)}</span>
                                </button>
                            ))}
                    </section>
                </div>

                <div>
                    <section className="card">
                        <div className="card-header">
                            <div><h2>Select date &amp; time</h2><p>All times are Kigali time (UTC+2).</p></div>
                            <div className="row">
                                <button className="secondary icon-only" id="week-prev" aria-label="Previous week"
                                        disabled={state.weekStart <= todayInKigali()} onClick={() => moveWeek(-7)}><Icon name="left" /></button>
                                <button className="secondary icon-only" id="week-next" aria-label="Next week"
                                        disabled={addDays(state.weekStart, 7) > lastBookableDay()} onClick={() => moveWeek(7)}><Icon name="right" /></button>
                            </div>
                        </div>

                        <div className="date-strip">
                            {weekDays(state.weekStart).map(d => {
                                const count = state.dayCounts[d];
                                return (
                                    <button key={d} className={'day ' + (d === state.date ? 'selected' : '')} data-date={d}
                                            disabled={d > lastBookableDay()}
                                            onClick={() => update(() => withSlots({ ...state, date: d }))}>
                                        <span className="dow">{weekdayShort(d)}</span>
                                        <span className="num">{Number(d.slice(8))}</span>
                                        <span className="dow">{monthShort(d)}</span>
                                        <span className={'open ' + (count ? '' : 'none')}>{count === undefined ? '-' : count + ' open'}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {!service ? <p className="muted" style={{ marginTop: 16 }}>Choose a service to see free times.</p> : (
                            <>
                                <div className="section-label"><Icon name="sun" /> Morning (before 12:00)</div>
                                {slotButtons(morning)}
                                <div className="section-label"><Icon name="moon" /> Afternoon (from 12:00)</div>
                                {slotButtons(afternoon)}
                            </>
                        )}
                    </section>

                    <section className="card">
                        <div className="card-header"><div><div className="section-label" style={{ margin: 0 }}>Appointment summary</div>
                            <h2>{service ? service.name + ' with ' + provider.fullName : 'Nothing selected yet'}</h2></div></div>
                        {state.slot ? (
                            <>
                                <div className="summary">
                                    <div><div className="k">Date &amp; time</div><div className="v">{prettyDate(state.slot)}</div>
                                        <div className="muted">{showTime(state.slot)} ({showDuration(service.durationMinutes)})</div></div>
                                    <div><div className="k">Location</div><div className="v">{business.name}</div>
                                        <div className="muted">{business.address}</div></div>
                                    <div><div className="k">Price</div><div className="v">{money(service.price)}</div>
                                        <div className="muted">Pay at the practice</div></div>
                                </div>
                                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="muted"><Icon name="shield" /> Protected by double-booking prevention</span>
                                    <button id="confirm-booking" disabled={user.blocked || limitReached} onClick={book}>Confirm appointment</button>
                                </div>
                                {limitReached && <p className="muted">You already have 2 active appointments.</p>}
                            </>
                        ) : <p className="muted">Pick a free time above to see the summary.</p>}
                    </section>
                </div>
            </div>
        </>
    );
}
