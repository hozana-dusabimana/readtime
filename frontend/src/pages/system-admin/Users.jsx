// System admin: every user account, with a role filter and search.
import { useState } from 'react';
import { api } from '../../api.js';
import { useLoad, useRun, useSession } from '../../auth/SessionContext.jsx';
import { Icon } from '../../components/Icon.jsx';
import { Modal } from '../../components/Modal.jsx';
import { EmptyState, Loading, Options, Person, initialOption } from '../../components/ui.jsx';
import { ROLE_NAMES } from '../../utils.js';

// Remembered while the app is open
const saved = { role: '', search: '' };

export default function Users() {
    const run = useRun();
    const { user: me } = useSession();
    const [roleFilter, setRoleState] = useState(saved.role);
    const [search, setSearchState] = useState(saved.search);
    const setRoleFilter = r => { saved.role = r; setRoleState(r); };
    const setSearch = s => { saved.search = s; setSearchState(s); };
    const [form, setForm] = useState(null);   // null = closed, { user: null } = new, { user } = edit

    const { data, reload } = useLoad(async () => ({
        users: await api('GET', '/api/admin/users'),
        businesses: await api('GET', '/api/businesses')
    }));

    if (!data) return <Loading />;
    const { users, businesses } = data;
    const businessName = id => {
        const b = businesses.find(x => x.id === id);
        return b ? b.name : '';
    };

    let list = users;
    if (roleFilter) list = list.filter(u => u.role === roleFilter);
    if (search) {
        const s = search.toLowerCase();
        list = list.filter(u => u.fullName.toLowerCase().includes(s) || u.email.includes(s));
    }

    const setActive = u => run(async () => {
        await api('POST', `/api/admin/users/${u.id}/active`, { active: !u.active });
        await reload();
    }, 'Account updated.');

    return (
        <section className="card">
            <div className="card-header">
                <div><h2>All accounts</h2><p>{users.length} accounts · {users.filter(u => !u.active).length} disabled</p></div>
                <div className="row">
                    <select className="role-filter" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                        <option value="">All roles</option>
                        {Object.keys(ROLE_NAMES).map(r => <option key={r} value={r}>{ROLE_NAMES[r]}</option>)}
                    </select>
                    <input className="search" placeholder="Search name or email" value={search} onChange={e => setSearch(e.target.value)} />
                    <button id="add-user" onClick={() => setForm({ user: null })}><Icon name="plus" /> Register account</button>
                </div>
            </div>
            {list.length === 0 ? <EmptyState text="No accounts match." /> : (
                <div className="table-wrap"><table><tbody>
                    <tr><th>User</th><th>Role</th><th>Business</th><th>No-shows</th><th>Login</th><th>Actions</th></tr>
                    {list.map(u => (
                        <tr key={u.id}>
                            <td><Person name={u.fullName} sub={u.email} /></td>
                            <td><span className="badge blue">{ROLE_NAMES[u.role]}</span></td>
                            <td>{businessName(u.businessId) || <span className="muted">-</span>}</td>
                            <td>{u.role === 'CLIENT'
                                ? <>{u.noShowCount}{u.blocked && <> <span className="badge red">Blocked</span></>}</>
                                : <span className="muted">-</span>}</td>
                            <td>{u.active ? <span className="badge green">Enabled</span> : <span className="badge gray">Disabled</span>}</td>
                            <td><div className="actions">
                                <button className="small secondary" data-edit-user={u.id} onClick={() => setForm({ user: u })}><Icon name="edit" /> Edit</button>
                                {u.id === me.id ? <span className="muted">(you)</span> : (
                                    <button className={'small ' + (u.active ? 'danger' : 'success')} data-user={u.id}
                                            onClick={() => setActive(u)}>{u.active ? 'Disable' : 'Enable'}</button>
                                )}
                            </div></td>
                        </tr>
                    ))}
                </tbody></table></div>
            )}
            {form && <UserForm user={form.user} businesses={businesses} onClose={() => setForm(null)} onDone={reload} />}
        </section>
    );
}

/**
 * user = null: register a new account of any role.
 * Otherwise edit name, email, business (providers only) and optionally set a new password.
 * The role is chosen when the account is created and cannot be changed later.
 */
function UserForm({ user, businesses, onClose, onDone }) {
    const run = useRun();
    const isNew = user === null;
    const [f, setF] = useState({
        role: isNew ? 'CLIENT' : user.role,
        businessId: initialOption(businesses, b => b.id, isNew ? '' : user.businessId),
        fullName: isNew ? '' : user.fullName,
        email: isNew ? '' : user.email,
        password: ''
    });
    const set = field => e => setF(x => ({ ...x, [field]: e.target.value }));

    function submit(event) {
        event.preventDefault();
        const isProvider = f.role === 'PROVIDER';
        const businessId = isProvider && f.businessId ? Number(f.businessId) : null;
        run(async () => {
            if (isNew) {
                await api('POST', '/api/admin/users', { fullName: f.fullName, email: f.email, password: f.password,
                                                        role: f.role, businessId: businessId });
            } else {
                await api('PUT', `/api/admin/users/${user.id}`, { fullName: f.fullName, email: f.email,
                                                                  businessId: businessId, newPassword: f.password });
            }
            onClose();
            await onDone();
        }, isNew ? 'Account registered.' : 'Account saved.');
    }

    return (
        <Modal title={isNew ? 'Register an account' : 'Edit account'} onClose={onClose}>
            <form noValidate onSubmit={submit}>
                {isNew ? (
                    <label>Role <select name="role" className="u-role" value={f.role} onChange={set('role')}>
                        {Object.keys(ROLE_NAMES).map(r => <option key={r} value={r}>{ROLE_NAMES[r]}</option>)}</select></label>
                ) : <p className="muted">Role: <strong>{ROLE_NAMES[f.role]}</strong></p>}
                <label className="u-business" hidden={f.role !== 'PROVIDER'}>Business <select name="businessId" value={f.businessId} onChange={set('businessId')}>
                    <Options list={businesses} valueOf={b => b.id} labelOf={b => b.name} emptyText="Add a business first" /></select></label>
                <label>Full name <input name="fullName" value={f.fullName} onChange={set('fullName')} /></label>
                <label>Email <input name="email" value={f.email} onChange={set('email')} /></label>
                <label>{isNew ? 'Password (8-64 characters)' : 'New password (leave empty to keep the current one)'}
                    <input name={isNew ? 'password' : 'newPassword'} type="password" autoComplete="new-password"
                           value={f.password} onChange={set('password')} /></label>
                <div className="modal-footer">
                    <button type="button" className="secondary" onClick={onClose}>Cancel</button>
                    <button>{isNew ? 'Register account' : 'Save changes'}</button>
                </div>
            </form>
        </Modal>
    );
}
