import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '../admin-event-repository';

const emptyForm = { name: '', type: 'conference', description: '', status: 'upcoming' };

const typeBadgeColors = {
  conference: 'bg-blue-100 text-gdg-blue',
  workshop: 'bg-purple-100 text-purple-700',
};

const statusBadgeColors = {
  upcoming: 'bg-blue-100 text-gdg-blue',
  ongoing: 'bg-green-100 text-gdg-green',
  completed: 'bg-gray-100 text-gdg-gray',
};

export default function EventCrud() {
  const { data, isLoading } = useAdminEvents();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setErrors({}); setShowModal(true); };
  const openEdit = (ev) => {
    setEditingId(ev.id);
    setForm({ name: ev.name, type: ev.type, description: ev.description || '', status: ev.status });
    setErrors({});
    setShowModal(true);
  };

  const validate = (f) => {
    const v = {};
    if (!f.name.trim()) v.name = 'Name is required';
    if (!f.type) v.type = 'Type is required';
    return v;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: form });
        toast.success('Event updated');
      } else {
        await createMutation.mutateAsync(form);
        toast.success('Event created');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Event deleted');
    } catch {
      toast.error('Failed to delete event');
    }
  };

  if (isLoading) return <div className="flex justify-center items-center py-16 text-gdg-gray">Loading events...</div>;

  const events = data?.data || [];

  const inputCls = "w-full px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gdg-dark">Events</h1>
        <button className="py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600" onClick={openCreate}>+ New Event</button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gdg-border">
        {events.length === 0 ? (
          <div className="text-center py-12 text-gdg-gray text-sm">No events yet. Create your first event.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Name</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Type</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Description</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Created</th>
                  <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="hover:bg-gdg-light-gray">
                    <td className="py-3 px-4 border-b border-gdg-border font-medium">{ev.name}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${typeBadgeColors[ev.type] || ''}`}>{ev.type}</span>
                    </td>
                    <td className="py-3 px-4 border-b border-gdg-border text-sm text-gdg-gray max-w-xs truncate">{ev.description || '—'}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusBadgeColors[ev.status] || ''}`}>{ev.status}</span>
                    </td>
                    <td className="py-3 px-4 border-b border-gdg-border text-sm text-gdg-gray">{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-4 border-b border-gdg-border">
                      <div className="flex gap-2">
                        <button className="px-4 py-1.5 border-2 border-gdg-border rounded-lg text-sm font-semibold text-gdg-gray hover:border-gdg-blue hover:text-gdg-blue" onClick={() => openEdit(ev)}>Edit</button>
                        <button className="px-4 py-1.5 bg-gdg-red text-white rounded-lg text-sm font-semibold hover:bg-red-600" onClick={() => handleDelete(ev.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-[90%] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">{editingId ? 'Edit Event' : 'Create Event'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Event Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. GDG DevFest 2026"
                  className={inputCls}
                />
                {errors.name && <div className="text-gdg-red text-xs mt-1">{errors.name}</div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="mb-5">
                  <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                    <option value="conference">Conference</option>
                    <option value="workshop">Workshop</option>
                  </select>
                  {errors.type && <div className="text-gdg-red text-xs mt-1">{errors.type}</div>}
                </div>
                <div className="mb-5">
                  <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Description <span className="text-gdg-gray font-normal">(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className={`${inputCls} resize-y`}
                />
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
