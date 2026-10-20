import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Complaint, Department } from '../types/index.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { PriorityBadge } from '../components/common/PriorityBadge.tsx';
import { SlaBadge } from '../components/common/SlaBadge.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Alert } from '../components/common/Alert.tsx';
import { AssignOfficerModal } from '../components/complaints/AssignOfficerModal.tsx';
import { EscalateModal } from '../components/complaints/EscalateModal.tsx';
import {
  Search,
  Filter,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  RefreshCw,
  Building,
} from 'lucide-react';

interface AuthorityDashboardProps {
  onSelectComplaint: (id: string) => void;
}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({
  onSelectComplaint,
}) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortOption, setSortOption] = useState('newest');

  // Quick modals
  const [assignComplaintId, setAssignComplaintId] = useState<string | null>(null);
  const [escalateComplaint, setEscalateComplaint] = useState<{ id: string; ref: string } | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, deptRes] = await Promise.all([
        api.getComplaints({
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          priority: priorityFilter || undefined,
          department_id: departmentFilter || undefined,
          sort: sortOption,
        }),
        api.getDepartments(),
      ]);
      setComplaints(compRes.complaints);
      setDepartments(deptRes.departments);
    } catch (err: any) {
      setError(err.message || 'Failed to load departmental complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter, priorityFilter, departmentFilter, sortOption]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints();
  };

  // Authority Statistics
  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'Pending').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;
  const highPriority = complaints.filter(c => c.priority === 'High').length;
  const overdue = complaints.filter(c => c.sla_status === 'Overdue').length;

  const onTimeResolved = complaints.filter(c => c.sla_status === 'Resolved Within SLA').length;
  const totalResolved = complaints.filter(c => c.status === 'Resolved').length;
  const slaCompliance = totalResolved > 0 ? Math.round((onTimeResolved / totalResolved) * 100) : 100;

  return (
    <div className="space-y-6 py-6">
      {/* Role Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              {user?.role.replace('_', ' ')}
            </span>
            {user?.department_name && (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Dept: {user.department_name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Authority Command & Resolution Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as {user?.full_name} ({user?.email}) • Active SLA Monitoring & Assignment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchComplaints}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Refresh records"
          >
            <RefreshCw size={15} />
          </button>
          <a
            href="/api/reports/export-csv"
            download
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Operational Metrics (Mandatory Section 18) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Total Queue</div>
          <div className="text-2xl font-black text-slate-900">{total}</div>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div className="text-xs font-semibold text-amber-800 mb-1">Pending Action</div>
          <div className="text-2xl font-black text-amber-900">{pending}</div>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <div className="text-xs font-semibold text-blue-800 mb-1">In Progress</div>
          <div className="text-2xl font-black text-blue-900">{inProgress}</div>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <div className="text-xs font-semibold text-rose-800 mb-1">High Priority</div>
          <div className="text-2xl font-black text-rose-900">{highPriority}</div>
        </div>
        <div className="bg-red-100/70 p-4 rounded-xl border border-red-300 shadow-2xs">
          <div className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
            <AlertTriangle size={12} />
            <span>Overdue SLA</span>
          </div>
          <div className="text-2xl font-black text-red-900">{overdue}</div>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800 mb-1">SLA Compliance</div>
          <div className="text-2xl font-black text-emerald-900">{slaCompliance}%</div>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search reference, keyword, student, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Status: All</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
              <option value="Reopened">Reopened</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Priority: All</option>
              <option value="High">High (24h)</option>
              <option value="Medium">Medium (48h)</option>
              <option value="Low">Low (72h)</option>
            </select>

            {user?.role === 'SUPER_ADMIN' || user?.role === 'NODAL_OFFICER' ? (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Department: All</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            ) : null}

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="deadline">Sort: Tightest Deadline</option>
              <option value="priority">Sort: Highest Priority</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>

            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setCategoryFilter('');
                setPriorityFilter('');
                setDepartmentFilter('');
                setSortOption('newest');
              }}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-800"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Complaints Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Assigned Grievance Records ({complaints.length})
          </h3>
          <span className="text-xs text-slate-400">Strictly manual delegation per college policy</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Fetching operational records...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No complaints in this queue"
              description="No complaints match the selected filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Subject & Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Officer</th>
                  <th className="py-3 px-4">SLA State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {complaints.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => onSelectComplaint(c.id)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {c.reference_no}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{c.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">{c.location}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{c.category}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.is_anonymous ? (
                        <span className="text-slate-500 italic">Anonymous</span>
                      ) : (
                        <span className="font-medium">{c.student_name || 'Student'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={c.priority} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.assigned_officer_name ? (
                        <span className="font-medium text-slate-800">{c.assigned_officer_name}</span>
                      ) : (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.sla_status && <SlaBadge status={c.sla_status} size="sm" />}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectComplaint(c.id)}
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="View Full Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => setAssignComplaintId(c.id)}
                          className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded"
                          title="Assign Officer"
                        >
                          <UserCheck size={15} />
                        </button>
                        <button
                          onClick={() => setEscalateComplaint({ id: c.id, ref: c.reference_no })}
                          className="p-1 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded"
                          title="Escalate Issue"
                        >
                          <ArrowUpRight size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Assign Modal */}
      {assignComplaintId && (
        <AssignOfficerModal
          isOpen={true}
          onClose={() => setAssignComplaintId(null)}
          complaintId={assignComplaintId}
          onSuccess={fetchComplaints}
        />
      )}

      {/* Quick Escalate Modal */}
      {escalateComplaint && (
        <EscalateModal
          isOpen={true}
          onClose={() => setEscalateComplaint(null)}
          complaintId={escalateComplaint.id}
          referenceNo={escalateComplaint.ref}
          onSuccess={fetchComplaints}
        />
      )}
    </div>
  );
};
