// Public page: simple login.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useSession } from '../../auth/SessionContext.jsx';
import { checkEmail } from '../../validation.js';
import { FieldError } from '../../components/ui.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';

export default function Login() {
    const { login } = useSession();
    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({ email: '', password: '', login: '' });
    const [busy, setBusy] = useState(false);

    // Typing again removes the old red error
    function change(field, value) {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '', login: '' }));
    }

    async function submit(event) {
        event.preventDefault();

        // Simple checks first, so the user sees what is missing
        const emailError = checkEmail(form.email);
        const passwordError = form.password ? '' : 'Please enter your password.';
        setErrors({ email: emailError, password: passwordError, login: '' });
        if (emailError || passwordError) return;

        setBusy(true);
        try {
            const result = await api('POST', '/api/login', { email: form.email, password: form.password });
            login(result.token, result.user);   // the app then shows the user's first page
        } catch (e) {
            setErrors(er => ({ ...er, login: e.message }));   // e.g. "Wrong email or password."
            setBusy(false);
        }
    }

    return (
        <div className="auth-shell">
            <div className="auth-picture">
                <img src="images/doctor-clipboard.jpg" alt="A doctor checking a patient's appointment" />
                <div className="overlay">
                    <h2>Welcome back</h2>
                    <p>Your appointments, schedule and business tools - all in one place.</p>
                </div>
            </div>
            <div className="auth-side">
                <div className="auth-box">
                    <h1>Log in</h1>
                    <p className="intro">Enter your email and password to continue.</p>
                    <form id="login-form" noValidate onSubmit={submit}>
                        <label>Email
                            <input name="email" id="login-email" type="email" autoComplete="username" placeholder="name@example.com"
                                   className={errors.email ? 'invalid' : ''} value={form.email}
                                   onChange={e => change('email', e.target.value)} />
                            <FieldError id="login-email-error" message={errors.email} />
                        </label>
                        <label>Password
                            <PasswordInput name="password" id="login-password" toggleId="toggle-password" autoComplete="current-password" placeholder="Your password"
                                           invalid={!!errors.password} value={form.password}
                                           onChange={e => change('password', e.target.value)} />
                            <FieldError id="login-password-error" message={errors.password} />
                        </label>
                        <div className="field-error" id="login-error" style={{ marginBottom: 12 }}>{errors.login}</div>
                        <button id="login-button" className="block large" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
                    </form>
                    <p className="switch-link">New to ReadyTime? <Link to="/signup" id="go-signup">Create an account</Link></p>
                </div>
            </div>
        </div>
    );
}
