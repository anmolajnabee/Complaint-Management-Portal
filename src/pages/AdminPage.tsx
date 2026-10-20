import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { User, AuditLog, SlaRule, Department, Role } from '../types/index.ts';
import { Alert } from '../components/common/Alert.tsx';
import {
  Users,
  ShieldCheck,
  History,
  Clock,
  Search,
  CheckCircle,
  FileText,
  Sliders,
} from 'lucide-react';

const ROLES: Role[] = ['STUDENT', 'DEPARTMENT_OFFICER', 'DEPARTMENT_HEAD', 'NODAL_OFFICER', 'SUPER_ADMIN'];

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'sla'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [rules, setRules] = useState<SlaRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search filter
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, dRes, lRes, sRes] = await Promise.all([
        api.getUsers(),
        api.getDepartments(),
        api.getAuditLogs(),
        api.getSlaRules(),
      ]);
      setUsers(uRes.users);
      setDepartments(dRes.departments);
      setLogs(lRes.logs);
      setRules(sRes.rules);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role, newDeptId?: string | null) => {
    setError(null);
    setSuccess(null);
    try {
      await api.updateUserRole(userId, newRole, newDeptId);
      setSuccess('User role updated successfully.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update user role.');
    }
  };

  const handleSlaUpdate = async (ruleId: string, hours: number, reminder: number) => {
    setError(null);
    setSuccess(null);
    try {
      await api.updateSlaRule(ruleId, hours, reminder);
      setSuccess('SLA threshold updated.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update SLA rule.');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block mb-1">
            Super Administrator Portal
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional Governance & Security
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role assignments, immutable audit log verification, and campus SLA rule enforcement
          </p>
        </div>
      </div>

      {error && <Alert type="error" onDismiss={() => setError(null)}>{error}</Alert>}
      {success && <Alert type="success" onDismiss={() => setSuccess(null)}>{success}</Alert>}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-sm">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold border-b-2 transition-colors ${
            activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={16} />
          <span>User & Role Governance ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold border-b-2 transition-colors ${
            activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History size={16} />
          <span>System Audit Log ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sla')}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold border-b-2 transition-colors ${
            activeTab === 'sla' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders size={16} />
          <span>SLA Rules Configuration</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading system management data...</div>
      ) : (
        <>
          {/* TAB 1: USER ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or role..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Current Role</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Roll / Staff ID</th>
                        <th className="py-3 px-4 text-right">Modify Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{u.full_name}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{u.email}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.department_name || (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{u.roll_number || 'N/A'}</td>
                          <td className="py-3 px-4 text-right">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as Role, u.department_id)}
                              className="px-2 py-1 text-xs border border-slate-300 rounded bg-white font-medium"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search audit actions, actors, or entity types..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="text-xs text-slate-400">Showing last 100 immutable events</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Entity</th>
                        <th className="py-3 px-4">Metadata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{l.actor_name}</td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {l.actor_role}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-blue-700 font-semibold">{l.action}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{l.entity_type}</span>{' '}
                            <span className="text-[10px] font-mono text-slate-400">({l.entity_id.slice(0, 8)})</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                            {l.metadata_json || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SLA RULES */}
          {activeTab === 'sla' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed">
                <strong>SLA Policy Definition:</strong> Configure institutional deadline windows in hours for grievance resolution. Grievances nearing the threshold generate automatic warnings; grievances exceeding the limit enter the Overdue state for nodal escalation.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{rule.priority} Priority SLA</span>
                      <Clock size={16} className="text-blue-600" />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Max Resolution Window (Hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={720}
                        defaultValue={rule.resolution_hours}
                        id={`hours-${rule.id}`}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Approaching Warning Threshold (Hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={720}
                        defaultValue={rule.reminder_hours}
                        id={`reminder-${rule.id}`}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      onClick={() => {
                        const hInput = document.getElementById(`hours-${rule.id}`) as HTMLInputElement;
                        const rInput = document.getElementById(`reminder-${rule.id}`) as HTMLInputElement;
                        handleSlaUpdate(rule.id, Number(hInput.value), Number(rInput.value));
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                    >
                      Save {rule.priority} Rules
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
