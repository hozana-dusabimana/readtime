// Public page: sign up in steps (1 Name -> 2 Email -> 3 Password -> 4 Review).
// Each step checks its own field before you can continue. After "Create account"
// the user is logged in automatically.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { session, setToken } from '../../session.js';
import { checkEmail, checkName, checkPassword, checkPasswordsMatch, PASSWORD_MAX, PASSWORD_MIN } from '../../validation.js';
import { $, esc } from '../../utils.js';

const STEPS = ['Your name', 'Your email', 'Password', 'Review'];

export function renderSignup(container) {
    // What the user typed so far (kept when going back and forth between steps)
    const data = { fullName: '', email: '', password: '', confirm: '' };
    let step = 1;
    let serverError = '';

    container.innerHTML = `
      <div class="auth-shell">
        <div class="auth-picture">
          <img src="images/planning-calendar.jpg" alt="A person planning their week with a calendar and phone">
          <div class="overlay">
            <h2>Your time, organised</h2>
            <p>Create a free client account and book appointments with clinics, salons and other services.</p>
          </div>
        </div>
        <div class="auth-side"><div class="auth-box" id="signup-box"></div></div>
      </div>`;

    function draw() {
        $('signup-box').innerHTML = `
          ${stepper()}
          <div class="step-title">Step ${step} of ${STEPS.length}</div>
          ${stepContent()}
          <p class="switch-link">Already have an account? <a href="#/login">Log in</a></p>`;
        connect();
        const first = $('signup-box').querySelector('input');
        if (first) first.focus();
    }

    function stepper() {
        return `<div class="stepper" aria-label="Signup progress">
          ${STEPS.map((name, i) => {
              const n = i + 1;
              const state = n < step ? 'done' : n === step ? 'current' : '';
              return `${i > 0 ? `<span class="line ${n <= step ? 'done' : ''}"></span>` : ''}
                      <span class="dot ${state}" title="${name}">${n < step ? icon('check') : n}</span>`;
          }).join('')}
        </div>`;
    }

    function stepContent() {
        if (step === 1) {
            return `
              <h1>What's your name?</h1>
              <p class="intro">This is how practices will see you.</p>
              <form id="step-form" novalidate>
                <label>Full name
                  <input id="su-name" autocomplete="name" placeholder="e.g. Grace Uwase" value="${esc(data.fullName)}">
                  <span class="field-error" id="su-name-error"></span>
                </label>
                <div class="step-buttons"><button id="su-next" class="large">Continue ${icon('right')}</button></div>
              </form>`;
        }
        if (step === 2) {
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
        if (step === 3) {
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
        return `
          <h1>Check your details</h1>
          <p class="intro">You are creating a <strong>client</strong> account.</p>
          <div class="review" id="su-review">
            <div><span>Name</span><strong>${esc(data.fullName.trim())}</strong></div>
            <div><span>Email</span><strong>${esc(data.email.trim())}</strong></div>
            <div><span>Password</span><strong>${'•'.repeat(data.password.length)}</strong></div>
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

        const back = $('su-back');
        if (back) back.onclick = () => { saveInputs(); step--; serverError = ''; draw(); };

        $('signup-box').querySelectorAll('[data-toggle]').forEach(b => {
            b.onclick = () => {
                const input = $(b.dataset.toggle);
                input.type = input.type === 'password' ? 'text' : 'password';
                b.textContent = input.type === 'password' ? 'Show' : 'Hide';
            };
        });

        if (step === 3) {
            $('su-password').oninput = drawRules;
            $('su-confirm').oninput = drawRules;
            drawRules();
        }

        $('step-form').onsubmit = event => {
            event.preventDefault();
            saveInputs();
            if (step === 1) next(checkName(data.fullName), 'su-name');
            else if (step === 2) next(checkEmail(data.email), 'su-email');
            else if (step === 3) next(checkPassword(data.password) || checkPasswordsMatch(data.password, data.confirm), 'su-password');
            else createAccount();
        };
    }

    function saveInputs() {
        if ($('su-name')) data.fullName = $('su-name').value;
        if ($('su-email')) data.email = $('su-email').value;
        if ($('su-password')) data.password = $('su-password').value;
        if ($('su-confirm')) data.confirm = $('su-confirm').value;
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
            await api('POST', '/api/register', { fullName: data.fullName.trim(), email: email, password: data.password });
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
