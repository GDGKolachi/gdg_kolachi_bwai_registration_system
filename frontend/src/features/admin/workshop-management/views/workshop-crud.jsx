import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminWorkshops, useCreateWorkshop, useUpdateWorkshop, useDeleteWorkshop } from '../admin-workshop-repository';
import { validateWorkshopForm } from '../admin-workshop-service';

const emptyForm = { title: '', description: '', date: '', time: '', venue: '', max_capacity: '', status: 'upcoming' };

const badgeColors = {
  open: 'bg-green-100 text-gdg-green',
  closed: 'bg-red-100 text-gdg-red',
  upcoming: 'bg-blue-100 text-gdg-blue',
  completed: 'bg-gray-100 text-gdg-gray',
};

export default function WorkshopCrud() {
  const { data: workshops, isLoading } = useAdminWorkshops();
  const createMutation = useCreateWorkshop();
  const updateMutation = useUpdateWorkshop();
  const deleteMutation = useDeleteWorkshop();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  if (isLoading) return <div className="flex justify-center items-center py-16 text-gdg-gray">Loading workshops...</div>;

  const workshopList = Array.isArray(workshops) ? workshops : workshops?.data || [];
  const totalPages = Math.ceil(workshopList.length / itemsPerPage);
  const paginated = workshopList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const inputCls = "w-full px-3.5 py-2.5 border border-gdg-border rounded-lg text-sm focus:outline-none focus:border-gdg-blue focus:ring-2 focus:ring-gdg-blue/15";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gdg-dark">Workshops</h1>
        <button className="py-2.5 px-6 bg-gdg-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600" onClick={openCreate}>+ New Workshop</button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gdg-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Title</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Date</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Venue</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Capacity</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 border-b border-gdg-border font-semibold text-xs text-gdg-gray uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(w => (
                <tr key={w.id} className="hover:bg-gdg-light-gray">
                  <td className="py-3 px-4 border-b border-gdg-border font-medium">{w.title}</td>
                  <td className="py-3 px-4 border-b border-gdg-border">{w.date}</td>
                  <td className="py-3 px-4 border-b border-gdg-border">{w.venue}</td>
                  <td className="py-3 px-4 border-b border-gdg-border">{w.max_capacity ?? w.maxCapacity}</td>
                  <td className="py-3 px-4 border-b border-gdg-border">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeColors[w.status] || ''}`}>{w.status}</span>
                  </td>
                  <td className="py-3 px-4 border-b border-gdg-border">
                    <div className="flex gap-2">
                      <button className="px-4 py-1.5 border-2 border-gdg-border rounded-lg text-sm font-semibold text-gdg-gray hover:border-gdg-blue hover:text-gdg-blue" onClick={() => openEdit(w)}>Edit</button>
                      <button className="px-4 py-1.5 bg-gdg-red text-white rounded-lg text-sm font-semibold hover:bg-red-600" onClick={() => handleDelete(w.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border border-gdg-border rounded-lg text-sm disabled:opacity-40">Previous</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1.5 rounded-lg text-sm ${currentPage === i + 1 ? 'bg-gdg-blue text-white' : 'border border-gdg-border hover:bg-gdg-light-gray'}`}>{i + 1}</button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border border-gdg-border rounded-lg text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-[90%] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">{editingId ? 'Edit Workshop' : 'Create Workshop'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
                {errors.title && <div className="text-gdg-red text-xs mt-1">{errors.title}</div>}
              </div>
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`${inputCls} resize-y`} />
                {errors.description && <div className="text-gdg-red text-xs mt-1">{errors.description}</div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="mb-5">
                  <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                  {errors.date && <div className="text-gdg-red text-xs mt-1">{errors.date}</div>}
                </div>
                <div className="mb-5">
                  <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Time</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className={inputCls} />
                  {errors.time && <div className="text-gdg-red text-xs mt-1">{errors.time}</div>}
                </div>
              </div>
              <div className="mb-5">
                <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Venue</label>
                <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} className={inputCls} />
                {errors.venue && <div className="text-gdg-red text-xs mt-1">{errors.venue}</div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="mb-5">
                  <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Max Capacity</label>
                  <input type="number" min="1" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} className={inputCls} />
                  {errors.max_capacity && <div className="text-gdg-red text-xs mt-1">{errors.max_capacity}</div>}
                </div>
                <div className="mb-5">
                  <label className="block mb-1.5 font-medium text-sm text-gdg-dark">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                    <option value="upcoming">Upcoming</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
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
