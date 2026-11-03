// Public page: sign up in steps.
//   Client:           1 Name -> 2 Email -> 3 Password -> 4 Review
//   Service provider: 1 Name -> 2 Email -> 3 Password -> 4 Business -> 5 Review
// The account type is chosen on step 1 (#/signup?as=provider opens it as a provider).
// Each step checks its own fields before you can continue. After "Create account"
// the user is logged in automatically.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { session, setToken } from '../../session.js';
import { checkEmail, checkName, checkPassword, checkPasswordsMatch, checkText, PASSWORD_MAX, PASSWORD_MIN } from '../../validation.js';
import { $, esc } from '../../utils.js';

const CLIENT_STEPS = ['Your name', 'Your email', 'Password', 'Review'];
const PROVIDER_STEPS = ['Your name', 'Your email', 'Password', 'Business', 'Review'];

export function renderSignup(container, params = {}) {
    // What the user typed so far (kept when going back and forth between steps)
    const data = { fullName: '', email: '', password: '', confirm: '', businessName: '', businessAddress: '' };
    let type = params.as === 'provider' ? 'PROVIDER' : 'CLIENT';
    let step = 1;
    let serverError = '';

    const steps = () => (type === 'PROVIDER' ? PROVIDER_STEPS : CLIENT_STEPS);
    const stepName = () => steps()[step - 1];

    container.innerHTML = `
      <div class="auth-shell">
        <div class="auth-picture">
          <img src="images/planning-calendar.jpg" alt="A person planning their week with a calendar and phone">
          <div class="overlay">
            <h2 id="su-picture-title"></h2>
            <p id="su-picture-text"></p>
          </div>
        </div>
        <div class="auth-side"><div class="auth-box" id="signup-box"></div></div>
      </div>`;

    function draw() {
        $('su-picture-title').textContent = type === 'PROVIDER' ? 'Grow your bookings' : 'Your time, organised';
        $('su-picture-text').textContent = type === 'PROVIDER'
            ? 'Register yourself and your business, then add your services and working hours. Clients can book you right away.'
            : 'Create a free client account and book appointments with clinics, salons and other services.';
        $('signup-box').innerHTML = `
          ${step === 1 ? typeChooser() : ''}
          ${stepper()}
          <div class="step-title">Step ${step} of ${steps().length} · ${type === 'PROVIDER' ? 'Service provider' : 'Client'}</div>
          ${stepContent()}
          <p class="switch-link">Already have an account? <a href="#/login">Log in</a></p>`;
        connect();
        const first = $('signup-box').querySelector('input');
        if (first) first.focus();
    }

    /** "I want to book" / "I offer services" - only on step 1. */
    function typeChooser() {
        return `<div class="tabs" id="su-type" style="margin-bottom: 18px; display: flex;">
          <button type="button" data-type="CLIENT" class="${type === 'CLIENT' ? 'active' : ''}" style="flex: 1;">
            ${icon('user')} I want to book</button>
          <button type="button" data-type="PROVIDER" class="${type === 'PROVIDER' ? 'active' : ''}" style="flex: 1;">
            ${icon('building')} I offer services</button>
        </div>`;
    }

    function stepper() {
        return `<div class="stepper" aria-label="Signup progress">
          ${steps().map((name, i) => {
              const n = i + 1;
              const state = n < step ? 'done' : n === step ? 'current' : '';
              return `${i > 0 ? `<span class="line ${n <= step ? 'done' : ''}"></span>` : ''}
                      <span class="dot ${state}" title="${name}">${n < step ? icon('check') : n}</span>`;
          }).join('')}
        </div>`;
    }

    function stepContent() {
        if (stepName() === 'Your name') {
            return `
              <h1>What's your name?</h1>
              <p class="intro">${type === 'PROVIDER' ? 'This is how clients will see you.' : 'This is how practices will see you.'}</p>
              <form id="step-form" novalidate>
                <label>Full name
                  <input id="su-name" autocomplete="name" placeholder="e.g. Grace Uwase" value="${esc(data.fullName)}">
                  <span class="field-error" id="su-name-error"></span>
                </label>
                <div class="step-buttons"><button id="su-next" class="large">Continue ${icon('right')}</button></div>
              </form>`;
        }
        if (stepName() === 'Your email') {
            return `
              <h1>Your email</h1>
              <p class="intro">You will use it to log in.</p>
              <form id="step-form" novalidate>
                <label>Email
                  <input id="su-email" type="email" autocomplete="email" placeholder="name@example.com" value="${esc(data.email)}">
                  <span class="field-error" id="su-email-error">${esc(serverError)}</span>
                </label>
                <div class="step-buttons">
                  <button type="button" class="secondary large" id="su-back">${icon('left')} Back</button>
                  <button id="su-next" class="large">Continue ${icon('right')}</button>
                </div>
              </form>`;
        }
        if (stepName() === 'Password') {
            return `
              <h1>Choose a password</h1>
              <p class="intro">Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.</p>
              <form id="step-form" novalidate>
                <label>Password
                  <span class="password-wrap">
                    <input id="su-password" type="password" autocomplete="new-password" value="${esc(data.password)}">
                    <button type="button" class="show-password" data-toggle="su-password">Show</button>
                  </span>
                </label>
                <ul class="rules" id="su-rules"></ul>
                <label>Repeat password
                  <span class="password-wrap">
                    <input id="su-confirm" type="password" autocomplete="new-password" value="${esc(data.confirm)}">
                    <button type="button" class="show-password" data-toggle="su-confirm">Show</button>
                  </span>
                  <span class="field-error" id="su-password-error"></span>
                </label>
                <div class="step-buttons">
                  <button type="button" class="secondary large" id="su-back">${icon('left')} Back</button>
                  <button id="su-next" class="large">Continue ${icon('right')}</button>
                </div>
              </form>`;
        }
        if (stepName() === 'Business') {
            return `
              <h1>Your business</h1>
              <p class="intro">Where clients will come for their appointments.</p>
              <form id="step-form" novalidate>
                <label>Business name
                  <input id="su-business" autocomplete="organization" placeholder="e.g. Kigali Smile Dental" value="${esc(data.businessName)}">
                  <span class="field-error" id="su-business-error"></span>
                </label>
                <label>Address
                  <input id="su-address" autocomplete="street-address" placeholder="e.g. KN 3 Rd, Kigali" value="${esc(data.businessAddress)}">
                  <span class="field-error" id="su-address-error"></span>
                </label>
                <div class="step-buttons">
                  <button type="button" class="secondary large" id="su-back">${icon('left')} Back</button>
                  <button id="su-next" class="large">Continue ${icon('right')}</button>
                </div>
              </form>`;
        }
        return `
          <h1>Check your details</h1>
          <p class="intro">You are creating a <strong>${type === 'PROVIDER' ? 'service provider' : 'client'}</strong> account.</p>
          <div class="review" id="su-review">
            <div><span>Name</span><strong>${esc(data.fullName.trim())}</strong></div>
            <div><span>Email</span><strong>${esc(data.email.trim())}</strong></div>
            <div><span>Password</span><strong>${'•'.repeat(data.password.length)}</strong></div>
            ${type === 'PROVIDER' ? `
            <div><span>Business</span><strong>${esc(data.businessName.trim())}</strong></div>
            <div><span>Address</span><strong>${esc(data.businessAddress.trim())}</strong></div>` : ''}
          </div>
          <div class="field-error" id="su-error" style="margin-bottom: 12px;">${esc(serverError)}</div>
          <form id="step-form" novalidate>
            <div class="step-buttons">
              <button type="button" class="secondary large" id="su-back">${icon('left')} Back</button>
              <button id="su-create" class="large success">${icon('check')} Create account</button>
            </div>
          </form>`;
    }

    // Live checklist under the password field (turns green when a rule is met)
    function drawRules() {
        const p = $('su-password').value;
        const rules = [
            { ok: p.length >= PASSWORD_MIN, text: `At least ${PASSWORD_MIN} characters` },
            { ok: p.length > 0 && p.length <= PASSWORD_MAX, text: `At most ${PASSWORD_MAX} characters` },
            { ok: p.length > 0 && p === $('su-confirm').value, text: 'Both passwords are the same' }
        ];
        $('su-rules').innerHTML = rules.map(r =>
            `<li class="${r.ok ? 'ok' : ''}">${icon(r.ok ? 'check' : 'x')} ${r.text}</li>`).join('');
    }

    function connect() {
        // Typing again removes the old red error, so it never shows a stale message
        $('signup-box').querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                $('signup-box').querySelectorAll('input.invalid').forEach(i => i.classList.remove('invalid'));
                $('signup-box').querySelectorAll('.field-error').forEach(e => { e.textContent = ''; });
            });
        });

        $('signup-box').querySelectorAll('[data-type]').forEach(b => {
            b.onclick = () => { saveInputs(); type = b.dataset.type; serverError = ''; draw(); };
        });

        const back = $('su-back');
        if (back) back.onclick = () => { saveInputs(); step--; serverError = ''; draw(); };

        $('signup-box').querySelectorAll('[data-toggle]').forEach(b => {
            b.onclick = () => {
                const input = $(b.dataset.toggle);
                input.type = input.type === 'password' ? 'text' : 'password';
                b.textContent = input.type === 'password' ? 'Show' : 'Hide';
            };
        });

        if (stepName() === 'Password') {
            $('su-password').oninput = drawRules;
            $('su-confirm').oninput = drawRules;
            drawRules();
        }

        $('step-form').onsubmit = event => {
            event.preventDefault();
            saveInputs();
            const name = stepName();
            if (name === 'Your name') next(checkName(data.fullName), 'su-name');
            else if (name === 'Your email') next(checkEmail(data.email), 'su-email');
            else if (name === 'Password') next(checkPassword(data.password) || checkPasswordsMatch(data.password, data.confirm), 'su-password');
            else if (name === 'Business') checkBusinessStep();
            else createAccount();
        };
    }

    function saveInputs() {
        if ($('su-name')) data.fullName = $('su-name').value;
        if ($('su-email')) data.email = $('su-email').value;
        if ($('su-password')) data.password = $('su-password').value;
        if ($('su-confirm')) data.confirm = $('su-confirm').value;
        if ($('su-business')) data.businessName = $('su-business').value;
        if ($('su-address')) data.businessAddress = $('su-address').value;
    }

    /** Both business fields are checked; each error is shown under its own field. */
    function checkBusinessStep() {
        const nameError = checkText(data.businessName, 'Business name', 2, 100);
        const addressError = checkText(data.businessAddress, 'Address', 2, 200);
        if (nameError) { $('su-business').classList.add('invalid'); $('su-business-error').textContent = nameError; }
        if (addressError) { $('su-address').classList.add('invalid'); $('su-address-error').textContent = addressError; }
        if (!nameError && !addressError) next('', 'su-business');
    }

    /** Goes to the next step, or shows the error under the field. */
    function next(error, inputId) {
        if (error) {
            $(inputId).classList.add('invalid');
            $(inputId + '-error').textContent = error;
            return;
        }
        serverError = '';
        step++;
        draw();
    }

    async function createAccount() {
        const button = $('su-create');
        button.disabled = true;
        button.textContent = 'Creating account...';
        const email = data.email.trim();
        try {
            const account = { fullName: data.fullName.trim(), email: email, password: data.password };
            if (type === 'PROVIDER') {
                await api('POST', '/api/register/provider', { ...account,
                    businessName: data.businessName.trim(), businessAddress: data.businessAddress.trim() });
            } else {
                await api('POST', '/api/register', account);
            }
            // Log in straight away with the same details
            const result = await api('POST', '/api/login', { email: email, password: data.password });
            setToken(result.token);
            session.user = result.user;
            session.afterLogin();
        } catch (e) {
            serverError = e.message;
            if (e.message.toLowerCase().includes('email')) step = 2;   // e.g. "email already exists" -> fix it there
            draw();
        }
    }

    draw();
}
