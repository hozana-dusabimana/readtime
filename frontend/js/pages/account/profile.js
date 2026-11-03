// My Profile (every role): change my name and email, and change my password.
import { api } from '../../api.js';
import { icon } from '../../icons.js';
import { session } from '../../session.js';
import { checkEmail, checkName, checkPassword, checkPasswordsMatch } from '../../validation.js';
import { ROLE_NAMES, avatar, esc, formData, run } from '../../utils.js';

export async function renderProfile(container) {
    const user = await api('GET', '/api/me');
    session.user = user;

    container.innerHTML = `
      <section class="card">
        <div class="person">${avatar(user.fullName, true)}
          <div><h2>${esc(user.fullName)}</h2>
               <div class="sub">${esc(user.email)} · ${ROLE_NAMES[user.role]}</div></div></div>
      </section>

      <div class="grid cols-2">
        <section class="card">
          <div class="card-header"><div><h2>Personal details</h2><p>Your name and the email you log in with.</p></div></div>
          <form id="profile-form" novalidate>
            <label>Full name <input name="fullName" id="p-name" value="${esc(user.fullName)}" autocomplete="name">
              <span class="field-error" id="p-name-error"></span></label>
            <label>Email <input name="email" id="p-email" type="email" value="${esc(user.email)}" autocomplete="email">
              <span class="field-error" id="p-email-error"></span></label>
            <button id="save-profile">${icon('check')} Save details</button>
          </form>
        </section>

        <section class="card">
          <div class="card-header"><div><h2>Change password</h2><p>Use 8 to 64 characters.</p></div></div>
          <form id="password-form" novalidate>
            <label>Current password <input name="currentPassword" id="p-current" type="password" autocomplete="current-password">
              <span class="field-error" id="p-current-error"></span></label>
            <label>New password <input name="newPassword" id="p-new" type="password" autocomplete="new-password">
              <span class="field-error" id="p-new-error"></span></label>
            <label>Repeat new password <input name="confirm" id="p-confirm" type="password" autocomplete="new-password">
              <span class="field-error" id="p-confirm-error"></span></label>
            <button id="save-password">${icon('shield')} Change password</button>
          </form>
        </section>
      </div>`;

    const show = (id, message) => {
        container.querySelector('#' + id).classList.toggle('invalid', !!message);
        container.querySelector('#' + id + '-error').textContent = message;
        return !message;
    };

    container.querySelector('#profile-form').onsubmit = event => {
        event.preventDefault();
        const f = formData(event.target);
        const ok = [show('p-name', checkName(f.fullName)), show('p-email', checkEmail(f.email))].every(Boolean);
        if (!ok) return;
        run(async () => {
            session.user = await api('PUT', '/api/me', { fullName: f.fullName.trim(), email: f.email.trim() });
            const nameInSidebar = document.getElementById('current-user');
            if (nameInSidebar) nameInSidebar.textContent = session.user.fullName;
            await renderProfile(container);
        }, 'Your details were saved.');
    };

    container.querySelector('#password-form').onsubmit = event => {
        event.preventDefault();
        const f = formData(event.target);
        const ok = [
            show('p-current', f.currentPassword ? '' : 'Please enter your current password.'),
            show('p-new', checkPassword(f.newPassword)),
            show('p-confirm', checkPasswordsMatch(f.newPassword, f.confirm))
        ].every(Boolean);
        if (!ok) return;
        run(async () => {
            await api('PUT', '/api/me/password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
            event.target.reset();
        }, 'Your password was changed.');
    };
}
