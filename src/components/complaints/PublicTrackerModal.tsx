import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Alert } from '../common/Alert.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { PriorityBadge } from '../common/PriorityBadge.tsx';
import { SlaBadge } from '../common/SlaBadge.tsx';
import { api } from '../../services/api.ts';
import { Complaint, StatusHistoryEntry } from '../../types/index.ts';
import { Search, MapPin, Calendar, CheckCircle2, Clock } from 'lucide-react';

interface PublicTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRef?: string;
}

export const PublicTrackerModal: React.FC<PublicTrackerModalProps> = ({
  isOpen,
  onClose,
  initialRef = '',
}) => {
  const [refInput, setRefInput] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(Complaint & { history: StatusHistoryEntry[] }) | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.trackComplaint(refInput.trim());
      setResult(res.complaint);
    } catch (err: any) {
      setError(err.message || 'Complaint not found. Please verify reference format (e.g. CMP-2026-000001).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Public Complaint Tracking" maxWidth="xl">
      <form onSubmit={handleSearch} className="mb-5">
        <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="track-ref-input">
          Complaint Reference Number
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="track-ref-input"
              type="text"
              required
              placeholder="e.g. CMP-2026-000001"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </div>
      </form>

      {error && <Alert type="error">{error}</Alert>}

      {result && (
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {result.reference_no}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">{result.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={result.status} size="lg" />
              {result.sla_status && <SlaBadge status={result.sla_status} size="sm" />}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block">Category</span>
              <span className="font-semibold text-slate-800">{result.category}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Department</span>
              <span className="font-semibold text-slate-800">{result.department_name || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Priority</span>
              <PriorityBadge priority={result.priority} size="sm" />
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block">Location</span>
              <span className="font-medium text-slate-700 flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-slate-400" />
                {result.location}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Date Filed</span>
              <span className="font-medium text-slate-700 flex items-center gap-1 mt-0.5">
                <Calendar size={12} className="text-slate-400" />
                {new Date(result.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Official Resolution History
            </h4>
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {result.history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  <div className="w-7 h-7 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shrink-0 z-10">
                    <CheckCircle2 size={14} className="text-blue-600" />
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex-1 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        Status changed to {h.new_status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    {h.reason && <p className="text-slate-600 mt-1 leading-relaxed">{h.reason}</p>}
                    <div className="text-[10px] text-slate-400 mt-1">Logged by {h.changed_by_role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
