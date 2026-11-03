// Public page: simple login.
import { api } from '../../api.js';
import { session, setToken } from '../../session.js';
import { checkEmail } from '../../validation.js';
import { $, formData } from '../../utils.js';

export function renderLogin(container) {
    container.innerHTML = `
      <div class="auth-shell">
        <div class="auth-picture">
          <img src="images/doctor-clipboard.jpg" alt="A doctor checking a patient's appointment">
          <div class="overlay">
            <h2>Welcome back</h2>
            <p>Your appointments, schedule and business tools - all in one place.</p>
          </div>
        </div>
        <div class="auth-side">
          <div class="auth-box">
            <h1>Log in</h1>
            <p class="intro">Enter your email and password to continue.</p>
            <form id="login-form" novalidate>
              <label>Email
                <input name="email" id="login-email" type="email" autocomplete="username" placeholder="name@example.com">
                <span class="field-error" id="login-email-error"></span>
              </label>
              <label>Password
                <span class="password-wrap">
                  <input name="password" id="login-password" type="password" autocomplete="current-password" placeholder="Your password">
                  <button type="button" class="show-password" id="toggle-password">Show</button>
                </span>
                <span class="field-error" id="login-password-error"></span>
              </label>
              <div class="field-error" id="login-error" style="margin-bottom: 12px;"></div>
              <button id="login-button" class="block large">Log in</button>
            </form>
            <p class="switch-link">New to ReadyTime? <a href="#/signup" id="go-signup">Create an account</a></p>
          </div>
        </div>
      </div>`;

    $('toggle-password').onclick = () => {
        const input = $('login-password');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        $('toggle-password').textContent = show ? 'Hide' : 'Show';
    };

    // Typing again removes the old red error
    ['login-email', 'login-password'].forEach(id => {
        $(id).addEventListener('input', () => { showFieldError(id, ''); $('login-error').textContent = ''; });
    });

    $('login-form').onsubmit = async event => {
        event.preventDefault();
        const f = formData(event.target);

        // Simple checks first, so the user sees what is missing
        const emailError = checkEmail(f.email);
        const passwordError = f.password ? '' : 'Please enter your password.';
        showFieldError('login-email', emailError);
        showFieldError('login-password', passwordError);
        $('login-error').textContent = '';
        if (emailError || passwordError) return;

        const button = $('login-button');
        button.disabled = true;
        button.textContent = 'Logging in...';
        try {
            const result = await api('POST', '/api/login', { email: f.email, password: f.password });
            setToken(result.token);
            session.user = result.user;
            session.afterLogin();
        } catch (e) {
            $('login-error').textContent = e.message;   // e.g. "Wrong email or password."
            button.disabled = false;
            button.textContent = 'Log in';
        }
    };
}

function showFieldError(inputId, message) {
    $(inputId).classList.toggle('invalid', !!message);
    $(inputId + '-error').textContent = message;
}
