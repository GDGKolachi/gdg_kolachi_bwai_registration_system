import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminWorkshops, useCreateWorkshop, useUpdateWorkshop, useDeleteWorkshop } from '../admin-workshop-repository';
import { validateWorkshopForm } from '../admin-workshop-service';

const emptyForm = { title: '', description: '', date: '', time: '', venue: '', map_location: '', speakers: [], max_capacity: '', special_instructions: '', status: 'upcoming', allow_exceptions: true, is_online: false };

const badgeColors = {
  open: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70',
  closed: 'bg-rose-50 text-rose-900 ring-1 ring-rose-200/70',
  upcoming: 'bg-sky-50 text-sky-900 ring-1 ring-sky-200/70',
  completed: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/80',
  disabled: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70',
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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };
  const openEdit = w => {
    setEditingId(w.id);
    setForm({
      title: w.title,
      description: w.description,
      date: w.date,
      time: w.time,
      venue: w.venue,
      map_location: w.map_location ?? w.mapLocation ?? '',
      speakers: w.speakers ?? [],
      max_capacity: w.max_capacity ?? w.maxCapacity,
      special_instructions: w.special_instructions ?? '',
      status: w.status,
      allow_exceptions: w.allow_exceptions ?? true,
      is_online: w.is_online ?? false,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const v = validateWorkshopForm(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    try {
      const payload = {
        ...form,
        max_capacity: Number(form.max_capacity),
        map_location: form.map_location || null,
        special_instructions: form.special_instructions || null,
        speakers: form.speakers.filter(s => s.name.trim()),
      };
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
        toast.success('Workshop updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Workshop created');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save workshop');
    }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this workshop?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Workshop deleted');
    } catch {
      toast.error('Failed to delete workshop');
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
          Loading workshops…
        </div>
      </div>
    );
  }

  const workshopList = Array.isArray(workshops) ? workshops : workshops?.data || [];
  const totalPages = Math.ceil(workshopList.length / itemsPerPage);
  const paginated = workshopList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const inputCls = 'ui-input';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="admin-page-head mb-0">
          <h1>Workshops</h1>
          <p>Create and manage workshop sessions, capacity, and registration status.</p>
        </div>
        <button type="button" className="ui-btn-primary w-full shrink-0 sm:w-auto" onClick={openCreate}>
          + New workshop
        </button>
      </div>

      <div className="ui-table-wrap">
        <table className="ui-table min-w-[36rem]">
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
            {paginated.map(w => (
              <tr key={w.id}>
                <td className="font-semibold text-slate-900">{w.title}</td>
                <td className="tabular-nums text-slate-700">{w.date}</td>
                <td className="max-w-[10rem] truncate text-slate-700" title={w.venue}>
                  {w.venue}
                </td>
                <td className="tabular-nums">{w.max_capacity ?? w.maxCapacity}</td>
                <td>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeColors[w.status] || ''}`}
                  >
                    {w.status}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="ui-btn-secondary !px-3 !py-1.5 text-xs"
                      onClick={() => openEdit(w)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ui-btn-danger !px-3 !py-1.5 text-xs"
                      onClick={() => handleDelete(w.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-4">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="ui-btn-secondary !px-3 !py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                type="button"
                onClick={() => setCurrentPage(i + 1)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  currentPage === i + 1
                    ? 'bg-gdg-blue text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
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
            className="ui-card max-h-[min(90dvh,90vh)] w-full max-w-lg overflow-y-auto rounded-b-none rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-8"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">
              {editingId ? 'Edit workshop' : 'Create workshop'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="ui-label-sentence" htmlFor="w-title">
                  Title
                </label>
                <input
                  id="w-title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputCls}
                />
                {errors.title && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.title}</div>}
              </div>
              <div className="mb-5">
                <label className="ui-label-sentence" htmlFor="w-desc">
                  Description
                </label>
                <textarea
                  id="w-desc"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className={`${inputCls} resize-y`}
                />
                <div className="mt-1 text-xs text-slate-400">Supports **bold**, *italic*, lists, and markdown formatting</div>
                {errors.description && (
                  <div className="mt-1 text-xs font-medium text-gdg-red">{errors.description}</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="mb-5">
                  <label className="ui-label-sentence" htmlFor="w-date">
                    Date
                  </label>
                  <input
                    id="w-date"
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className={inputCls}
                  />
                  {errors.date && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.date}</div>}
                </div>
                <div className="mb-5">
                  <label className="ui-label-sentence" htmlFor="w-time">
                    Time
                  </label>
                  <input
                    id="w-time"
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className={inputCls}
                  />
                  {errors.time && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.time}</div>}
                </div>
              </div>
              <div className="mb-5">
                <label className="ui-label-sentence" htmlFor="w-venue">
                  Venue
                </label>
                <input
                  id="w-venue"
                  value={form.venue}
                  onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                  className={inputCls}
                />
                {errors.venue && <div className="mt-1 text-xs font-medium text-gdg-red">{errors.venue}</div>}
              </div>
              <div className="mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_online}
                    onChange={e => setForm(f => ({ ...f, is_online: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-gdg-blue focus:ring-gdg-blue/30"
                  />
                  <span className="text-sm text-slate-700">This is an online event</span>
                </label>
                <div className="mt-1 ml-6 text-xs text-slate-400">
                  When checked, shortlisting emails will skip the QR ticket and show a join-link instead.
                </div>
              </div>
              <div className="mb-5">
                <label className="ui-label-sentence" htmlFor="w-map">
                  Map Location
                </label>
                <input
                  id="w-map"
                  value={form.map_location}
                  onChange={e => setForm(f => ({ ...f, map_location: e.target.value }))}
                  placeholder="e.g. 24.8607,67.0011 or venue name"
                  className={inputCls}
                />
                <div className="mt-1 text-xs text-slate-400">
                  Accepted formats: <strong>lat,lng</strong> (e.g. 24.8607,67.0011), <strong>Google Maps URL</strong> (e.g. https://maps.google.com/maps?q=...), or a <strong>place name</strong> (e.g. IBA Karachi Main Campus)
                </div>
              </div>
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="ui-label-sentence mb-0">Speakers / Facilitators</label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-gdg-blue hover:underline"
                    onClick={() => setForm(f => ({ ...f, speakers: [...f.speakers, { name: '', role: '', photo_url: '' }] }))}
                  >
                    + Add speaker
                  </button>
                </div>
                {form.speakers.map((speaker, i) => (
                  <div key={i} className="mb-2 flex gap-2 items-start">
                    <input
                      value={speaker.name}
                      onChange={e => {
                        const updated = [...form.speakers];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setForm(f => ({ ...f, speakers: updated }));
                      }}
                      placeholder="Name"
                      className={`${inputCls} flex-1`}
                    />
                    <input
                      value={speaker.role}
                      onChange={e => {
                        const updated = [...form.speakers];
                        updated[i] = { ...updated[i], role: e.target.value };
                        setForm(f => ({ ...f, speakers: updated }));
                      }}
                      placeholder="Role"
                      className={`${inputCls} flex-1`}
                    />
                    <input
                      value={speaker.photo_url}
                      onChange={e => {
                        const updated = [...form.speakers];
                        updated[i] = { ...updated[i], photo_url: e.target.value };
                        setForm(f => ({ ...f, speakers: updated }));
                      }}
                      placeholder="Photo URL (optional)"
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      className="mt-2 text-sm text-gdg-red hover:text-gdg-red/80"
                      onClick={() => setForm(f => ({ ...f, speakers: f.speakers.filter((_, j) => j !== i) }))}
                      title="Remove speaker"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {form.speakers.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center text-xs text-slate-400">
                    No speakers added yet
                  </div>
                )}
              </div>
              <div className="mb-5">
                <label className="ui-label-sentence" htmlFor="w-special">
                  Special Instructions (included in ticket email)
                </label>
                <textarea
                  id="w-special"
                  value={form.special_instructions}
                  onChange={e => setForm(f => ({ ...f, special_instructions: e.target.value }))}
                  rows={3}
                  placeholder="e.g. Bring your laptop with Python 3.10+ installed. Wear comfortable shoes."
                  className={`${inputCls} resize-y`}
                />
                <div className="mt-1 text-xs text-slate-400">
                  This message will appear in the shortlisting email sent to participants. Supports line breaks.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="mb-5">
                  <label className="ui-label-sentence" htmlFor="w-cap">
                    Max capacity
                  </label>
                  <input
                    id="w-cap"
                    type="number"
                    min="1"
                    value={form.max_capacity}
                    onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))}
                    className={inputCls}
                  />
                  {errors.max_capacity && (
                    <div className="mt-1 text-xs font-medium text-gdg-red">{errors.max_capacity}</div>
                  )}
                </div>
                <div className="mb-5">
                  <label className="ui-label-sentence" htmlFor="w-status">
                    Status
                  </label>
                  <select
                    id="w-status"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="completed">Completed</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <div className="mb-5">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    id="w-allow-exceptions"
                    type="checkbox"
                    checked={form.allow_exceptions}
                    onChange={e => setForm(f => ({ ...f, allow_exceptions: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gdg-blue focus:ring-gdg-blue/30"
                  />
                  <span className="text-sm text-slate-700">
                    Allow exception requests for this workshop
                  </span>
                </label>
                <div className="mt-1 ml-6 text-xs text-slate-400">
                  When unchecked, attendees cannot submit exception requests targeting this workshop.
                </div>
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
