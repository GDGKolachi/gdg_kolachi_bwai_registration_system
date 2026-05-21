import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  useAdminEventTypes,
  useCreateEventType,
  useUpdateEventType,
  useDeleteEventType,
} from '../event-types-repository';

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const empty = { name: '', slug: '', description: '', is_active: true };

export default function EventTypesManagement() {
  const { data: types, isLoading } = useAdminEventTypes();
  const create = useCreateEventType();
  const update = useUpdateEventType();
  const del = useDeleteEventType();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditingId(null);
    setForm(empty);
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({ name: t.name, slug: t.slug, description: t.description || '', is_active: t.is_active });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, data: form });
        toast.success('Event type updated');
      } else {
        await create.mutateAsync(form);
        toast.success('Event type created');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event type');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this event type?')) return;
    try {
      await del.mutateAsync(id);
      toast.success('Deactivated');
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="admin-page-head mb-0">
          <h1>Event Types</h1>
          <p>Manage the categories admins can choose when creating an event.</p>
        </div>
        <button type="button" className="ui-btn-primary w-full shrink-0 sm:w-auto" onClick={openCreate}>+ New event type</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-gdg-blue" aria-hidden />
        </div>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table min-w-[36rem]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(types || []).map((t) => (
                <tr key={t.id}>
                  <td className="font-semibold text-slate-900">{t.name}</td>
                  <td className="text-slate-700"><code className="text-xs">{t.slug}</code></td>
                  <td className="max-w-[20rem] truncate" title={t.description}>{t.description || '—'}</td>
                  <td>{t.is_active ? 'Yes' : 'No'}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="ui-btn-secondary !px-3 !py-1.5 text-xs" onClick={() => openEdit(t)}>Edit</button>
                      {t.is_active && (
                        <button type="button" className="ui-btn-danger !px-3 !py-1.5 text-xs" onClick={() => handleDelete(t.id)}>Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setShowModal(false)}>
          <div className="ui-card w-full max-w-md overflow-y-auto rounded-b-none rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-8" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">{editingId ? 'Edit event type' : 'New event type'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="ui-label-sentence" htmlFor="et-name">Name</label>
                <input id="et-name" className="ui-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editingId ? f.slug : slugify(e.target.value) }))} />
              </div>
              <div className="mb-4">
                <label className="ui-label-sentence" htmlFor="et-slug">Slug</label>
                <input id="et-slug" className="ui-input" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
                <div className="mt-1 text-xs text-slate-400">Used internally and in URLs. Lowercase, hyphens only.</div>
              </div>
              <div className="mb-4">
                <label className="ui-label-sentence" htmlFor="et-desc">Description</label>
                <textarea id="et-desc" rows={3} className="ui-input resize-y" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-gdg-blue focus:ring-gdg-blue/30" />
                  <span className="text-sm text-slate-700">Active (visible in event-create selector)</span>
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="ui-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ui-btn-primary">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
