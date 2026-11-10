// Services table with add / edit pop-ups and an active switch.
// Provider: manages their own services.
import { useState } from 'react';
import { api } from '../api.js';
import { useLoad, useRun } from '../auth/SessionContext.jsx';
import { money, showDuration } from '../utils.js';
import { Icon } from './Icon.jsx';
import { Modal } from './Modal.jsx';
import { EmptyState, Loading, Options, initialOption } from './ui.jsx';

/**
 * providers: list of providers whose services are shown (normally just the logged-in provider).
 * selectedProviderId: (optional) pre-selected provider filter.
 */
export function ServicesManager({ providers, selectedProviderId }) {
    const run = useRun();
    const many = providers.length > 1;
    const [filter, setFilter] = useState(selectedProviderId ? String(selectedProviderId) : '');
    const [form, setForm] = useState(null);   // null = closed, { service: null } = new, { service } = edit

    // Load the services of every provider
    const { data: services, setData: setServices, reload } = useLoad(async () => {
        let all = [];
        for (const p of providers) {
            all = all.concat(await api('GET', `/api/providers/${p.id}/services`));
        }
        return all;
    });

    if (!services) return <Loading />;

    const shown = filter ? services.filter(s => String(s.providerId) === filter) : services;

    function toggle(s, active) {
        // Show the new position at once; the reload afterwards shows what the server saved
        setServices(list => list.map(x => (x.id === s.id ? { ...x, active: active } : x)));
        run(async () => {
            try {
                await api('PUT', `/api/services/${s.id}`,
                    { name: s.name, durationMinutes: s.durationMinutes, price: s.price, active: active });
            } catch (e) {
                setServices(list => list.map(x => (x.id === s.id ? { ...x, active: s.active } : x)));
                throw e;
            }
            await reload();
        }, active ? 'Service is now available.' : 'Service is now hidden from clients.');
    }

    return (
        <div className="card">
            <div className="card-header">
                <div><h2>Service offerings</h2><p>{services.filter(s => s.active).length} active of {services.length}.
                    Inactive services cannot be booked.</p></div>
                <div className="row">
                    {many && (
                        <select className="provider-filter" value={filter} onChange={e => setFilter(e.target.value)}>
                            <option value="">All providers</option>
                            <Options list={providers} valueOf={p => p.id} labelOf={p => p.fullName} emptyText="" />
                        </select>
                    )}
                    <button className="add-service" disabled={providers.length === 0} onClick={() => setForm({ service: null })}>
                        <Icon name="plus" /> New service</button>
                </div>
            </div>
            {shown.length === 0 ? <EmptyState text={providers.length === 0 ? 'Add a provider first.' : 'No services yet.'} /> : (
                <div className="table-wrap"><table><tbody>
                    <tr><th>Service</th><th>Duration</th><th>Price</th>{many && <th>Provider</th>}<th>Available</th><th></th></tr>
                    {shown.map(s => (
                        <tr key={s.id}>
                            <td><strong>{s.name}</strong></td>
                            <td><span className="badge blue">{showDuration(s.durationMinutes)}</span></td>
                            <td>{money(s.price)}</td>
                            {many && <td>{s.providerName}</td>}
                            <td><label className="switch" title="Active">
                                <input type="checkbox" data-toggle={s.id} checked={!!s.active} onChange={e => toggle(s, e.target.checked)} />
                                <span></span></label></td>
                            <td><button className="secondary small" data-edit={s.id} onClick={() => setForm({ service: s })}>
                                <Icon name="edit" /> Edit</button></td>
                        </tr>
                    ))}
                </tbody></table></div>
            )}
            {form && (
                <ServiceForm service={form.service} providers={providers} filter={filter}
                             onClose={() => setForm(null)} onDone={reload} />
            )}
        </div>
    );
}

/** Pop-up form. service = null means "add a new one". */
function ServiceForm({ service, providers, filter, onClose, onDone }) {
    const run = useRun();
    const isNew = service === null;
    const [f, setF] = useState({
        providerId: initialOption(providers, p => p.id, filter),
        name: service ? service.name : '',
        durationMinutes: String(service ? service.durationMinutes : 30),
        price: String(service ? service.price : 0)
    });
    const set = field => e => setF(x => ({ ...x, [field]: e.target.value }));

    function submit(event) {
        event.preventDefault();
        const data = { name: f.name, durationMinutes: Number(f.durationMinutes), price: Number(f.price) };
        run(async () => {
            if (isNew) {
                const providerId = (providers.length > 1 && f.providerId) || providers[0].id;
                await api('POST', `/api/providers/${providerId}/services`, data);
            } else {
                await api('PUT', `/api/services/${service.id}`, { ...data, active: service.active });
            }
            onClose();
            await onDone();
        }, isNew ? 'Service added.' : 'Service saved.');
    }

    return (
        <Modal title={isNew ? 'New service' : 'Edit service'} onClose={onClose}>
            <form noValidate onSubmit={submit}>
                {isNew && providers.length > 1 && (
                    <label>Provider <select name="providerId" value={f.providerId} onChange={set('providerId')}>
                        <Options list={providers} valueOf={p => p.id} labelOf={p => p.fullName} emptyText="" /></select></label>
                )}
                <label>Service name <input name="name" value={f.name} onChange={set('name')} /></label>
                <div className="grid cols-2" style={{ gap: 12 }}>
                    <label>Duration (minutes) <input name="durationMinutes" type="number" min="5" max="480"
                                                     value={f.durationMinutes} onChange={set('durationMinutes')} /></label>
                    <label>Price (RWF) <input name="price" type="number" min="0" value={f.price} onChange={set('price')} /></label>
                </div>
                <div className="modal-footer">
                    <button type="button" className="secondary" onClick={onClose}>Cancel</button>
                    <button>{isNew ? 'Add service' : 'Save changes'}</button>
                </div>
            </form>
        </Modal>
    );
}
