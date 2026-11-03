// Public home page (landing page).
import { icon } from '../../icons.js';

export function renderHome(container) {
    container.innerHTML = `
      <section class="hero">
        <div class="container">
          <div>
            <span class="eyebrow">${icon('logo')} Appointment booking made simple</span>
            <h1>Book your next appointment in <span>under a minute</span>.</h1>
            <p class="lead">ReadyTime shows the real free times of clinics, salons and other service
              businesses. Pick a time, confirm, done - and nobody else can take your slot.</p>
            <div class="cta">
              <a class="button large" href="#/signup" id="hero-signup">Create a free account ${icon('right')}</a>
              <a class="button large secondary" href="#/how-it-works">See how it works</a>
            </div>
            <div class="trust">
              <span>${icon('check')} Real-time free slots</span>
              <span>${icon('check')} No double-booking</span>
              <span>${icon('check')} Free cancellation up to 2 hours before</span>
            </div>
          </div>
          <div class="hero-media">
            <img src="images/doctor-consultation.jpg" alt="A doctor talking with a patient during an appointment">
            <div class="float-card two">
              <span class="stat-icon" style="background: var(--green-soft); color: var(--green);">${icon('check')}</span>
              <div><strong>Appointment confirmed</strong><span class="muted">Your slot is locked for you</span></div>
            </div>
            <div class="float-card one">
              <span class="stat-icon" style="background: var(--blue-soft); color: var(--blue);">${icon('clock')}</span>
              <div><strong>Kigali time, always</strong><span class="muted">Africa/Kigali (UTC+2)</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Who it's for</span>
            <h2>One booking system for every kind of service</h2>
            <p>Any business that works with appointments can list its providers, services and working hours.</p>
          </div>
          <div class="grid cols-3">
            <div class="audience-card">
              <img src="images/doctor-clipboard.jpg" alt="A doctor with a clipboard talking to a patient">
              <div class="body"><h3>Clinics &amp; health practices</h3>
                <p>Consultations, check-ups and follow-ups, each with its own duration.</p></div>
            </div>
            <div class="audience-card">
              <img src="images/salon-stylist.jpg" alt="A hair stylist working on a client's hair">
              <div class="body"><h3>Salons &amp; barbers</h3>
                <p>Haircuts, styling and treatments. Clients see exactly which times are still free.</p></div>
            </div>
            <div class="audience-card">
              <img src="images/clinic-conversation.jpg" alt="A professional talking with a client">
              <div class="body"><h3>Any service business</h3>
                <p>Consultants, therapists, repair services - if it needs a time slot, it fits.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section white">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Features</span>
            <h2>Fair rules, built in</h2>
            <p>The same clear rules apply to everyone, and the system enforces them automatically.</p>
          </div>
          <div class="grid cols-3">
            ${feature('calendar', 'blue', 'Real-time availability',
                'Free times come straight from each provider\'s working hours and existing bookings.')}
            ${feature('shield', 'green', 'No double-booking',
                'Even if two people click the same time at the same second, only one booking succeeds.')}
            ${feature('list', 'purple', 'Up to 2 active bookings',
                'Each client can hold two upcoming appointments, so time is shared fairly.')}
            ${feature('clock', 'orange', 'Free cancellation',
                'Cancel or reschedule for free until 2 hours before your appointment starts.')}
            ${feature('alert', 'red', 'No-show protection',
                'After 3 missed appointments, booking is paused until an admin reviews the account.')}
            ${feature('users', 'blue', 'A dashboard for every role',
                'Clients, service providers and the platform admin each get their own pages.')}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">How it works</span>
            <h2>Three steps to your appointment</h2>
          </div>
          <div class="grid cols-3 steps">
            <div class="step-card"><h3>Create your account</h3><p>Sign up in three short steps: name, email and password.</p></div>
            <div class="step-card"><h3>Choose a time</h3><p>Pick a practice, a practitioner and a service, then a free time.</p></div>
            <div class="step-card"><h3>You're booked</h3><p>Your slot is confirmed instantly. Reschedule or cancel from your dashboard.</p></div>
          </div>
        </div>
      </section>

      <section class="section" style="padding-top: 0;">
        <div class="container">
          <div class="cta-banner">
            <div><h2>Ready to book?</h2><p>Creating an account takes less than a minute.</p></div>
            <a class="button large" href="#/signup">Get started ${icon('right')}</a>
          </div>
        </div>
      </section>`;
}

function feature(iconName, tone, title, text) {
    return `
      <div class="feature tone-${tone}">
        <span class="stat-icon">${icon(iconName)}</span>
        <h3>${title}</h3>
        <p>${text}</p>
      </div>`;
}
