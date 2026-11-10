// The parts around every logged-in page: sidebar, page title and the Kigali clock.
import { useEffect, useLayoutEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { setToken } from '../auth/token.js';
import { useRun, useSession } from '../auth/SessionContext.jsx';
import { Icon } from '../components/Icon.jsx';
import { Avatar } from '../components/ui.jsx';
import { ROLE_NAMES, nowInKigali, prettyDate, showTime } from '../utils.js';

export default function AppLayout({ routes }) {
    const { user, setUser } = useSession();
    const run = useRun();
    const navigate = useNavigate();
    const location = useLocation();
    const route = routes.find(r => r.path && r.path === location.pathname);
    const [menuOpen, setMenuOpen] = useState(false);

    useLayoutEffect(() => {
        document.body.classList.remove('logged-out');
        return () => document.body.classList.remove('menu-open');
    }, []);

    // On small screens the menu button opens and closes the sidebar; changing page closes it.
    useLayoutEffect(() => {
        document.body.classList.toggle('menu-open', menuOpen);
    }, [menuOpen]);
    useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);

    useEffect(() => {
        if (route) document.title = route.title + ' - ReadyTime';
    }, [route]);

    function logout() {
        run(async () => {
            await api('POST', '/api/logout');
            setToken(null);
            setUser(null);
            navigate('/login');
        }, 'You are logged out.');
    }

    return (
        <>
            <aside className="sidebar" id="sidebar">
                <div className="brand"><span className="brand-logo"><Icon name="logo" /></span> ReadyTime</div>
                <nav>
                    {routes.map((r, i) => {
                        if (r.section) return <div key={'section-' + i} className="nav-section">{r.section}</div>;
                        if (r.hidden) return null;
                        return (
                            <NavLink key={r.path} to={r.path} end
                                     className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')}>
                                <Icon name={r.icon} /> {r.label}
                            </NavLink>
                        );
                    })}
                </nav>
                <div className="sidebar-user">
                    <Avatar name={user.fullName} />
                    <div className="who">
                        <div className="name" id="current-user">{user.fullName}</div>
                        <div className="role">{ROLE_NAMES[user.role]}</div>
                    </div>
                    <button className="secondary icon-only" id="logout-button" title="Log out" aria-label="Log out" onClick={logout}>
                        <Icon name="logout" />
                    </button>
                </div>
            </aside>

            <div className="main">
                <header className="topbar">
                    <div className="row" style={{ alignItems: 'center' }}>
                        <button className="secondary icon-only menu-button" id="menu-button" aria-label="Open menu"
                                onClick={() => setMenuOpen(open => !open)}>&#9776;</button>
                        <div>
                            <h1 id="page-title">{route ? route.title : ''}</h1>
                            <div className="subtitle" id="page-subtitle">{route ? route.subtitle || '' : ''}</div>
                        </div>
                    </div>
                    <Clock />
                </header>

                {/* A new box per address, so every page starts fresh (like a full page change) */}
                <main id="app"><div key={location.pathname + location.search}><Outlet /></div></main>
            </div>
        </>
    );
}

/** Shows the current Kigali time in the top bar and updates it every 30 seconds. */
function Clock() {
    const [now, setNow] = useState(nowInKigali);
    useEffect(() => {
        const timer = setInterval(() => setNow(nowInKigali()), 30000);
        return () => clearInterval(timer);
    }, []);
    return <span className="chip" id="clock"><Icon name="clock" /> {prettyDate(now)} · {showTime(now)} Kigali (UTC+2)</span>;
}
