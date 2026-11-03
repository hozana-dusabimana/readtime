// Which pages each role has. Each entry becomes a link in the sidebar.
// The address in the browser looks like  index.html#/book  - the part after # picks the page.
// (The backend still checks every permission; this list only decides what is shown.)
import { renderHome } from './pages/public/home.js';
import { renderHowItWorks } from './pages/public/how-it-works.js';
import { renderForBusiness } from './pages/public/for-business.js';
import { renderLogin } from './pages/public/login.js';
import { renderSignup } from './pages/public/signup.js';
import { renderBook } from './pages/client/book.js';
import { renderMyAppointments } from './pages/client/my-appointments.js';
import { renderSchedule } from './pages/provider/schedule.js';
import { renderMyHours } from './pages/provider/hours.js';
import { renderMyServices } from './pages/provider/services.js';
import { renderPlatformOverview } from './pages/system-admin/overview.js';
import { renderModeration } from './pages/system-admin/moderation.js';
import { renderBusinesses } from './pages/system-admin/businesses.js';
import { renderUsers } from './pages/system-admin/users.js';
import { renderProfile } from './pages/account/profile.js';
import { renderReports } from './pages/account/reports.js';

// Pages for visitors who are NOT logged in (top menu instead of sidebar).
export const PUBLIC_ROUTES = [
    { path: '/', label: 'Home', inMenu: true, render: renderHome, title: 'Smart appointment booking' },
    { path: '/how-it-works', label: 'How it works', inMenu: true, render: renderHowItWorks, title: 'How it works' },
    { path: '/for-business', label: 'For businesses', inMenu: true, render: renderForBusiness, title: 'For businesses' },
    { path: '/login', label: 'Log in', render: renderLogin, title: 'Log in' },
    { path: '/signup', label: 'Sign up', render: renderSignup, title: 'Create an account' }
];

// Pages for logged-in users, per role (shown in the sidebar).
export const ROUTES = {
    CLIENT: [
        { section: 'Booking' },
        { path: '/book', label: 'Book Appointment', icon: 'calendarPlus', render: renderBook,
          title: 'Book an Appointment', subtitle: 'Choose a practice, a practitioner, a service and a free time.' },
        { path: '/appointments', label: 'My Appointments', icon: 'list', render: renderMyAppointments,
          title: 'My Appointments', subtitle: 'See your visits, reschedule or cancel them.' },
        { section: 'Account' },
        { path: '/profile', label: 'My Profile', icon: 'user', render: renderProfile,
          title: 'My Profile', subtitle: 'Your details and password.' }
    ],
    PROVIDER: [
        { section: 'My work' },
        { path: '/schedule', label: "Today's Schedule", icon: 'calendar', render: renderSchedule,
          title: 'Schedule & Attendance', subtitle: 'Your appointments by day. Mark visits as completed or no-show.' },
        { path: '/hours', label: 'Working Hours', icon: 'clock', render: renderMyHours,
          title: 'Working Hours', subtitle: 'Your weekly availability. Breaks are the gaps between periods.' },
        { path: '/services', label: 'My Services', icon: 'tag', render: renderMyServices,
          title: 'My Services', subtitle: 'What clients can book with you.' },
        { path: '/reports', label: 'Reports', icon: 'chart', render: renderReports,
          title: 'Reports', subtitle: 'Your appointments, attendance and revenue for a period.' },
        { section: 'Account' },
        { path: '/profile', label: 'My Profile', icon: 'user', render: renderProfile,
          title: 'My Profile', subtitle: 'Your details and password.' }
    ],
    SYSTEM_ADMIN: [
        { section: 'Platform' },
        { path: '/overview', label: 'Overview', icon: 'grid', render: renderPlatformOverview,
          title: 'Platform Overview', subtitle: 'Users, businesses and bookings across ReadyTime.' },
        { path: '/moderation', label: 'Client Moderation', icon: 'shield', render: renderModeration,
          title: 'Client Moderation', subtitle: 'No-shows, blocked clients and unblocking.' },
        { path: '/reports', label: 'Reports', icon: 'chart', render: renderReports,
          title: 'Reports', subtitle: 'Appointments, attendance and revenue across the platform.' },
        { section: 'Accounts' },
        { path: '/businesses', label: 'Businesses', icon: 'building', render: renderBusinesses,
          title: 'Businesses', subtitle: 'Businesses and their service providers.' },
        { path: '/users', label: 'User Accounts', icon: 'users', render: renderUsers,
          title: 'User Accounts', subtitle: 'Register, edit, disable and enable accounts.' },
        { section: 'Account' },
        { path: '/profile', label: 'My Profile', icon: 'user', render: renderProfile,
          title: 'My Profile', subtitle: 'Your details and password.' }
    ]
};
