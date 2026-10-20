import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Announcement } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { Alert } from '../components/common/Alert.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Megaphone, Plus, Calendar, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';

export const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.getAnnouncements();
      setAnnouncements(res.announcements);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await api.createAnnouncement({
        title: title.trim(),
        description: description.trim(),
        priority,
        expiry_date: expiryDate || undefined,
      });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || 'Failed to publish announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAnnouncement(id);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || 'Failed to remove announcement.');
    }
  };

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'NODAL_OFFICER';

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
            Official Notices
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Campus Announcements & Outages
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Important service schedules, maintenance windows, and campus bulletins
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2"
          >
            <Plus size={15} />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No active announcements"
          description="There are currently no maintenance notices or service announcements."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ann.priority === 'Urgent'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : ann.priority === 'High'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {ann.priority} Priority
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                    <Calendar size={12} />
                    {ann.publication_date}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">{ann.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{ann.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Published by {ann.created_by_name || 'Administration'}</span>
                {canManage && (
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="text-rose-600 hover:text-rose-800 p-1"
                    title="Archive announcement"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Publish Campus Announcement">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ann-title">
              Announcement Title *
            </label>
            <input
              id="ann-title"
              type="text"
              required
              placeholder="e.g. Water Tank Cleaning - West Hostel Block"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ann-priority">
                Urgency Priority
              </label>
              <select
                id="ann-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ann-expiry">
                Expiry Date (Optional)
              </label>
              <input
                id="ann-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ann-desc">
              Announcement Body *
            </label>
            <textarea
              id="ann-desc"
              rows={4}
              required
              placeholder="Details regarding the maintenance, affected zones, and expected completion..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg shadow-xs"
            >
              Publish Notice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
