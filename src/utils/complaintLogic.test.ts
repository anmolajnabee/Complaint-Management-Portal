import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatComplaintReference,
  isValidComplaintReference,
  computeSlaDueDate,
  calculateSlaStatus,
  isValidStatusTransition,
  canUserViewComplaint,
  canUserAssign,
  canUserSetPriority,
  DEFAULT_SLA_HOURS,
} from './complaintLogic.ts';

test('formatComplaintReference generates correctly padded sequential references', () => {
  assert.equal(formatComplaintReference(2026, 1), 'CMP-2026-000001');
  assert.equal(formatComplaintReference(2026, 42), 'CMP-2026-000042');
  assert.equal(formatComplaintReference(2026, 123456), 'CMP-2026-123456');
  assert.throws(() => formatComplaintReference(2026, 0), /Sequence number must be positive/);
});

test('isValidComplaintReference validates correct CMP format', () => {
  assert.equal(isValidComplaintReference('CMP-2026-000001'), true);
  assert.equal(isValidComplaintReference('CMP-2026-123456'), true);
  assert.equal(isValidComplaintReference('CMP-26-000001'), false);
  assert.equal(isValidComplaintReference('CMP-2026-123'), false);
  assert.equal(isValidComplaintReference('INVALID-REF'), false);
});

test('computeSlaDueDate adds appropriate hours based on priority', () => {
  const base = new Date('2026-10-20T10:00:00Z');
  const highDue = computeSlaDueDate(base, 'High');
  const medDue = computeSlaDueDate(base, 'Medium');
  const lowDue = computeSlaDueDate(base, 'Low');

  assert.equal(highDue.toISOString(), new Date(base.getTime() + 24 * 3600 * 1000).toISOString());
  assert.equal(medDue.toISOString(), new Date(base.getTime() + 48 * 3600 * 1000).toISOString());
  assert.equal(lowDue.toISOString(), new Date(base.getTime() + 72 * 3600 * 1000).toISOString());
});

test('calculateSlaStatus accurately identifies On Track, Due Soon, and Overdue', () => {
  const now = new Date('2026-10-20T12:00:00Z');

  // Due in 12 hours -> On Track
  const onTrackDue = new Date('2026-10-21T00:00:00Z');
  assert.equal(calculateSlaStatus(onTrackDue, 'In Progress', null, now), 'On Track');

  // Due in 3 hours -> Due Soon (within 6h)
  const dueSoon = new Date('2026-10-20T15:00:00Z');
  assert.equal(calculateSlaStatus(dueSoon, 'In Progress', null, now), 'Due Soon');

  // Past due -> Overdue
  const pastDue = new Date('2026-10-20T10:00:00Z');
  assert.equal(calculateSlaStatus(pastDue, 'In Progress', null, now), 'Overdue');

  // Resolved within SLA
  assert.equal(calculateSlaStatus(onTrackDue, 'Resolved', '2026-10-20T18:00:00Z', now), 'Resolved Within SLA');

  // Resolved after SLA
  assert.equal(calculateSlaStatus(pastDue, 'Resolved', '2026-10-20T11:00:00Z', now), 'Resolved After SLA');
});

test('isValidStatusTransition enforces strict role-based transitions', () => {
  // Student cannot jump to In Progress or Resolved
  assert.equal(isValidStatusTransition('Pending', 'In Progress', 'STUDENT').allowed, false);
  assert.equal(isValidStatusTransition('Pending', 'Resolved', 'STUDENT').allowed, false);
  // Student can reopen resolved
  assert.equal(isValidStatusTransition('Resolved', 'Reopened', 'STUDENT').allowed, true);

  // Officer can move Pending -> In Progress and In Progress -> Resolved
  assert.equal(isValidStatusTransition('Pending', 'In Progress', 'DEPARTMENT_OFFICER').allowed, true);
  assert.equal(isValidStatusTransition('In Progress', 'Resolved', 'DEPARTMENT_OFFICER').allowed, true);
  // Officer cannot reject directly
  assert.equal(isValidStatusTransition('Pending', 'Rejected', 'DEPARTMENT_OFFICER').allowed, false);

  // Department Head can reject
  assert.equal(isValidStatusTransition('Pending', 'Rejected', 'DEPARTMENT_HEAD').allowed, true);

  // Identical transition disallowed
  assert.equal(isValidStatusTransition('Pending', 'Pending', 'SUPER_ADMIN').allowed, false);
});

test('canUserViewComplaint enforces data privacy and isolation', () => {
  const studentA = { id: 'user-a', role: 'STUDENT' as const };
  const studentB = { id: 'user-b', role: 'STUDENT' as const };
  const complaintA = { student_id: 'user-a', department_id: 'dept-1', assigned_officer_id: 'off-1' };

  // Owner student can view
  assert.equal(canUserViewComplaint(studentA, complaintA), true);
  // Other student CANNOT view
  assert.equal(canUserViewComplaint(studentB, complaintA), false);

  // Officer in same dept assigned can view
  const officer1 = { id: 'off-1', role: 'DEPARTMENT_OFFICER' as const, department_id: 'dept-1' };
  const officerOther = { id: 'off-2', role: 'DEPARTMENT_OFFICER' as const, department_id: 'dept-2' };
  assert.equal(canUserViewComplaint(officer1, complaintA), true);
  assert.equal(canUserViewComplaint(officerOther, complaintA), false);

  // Super admin can view all
  const superAdmin = { id: 'admin-1', role: 'SUPER_ADMIN' as const };
  assert.equal(canUserViewComplaint(superAdmin, complaintA), true);
});

test('canUserAssign validates assignment privileges', () => {
  assert.equal(canUserAssign('STUDENT'), false);
  assert.equal(canUserAssign('DEPARTMENT_OFFICER'), false);
  assert.equal(canUserAssign('DEPARTMENT_HEAD'), true);
  assert.equal(canUserAssign('NODAL_OFFICER'), true);
  assert.equal(canUserAssign('SUPER_ADMIN'), true);
});
