// A simple pop-up window. Clicking outside it or on the X closes it.
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';

export function Modal({ title, onClose, children }) {
    return createPortal(
        <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
            <div className="modal" role="dialog" aria-label={title}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="secondary icon-only modal-close" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>,
        document.body
    );
}
