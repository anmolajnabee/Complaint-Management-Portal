import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Complaint } from '../types/index.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { PriorityBadge } from '../components/common/PriorityBadge.tsx';
import { SlaBadge } from '../components/common/SlaBadge.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Alert } from '../components/common/Alert.tsx';
import {
  PlusCircle,
  Search,
  Filter,
  Calendar,
  MapPin,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface StudentDashboardProps {
  onOpenNewComplaint: () => void;
  onOpenTrackModal: () => void;
  onSelectComplaint: (id: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onOpenNewComplaint,
  onOpenTrackModal,
  onSelectComplaint,
}) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getComplaints({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });
      setComplaints(data.complaints);
    } catch (err: any) {
      setError(err.message || 'Failed to load your complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints();
  };

  // Real-time metric counts derived from actual database records
  const totalCount = complaints.length;
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;
  const rejectedCount = complaints.filter(c => c.status === 'Rejected').length;
  const reopenedCount = complaints.filter(c => c.status === 'Reopened').length;

  return (
    <div className="space-y-6 py-6">
      {/* Student Welcome Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
            Student Grievance Dashboard
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Roll No: <span className="font-mono font-medium text-slate-700">{user?.roll_number || 'N/A'}</span> • Email: <span className="font-mono text-slate-700">{user?.email}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNewComplaint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <PlusCircle size={16} />
            <span>Submit Complaint</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Mandatory Section 11) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Total Filed</div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div className="text-xs font-semibold text-amber-800 mb-1">Pending</div>
          <div className="text-2xl font-black text-amber-900">{pendingCount}</div>
        </div>
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <div className="text-xs font-semibold text-blue-800 mb-1">In Progress</div>
          <div className="text-2xl font-black text-blue-900">{inProgressCount}</div>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800 mb-1">Resolved</div>
          <div className="text-2xl font-black text-emerald-900">{resolvedCount}</div>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <div className="text-xs font-semibold text-rose-800 mb-1">Rejected</div>
          <div className="text-2xl font-black text-rose-900">{rejectedCount}</div>
        </div>
        <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 shadow-2xs">
          <div className="text-xs font-semibold text-purple-800 mb-1">Reopened</div>
          <div className="text-2xl font-black text-purple-900">{reopenedCount}</div>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, subject, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
            <option value="Reopened">Reopened</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="Hostel">Hostel</option>
            <option value="Electricity">Electricity</option>
            <option value="Water">Water</option>
            <option value="IT/Internet">IT / Internet</option>
            <option value="Cleanliness">Cleanliness</option>
            <option value="Civil/Maintenance">Civil / Maintenance</option>
            <option value="Library">Library</option>
            <option value="Canteen">Canteen</option>
          </select>

          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); }}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Complaints Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">My Filed Complaints ({complaints.length})</h3>
          <span className="text-xs text-slate-400">Click row or action to view resolution & messages</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading complaints from database...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No complaints found"
              description="You have not submitted any complaints matching this criteria."
              actionLabel="Submit First Complaint"
              onAction={onOpenNewComplaint}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Deadline</th>
                  <th className="py-3 px-4 text-right">Action</th>
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
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {c.title}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{c.category}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[160px] truncate">{c.location}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={c.priority} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.sla_status && <SlaBadge status={c.sla_status} size="sm" />}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectComplaint(c.id);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
