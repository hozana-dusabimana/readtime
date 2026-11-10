// Public page: what ReadyTime offers to businesses and providers.
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon.jsx';

export default function ForBusiness() {
    return (
        <>
            <section className="hero">
                <div className="container split">
                    <div>
                        <span className="eyebrow">For businesses</span>
                        <h1 style={{ fontSize: 40 }}>Fill your schedule, <span>not your phone line</span>.</h1>
                        <p className="lead">Set your providers, services and working hours once. ReadyTime turns them into
                            bookable times and keeps every calendar free of double-bookings.</p>
                        <div className="cta">
                            <Link className="button large" to="/signup?as=provider" id="provider-signup">Register as a provider</Link>
                            <Link className="button large secondary" to="/how-it-works">How booking works</Link>
                        </div>
                    </div>
                    <img src="images/clinic-conversation.jpg" alt="A professional in scrubs talking with a client" />
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="section-head">
                        <span className="eyebrow">Roles</span>
                        <h2>Everyone gets the right tools</h2>
                        <p>Each person only sees and changes what their role allows - checked by the server on every request.</p>
                    </div>
                    <div className="grid cols-2">
                        <Role icon="user" tone="green" title="Service provider"
                              points={['Sets weekly working hours and breaks', 'Creates services with duration and price',
                                       'Sees their appointments and marks visits completed or no-show']} />
                        <Role icon="shield" tone="purple" title="System admin"
                              points={['Registers businesses and adds their service providers', 'Enables or disables user accounts',
                                       'Reviews and unblocks clients']} />
                    </div>
                </div>
            </section>

            <section className="section white">
                <div className="container split">
                    <img src="images/salon-stylist.jpg" alt="A stylist preparing a client's hair in a salon" />
                    <div>
                        <span className="eyebrow">Scheduling</span>
                        <h2>Your hours, your breaks, your services</h2>
                        <ul className="check-list">
                            <li><Icon name="check" /><span>Several working periods per day - the gap between them is a break.</span></li>
                            <li><Icon name="check" /><span>Free times follow the length of each service (e.g. 30 or 45 minutes).</span></li>
                            <li><Icon name="check" /><span>Changing hours never cancels existing bookings - you see which ones are affected.</span></li>
                            <li><Icon name="check" /><span>Clients with 3 no-shows are paused automatically.</span></li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="cta-banner">
                        <div><h2>Want your business on ReadyTime?</h2>
                            <p>Register yourself and your business in a few steps, then add your services and working hours.</p></div>
                        <Link className="button large" to="/signup?as=provider">Register as a provider <Icon name="right" /></Link>
                    </div>
                </div>
            </section>
        </>
    );
}

function Role({ icon, tone, title, points }) {
    return (
        <div className={'feature tone-' + tone}>
            <span className="stat-icon"><Icon name={icon} /></span>
            <h3>{title}</h3>
            <ul className="check-list" style={{ margin: '10px 0 0' }}>
                {points.map(p => <li key={p}><Icon name="check" /><span>{p}</span></li>)}
            </ul>
        </div>
    );
}
