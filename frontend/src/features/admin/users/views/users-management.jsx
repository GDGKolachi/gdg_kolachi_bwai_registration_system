import { useState } from 'react';
import toast from 'react-hot-toast';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../users-repository';

const emptyForm = { name: '', email: '', password: '' };

export default function UsersManagement() {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useUsers(page);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const users = result?.data || [];
  const totalPages = result?.totalPages || 1;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };
  const openEdit = u => {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, password: '' });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = 'Name is required';
    if (!form.email?.trim()) errs.email = 'Email is required';
    if (!editingId && !form.password?.trim()) errs.password = 'Password is required';
    if (form.password && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    try {
      const payload = { name: form.name, email: form.email };
      if (form.password) payload.password = form.password;

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        toast.success('User updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('User created');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this user?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue"
            aria-hidden
          />
          Loading users…
        </div>
      </div>
    );
  }

  const inputCls = 'ui-input';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="admin-page-head mb-0">
          <h1>Users</h1>
          <p>Manage admin accounts for the dashboard.</p>
        </div>
        <button type="button" className="ui-btn-primary w-full shrink-0 sm:w-auto" onClick={openCreate}>
          + New user
        </button>
      </div>

      <div className="ui-table-wrap">
        <table className="ui-table min-w-[32rem]">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="font-semibold text-slate-900">{u.name}</td>
                <td>{u.email}</td>
                <td className="text-slate-600">{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="ui-btn-secondary !px-3 !py-1.5 text-xs"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </button>
                    <button type="button" className="ui-btn-danger !px-3 !py-1.5 text-xs" onClick={() => handleDelete(u.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-4">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="ui-btn-secondary !px-3 !py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="ui-btn-secondary !px-3 !py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowModal(false)}
          role="presentation"
        >
          <div
            className="ui-card w-full max-w-md rounded-b-none rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-8"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">
              {editingId ? 'Edit user' : 'Create user'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="ui-label-sentence" htmlFor="u-name">
                  Name
                </label>
                <input
                  id="u-name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                />
                {errors.name && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.name}</div>}
              </div>
              <div className="mb-5">
                <label className="ui-label-sentence" htmlFor="u-email">
                  Email
                </label>
                <input
                  id="u-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                />
                {errors.email && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.email}</div>}
              </div>
              <div className="mb-5">
                <label className="ui-label-sentence" htmlFor="u-pass">
                  Password {editingId ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  id="u-pass"
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className={inputCls}
                />
                {errors.password && (
                  <div className="mt-1 text-xs font-medium text-gdg-red">{errors.password}</div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" className="ui-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ui-btn-primary">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
