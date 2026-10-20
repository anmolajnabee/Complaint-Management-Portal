// Complaint System Domain Logic & Business Rules

export type Role = 'STUDENT' | 'DEPARTMENT_OFFICER' | 'DEPARTMENT_HEAD' | 'NODAL_OFFICER' | 'SUPER_ADMIN';

export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Rejected' | 'Reopened';

export type ComplaintPriority = 'Low' | 'Medium' | 'High';

export type SlaStatus = 'On Track' | 'Due Soon' | 'Overdue' | 'Resolved Within SLA' | 'Resolved After SLA';

export interface SlaRuleConfig {
  High: number; // hours (default 24)
  Medium: number; // hours (default 48)
  Low: number; // hours (default 72)
}

export const DEFAULT_SLA_HOURS: SlaRuleConfig = {
  High: 24,
  Medium: 48,
  Low: 72,
};

/**
 * Validates whether a state transition is legal according to college complaint workflow
 */
export function isValidStatusTransition(currentStatus: ComplaintStatus, newStatus: ComplaintStatus, userRole: Role): { allowed: boolean; reason?: string } {
  if (currentStatus === newStatus) {
    return { allowed: false, reason: 'New status is identical to current status.' };
  }

  // Students can only reopen resolved complaints
  if (userRole === 'STUDENT') {
    if (currentStatus === 'Resolved' && newStatus === 'Reopened') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Students can only reopen resolved complaints if unsatisfied.' };
  }

  // Officer transitions
  if (userRole === 'DEPARTMENT_OFFICER') {
    if (currentStatus === 'Pending' && newStatus === 'In Progress') return { allowed: true };
    if (currentStatus === 'Reopened' && newStatus === 'In Progress') return { allowed: true };
    if (currentStatus === 'In Progress' && newStatus === 'Resolved') return { allowed: true };
    return { allowed: false, reason: `Department Officers can only move Pending/Reopened to In Progress, or In Progress to Resolved.` };
  }

  // Head transitions
  if (userRole === 'DEPARTMENT_HEAD') {
    if (currentStatus === 'Pending' && (newStatus === 'In Progress' || newStatus === 'Rejected')) return { allowed: true };
    if (currentStatus === 'Reopened' && (newStatus === 'In Progress' || newStatus === 'Rejected')) return { allowed: true };
    if (currentStatus === 'In Progress' && newStatus === 'Resolved') return { allowed: true };
    if (currentStatus === 'Resolved' && newStatus === 'Reopened') return { allowed: true };
    return { allowed: false, reason: `Invalid status transition for Department Head.` };
  }

  // Nodal Officer and Super Admin transitions
  if (userRole === 'NODAL_OFFICER' || userRole === 'SUPER_ADMIN') {
    // Authorized to perform standard workflow transitions
    const validPairs: Record<ComplaintStatus, ComplaintStatus[]> = {
      'Pending': ['In Progress', 'Rejected'],
      'In Progress': ['Resolved', 'Pending'],
      'Resolved': ['Reopened'],
      'Rejected': ['Pending', 'In Progress'],
      'Reopened': ['In Progress', 'Resolved', 'Rejected'],
    };
    if (validPairs[currentStatus]?.includes(newStatus)) {
      return { allowed: true };
    }
    return { allowed: false, reason: `Cannot transition directly from ${currentStatus} to ${newStatus}.` };
  }

  return { allowed: false, reason: 'Unauthorized role.' };
}

/**
 * Formats a complaint reference in format: CMP-YYYY-XXXXXX
 */
export function formatComplaintReference(year: number, sequenceNumber: number): string {
  if (sequenceNumber < 1) {
    throw new Error('Sequence number must be positive');
  }
  const padded = sequenceNumber.toString().padStart(6, '0');
  return `CMP-${year}-${padded}`;
}

/**
 * Validates reference format
 */
export function isValidComplaintReference(reference: string): boolean {
  return /^CMP-\d{4}-\d{6}$/.test(reference.trim());
}

/**
 * Computes SLA deadline date from creation time and priority
 */
export function computeSlaDueDate(createdAt: Date | string, priority: ComplaintPriority, slaConfig = DEFAULT_SLA_HOURS): Date {
  const created = new Date(createdAt);
  const hours = slaConfig[priority] || 48;
  return new Date(created.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Determines SLA status (On Track, Due Soon, Overdue, Resolved Within SLA, Resolved After SLA)
 */
export function calculateSlaStatus(
  dueDate: Date | string,
  currentStatus: ComplaintStatus,
  resolvedAt?: Date | string | null,
  now: Date = new Date()
): SlaStatus {
  const due = new Date(dueDate).getTime();
  const current = now.getTime();

  if (currentStatus === 'Resolved') {
    if (!resolvedAt) {
      return 'Resolved Within SLA';
    }
    const resolved = new Date(resolvedAt).getTime();
    return resolved <= due ? 'Resolved Within SLA' : 'Resolved After SLA';
  }

  if (currentStatus === 'Rejected') {
    return 'Resolved Within SLA';
  }

  // Open status: Pending, In Progress, Reopened
  if (current > due) {
    return 'Overdue';
  }

  // Due Soon if less than 6 hours remaining
  const sixHoursMs = 6 * 60 * 60 * 1000;
  if (due - current <= sixHoursMs) {
    return 'Due Soon';
  }

  return 'On Track';
}

/**
 * Calculates remaining hours or overdue hours
 */
export function getRemainingHours(dueDate: Date | string, now: Date = new Date()): number {
  const due = new Date(dueDate).getTime();
  const diff = due - now.getTime();
  return Math.round(diff / (1000 * 60 * 60));
}

/**
 * Checks if a user has permission to view a complaint
 */
export function canUserViewComplaint(
  user: { id: string; role: Role; department_id?: string | null },
  complaint: { student_id: string; department_id?: string | null; assigned_officer_id?: string | null }
): boolean {
  if (user.role === 'SUPER_ADMIN' || user.role === 'NODAL_OFFICER') {
    return true;
  }
  if (user.role === 'STUDENT') {
    return user.id === complaint.student_id;
  }
  if (user.role === 'DEPARTMENT_HEAD') {
    return user.department_id === complaint.department_id || !complaint.department_id;
  }
  if (user.role === 'DEPARTMENT_OFFICER') {
    return user.id === complaint.assigned_officer_id || (user.department_id === complaint.department_id && !complaint.assigned_officer_id);
  }
  return false;
}

/**
 * Checks if a user has permission to manually assign department/officer
 */
export function canUserAssign(userRole: Role): boolean {
  return ['DEPARTMENT_HEAD', 'NODAL_OFFICER', 'SUPER_ADMIN'].includes(userRole);
}

/**
 * Checks if user can manage priority
 */
export function canUserSetPriority(userRole: Role): boolean {
  return ['DEPARTMENT_OFFICER', 'DEPARTMENT_HEAD', 'NODAL_OFFICER', 'SUPER_ADMIN'].includes(userRole);
}
