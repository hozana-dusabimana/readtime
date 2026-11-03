// Public page: how booking works + the rules + frequently asked questions.
import { icon } from '../../icons.js';

export function renderHowItWorks(container) {
    container.innerHTML = `
      <section class="hero">
        <div class="container" style="grid-template-columns: 1fr;">
          <div class="section-head" style="margin-bottom: 0;">
            <span class="eyebrow">How it works</span>
            <h2 style="font-size: 38px;">From sign-up to appointment in four steps</h2>
            <p>No phone calls and no waiting. You only ever see times that are really free.</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="grid cols-2 steps">
            <div class="step-card"><h3>Create a client account</h3>
              <p>Enter your name, your email and a password (8 to 64 characters). That's it.</p></div>
            <div class="step-card"><h3>Find a practice and a practitioner</h3>
              <p>Choose the business, then the person you want to see, then the service you need.
                 Each service shows its duration and price.</p></div>
            <div class="step-card"><h3>Pick a free time</h3>
              <p>Times are built from the practitioner's working hours and the length of the service.
                 Breaks and times that are already booked are never shown.</p></div>
            <div class="step-card"><h3>Confirm and manage</h3>
              <p>Confirm with one click. Later you can reschedule or cancel from "My Appointments".</p></div>
          </div>
        </div>
      </section>

      <section class="section white">
        <div class="container split">
          <img src="images/planning-calendar.jpg" alt="A person planning appointments in a calendar with a phone">
          <div>
            <span class="eyebrow">Booking rules</span>
            <h2>Simple rules that keep things fair</h2>
            <ul class="check-list">
              <li>${icon('check')}<span><strong>At most 2 active appointments</strong> per client at the same time.</span></li>
              <li>${icon('check')}<span><strong>Cancel or reschedule for free</strong> until 2 hours before the start
                  (exactly 2 hours before is still allowed).</span></li>
              <li>${icon('check')}<span><strong>No double-booking:</strong> a time can only ever be booked by one person.</span></li>
              <li>${icon('check')}<span><strong>3 no-shows pause booking.</strong> A system admin can review and unblock the account.</span></li>
              <li>${icon('check')}<span><strong>One time zone:</strong> all times are Kigali time (UTC+2).</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container" style="max-width: 820px;">
          <div class="section-head"><span class="eyebrow">FAQ</span><h2>Questions people ask</h2></div>
          <div class="faq">
            <details><summary>Does it cost anything to create an account?</summary>
              <p>No. Creating a client account and booking is free. You pay the service price at the practice.</p></details>
            <details><summary>What happens if I cancel less than 2 hours before?</summary>
              <p>You can't cancel or reschedule online any more. Please contact the practice directly.</p></details>
            <details><summary>What counts as a no-show?</summary>
              <p>If you don't come to an appointment, the provider can mark it as a no-show after its start time.
                 After 3 no-shows you can't make new bookings until a system admin unblocks your account.</p></details>
            <details><summary>What if the practitioner changes their working hours?</summary>
              <p>Your booking is kept. The practitioner sees which bookings are outside their new hours and
                 contacts you if something needs to change.</p></details>
            <details><summary>Can two people book the same time?</summary>
              <p>No. The system locks the time while a booking is saved, so only the first person gets it.</p></details>
          </div>
        </div>
      </section>

      <section class="section" style="padding-top: 0;">
        <div class="container">
          <div class="cta-banner">
            <div><h2>Try it yourself</h2><p>Create an account and book your first appointment.</p></div>
            <a class="button large" href="#/signup">Create an account ${icon('right')}</a>
          </div>
        </div>
      </section>`;
}
