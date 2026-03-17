import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminWorkshops, useCreateWorkshop, useUpdateWorkshop, useDeleteWorkshop } from '../admin-workshop-repository';
import { validateWorkshopForm } from '../admin-workshop-service';

const emptyForm = { title: '', description: '', date: '', time: '', venue: '', max_capacity: '', status: 'upcoming' };

export default function WorkshopCrud() {
  const { data: workshops, isLoading } = useAdminWorkshops();
  const createMutation = useCreateWorkshop();
  const updateMutation = useUpdateWorkshop();
  const deleteMutation = useDeleteWorkshop();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setErrors({}); setShowModal(true); };
  const openEdit = (w) => {
    setEditingId(w.id);
    setForm({ title: w.title, description: w.description, date: w.date, time: w.time, venue: w.venue, max_capacity: w.max_capacity ?? w.maxCapacity, status: w.status });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validateWorkshopForm(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: { ...form, max_capacity: Number(form.max_capacity) } });
        toast.success('Workshop updated');
      } else {
        await createMutation.mutateAsync({ ...form, max_capacity: Number(form.max_capacity) });
        toast.success('Workshop created');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save workshop');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this workshop?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Workshop deleted');
    } catch {
      toast.error('Failed to delete workshop');
    }
  };

  if (isLoading) return <div className="loading">Loading workshops...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Workshops</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Workshop</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Venue</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workshops?.map(w => (
              <tr key={w.id}>
                <td style={{ fontWeight: 500 }}>{w.title}</td>
                <td>{w.date}</td>
                <td>{w.venue}</td>
                <td>{w.max_capacity ?? w.maxCapacity}</td>
                <td><span className={`badge badge-${w.status}`}>{w.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(w)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(w.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Edit Workshop' : 'Create Workshop'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                {errors.title && <div className="form-error">{errors.title}</div>}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                {errors.description && <div className="form-error">{errors.description}</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  {errors.date && <div className="form-error">{errors.date}</div>}
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                  {errors.time && <div className="form-error">{errors.time}</div>}
                </div>
              </div>
              <div className="form-group">
                <label>Venue</label>
                <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
                {errors.venue && <div className="form-error">{errors.venue}</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Max Capacity</label>
                  <input type="number" min="1" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} />
                  {errors.max_capacity && <div className="form-error">{errors.max_capacity}</div>}
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="upcoming">Upcoming</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
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
