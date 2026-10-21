import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { AnalyticsSummary } from '../types/index.ts';
import { Alert } from '../components/common/Alert.tsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  TrendingUp,
  Star,
} from 'lucide-react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getAnalytics()
      .then(res => setData(res))
      .catch(err => setError(err.message || 'Failed to load analytics records.'))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 py-6 print:py-0">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
            College Grievance Intelligence
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated from live database records • No simulated or fabricated metrics
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <a
            href="/api/reports/export-csv"
            download
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Crunching institutional analytics...</span>
        </div>
      ) : !data ? null : (
        <>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase">Total Registered</span>
                <TrendingUp size={16} className="text-blue-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">{data.summary.total}</div>
              <div className="text-[11px] text-slate-500 mt-1">All time campus grievances</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase">Resolved Rate</span>
                <CheckCircle size={16} className="text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-600">
                {data.summary.total > 0 ? Math.round((data.summary.resolved / data.summary.total) * 100) : 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {data.summary.resolved} of {data.summary.total} resolved
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase">SLA Compliance</span>
                <Clock size={16} className="text-blue-600" />
              </div>
              <div className="text-3xl font-black text-blue-600">
                {data.summary.slaCompliancePercent}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Resolved within deadline</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase">Satisfaction</span>
                <Star size={16} className="fill-amber-400 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-500">
                {data.summary.averageRating}
                <span className="text-base font-normal text-slate-400">/5</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Student verification rating</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* By Category */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs min-w-0">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Complaints by Category</h3>
              <p className="text-xs text-slate-500 mb-4">Volume distribution across infrastructure departments</p>
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byCategory} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="category" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={45} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By Status */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs min-w-0">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Status Workflow Distribution</h3>
              <p className="text-xs text-slate-500 mb-4">Current stage breakdown of complaints in the system</p>
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byStatus.filter(s => s.count > 0)}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={36}
                      paddingAngle={3}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {data.byStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Department Breakdown & Problem Locations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Department Breakdown */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs min-w-0">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Department Workload</h3>
              <div className="space-y-3">
                {data.byDepartment.map((dept, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{dept.department_name}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{
                            width: `${data.summary.total > 0 ? (dept.count / data.summary.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-900 w-6 text-right">{dept.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recurring Problem Locations */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin size={16} className="text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Recurring Problem Locations</h3>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {data.topLocations.map((loc, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-800 font-medium">{loc.location}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold font-mono">
                      {loc.count} {loc.count === 1 ? 'incident' : 'incidents'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
