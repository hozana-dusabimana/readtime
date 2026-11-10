// Public page: how booking works + the rules + frequently asked questions.
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon.jsx';

export default function HowItWorks() {
    return (
        <>
            <section className="hero">
                <div className="container" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="section-head" style={{ marginBottom: 0 }}>
                        <span className="eyebrow">How it works</span>
                        <h2 style={{ fontSize: 38 }}>From sign-up to appointment in four steps</h2>
                        <p>No phone calls and no waiting. You only ever see times that are really free.</p>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="grid cols-2 steps">
                        <div className="step-card"><h3>Create a client account</h3>
                            <p>Enter your name, your email and a password (8 to 64 characters). That&apos;s it.</p></div>
                        <div className="step-card"><h3>Find a practice and a practitioner</h3>
                            <p>Choose the business, then the person you want to see, then the service you need.
                                Each service shows its duration and price.</p></div>
                        <div className="step-card"><h3>Pick a free time</h3>
                            <p>Times are built from the practitioner&apos;s working hours and the length of the service.
                                Breaks and times that are already booked are never shown.</p></div>
                        <div className="step-card"><h3>Confirm and manage</h3>
                            <p>Confirm with one click. Later you can reschedule or cancel from &quot;My Appointments&quot;.</p></div>
                    </div>
                </div>
            </section>

            <section className="section white">
                <div className="container split">
                    <img src="images/planning-calendar.jpg" alt="A person planning appointments in a calendar with a phone" />
                    <div>
                        <span className="eyebrow">Booking rules</span>
                        <h2>Simple rules that keep things fair</h2>
                        <ul className="check-list">
                            <li><Icon name="check" /><span><strong>At most 2 active appointments</strong> per client at the same time.</span></li>
                            <li><Icon name="check" /><span><strong>Cancel or reschedule for free</strong> until 2 hours before the start
                                (exactly 2 hours before is still allowed).</span></li>
                            <li><Icon name="check" /><span><strong>No double-booking:</strong> a time can only ever be booked by one person.</span></li>
                            <li><Icon name="check" /><span><strong>3 no-shows pause booking.</strong> A system admin can review and unblock the account.</span></li>
                            <li><Icon name="check" /><span><strong>One time zone:</strong> all times are Kigali time (UTC+2).</span></li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container" style={{ maxWidth: 820 }}>
                    <div className="section-head"><span className="eyebrow">FAQ</span><h2>Questions people ask</h2></div>
                    <div className="faq">
                        <details><summary>Does it cost anything to create an account?</summary>
                            <p>No. Creating a client account and booking is free. You pay the service price at the practice.</p></details>
                        <details><summary>What happens if I cancel less than 2 hours before?</summary>
                            <p>You can&apos;t cancel or reschedule online any more. Please contact the practice directly.</p></details>
                        <details><summary>What counts as a no-show?</summary>
                            <p>If you don&apos;t come to an appointment, the provider can mark it as a no-show after its start time.
                                After 3 no-shows you can&apos;t make new bookings until a system admin unblocks your account.</p></details>
                        <details><summary>What if the practitioner changes their working hours?</summary>
                            <p>Your booking is kept. The practitioner sees which bookings are outside their new hours and
                                contacts you if something needs to change.</p></details>
                        <details><summary>Can two people book the same time?</summary>
                            <p>No. The system locks the time while a booking is saved, so only the first person gets it.</p></details>
                    </div>
                </div>
            </section>

            <section className="section" style={{ paddingTop: 0 }}>
                <div className="container">
                    <div className="cta-banner">
                        <div><h2>Try it yourself</h2><p>Create an account and book your first appointment.</p></div>
                        <Link className="button large" to="/signup">Create an account <Icon name="right" /></Link>
                    </div>
                </div>
            </section>
        </>
    );
}
