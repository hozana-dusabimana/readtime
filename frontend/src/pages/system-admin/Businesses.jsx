// System admin: businesses and their service providers.
import { Fragment, useState } from 'react';
import { api } from '../../api.js';
import { useLoad, useRun } from '../../auth/SessionContext.jsx';
import { Icon } from '../../components/Icon.jsx';
import { Modal } from '../../components/Modal.jsx';
import { EmptyState, Loading, Options, initialOption } from '../../components/ui.jsx';

export default function Businesses() {
    const run = useRun();
    // null = no pop-up; { kind: 'business', business } or { kind: 'provider', businessId }
    const [popup, setPopup] = useState(null);
    const { data, reload } = useLoad(async () => ({
        businesses: await api('GET', '/api/businesses'),
        users: await api('GET', '/api/admin/users')
    }));

    if (!data) return <Loading />;
    const { businesses, users } = data;
    const providersOf = id => users.filter(u => u.role === 'PROVIDER' && u.businessId === id);

    const setActive = b => run(async () => {
        await api('POST', `/api/admin/businesses/${b.id}/active`, { active: !b.active });
        await reload();
    }, 'Business updated.');

    const close = () => setPopup(null);

    return (
        <>
            <section className="card">
                <div className="card-header">
                    <div><h2>Registered businesses</h2><p>{businesses.length} business account(s)</p></div>
                    <button id="add-business" onClick={() => setPopup({ kind: 'business', business: null })}><Icon name="plus" /> Add business</button>
                </div>
                {businesses.length === 0 ? <EmptyState text="No businesses yet. Add the first one." /> : (
                    <div className="table-wrap"><table><tbody>
                        <tr><th>Business</th><th>Service providers</th><th>Status</th><th>Actions</th></tr>
                        {businesses.map(b => {
                            const providers = providersOf(b.id);
                            return (
                                <tr key={b.id}>
                                    <td><strong>{b.name}</strong><div className="muted">{b.address}</div></td>
                                    <td>{providers.length === 0 ? <span className="muted">None yet</span>
                                        : providers.map((p, i) => <Fragment key={p.id}>{i > 0 && <br />}{p.fullName}</Fragment>)}</td>
                                    <td><span className={'badge ' + (b.active ? 'green' : 'red')}>{b.active ? 'Active' : 'Suspended'}</span></td>
                                    <td><div className="actions">
                                        <button className="small secondary" data-edit-business={b.id}
                                                onClick={() => setPopup({ kind: 'business', business: b })}><Icon name="edit" /> Edit</button>
                                        <button className="small secondary" data-add-provider={b.id}
                                                onClick={() => setPopup({ kind: 'provider', businessId: b.id })}><Icon name="user" /> Add provider</button>
                                        <button className={'small ' + (b.active ? 'danger' : 'success')} data-business={b.id}
                                                onClick={() => setActive(b)}>{b.active ? 'Suspend' : 'Activate'}</button>
                                    </div></td>
                                </tr>
                            );
                        })}
                    </tbody></table></div>
                )}
            </section>
            <div className="notice"><Icon name="info" /><div>A suspended business stays in the system, but clients can no longer
                see it or book its providers.</div></div>

            {popup && popup.kind === 'business' && <BusinessForm business={popup.business} onClose={close} onDone={reload} />}
            {popup && popup.kind === 'provider' &&
                <AddProviderForm businesses={businesses} businessId={popup.businessId} onClose={close} onDone={reload} />}
        </>
    );
}

/** business = null means "add a new business"; otherwise the business is edited. */
function BusinessForm({ business, onClose, onDone }) {
    const run = useRun();
    const isNew = business === null;
    const [f, setF] = useState({ name: isNew ? '' : business.name, address: isNew ? '' : business.address });
    const set = field => e => setF(x => ({ ...x, [field]: e.target.value }));

    function submit(event) {
        event.preventDefault();
        run(async () => {
            if (isNew) await api('POST', '/api/admin/businesses', f);
            else await api('PUT', `/api/admin/businesses/${business.id}`, f);
            onClose();
            await onDone();
        }, isNew ? 'Business added.' : 'Business saved.');
    }

    return (
        <Modal title={isNew ? 'Add a business' : 'Edit business'} onClose={onClose}>
            <form noValidate onSubmit={submit}>
                <label>Business name <input name="name" value={f.name} onChange={set('name')} /></label>
                <label>Address <input name="address" value={f.address} onChange={set('address')} /></label>
                <div className="modal-footer">
                    <button type="button" className="secondary" onClick={onClose}>Cancel</button>
                    <button>{isNew ? 'Add business' : 'Save changes'}</button>
                </div>
            </form>
        </Modal>
    );
}

function AddProviderForm({ businesses, businessId, onClose, onDone }) {
    const run = useRun();
    const [f, setF] = useState({
        businessId: initialOption(businesses, b => b.id, businessId),
        fullName: '', email: '', password: ''
    });
    const set = field => e => setF(x => ({ ...x, [field]: e.target.value }));

    function submit(event) {
        event.preventDefault();
        run(async () => {
            await api('POST', `/api/admin/businesses/${f.businessId}/providers`, f);
            onClose();
            await onDone();
        }, 'Service provider added.');
    }

    return (
        <Modal title="Add a service provider" onClose={onClose}>
            <form noValidate onSubmit={submit}>
                <label>Business <select name="businessId" value={f.businessId} onChange={set('businessId')}>
                    <Options list={businesses} valueOf={b => b.id} labelOf={b => b.name} emptyText="No businesses" /></select></label>
                <label>Full name <input name="fullName" value={f.fullName} onChange={set('fullName')} /></label>
                <label>Email <input name="email" value={f.email} onChange={set('email')} /></label>
                <label>Temporary password (8-64 characters) <input name="password" type="password" value={f.password} onChange={set('password')} /></label>
                <div className="modal-footer">
                    <button type="button" className="secondary" onClick={onClose}>Cancel</button>
                    <button>Add provider</button>
                </div>
            </form>
        </Modal>
    );
}
