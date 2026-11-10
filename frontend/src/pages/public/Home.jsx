// Public home page (landing page).
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon.jsx';

export default function Home() {
    return (
        <>
            <section className="hero">
                <div className="container">
                    <div>
                        <span className="eyebrow"><Icon name="logo" /> Appointment booking made simple</span>
                        <h1>Book your next appointment in <span>under a minute</span>.</h1>
                        <p className="lead">ReadyTime shows the real free times of clinics, salons and other service
                            businesses. Pick a time, confirm, done - and nobody else can take your slot.</p>
                        <div className="cta">
                            <Link className="button large" to="/signup" id="hero-signup">Create a free account <Icon name="right" /></Link>
                            <Link className="button large secondary" to="/how-it-works">See how it works</Link>
                        </div>
                        <div className="trust">
                            <span><Icon name="check" /> Real-time free slots</span>
                            <span><Icon name="check" /> No double-booking</span>
                            <span><Icon name="check" /> Free cancellation up to 2 hours before</span>
                        </div>
                    </div>
                    <div className="hero-media">
                        <img src="images/doctor-consultation.jpg" alt="A doctor talking with a patient during an appointment" />
                        <div className="float-card two">
                            <span className="stat-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="check" /></span>
                            <div><strong>Appointment confirmed</strong><span className="muted">Your slot is locked for you</span></div>
                        </div>
                        <div className="float-card one">
                            <span className="stat-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="clock" /></span>
                            <div><strong>Kigali time, always</strong><span className="muted">Africa/Kigali (UTC+2)</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="section-head">
                        <span className="eyebrow">Who it&apos;s for</span>
                        <h2>One booking system for every kind of service</h2>
                        <p>Any business that works with appointments can list its providers, services and working hours.</p>
                    </div>
                    <div className="grid cols-3">
                        <div className="audience-card">
                            <img src="images/doctor-clipboard.jpg" alt="A doctor with a clipboard talking to a patient" />
                            <div className="body"><h3>Clinics &amp; health practices</h3>
                                <p>Consultations, check-ups and follow-ups, each with its own duration.</p></div>
                        </div>
                        <div className="audience-card">
                            <img src="images/salon-stylist.jpg" alt="A hair stylist working on a client's hair" />
                            <div className="body"><h3>Salons &amp; barbers</h3>
                                <p>Haircuts, styling and treatments. Clients see exactly which times are still free.</p></div>
                        </div>
                        <div className="audience-card">
                            <img src="images/clinic-conversation.jpg" alt="A professional talking with a client" />
                            <div className="body"><h3>Any service business</h3>
                                <p>Consultants, therapists, repair services - if it needs a time slot, it fits.</p></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section white">
                <div className="container">
                    <div className="section-head">
                        <span className="eyebrow">Features</span>
                        <h2>Fair rules, built in</h2>
                        <p>The same clear rules apply to everyone, and the system enforces them automatically.</p>
                    </div>
                    <div className="grid cols-3">
                        <Feature icon="calendar" tone="blue" title="Real-time availability"
                                 text="Free times come straight from each provider's working hours and existing bookings." />
                        <Feature icon="shield" tone="green" title="No double-booking"
                                 text="Even if two people click the same time at the same second, only one booking succeeds." />
                        <Feature icon="list" tone="purple" title="Up to 2 active bookings"
                                 text="Each client can hold two upcoming appointments, so time is shared fairly." />
                        <Feature icon="clock" tone="orange" title="Free cancellation"
                                 text="Cancel or reschedule for free until 2 hours before your appointment starts." />
                        <Feature icon="alert" tone="red" title="No-show protection"
                                 text="After 3 missed appointments, booking is paused until an admin reviews the account." />
                        <Feature icon="users" tone="blue" title="A dashboard for every role"
                                 text="Clients, service providers and the platform admin each get their own pages." />
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="section-head">
                        <span className="eyebrow">How it works</span>
                        <h2>Three steps to your appointment</h2>
                    </div>
                    <div className="grid cols-3 steps">
                        <div className="step-card"><h3>Create your account</h3><p>Sign up in three short steps: name, email and password.</p></div>
                        <div className="step-card"><h3>Choose a time</h3><p>Pick a practice, a practitioner and a service, then a free time.</p></div>
                        <div className="step-card"><h3>You&apos;re booked</h3><p>Your slot is confirmed instantly. Reschedule or cancel from your dashboard.</p></div>
                    </div>
                </div>
            </section>

            <section className="section" style={{ paddingTop: 0 }}>
                <div className="container">
                    <div className="cta-banner">
                        <div><h2>Ready to book?</h2><p>Creating an account takes less than a minute.</p></div>
                        <Link className="button large" to="/signup">Get started <Icon name="right" /></Link>
                    </div>
                </div>
            </section>
        </>
    );
}

function Feature({ icon, tone, title, text }) {
    return (
        <div className={'feature tone-' + tone}>
            <span className="stat-icon"><Icon name={icon} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
        </div>
    );
}
