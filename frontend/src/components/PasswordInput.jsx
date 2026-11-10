// A password field with a "Show" / "Hide" button.
import { useState } from 'react';

export function PasswordInput({ invalid, toggleId, ...props }) {
    const [show, setShow] = useState(false);
    return (
        <span className="password-wrap">
            <input {...props} type={show ? 'text' : 'password'} className={invalid ? 'invalid' : ''} />
            <button type="button" className="show-password" id={toggleId} onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show'}</button>
        </span>
    );
}
