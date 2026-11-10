// Chooses the pages to show:
//  - Not logged in -> public pages (home, how it works, for businesses, login, signup) with a top menu.
//  - Logged in     -> the pages of the user's role with a sidebar.
// An unknown address goes to the home page (logged out) or to the role's first page (logged in),
// which is also how the user lands on their first page right after logging in.
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './auth/SessionContext.jsx';
import { PUBLIC_ROUTES, ROUTES, pagesOf } from './routes.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import AppLayout from './layouts/AppLayout.jsx';

export default function App() {
    const { user, ready } = useSession();

    if (!ready) {
        // Checking a saved login with GET /api/me
        return <div className="main"><main id="app">Loading...</main></div>;
    }

    if (!user) {
        return (
            <Routes>
                <Route element={<PublicLayout routes={PUBLIC_ROUTES} />}>
                    {PUBLIC_ROUTES.map(r => <Route key={r.path} path={r.path} element={<r.component />} />)}
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        );
    }

    const pages = pagesOf(user.role);
    return (
        <Routes>
            <Route element={<AppLayout routes={ROUTES[user.role] || []} />}>
                {pages.map(r => <Route key={r.path} path={r.path} element={<r.component />} />)}
            </Route>
            <Route path="*" element={pages.length ? <Navigate to={pages[0].path} replace /> : null} />
        </Routes>
    );
}
