// Which pages each role has. Each entry becomes a link in the menu.
// The address in the browser looks like  index.html#/book  - the part after # picks the page.
// (The backend still checks every permission; this list only decides what is shown.)
import Home from './pages/public/Home.jsx';
import HowItWorks from './pages/public/HowItWorks.jsx';
import ForBusiness from './pages/public/ForBusiness.jsx';
import Login from './pages/public/Login.jsx';
import Signup from './pages/public/Signup.jsx';
import Book from './pages/client/Book.jsx';
import MyAppointments from './pages/client/MyAppointments.jsx';
import Schedule from './pages/provider/Schedule.jsx';
import Bookings from './pages/provider/Bookings.jsx';
import MyHours from './pages/provider/Hours.jsx';
import MyServices from './pages/provider/Services.jsx';
import PlatformOverview from './pages/system-admin/Overview.jsx';
import Moderation from './pages/system-admin/Moderation.jsx';
import Businesses from './pages/system-admin/Businesses.jsx';
import Users from './pages/system-admin/Users.jsx';
import Profile from './pages/account/Profile.jsx';
import Reports from './pages/account/Reports.jsx';

// Pages for visitors who are NOT logged in (top menu instead of sidebar).
export const PUBLIC_ROUTES = [
    { path: '/', label: 'Home', inMenu: true, component: Home, title: 'Smart appointment booking' },
    { path: '/how-it-works', label: 'How it works', inMenu: true, component: HowItWorks, title: 'How it works' },
    { path: '/for-business', label: 'For businesses', inMenu: true, component: ForBusiness, title: 'For businesses' },
    { path: '/login', label: 'Log in', component: Login, title: 'Log in' },
    { path: '/signup', label: 'Sign up', component: Signup, title: 'Create an account' }
];

const PROFILE = {
    path: '/profile', label: 'My Profile', icon: 'user', component: Profile,
    title: 'My Profile', subtitle: 'Your details and password.'
};

// Pages for logged-in users, per role (shown in the sidebar). { section } entries are headings.
export const ROUTES = {
    CLIENT: [
        { section: 'Booking' },
        { path: '/book', label: 'Book Appointment', icon: 'calendarPlus', component: Book,
          title: 'Book an Appointment', subtitle: 'Choose a practice, a practitioner, a service and a free time.' },
        { path: '/appointments', label: 'My Appointments', icon: 'list', component: MyAppointments,
          title: 'My Appointments', subtitle: 'See your visits, reschedule or cancel them.' },
        { section: 'Account' },
        PROFILE
    ],
    PROVIDER: [
        { section: 'My work' },
        { path: '/schedule', label: "Today's Schedule", icon: 'calendar', component: Schedule,
          title: 'Schedule & Attendance', subtitle: 'Your appointments by day. Mark visits as completed or no-show.' },
        { path: '/bookings', label: 'All Bookings', icon: 'list', component: Bookings,
          title: 'All Bookings', subtitle: 'Every appointment clients have booked with you, on any day.' },
        { path: '/hours', label: 'Working Hours', icon: 'clock', component: MyHours,
          title: 'Working Hours', subtitle: 'Your weekly availability. Breaks are the gaps between periods.' },
        { path: '/services', label: 'My Services', icon: 'tag', component: MyServices,
          title: 'My Services', subtitle: 'What clients can book with you.' },
        { path: '/reports', label: 'Reports', icon: 'chart', component: Reports,
          title: 'Reports', subtitle: 'Your appointments, attendance and revenue for a period.' },
        { section: 'Account' },
        PROFILE
    ],
    SYSTEM_ADMIN: [
        { section: 'Platform' },
        { path: '/overview', label: 'Overview', icon: 'grid', component: PlatformOverview,
          title: 'Platform Overview', subtitle: 'Users, businesses and bookings across ReadyTime.' },
        { path: '/moderation', label: 'Client Moderation', icon: 'shield', component: Moderation,
          title: 'Client Moderation', subtitle: 'No-shows, blocked clients and unblocking.' },
        { path: '/reports', label: 'Reports', icon: 'chart', component: Reports,
          title: 'Reports', subtitle: 'Appointments, attendance and revenue across the platform.' },
        { section: 'Accounts' },
        { path: '/businesses', label: 'Businesses', icon: 'building', component: Businesses,
          title: 'Businesses', subtitle: 'Businesses and their service providers.' },
        { path: '/users', label: 'User Accounts', icon: 'users', component: Users,
          title: 'User Accounts', subtitle: 'Register, edit, disable and enable accounts.' },
        { section: 'Account' },
        PROFILE
    ]
};

/** The pages (not the section headings) of a role. The first one is shown after login. */
export function pagesOf(role) {
    return (ROUTES[role] || []).filter(r => r.path);
}
