import {
  User,
  Department,
  Complaint,
  StatusHistoryEntry,
  AssignmentEntry,
  Attachment,
  ComplaintMessage,
  FeedbackEntry,
  EscalationEntry,
  NotificationItem,
  Announcement,
  KnownIssue,
  AuditLog,
  SlaRule,
  AnalyticsSummary,
} from '../types/index.ts';

const TOKEN_KEY = 'smart_college_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: { full_name: string; email: string; password: string; phone?: string; roll_number?: string }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCurrentUser: () =>
    request<{ user: User }>('/api/auth/me'),

  updateProfile: (data: { full_name?: string; phone?: string; roll_number?: string }) =>
    request<{ message: string }>('/api/auth/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Departments
  getDepartments: () =>
    request<{ departments: Department[] }>('/api/departments'),

  getOfficers: (departmentId?: string) =>
    request<{ officers: { id: string; full_name: string; email: string; role: string; department_id: string }[] }>(
      `/api/officers${departmentId ? `?department_id=${departmentId}` : ''}`
    ),

  // Complaints
  getComplaints: (params: { status?: string; category?: string; priority?: string; department_id?: string; search?: string; sort?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.category) query.set('category', params.category);
    if (params.priority) query.set('priority', params.priority);
    if (params.department_id) query.set('department_id', params.department_id);
    if (params.search) query.set('search', params.search);
    if (params.sort) query.set('sort', params.sort);
    return request<{ complaints: Complaint[] }>(`/api/complaints?${query.toString()}`);
  },

  getComplaintById: (id: string) =>
    request<{
      complaint: Complaint;
      history: StatusHistoryEntry[];
      assignments: AssignmentEntry[];
      attachments: Attachment[];
      messages: ComplaintMessage[];
      feedback?: FeedbackEntry | null;
      escalations: EscalationEntry[];
    }>(`/api/complaints/${id}`),

  submitComplaint: (data: {
    category: string;
    title: string;
    description: string;
    location: string;
    is_anonymous: boolean;
    attachments?: { file_name: string; file_url: string; file_size: number; mime_type: string }[];
  }) =>
    request<{ message: string; id: string; reference_no: string }>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  trackComplaint: (referenceNo: string) =>
    request<{
      complaint: Complaint & { history: StatusHistoryEntry[] };
    }>(`/api/complaints/track/${encodeURIComponent(referenceNo)}`),

  updateStatus: (id: string, data: { new_status: string; reason?: string; resolution_notes?: string; resolution_evidence_url?: string }) =>
    request<{ message: string; new_status: string }>(`/api/complaints/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  assignComplaint: (id: string, data: { department_id?: string; assigned_officer_id?: string; notes?: string }) =>
    request<{ message: string }>(`/api/complaints/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePriority: (id: string, priority: string) =>
    request<{ message: string; priority: string; due_date: string }>(`/api/complaints/${id}/priority`, {
      method: 'POST',
      body: JSON.stringify({ priority }),
    }),

  escalateComplaint: (id: string, reason: string) =>
    request<{ message: string }>(`/api/complaints/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  sendMessage: (id: string, message: string, is_internal = false) =>
    request<{ message: string; entry: ComplaintMessage }>(`/api/complaints/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, is_internal }),
    }),

  verifyResolution: (id: string, data: { is_issue_resolved: boolean; rating?: number; comment?: string; reopen_reason?: string }) =>
    request<{ message: string; status?: string }>(`/api/complaints/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // File Upload
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ file_name: string; file_url: string; file_size: number; mime_type: string }>('/api/upload', {
      method: 'POST',
      body: formData,
    });
  },

  addAttachment: async (complaintId: string, file: File, isResolution = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_resolution_evidence', String(isResolution));
    return request<{ message: string; attachment: Attachment }>(`/api/complaints/${complaintId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  },

  // Notifications
  getNotifications: () =>
    request<{ notifications: NotificationItem[]; unreadCount: number }>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PUT' }),

  markAllNotificationsRead: () =>
    request<{ message: string }>('/api/notifications/read-all', { method: 'PUT' }),

  // Announcements
  getAnnouncements: () =>
    request<{ announcements: Announcement[] }>('/api/announcements'),

  createAnnouncement: (data: { title: string; description: string; priority?: string; expiry_date?: string }) =>
    request<{ message: string; id: string }>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteAnnouncement: (id: string) =>
    request<{ message: string }>(`/api/announcements/${id}`, { method: 'DELETE' }),

  // Known Issues
  getKnownIssues: () =>
    request<{ issues: KnownIssue[] }>('/api/known-issues'),

  createKnownIssue: (data: { title: string; category: string; location: string; description: string; status?: string; estimated_resolution?: string }) =>
    request<{ message: string; id: string }>('/api/known-issues', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  linkComplaintToIssue: (issueId: string, complaintId: string) =>
    request<{ message: string }>(`/api/known-issues/${issueId}/link`, {
      method: 'POST',
      body: JSON.stringify({ complaint_id: complaintId }),
    }),

  // Analytics
  getPublicStats: () =>
    request<{ summary: AnalyticsSummary['summary'] }>('/api/public-stats'),

  getAnalytics: () =>
    request<AnalyticsSummary>('/api/analytics'),

  // Admin
  getUsers: () =>
    request<{ users: User[] }>('/api/admin/users'),

  updateUserRole: (id: string, role: string, department_id?: string | null) =>
    request<{ message: string }>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, department_id }),
    }),

  getAuditLogs: () =>
    request<{ logs: AuditLog[] }>('/api/admin/audit-logs'),

  getSlaRules: () =>
    request<{ rules: SlaRule[] }>('/api/sla-rules'),

  updateSlaRule: (id: string, resolution_hours: number, reminder_hours: number) =>
    request<{ message: string }>(`/api/sla-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ resolution_hours, reminder_hours }),
    }),
};
