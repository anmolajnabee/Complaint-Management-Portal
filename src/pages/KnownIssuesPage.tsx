import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { KnownIssue, Complaint } from '../types/index.ts';
import { Modal } from '../components/common/Modal.tsx';
import { Alert } from '../components/common/Alert.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { ShieldAlert, Plus, Link as LinkIcon, MapPin, Clock, CheckCircle } from 'lucide-react';

export const KnownIssuesPage: React.FC = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<KnownIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('IT/Internet');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedResolution, setEstimatedResolution] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Link Modal
  const [linkModalIssueId, setLinkModalIssueId] = useState<string | null>(null);
  const [complaintsList, setComplaintsList] = useState<Complaint[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [linking, setLinking] = useState(false);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await api.getKnownIssues();
      setIssues(res.issues);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch known issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createKnownIssue({
        title: title.trim(),
        category,
        location: location.trim(),
        description: description.trim(),
        estimated_resolution: estimatedResolution.trim() || undefined,
      });
      setIsCreateOpen(false);
      setTitle('');
      setLocation('');
      setDescription('');
      fetchIssues();
    } catch (err: any) {
      setError(err.message || 'Failed to create known issue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLinkModal = async (issueId: string) => {
    setLinkModalIssueId(issueId);
    try {
      const res = await api.getComplaints();
      setComplaintsList(res.complaints);
      if (res.complaints.length > 0) {
        setSelectedComplaintId(res.complaints[0].id);
      }
    } catch {
      // ignore
    }
  };

  const handleLinkComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkModalIssueId || !selectedComplaintId) return;
    setLinking(true);
    try {
      await api.linkComplaintToIssue(linkModalIssueId, selectedComplaintId);
      setLinkModalIssueId(null);
      fetchIssues();
    } catch (err: any) {
      setError(err.message || 'Failed to link complaint.');
    } finally {
      setLinking(false);
    }
  };

  const canManage = user && user.role !== 'STUDENT';

  return (
    <div className="space-y-6 py-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
            Campus Infrastructure Registry
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Known Campus Issues
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Broad facility issues currently undergoing authorized work • Manual incident correlation
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2"
          >
            <Plus size={15} />
            <span>Register Known Issue</span>
          </button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading known issues...</div>
      ) : issues.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No widespread known issues"
          description="All known campus facilities are functioning within normal operational parameters."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map((iss) => (
            <div
              key={iss.id}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {iss.category}
                  </span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                    {iss.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">{iss.title}</h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>{iss.location}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{iss.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  <span>ETA: {iss.estimated_resolution || 'Under Assessment'}</span>
                </div>

                {canManage && (
                  <button
                    onClick={() => handleOpenLinkModal(iss.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    <LinkIcon size={13} />
                    <span>Link Complaint</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register Known Campus Issue">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ki-title">
              Issue Subject *
            </label>
            <input
              id="ki-title"
              type="text"
              required
              placeholder="e.g. Main Transformer Maintenance - North Campus"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ki-category">
                Category
              </label>
              <select
                id="ki-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="IT/Internet">IT / Internet</option>
                <option value="Electricity">Electricity</option>
                <option value="Water">Water</option>
                <option value="Hostel">Hostel</option>
                <option value="Civil/Maintenance">Civil / Maintenance</option>
                <option value="Canteen">Canteen</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ki-loc">
                Campus Location *
              </label>
              <input
                id="ki-loc"
                type="text"
                required
                placeholder="e.g. North Substation"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ki-eta">
              Estimated Resolution Time
            </label>
            <input
              id="ki-eta"
              type="text"
              placeholder="e.g. Tomorrow by 4:00 PM"
              value={estimatedResolution}
              onChange={(e) => setEstimatedResolution(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ki-desc">
              Description of Outage / Scope *
            </label>
            <textarea
              id="ki-desc"
              rows={3}
              required
              placeholder="Scope of affected buildings and work in progress..."
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
              Register Issue
            </button>
          </div>
        </form>
      </Modal>

      {/* Link Complaint Modal */}
      <Modal isOpen={Boolean(linkModalIssueId)} onClose={() => setLinkModalIssueId(null)} title="Manually Link Student Complaint">
        <form onSubmit={handleLinkComplaint} className="space-y-4">
          <div className="text-xs text-slate-600">
            Select a student complaint to associate with this known campus issue. Note: automatic or AI correlation is prohibited; association is verified manually.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="link-complaint-select">
              Select Complaint
            </label>
            <select
              id="link-complaint-select"
              value={selectedComplaintId}
              onChange={(e) => setSelectedComplaintId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {complaintsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.reference_no} — {c.title.slice(0, 45)}... ({c.category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setLinkModalIssueId(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={linking}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Confirm Link
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
