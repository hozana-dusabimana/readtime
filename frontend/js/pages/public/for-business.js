// Public page: what ReadyTime offers to businesses and providers.
import { icon } from '../../icons.js';

export function renderForBusiness(container) {
    container.innerHTML = `
      <section class="hero">
        <div class="container split">
          <div>
            <span class="eyebrow">For businesses</span>
            <h1 style="font-size: 40px;">Fill your schedule, <span>not your phone line</span>.</h1>
            <p class="lead">Set your providers, services and working hours once. ReadyTime turns them into
              bookable times and keeps every calendar free of double-bookings.</p>
            <div class="cta">
              <a class="button large" href="#/login">Log in to your business</a>
              <a class="button large secondary" href="#/how-it-works">How booking works</a>
            </div>
          </div>
          <img src="images/clinic-conversation.jpg" alt="A professional in scrubs talking with a client">
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Roles</span>
            <h2>Everyone gets the right tools</h2>
            <p>Each person only sees and changes what their role allows - checked by the server on every request.</p>
          </div>
          <div class="grid cols-3">
            ${role('building', 'blue', 'Business admin',
                ['Adds providers to the business', 'Manages every provider\'s services and hours', 'Sees all appointments and attendance'])}
            ${role('user', 'green', 'Service provider',
                ['Sets weekly working hours and breaks', 'Creates services with duration and price', 'Marks visits completed or no-show'])}
            ${role('shield', 'purple', 'System admin',
                ['Registers businesses and their admins', 'Enables or disables user accounts', 'Reviews and unblocks clients'])}
          </div>
        </div>
      </section>

      <section class="section white">
        <div class="container split">
          <img src="images/salon-stylist.jpg" alt="A stylist preparing a client's hair in a salon">
          <div>
            <span class="eyebrow">Scheduling</span>
            <h2>Your hours, your breaks, your services</h2>
            <ul class="check-list">
              <li>${icon('check')}<span>Several working periods per day - the gap between them is a break.</span></li>
              <li>${icon('check')}<span>Free times follow the length of each service (e.g. 30 or 45 minutes).</span></li>
              <li>${icon('check')}<span>Changing hours never cancels existing bookings - you see which ones are affected.</span></li>
              <li>${icon('check')}<span>Clients with 3 no-shows are paused automatically.</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="cta-banner">
            <div><h2>Want your business on ReadyTime?</h2>
              <p>Business accounts are created by the ReadyTime system admin. Ask them to register your business.</p></div>
            <a class="button large" href="#/login">Log in ${icon('right')}</a>
          </div>
        </div>
      </section>`;
}

function role(iconName, tone, title, points) {
    return `
      <div class="feature tone-${tone}">
        <span class="stat-icon">${icon(iconName)}</span>
        <h3>${title}</h3>
        <ul class="check-list" style="margin: 10px 0 0;">
          ${points.map(p => `<li>${icon('check')}<span>${p}</span></li>`).join('')}
        </ul>
      </div>`;
}
