// Public top menu and footer (for visitors who are not logged in).
import { useLayoutEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon.jsx';

export default function PublicLayout({ routes }) {
    const location = useLocation();
    const route = routes.find(r => r.path === location.pathname);
    const menu = routes.filter(r => r.inMenu);

    useLayoutEffect(() => {
        document.body.classList.add('logged-out');
        document.body.classList.remove('menu-open');
    }, []);

    useLayoutEffect(() => {
        if (route) document.title = route.title + ' - ReadyTime';
        window.scrollTo(0, 0);
    }, [route, location.search]);

    return (
        <>
            <header className="public-nav" id="public-nav">
                <div className="container">
                    <Link className="brand" to="/"><span className="brand-logo"><Icon name="logo" /></span> ReadyTime</Link>
                    <nav className="public-links">
                        {menu.map(r => (
                            <NavLink key={r.path} to={r.path} end className={({ isActive }) => (isActive ? 'active' : '')}>
                                {r.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="public-actions">
                        <Link className="button secondary" to="/login" id="nav-login">Log in</Link>
                        <Link className="button" to="/signup" id="nav-signup">Get started</Link>
                    </div>
                </div>
            </header>

            <div className="main">
                {/* A new box per address, so every page starts fresh (like a full page change) */}
                <main id="app"><div key={location.pathname + location.search}><Outlet /></div></main>
            </div>

            <footer className="public-footer" id="public-footer">
                <div className="container">
                    <div>
                        <div className="brand"><span className="brand-logo"><Icon name="logo" /></span> ReadyTime</div>
                        <p>Smart appointment booking and scheduling for clinics, salons and service businesses.
                            Real-time availability, no double-booking.</p>
                    </div>
                    <div>{menu.map(r => <Link key={r.path} to={r.path}>{r.label}</Link>)}</div>
                    <div><Link to="/login">Log in</Link><Link to="/signup">Create an account</Link></div>
                    <div className="small-print">ReadyTime - student project (AUCA, Software Testing Techniques).
                        All times are Africa/Kigali (UTC+2). Photos from Pexels.</div>
                </div>
            </footer>
        </>
    );
}
