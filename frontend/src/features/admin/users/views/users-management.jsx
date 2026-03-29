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

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setErrors({}); setShowModal(true); };
  const openEdit = (u) => {
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

  const handleSubmit = async (e) => {
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

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  if (isLoading) return <div className="flex justify-center items-center py-16 text-gdg-gray">Loading users...</div>;

  const inputCls = "w-full px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gdg-dark">Users</h1>
        <button className="py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600" onClick={openCreate}>+ New User</button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gdg-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Name</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Email</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Created At</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gdg-light-gray">
                  <td className="py-3 px-4 border-b border-gdg-border font-medium">{u.name}</td>
                  <td className="py-3 px-4 border-b border-gdg-border">{u.email}</td>
                  <td className="py-3 px-4 border-b border-gdg-border text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 border-b border-gdg-border">
                    <div className="flex gap-2">
                      <button className="px-4 py-1.5 border-2 border-gdg-border rounded-lg text-sm font-semibold text-gdg-gray hover:border-gdg-blue hover:text-gdg-blue" onClick={() => openEdit(u)}>Edit</button>
                      <button className="px-4 py-1.5 bg-gdg-red text-white rounded-lg text-sm font-semibold hover:bg-red-600" onClick={() => handleDelete(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="text-center text-gdg-gray py-8">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gdg-border rounded-lg text-sm disabled:opacity-40">Previous</button>
            <span className="text-sm text-gdg-gray">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gdg-border rounded-lg text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-[90%]" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">{editingId ? 'Edit User' : 'Create User'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                {errors.name && <div className="text-gdg-red text-xs mt-1">{errors.name}</div>}
              </div>
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                {errors.email && <div className="text-gdg-red text-xs mt-1">{errors.email}</div>}
              </div>
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Password {editingId ? '(leave blank to keep current)' : '*'}</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
                {errors.password && <div className="text-gdg-red text-xs mt-1">{errors.password}</div>}
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" className="px-6 py-2.5 border-2 border-gdg-border rounded-lg text-sm font-semibold text-gdg-gray hover:border-gdg-blue hover:text-gdg-blue" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-gdg-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-600">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
