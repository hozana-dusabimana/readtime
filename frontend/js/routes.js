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
import { renderBusinessOverview } from './pages/business-admin/overview.js';
import { renderBusinessServices } from './pages/business-admin/services.js';
import { renderProviders } from './pages/business-admin/providers.js';
import { renderProviderHours } from './pages/business-admin/provider-hours.js';
import { renderBusinessAppointments } from './pages/business-admin/appointments.js';
import { renderPlatformOverview } from './pages/system-admin/overview.js';
import { renderModeration } from './pages/system-admin/moderation.js';
import { renderBusinesses } from './pages/system-admin/businesses.js';
import { renderUsers } from './pages/system-admin/users.js';

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
          title: 'My Appointments', subtitle: 'See your visits, reschedule or cancel them.' }
    ],
    PROVIDER: [
        { section: 'My work' },
        { path: '/schedule', label: "Today's Schedule", icon: 'calendar', render: renderSchedule,
          title: 'Schedule & Attendance', subtitle: 'Your appointments by day. Mark visits as completed or no-show.' },
        { path: '/hours', label: 'Working Hours', icon: 'clock', render: renderMyHours,
          title: 'Working Hours', subtitle: 'Your weekly availability. Breaks are the gaps between periods.' },
        { path: '/services', label: 'My Services', icon: 'tag', render: renderMyServices,
          title: 'My Services', subtitle: 'What clients can book with you.' }
    ],
    BUSINESS_ADMIN: [
        { section: 'My business' },
        { path: '/overview', label: 'Overview', icon: 'grid', render: renderBusinessOverview,
          title: 'Business Overview', subtitle: 'Key numbers for your business.' },
        { path: '/services', label: 'Services', icon: 'tag', render: renderBusinessServices,
          title: 'Service Offerings', subtitle: 'Services of all providers in your business.' },
        { path: '/providers', label: 'Providers', icon: 'users', render: renderProviders,
          title: 'Provider Roster', subtitle: 'Your providers, their hours and services.' },
        { path: '/provider-hours', hidden: true, render: renderProviderHours,
          title: 'Provider Working Hours', subtitle: 'Weekly availability of one provider.' },
        { path: '/appointments', label: 'Appointments', icon: 'list', render: renderBusinessAppointments,
          title: 'Appointments & Attendance', subtitle: 'Every appointment in your business.' }
    ],
    SYSTEM_ADMIN: [
        { section: 'Platform' },
        { path: '/overview', label: 'Overview', icon: 'grid', render: renderPlatformOverview,
          title: 'Platform Overview', subtitle: 'Users, businesses and bookings across ReadyTime.' },
        { path: '/moderation', label: 'Client Moderation', icon: 'shield', render: renderModeration,
          title: 'Client Moderation', subtitle: 'No-shows, blocked clients and unblocking.' },
        { section: 'Accounts' },
        { path: '/businesses', label: 'Businesses', icon: 'building', render: renderBusinesses,
          title: 'Businesses', subtitle: 'Business accounts and their admins.' },
        { path: '/users', label: 'User Accounts', icon: 'users', render: renderUsers,
          title: 'User Accounts', subtitle: 'Every account on the platform.' }
    ]
};
