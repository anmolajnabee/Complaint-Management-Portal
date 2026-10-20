import { Role, ComplaintStatus, ComplaintPriority, SlaStatus } from '../utils/complaintLogic.ts';

export type { Role, ComplaintStatus, ComplaintPriority, SlaStatus };

export interface User {
  id: string;
  email: string;
  role: Role;
  full_name: string;
  department_id?: string | null;
  department_name?: string | null;
  phone?: string | null;
  roll_number?: string | null;
  avatar_url?: string | null;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  complaint_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by_id: string;
  is_resolution_evidence: number;
  created_at: string;
}

export interface StatusHistoryEntry {
  id: string;
  complaint_id: string;
  previous_status: string;
  new_status: string;
  changed_by_id: string;
  changed_by_name: string;
  changed_by_role: string;
  reason?: string;
  created_at: string;
}

export interface AssignmentEntry {
  id: string;
  complaint_id: string;
  department_id: string;
  department_name?: string;
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  assigned_by_id: string;
  assigned_by_name: string;
  notes?: string;
  created_at: string;
}

export interface ComplaintMessage {
  id: string;
  complaint_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  is_internal: number;
  created_at: string;
}

export interface FeedbackEntry {
  id: string;
  complaint_id: string;
  student_id: string;
  rating: number;
  comment?: string;
  is_issue_resolved: number;
  created_at: string;
}

export interface EscalationEntry {
  id: string;
  complaint_id: string;
  from_role: string;
  to_role: string;
  reason: string;
  escalated_by_id: string;
  escalated_by_name: string;
  status: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  reference_no: string;
  sequence_number: number;
  student_id?: string | null;
  student_name?: string | null;
  student_email?: string | null;
  student_roll?: string | null;
  student_phone?: string | null;
  category: string;
  title: string;
  description: string;
  location: string;
  is_anonymous: number;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  department_id?: string | null;
  department_name?: string | null;
  department_code?: string | null;
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  assigned_officer_email?: string | null;
  due_date: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  resolution_evidence_url?: string | null;
  sla_status?: SlaStatus;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  is_read: number;
  type: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: 'Normal' | 'High' | 'Urgent';
  is_active: number;
  publication_date: string;
  expiry_date?: string | null;
  created_by_id: string;
  created_by_name?: string;
  created_at: string;
}

export interface KnownIssue {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  status: 'Identified' | 'In Progress' | 'Resolved';
  estimated_resolution?: string | null;
  updated_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata_json?: string;
  created_at: string;
}

export interface SlaRule {
  id: string;
  priority: ComplaintPriority;
  resolution_hours: number;
  reminder_hours: number;
  created_at: string;
}

export interface AnalyticsSummary {
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    rejected: number;
    reopened: number;
    highPriority: number;
    overdue: number;
    slaCompliancePercent: number;
    averageRating: number;
  };
  byCategory: { category: string; count: number }[];
  byDepartment: { department_name: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byStatus: { status: string; count: number }[];
  topLocations: { location: string; count: number }[];
}
