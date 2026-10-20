import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Alert } from '../common/Alert.tsx';
import { api } from '../../services/api.ts';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface EscalateModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string;
  referenceNo: string;
  onSuccess: () => void;
}

export const EscalateModal: React.FC<EscalateModalProps> = ({
  isOpen,
  onClose,
  complaintId,
  referenceNo,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let nextTier = 'Super Admin';
  if (user?.role === 'DEPARTMENT_OFFICER') nextTier = 'Department Head';
  else if (user?.role === 'DEPARTMENT_HEAD') nextTier = 'Nodal Officer';
  else if (user?.role === 'NODAL_OFFICER') nextTier = 'Super Admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('Please provide a descriptive reason for escalation.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.escalateComplaint(complaintId, reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to escalate complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Escalate Complaint: ${referenceNo}`} maxWidth="md">
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Escalation Tier:</strong> This action escalates this complaint from{' '}
            <span className="font-semibold">{user?.role}</span> to <span className="font-semibold text-rose-700">{nextTier}</span>.
            The designated higher authority will receive high-priority notification.
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="escalate-reason">
            Reason for Escalation *
          </label>
          <textarea
            id="escalate-reason"
            rows={3}
            required
            placeholder="e.g. Budget approval required from campus finance / Contractor delayed material delivery past SLA."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 rounded-lg shadow-xs flex items-center gap-1.5"
          >
            <ArrowUpRight size={14} />
            <span>Submit Escalation</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
