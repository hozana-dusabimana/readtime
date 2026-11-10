// Small UI pieces used by many pages.
import { Icon } from './Icon.jsx';
import { STATUS_NAMES, initials } from '../utils.js';

export function Avatar({ name, large }) {
    return <div className={'avatar ' + (large ? 'large' : '')}>{initials(name)}</div>;
}

/** Name with a small grey line under it, e.g. an email. */
export function Person({ name, sub }) {
    return (
        <div className="person">
            <Avatar name={name} />
            <div><div><strong>{name}</strong></div><div className="sub">{sub || ''}</div></div>
        </div>
    );
}

export function StatusBadge({ status }) {
    return <span className={'badge ' + status}>{STATUS_NAMES[status] || status}</span>;
}

/** A number card for the top of a page. tone: blue, green, red, orange or purple. */
export function StatCard({ label, value, note, icon, tone }) {
    return (
        <div className={'stat tone-' + tone}>
            <div className="stat-top"><span className="stat-label">{label}</span>
                <span className="stat-icon"><Icon name={icon} /></span></div>
            <div className="stat-value">{value}</div>
            <div className="stat-note">{note}</div>
        </div>
    );
}

export function EmptyState({ text }) {
    return <div className="empty">{text}</div>;
}

export function Loading() {
    return <div className="empty">Loading...</div>;
}

/** <option> tags for a <select>. Shows one empty option with emptyText when the list is empty. */
export function Options({ list, valueOf, labelOf, emptyText }) {
    if (list.length === 0) return <option value="">{emptyText}</option>;
    return list.map(x => <option key={String(valueOf(x))} value={String(valueOf(x))}>{labelOf(x)}</option>);
}

/**
 * The value a <select> built with <Options> starts with: the wanted value if it is in the list,
 * otherwise the first one (what the browser shows when nothing is pre-selected).
 */
export function initialOption(list, valueOf, wanted) {
    if (list.some(x => String(valueOf(x)) === String(wanted))) return String(wanted);
    return list.length ? String(valueOf(list[0])) : '';
}

/** The red error line under a form field. */
export function FieldError({ id, message }) {
    return <span className="field-error" id={id}>{message || ''}</span>;
}
