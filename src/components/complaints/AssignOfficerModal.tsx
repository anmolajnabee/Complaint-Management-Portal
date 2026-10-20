import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Alert } from '../common/Alert.tsx';
import { api } from '../../services/api.ts';
import { Department } from '../../types/index.ts';
import { UserCheck, Shield } from 'lucide-react';

interface AssignOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string;
  currentDeptId?: string | null;
  currentOfficerId?: string | null;
  onSuccess: () => void;
}

export const AssignOfficerModal: React.FC<AssignOfficerModalProps> = ({
  isOpen,
  onClose,
  complaintId,
  currentDeptId,
  currentOfficerId,
  onSuccess,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<{ id: string; full_name: string; email: string; role: string; department_id: string }[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(currentDeptId || '');
  const [selectedOfficer, setSelectedOfficer] = useState<string>(currentOfficerId || '');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedDept(currentDeptId || '');
      setSelectedOfficer(currentOfficerId || '');
      api.getDepartments().then(res => setDepartments(res.departments)).catch(() => {});
      api.getOfficers().then(res => setOfficers(res.officers)).catch(() => {});
    }
  }, [isOpen, currentDeptId, currentOfficerId]);

  const filteredOfficers = selectedDept
    ? officers.filter(o => o.department_id === selectedDept)
    : officers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.assignComplaint(complaintId, {
        department_id: selectedDept || undefined,
        assigned_officer_id: selectedOfficer || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Authority Assignment" maxWidth="md">
      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 leading-relaxed">
          <strong>Authority Directive:</strong> Automatic routing is prohibited. Authorized authorities manually delegate issues to qualified departmental personnel.
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="assign-dept">
            Designated Department
          </label>
          <select
            id="assign-dept"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setSelectedOfficer('');
            }}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Select Department --</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="assign-officer">
            Assigned Department Officer
          </label>
          <select
            id="assign-officer"
            value={selectedOfficer}
            onChange={(e) => setSelectedOfficer(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Unassigned (Department Queue) --</option>
            {filteredOfficers.map(o => (
              <option key={o.id} value={o.id}>{o.full_name} ({o.role})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="assign-notes">
            Assignment Directive / Notes (Optional)
          </label>
          <textarea
            id="assign-notes"
            rows={2}
            placeholder="e.g. Inspect high-voltage breaker and replace by tomorrow noon."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg shadow-xs flex items-center gap-1.5"
          >
            <UserCheck size={14} />
            <span>Confirm Assignment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
