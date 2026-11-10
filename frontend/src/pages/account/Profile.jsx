// My Profile (every role): change my name and email, and change my password.
import { useState } from 'react';
import { api } from '../../api.js';
import { useLoad, useRun, useSession } from '../../auth/SessionContext.jsx';
import { Icon } from '../../components/Icon.jsx';
import { Avatar, FieldError, Loading } from '../../components/ui.jsx';
import { ROLE_NAMES } from '../../utils.js';
import { checkEmail, checkName, checkPassword, checkPasswordsMatch } from '../../validation.js';

export default function Profile() {
    const { setUser } = useSession();
    const { data: user, reload } = useLoad(async () => {
        const me = await api('GET', '/api/me');
        setUser(me);
        return me;
    });

    if (!user) return <Loading />;

    return (
        <>
            <section className="card">
                <div className="person"><Avatar name={user.fullName} large />
                    <div><h2>{user.fullName}</h2>
                        <div className="sub">{user.email} · {ROLE_NAMES[user.role]}</div></div></div>
            </section>

            <div className="grid cols-2">
                <section className="card">
                    <div className="card-header"><div><h2>Personal details</h2><p>Your name and the email you log in with.</p></div></div>
                    {/* key: after saving, the form starts again from the saved details */}
                    <DetailsForm key={user.fullName + '|' + user.email} user={user} reload={reload} />
                </section>

                <section className="card">
                    <div className="card-header"><div><h2>Change password</h2><p>Use 8 to 64 characters.</p></div></div>
                    <PasswordForm />
                </section>
            </div>
        </>
    );
}

function DetailsForm({ user, reload }) {
    const run = useRun();
    const { setUser } = useSession();
    const [f, setF] = useState({ fullName: user.fullName, email: user.email });
    const [errors, setErrors] = useState({});

    function submit(event) {
        event.preventDefault();
        const found = { 'p-name': checkName(f.fullName), 'p-email': checkEmail(f.email) };
        setErrors(found);
        if (Object.values(found).some(Boolean)) return;
        run(async () => {
            setUser(await api('PUT', '/api/me', { fullName: f.fullName.trim(), email: f.email.trim() }));   // also updates the sidebar
            await reload();
        }, 'Your details were saved.');
    }

    return (
        <form id="profile-form" noValidate onSubmit={submit}>
            <label>Full name <input name="fullName" id="p-name" autoComplete="name" className={errors['p-name'] ? 'invalid' : ''}
                                    value={f.fullName} onChange={e => setF(x => ({ ...x, fullName: e.target.value }))} />
                <FieldError id="p-name-error" message={errors['p-name']} /></label>
            <label>Email <input name="email" id="p-email" type="email" autoComplete="email" className={errors['p-email'] ? 'invalid' : ''}
                                value={f.email} onChange={e => setF(x => ({ ...x, email: e.target.value }))} />
                <FieldError id="p-email-error" message={errors['p-email']} /></label>
            <button id="save-profile"><Icon name="check" /> Save details</button>
        </form>
    );
}

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirm: '' };

function PasswordForm() {
    const run = useRun();
    const [f, setF] = useState(EMPTY_PASSWORDS);
    const [errors, setErrors] = useState({});
    const set = field => e => setF(x => ({ ...x, [field]: e.target.value }));

    function submit(event) {
        event.preventDefault();
        const found = {
            'p-current': f.currentPassword ? '' : 'Please enter your current password.',
            'p-new': checkPassword(f.newPassword),
            'p-confirm': checkPasswordsMatch(f.newPassword, f.confirm)
        };
        setErrors(found);
        if (Object.values(found).some(Boolean)) return;
        run(async () => {
            await api('PUT', '/api/me/password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
            setF(EMPTY_PASSWORDS);
        }, 'Your password was changed.');
    }

    const field = (label, name, id, autoComplete) => (
        <label>{label} <input name={name} id={id} type="password" autoComplete={autoComplete}
                              className={errors[id] ? 'invalid' : ''} value={f[name]} onChange={set(name)} />
            <FieldError id={id + '-error'} message={errors[id]} /></label>
    );

    return (
        <form id="password-form" noValidate onSubmit={submit}>
            {field('Current password', 'currentPassword', 'p-current', 'current-password')}
            {field('New password', 'newPassword', 'p-new', 'new-password')}
            {field('Repeat new password', 'confirm', 'p-confirm', 'new-password')}
            <button id="save-password"><Icon name="shield" /> Change password</button>
        </form>
    );
}
