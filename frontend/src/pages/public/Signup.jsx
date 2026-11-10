// Public page: sign up in steps.
//   Client:           1 Name -> 2 Email -> 3 Password -> 4 Review
//   Service provider: 1 Name -> 2 Email -> 3 Password -> 4 Business -> 5 Review
// The account type is chosen on step 1 (#/signup?as=provider opens it as a provider).
// Each step checks its own fields before you can continue. After "Create account"
// the user is logged in automatically.
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useSession } from '../../auth/SessionContext.jsx';
import { Icon } from '../../components/Icon.jsx';
import { FieldError } from '../../components/ui.jsx';
import { PasswordInput } from '../../components/PasswordInput.jsx';
import { checkEmail, checkName, checkPassword, checkPasswordsMatch, checkText, PASSWORD_MAX, PASSWORD_MIN } from '../../validation.js';

const CLIENT_STEPS = ['Your name', 'Your email', 'Password', 'Review'];
const PROVIDER_STEPS = ['Your name', 'Your email', 'Password', 'Business', 'Review'];
const NO_ERRORS = {};

export default function Signup() {
    const [params] = useSearchParams();
    const { login } = useSession();

    // What the user typed so far (kept when going back and forth between steps)
    const [data, setData] = useState({ fullName: '', email: '', password: '', confirm: '', businessName: '', businessAddress: '' });
    const [type, setType] = useState(params.get('as') === 'provider' ? 'PROVIDER' : 'CLIENT');
    const [step, setStep] = useState(1);
    const [serverError, setServerError] = useState('');
    const [errors, setErrors] = useState(NO_ERRORS);   // { fieldId: message }
    const [busy, setBusy] = useState(false);
    const boxRef = useRef(null);

    const steps = type === 'PROVIDER' ? PROVIDER_STEPS : CLIENT_STEPS;
    const stepName = steps[step - 1];

    // Each new step (or account type) puts the cursor in its first field
    useEffect(() => {
        const first = boxRef.current && boxRef.current.querySelector('input');
        if (first) first.focus();
    }, [step, type]);

    /** Typing again removes the old red errors, so they never show a stale message. */
    function change(field, value) {
        setData(d => ({ ...d, [field]: value }));
        setErrors(NO_ERRORS);
        setServerError('');
    }

    function chooseType(t) {
        setType(t);
        setServerError('');
        setErrors(NO_ERRORS);
    }

    function back() {
        setStep(s => s - 1);
        setServerError('');
        setErrors(NO_ERRORS);
    }

    /** Goes to the next step, or shows the errors under their fields. */
    function next(fieldErrors) {
        if (Object.values(fieldErrors).some(Boolean)) {
            setErrors(fieldErrors);
            return;
        }
        setErrors(NO_ERRORS);
        setServerError('');
        setStep(s => s + 1);
    }

    function submit(event) {
        event.preventDefault();
        if (stepName === 'Your name') next({ 'su-name': checkName(data.fullName) });
        else if (stepName === 'Your email') next({ 'su-email': checkEmail(data.email) });
        else if (stepName === 'Password') next({ 'su-password': checkPassword(data.password) || checkPasswordsMatch(data.password, data.confirm) });
        else if (stepName === 'Business') {
            // Both business fields are checked; each error is shown under its own field.
            next({
                'su-business': checkText(data.businessName, 'Business name', 2, 100),
                'su-address': checkText(data.businessAddress, 'Address', 2, 200)
            });
        } else createAccount();
    }

    async function createAccount() {
        setBusy(true);
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
            login(result.token, result.user);   // the app then shows the user's first page
        } catch (e) {
            setServerError(e.message);
            setErrors(NO_ERRORS);
            if (e.message.toLowerCase().includes('email')) setStep(2);   // e.g. "email already exists" -> fix it there
            setBusy(false);
        }
    }

    const input = (field, id, props) => (
        <input id={id} value={data[field]} className={errors[id] ? 'invalid' : ''}
               onChange={e => change(field, e.target.value)} {...props} />
    );

    const backButton = (
        <button type="button" className="secondary large" id="su-back" onClick={back}><Icon name="left" /> Back</button>
    );
    const nextButton = <button id="su-next" className="large">Continue <Icon name="right" /></button>;

    function stepContent() {
        if (stepName === 'Your name') {
            return (
                <>
                    <h1>What&apos;s your name?</h1>
                    <p className="intro">{type === 'PROVIDER' ? 'This is how clients will see you.' : 'This is how practices will see you.'}</p>
                    <form id="step-form" noValidate onSubmit={submit}>
                        <label>Full name
                            {input('fullName', 'su-name', { autoComplete: 'name', placeholder: 'e.g. Grace Uwase' })}
                            <FieldError id="su-name-error" message={errors['su-name']} />
                        </label>
                        <div className="step-buttons">{nextButton}</div>
                    </form>
                </>
            );
        }
        if (stepName === 'Your email') {
            return (
                <>
                    <h1>Your email</h1>
                    <p className="intro">You will use it to log in.</p>
                    <form id="step-form" noValidate onSubmit={submit}>
                        <label>Email
                            {input('email', 'su-email', { type: 'email', autoComplete: 'email', placeholder: 'name@example.com' })}
                            <FieldError id="su-email-error" message={errors['su-email'] || serverError} />
                        </label>
                        <div className="step-buttons">{backButton}{nextButton}</div>
                    </form>
                </>
            );
        }
        if (stepName === 'Password') {
            const p = data.password;
            // Live checklist under the password field (turns green when a rule is met)
            const rules = [
                { ok: p.length >= PASSWORD_MIN, text: `At least ${PASSWORD_MIN} characters` },
                { ok: p.length > 0 && p.length <= PASSWORD_MAX, text: `At most ${PASSWORD_MAX} characters` },
                { ok: p.length > 0 && p === data.confirm, text: 'Both passwords are the same' }
            ];
            return (
                <>
                    <h1>Choose a password</h1>
                    <p className="intro">Use {PASSWORD_MIN} to {PASSWORD_MAX} characters.</p>
                    <form id="step-form" noValidate onSubmit={submit}>
                        <label>Password
                            <PasswordInput id="su-password" autoComplete="new-password" invalid={!!errors['su-password']}
                                           value={data.password} onChange={e => change('password', e.target.value)} />
                        </label>
                        <ul className="rules" id="su-rules">
                            {rules.map(r => <li key={r.text} className={r.ok ? 'ok' : ''}><Icon name={r.ok ? 'check' : 'x'} /> {r.text}</li>)}
                        </ul>
                        <label>Repeat password
                            <PasswordInput id="su-confirm" autoComplete="new-password"
                                           value={data.confirm} onChange={e => change('confirm', e.target.value)} />
                            <FieldError id="su-password-error" message={errors['su-password']} />
                        </label>
                        <div className="step-buttons">{backButton}{nextButton}</div>
                    </form>
                </>
            );
        }
        if (stepName === 'Business') {
            return (
                <>
                    <h1>Your business</h1>
                    <p className="intro">Where clients will come for their appointments.</p>
                    <form id="step-form" noValidate onSubmit={submit}>
                        <label>Business name
                            {input('businessName', 'su-business', { autoComplete: 'organization', placeholder: 'e.g. Kigali Smile Dental' })}
                            <FieldError id="su-business-error" message={errors['su-business']} />
                        </label>
                        <label>Address
                            {input('businessAddress', 'su-address', { autoComplete: 'street-address', placeholder: 'e.g. KN 3 Rd, Kigali' })}
                            <FieldError id="su-address-error" message={errors['su-address']} />
                        </label>
                        <div className="step-buttons">{backButton}{nextButton}</div>
                    </form>
                </>
            );
        }
        return (
            <>
                <h1>Check your details</h1>
                <p className="intro">You are creating a <strong>{type === 'PROVIDER' ? 'service provider' : 'client'}</strong> account.</p>
                <div className="review" id="su-review">
                    <div><span>Name</span><strong>{data.fullName.trim()}</strong></div>
                    <div><span>Email</span><strong>{data.email.trim()}</strong></div>
                    <div><span>Password</span><strong>{'•'.repeat(data.password.length)}</strong></div>
                    {type === 'PROVIDER' && (
                        <>
                            <div><span>Business</span><strong>{data.businessName.trim()}</strong></div>
                            <div><span>Address</span><strong>{data.businessAddress.trim()}</strong></div>
                        </>
                    )}
                </div>
                <div className="field-error" id="su-error" style={{ marginBottom: 12 }}>{serverError}</div>
                <form id="step-form" noValidate onSubmit={submit}>
                    <div className="step-buttons">
                        {backButton}
                        <button id="su-create" className="large success" disabled={busy}>
                            {busy ? 'Creating account...' : <><Icon name="check" /> Create account</>}
                        </button>
                    </div>
                </form>
            </>
        );
    }

    return (
        <div className="auth-shell">
            <div className="auth-picture">
                <img src="images/planning-calendar.jpg" alt="A person planning their week with a calendar and phone" />
                <div className="overlay">
                    <h2 id="su-picture-title">{type === 'PROVIDER' ? 'Grow your bookings' : 'Your time, organised'}</h2>
                    <p id="su-picture-text">{type === 'PROVIDER'
                        ? 'Register yourself and your business, then add your services and working hours. Clients can book you right away.'
                        : 'Create a free client account and book appointments with clinics, salons and other services.'}</p>
                </div>
            </div>
            <div className="auth-side">
                <div className="auth-box" id="signup-box" ref={boxRef}>
                    {step === 1 && (
                        // "I want to book" / "I offer services" - only on step 1
                        <div className="tabs" id="su-type" style={{ marginBottom: 18, display: 'flex' }}>
                            <button type="button" data-type="CLIENT" className={type === 'CLIENT' ? 'active' : ''} style={{ flex: 1 }}
                                    onClick={() => chooseType('CLIENT')}><Icon name="user" /> I want to book</button>
                            <button type="button" data-type="PROVIDER" className={type === 'PROVIDER' ? 'active' : ''} style={{ flex: 1 }}
                                    onClick={() => chooseType('PROVIDER')}><Icon name="building" /> I offer services</button>
                        </div>
                    )}
                    <div className="stepper" aria-label="Signup progress">
                        {steps.map((name, i) => {
                            const n = i + 1;
                            const state = n < step ? 'done' : n === step ? 'current' : '';
                            return (
                                <Fragment key={name}>
                                    {i > 0 && <span className={'line ' + (n <= step ? 'done' : '')}></span>}
                                    <span className={'dot ' + state} title={name}>{n < step ? <Icon name="check" /> : n}</span>
                                </Fragment>
                            );
                        })}
                    </div>
                    <div className="step-title">Step {step} of {steps.length} · {type === 'PROVIDER' ? 'Service provider' : 'Client'}</div>
                    {/* key: every step is a fresh form (e.g. passwords hidden again) */}
                    <Fragment key={stepName}>{stepContent()}</Fragment>
                    <p className="switch-link">Already have an account? <Link to="/login">Log in</Link></p>
                </div>
            </div>
        </div>
    );
}
