import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Alert } from '../common/Alert.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { PriorityBadge } from '../common/PriorityBadge.tsx';
import { SlaBadge } from '../common/SlaBadge.tsx';
import { AssignOfficerModal } from './AssignOfficerModal.tsx';
import { EscalateModal } from './EscalateModal.tsx';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Complaint,
  StatusHistoryEntry,
  AssignmentEntry,
  Attachment,
  ComplaintMessage,
  FeedbackEntry,
  EscalationEntry,
  ComplaintStatus,
  ComplaintPriority,
} from '../../types/index.ts';
import {
  canUserAssign,
  canUserSetPriority,
  isValidStatusTransition,
  getRemainingHours,
} from '../../utils/complaintLogic.ts';
import {
  Clock,
  MapPin,
  Calendar,
  UserCheck,
  Send,
  Upload,
  ArrowUpRight,
  Shield,
  Star,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  FileText,
  MessageSquare,
  History,
  Paperclip,
  Check,
} from 'lucide-react';

interface ComplaintDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaintId: string | null;
  onRefreshList?: () => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  isOpen,
  onClose,
  complaintId,
  onRefreshList,
}) => {
  const { user, isStudent } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [assignments, setAssignments] = useState<AssignmentEntry[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry | null>(null);
  const [escalations, setEscalations] = useState<EscalationEntry[]>([]);

  // Sub-modals
  const [assignOpen, setAssignOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'history' | 'attachments'>('overview');

  // Message input
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Status update state
  const [statusAction, setStatusAction] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Student verification state
  const [verificationMode, setVerificationMode] = useState<'none' | 'resolve' | 'reopen'>('none');
  const [starRating, setStarRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Resolution evidence upload
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const fetchDetails = async () => {
    if (!complaintId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getComplaintById(complaintId);
      setComplaint(data.complaint);
      setHistory(data.history);
      setAssignments(data.assignments);
      setAttachments(data.attachments);
      setMessages(data.messages);
      setFeedback(data.feedback || null);
      setEscalations(data.escalations);
    } catch (err: any) {
      setError(err.message || 'Failed to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && complaintId) {
      fetchDetails();
    }
  }, [isOpen, complaintId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !complaintId) return;
    setSendingMsg(true);
    try {
      const res = await api.sendMessage(complaintId, newMessage.trim());
      setMessages(prev => [...prev, res.entry]);
      setNewMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleStatusChange = async (targetStatus: ComplaintStatus) => {
    if (!complaintId) return;
    setUpdatingStatus(true);
    setError(null);
    try {
      await api.updateStatus(complaintId, {
        new_status: targetStatus,
        resolution_notes: targetStatus === 'Resolved' ? resolutionNotes : undefined,
      });
      setStatusAction('');
      setResolutionNotes('');
      await fetchDetails();
      onRefreshList?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: ComplaintPriority) => {
    if (!complaintId) return;
    try {
      await api.updatePriority(complaintId, newPriority);
      await fetchDetails();
      onRefreshList?.();
    } catch (err: any) {
      setError(err.message || 'Failed to change priority.');
    }
  };

  const handleVerificationSubmit = async (resolved: boolean) => {
    if (!complaintId) return;
    setSubmittingVerification(true);
    setError(null);
    try {
      await api.verifyResolution(complaintId, {
        is_issue_resolved: resolved,
        rating: resolved ? starRating : undefined,
        comment: resolved ? feedbackComment : undefined,
        reopen_reason: !resolved ? reopenReason : undefined,
      });
      setVerificationMode('none');
      await fetchDetails();
      onRefreshList?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !complaintId) return;
    const file = e.target.files[0];
    setUploadingEvidence(true);
    try {
      await api.addAttachment(complaintId, file, true);
      await fetchDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to upload resolution evidence');
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (!isOpen) return null;

  const hoursRemaining = complaint ? getRemainingHours(complaint.due_date) : 0;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={complaint ? `${complaint.reference_no} — Details` : 'Complaint Overview'}
        maxWidth="3xl"
      >
        {error && <Alert type="error" onDismiss={() => setError(null)}>{error}</Alert>}

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Retrieving complaint records...</span>
          </div>
        ) : !complaint ? (
          <div className="py-8 text-center text-slate-500 text-sm">Complaint record not found.</div>
        ) : (
          <div className="space-y-5">
            {/* Header info badge bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded border border-blue-200">
                    {complaint.reference_no}
                  </span>
                  <StatusBadge status={complaint.status} size="lg" />
                  <PriorityBadge priority={complaint.priority} size="md" />
                  {complaint.sla_status && <SlaBadge status={complaint.sla_status} size="md" />}
                </div>

                {/* SLA countdown or resolved info */}
                <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  {complaint.status === 'Resolved' ? (
                    <span className="text-emerald-700 font-semibold">Resolved</span>
                  ) : hoursRemaining > 0 ? (
                    <span>
                      Deadline: <strong className="text-slate-900">{hoursRemaining}h remaining</strong>
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold">
                      Overdue by {Math.abs(hoursRemaining)}h
                    </span>
                  )}
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-900 leading-snug">{complaint.title}</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">Category</span>
                  <span className="font-semibold text-slate-800">{complaint.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-800">{complaint.department_name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Assigned Officer</span>
                  <span className="font-semibold text-slate-800">{complaint.assigned_officer_name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Reported By</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    {complaint.is_anonymous ? (
                      <>
                        <Shield size={12} className="text-blue-600" />
                        <span>Anonymous</span>
                      </>
                    ) : (
                      complaint.student_name || 'Student'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Authority Action Control Bar */}
            {user && user.role !== 'STUDENT' && (
              <div className="bg-white border border-blue-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Status Actions */}
                  {complaint.status === 'Pending' && (
                    <button
                      onClick={() => handleStatusChange('In Progress')}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>Start Progress</span>
                    </button>
                  )}

                  {complaint.status === 'In Progress' && (
                    <button
                      onClick={() => setStatusAction('resolve')}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} />
                      <span>Mark Resolved</span>
                    </button>
                  )}

                  {(user.role === 'DEPARTMENT_HEAD' || user.role === 'SUPER_ADMIN') && complaint.status === 'Pending' && (
                    <button
                      onClick={() => handleStatusChange('Rejected')}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                    >
                      Reject
                    </button>
                  )}

                  {/* Manual Assignment */}
                  {canUserAssign(user.role) && (
                    <button
                      onClick={() => setAssignOpen(true)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
                    >
                      <UserCheck size={14} />
                      <span>Assign Dept / Officer</span>
                    </button>
                  )}

                  {/* Escalate */}
                  <button
                    onClick={() => setEscalateOpen(true)}
                    className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1.5"
                  >
                    <ArrowUpRight size={14} />
                    <span>Escalate</span>
                  </button>
                </div>

                {/* Priority Selector for Authorized Personnel */}
                {canUserSetPriority(user.role) && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 font-medium">Priority:</span>
                    <select
                      value={complaint.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as ComplaintPriority)}
                      className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
                    >
                      <option value="Low">Low (72h)</option>
                      <option value="Medium">Medium (48h)</option>
                      <option value="High">High (24h)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Resolve Form Dialog within page if active */}
            {statusAction === 'resolve' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-3">
                <div className="font-bold text-emerald-900 text-sm">Resolution Completion Form</div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Official Resolution Notes *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Document the exact technical actions, parts replaced, or service restored..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusAction('')}
                    className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus || !resolutionNotes.trim()}
                    onClick={() => handleStatusChange('Resolved')}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold rounded shadow-xs"
                  >
                    Confirm Resolution
                  </button>
                </div>
              </div>
            )}

            {/* Resolution Verification & Feedback Card for Students */}
            {complaint.status === 'Resolved' && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs">
                {feedback ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <CheckCircle size={16} className="text-emerald-600" />
                      <span>Resolution Confirmed by Student</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={star <= feedback.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                        />
                      ))}
                      <span className="text-slate-700 ml-1 font-semibold">{feedback.rating}/5</span>
                    </div>
                    {feedback.comment && (
                      <p className="text-slate-700 italic mt-1 bg-white/70 p-2 rounded border border-emerald-100">
                        "{feedback.comment}"
                      </p>
                    )}
                  </div>
                ) : isStudent ? (
                  <div className="space-y-3">
                    <div className="font-bold text-sm text-slate-900">
                      Has your campus issue been resolved?
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      College authorities marked this complaint resolved. Please confirm whether the repair or service meets your satisfaction, or reopen it if incomplete.
                    </p>

                    {verificationMode === 'none' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setVerificationMode('resolve')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle size={14} />
                          <span>Yes, Issue Resolved</span>
                        </button>
                        <button
                          onClick={() => setVerificationMode('reopen')}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg flex items-center gap-1.5"
                        >
                          <RotateCcw size={14} />
                          <span>No, Reopen Complaint</span>
                        </button>
                      </div>
                    )}

                    {verificationMode === 'resolve' && (
                      <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2">
                        <div className="font-semibold text-slate-800">Rate the Resolution Quality:</div>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setStarRating(num)}
                              className="p-1 hover:scale-110 transition-transform"
                              aria-label={`Rate ${num} stars`}
                            >
                              <Star
                                size={20}
                                className={num <= starRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                              />
                            </button>
                          ))}
                        </div>
                        <div>
                          <label className="block text-slate-600 font-medium mb-1">Optional Feedback Comment:</label>
                          <input
                            type="text"
                            placeholder="e.g. Prompt repair and polite technician"
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded text-xs"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setVerificationMode('none')}
                            className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            disabled={submittingVerification}
                            onClick={() => handleVerificationSubmit(true)}
                            className="px-4 py-1 bg-emerald-600 text-white font-semibold rounded shadow-xs"
                          >
                            Submit Verification
                          </button>
                        </div>
                      </div>
                    )}

                    {verificationMode === 'reopen' && (
                      <div className="bg-white p-3 rounded-lg border border-rose-200 space-y-2">
                        <div className="font-semibold text-rose-900">Explain why issue is unresolved:</div>
                        <textarea
                          rows={2}
                          required
                          placeholder="e.g. The leak resumed 2 hours after the repair was completed..."
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          className="w-full p-2 border border-rose-300 rounded text-xs"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setVerificationMode('none')}
                            className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            disabled={submittingVerification || !reopenReason.trim()}
                            onClick={() => handleVerificationSubmit(false)}
                            className="px-4 py-1 bg-rose-600 text-white font-semibold rounded shadow-xs"
                          >
                            Reopen Complaint
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-600">
                    Awaiting resolution confirmation from the student.
                  </div>
                )}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText size={14} />
                <span>Description & Resolution</span>
              </button>

              <button
                onClick={() => setActiveTab('messages')}
                className={`flex items-center gap-1.5 px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === 'messages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare size={14} />
                <span>Messages ({messages.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History size={14} />
                <span>Audit Timeline ({history.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('attachments')}
                className={`flex items-center gap-1.5 px-4 py-2 font-semibold border-b-2 transition-colors ${
                  activeTab === 'attachments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Paperclip size={14} />
                <span>Files ({attachments.length})</span>
              </button>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Issue Description</h4>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {complaint.description}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span>
                    Location: <strong className="text-slate-900">{complaint.location}</strong>
                  </span>
                </div>

                {complaint.resolution_notes && (
                  <div>
                    <h4 className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-600" />
                      <span>Official Resolution Report</span>
                    </h4>
                    <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200 text-emerald-950 leading-relaxed whitespace-pre-wrap">
                      {complaint.resolution_notes}
                    </div>
                  </div>
                )}

                {/* Escalation history if any */}
                {escalations.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <span>Recorded Escalations ({escalations.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {escalations.map((esc) => (
                        <div key={esc.id} className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900 mb-1">
                            <span>{esc.from_role} → {esc.to_role}</span>
                            <span className="text-slate-400 font-normal">
                              {new Date(esc.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-700">{esc.reason}</p>
                          <div className="text-[10px] text-slate-400 mt-1">By {esc.escalated_by_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Messages */}
            {activeTab === 'messages' && (
              <div className="space-y-3">
                <div className="max-h-72 overflow-y-auto space-y-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  {messages.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No messages yet. Start a discussion with the authorities.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = user?.id === m.sender_id;
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="text-[10px] text-slate-400 mb-0.5 px-1">
                            {m.sender_name} ({m.sender_role.replace('_', ' ')}) •{' '}
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div
                            className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                            }`}
                          >
                            {m.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Send message box */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Type an official message or query..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}

            {/* Tab: Timeline / History */}
            {activeTab === 'history' && (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 text-xs">
                {history.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 relative">
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shrink-0 z-10">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {h.previous_status === 'None' ? 'Complaint Registered' : `Status changed from ${h.previous_status} to ${h.new_status}`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      {h.reason && <p className="text-slate-600 mt-1">{h.reason}</p>}
                      <div className="text-[10px] text-slate-400 mt-1">
                        By {h.changed_by_name} ({h.changed_by_role})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Attachments */}
            {activeTab === 'attachments' && (
              <div className="space-y-3 text-xs">
                {attachments.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">No attachments uploaded for this complaint.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-blue-700 hover:underline block truncate"
                            >
                              {att.file_name}
                            </a>
                            <span className="text-[10px] text-slate-400">
                              {Math.round(att.file_size / 1024)} KB •{' '}
                              {att.is_resolution_evidence ? 'Resolution Evidence' : 'Student Evidence'}
                            </span>
                          </div>
                        </div>
                        <a
                          href={att.file_url}
                          download
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload additional evidence */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Add evidence attachment:</span>
                  <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5">
                    <Upload size={14} />
                    <span>{uploadingEvidence ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      onChange={handleEvidenceUpload}
                      disabled={uploadingEvidence}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Sub-modals */}
      {complaint && (
        <>
          <AssignOfficerModal
            isOpen={assignOpen}
            onClose={() => setAssignOpen(false)}
            complaintId={complaint.id}
            currentDeptId={complaint.department_id}
            currentOfficerId={complaint.assigned_officer_id}
            onSuccess={() => {
              fetchDetails();
              onRefreshList?.();
            }}
          />

          <EscalateModal
            isOpen={escalateOpen}
            onClose={() => setEscalateOpen(false)}
            complaintId={complaint.id}
            referenceNo={complaint.reference_no}
            onSuccess={() => {
              fetchDetails();
              onRefreshList?.();
            }}
          />
        </>
      )}
    </>
  );
};
