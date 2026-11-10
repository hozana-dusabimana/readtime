// Input checks for the forms.
// They use the SAME rules as the backend, so the user sees mistakes immediately.
// The backend still checks everything again - this is only for convenience.
// Each function returns an error message, or '' when the value is fine.

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

export function checkName(name) {
    const n = (name || '').trim();
    if (n.length === 0) return 'Please enter your full name.';
    if (n.length < NAME_MIN || n.length > NAME_MAX) return `Name must be ${NAME_MIN} to ${NAME_MAX} characters.`;
    return '';
}

export function checkEmail(email) {
    const e = (email || '').trim();
    if (e.length === 0) return 'Please enter your email.';
    if (e.length > 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return 'Please enter a valid email, like name@example.com.';
    return '';
}

export function checkPassword(password) {
    const p = password || '';
    if (p.length === 0) return 'Please choose a password.';
    if (p.length < PASSWORD_MIN || p.length > PASSWORD_MAX) return `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`;
    return '';
}

/** Any text field with a length limit, e.g. business name (2-100) or address (2-200). */
export function checkText(value, fieldName, min, max) {
    const v = (value || '').trim();
    if (v.length === 0) return `Please enter the ${fieldName.toLowerCase()}.`;
    if (v.length < min || v.length > max) return `${fieldName} must be ${min} to ${max} characters.`;
    return '';
}

export function checkPasswordsMatch(password, confirm) {
    if ((confirm || '').length === 0) return 'Please type the password again.';
    return password === confirm ? '' : 'The two passwords are not the same.';
}
