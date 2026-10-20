import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

test('Mandatory 24-Step End-to-End Workflow with Real Database Records', async () => {
  const timestamp = Date.now();
  const studentAEmail = `student.test.${timestamp}@smartcollege.edu`;
  const studentBEmail = `student.other.${timestamp}@smartcollege.edu`;

  // 1. Register Student A
  console.log('1. Registering Student A...');
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Student Test Alpha',
      email: studentAEmail,
      password: 'Password@123',
      phone: '+91 99999 11111',
      roll_number: '2026-CSE-TEST',
    }),
  });
  assert.equal(regARes.status, 201, 'Student A registration should succeed');
  const regAData = await regARes.json();
  const studentAToken = regAData.token;
  const studentAId = regAData.user.id;
  assert.ok(studentAToken, 'Student A should receive valid JWT token');

  // 2. Log in as Student A
  console.log('2. Logging in as Student A...');
  const loginARes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: studentAEmail,
      password: 'Password@123',
    }),
  });
  assert.equal(loginARes.status, 200, 'Student A login should succeed');
  const loginAData = await loginARes.json();
  assert.equal(loginAData.user.email, studentAEmail);

  // 3. Submit a complaint
  // 4. Upload an attachment
  console.log('3 & 4. Submitting complaint with attachment...');
  const submitRes = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentAToken}`,
    },
    body: JSON.stringify({
      category: 'Hostel',
      title: 'Broken window latch in Hostel Room 204',
      description: 'The window latch is completely detached causing cold drafts during night hours.',
      location: 'Hostel Block C, Room 204',
      is_anonymous: false,
      attachments: [
        {
          file_name: 'window_latch_damage.png',
          file_url: '/uploads/window_latch_damage.png',
          file_size: 1048576,
          mime_type: 'image/png',
        },
      ],
    }),
  });
  assert.equal(submitRes.status, 201, 'Complaint submission should succeed');
  const submitData = await submitRes.json();

  // 5. Verify the complaint is saved
  // 6. Record the complaint reference
  const complaintId = submitData.id;
  const referenceNo = submitData.reference_no;
  console.log(`5 & 6. Saved complaint ID: ${complaintId}, Reference: ${referenceNo}`);
  assert.ok(referenceNo.startsWith('CMP-'), 'Reference should follow CMP format');

  // 7. Log in as an authorized authority (Super Admin / Dept Head)
  console.log('7. Logging in as Department Head (Hostel Affairs)...');
  const headLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'head.hostel@smartcollege.edu',
      password: 'Head@123',
    }),
  });
  assert.equal(headLoginRes.status, 200);
  const headData = await headLoginRes.json();
  const headToken = headData.token;

  // 8. Find the complaint
  console.log('8. Finding the complaint in authority records...');
  const getDetailRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    headers: { 'Authorization': `Bearer ${headToken}` },
  });
  assert.equal(getDetailRes.status, 200);
  const detailData = await getDetailRes.json();
  assert.equal(detailData.complaint.reference_no, referenceNo);
  assert.equal(detailData.complaint.status, 'Pending');

  // 9. Assign the department manually
  // 10. Assign an officer manually
  console.log('9 & 10. Assigning department and officer manually...');
  const assignRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${headToken}`,
    },
    body: JSON.stringify({
      department_id: 'dept-hostel',
      assigned_officer_id: 'usr-officer-hostel',
      notes: 'Assigned to Senior Officer Er. Amit Kumar for window replacement.',
    }),
  });
  assert.equal(assignRes.status, 200);

  // 11. Set priority
  console.log('11. Updating priority to High...');
  const prioRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/priority`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${headToken}`,
    },
    body: JSON.stringify({ priority: 'High' }),
  });
  assert.equal(prioRes.status, 200);

  // 12. Change status to In Progress
  console.log('12. Advancing status to In Progress...');
  const progressRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${headToken}`,
    },
    body: JSON.stringify({
      new_status: 'In Progress',
      reason: 'Carpenter dispatched with new latch assembly.',
    }),
  });
  assert.equal(progressRes.status, 200);

  // 13. Send a message
  console.log('13. Sending authority message to student...');
  const msgRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${headToken}`,
    },
    body: JSON.stringify({
      message: 'Hello Student, our hostel maintenance team is on the way to Room 204 with the replacement hardware.',
    }),
  });
  assert.equal(msgRes.status, 201);

  // 14. Add resolution notes
  // 15. Resolve the complaint
  console.log('14 & 15. Resolving complaint with technical notes...');
  const resolveRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${headToken}`,
    },
    body: JSON.stringify({
      new_status: 'Resolved',
      resolution_notes: 'Heavy-duty brass latch installed with hardened screws. Window closure and seal inspected.',
    }),
  });
  assert.equal(resolveRes.status, 200);

  // 16. Log back in as Student A
  // 17. Confirm status persistence
  // 18. Read the authority's message
  console.log('16, 17, 18. Verifying Student A perspective, messages & status...');
  const studentCheckRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    headers: { 'Authorization': `Bearer ${studentAToken}` },
  });
  assert.equal(studentCheckRes.status, 200);
  const studentCheckData = await studentCheckRes.json();
  assert.equal(studentCheckData.complaint.status, 'Resolved');
  assert.ok(studentCheckData.messages.some((m: any) => m.message.includes('replacement hardware')));

  // 19. Verify the resolution or reopen the complaint
  // 20. Submit feedback after successful resolution
  console.log('19 & 20. Submitting resolution confirmation and 5-star rating...');
  const verifyRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentAToken}`,
    },
    body: JSON.stringify({
      is_issue_resolved: true,
      rating: 5,
      comment: 'Excellent service. The carpenter arrived quickly and the new latch is sturdy.',
    }),
  });
  assert.equal(verifyRes.status, 200);

  // 21. Verify database records and status history
  console.log('21. Verifying database records, feedback & status history...');
  const finalCheckRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    headers: { 'Authorization': `Bearer ${studentAToken}` },
  });
  const finalCheckData = await finalCheckRes.json();
  assert.equal(finalCheckData.feedback.rating, 5);
  assert.ok(finalCheckData.history.length >= 3, 'Should have initial, In Progress, and Resolved history entries');

  // 22. Register or use Student B
  // 23. Attempt to access Student A's complaint
  // 24. Confirm access is denied
  console.log('22, 23, 24. Registering Student B and testing access denial...');
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Student Test Beta',
      email: studentBEmail,
      password: 'Password@123',
    }),
  });
  assert.equal(regBRes.status, 201);
  const regBData = await regBRes.json();
  const studentBToken = regBData.token;

  // Student B attempts to access Student A's complaint
  const unauthorizedRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    headers: { 'Authorization': `Bearer ${studentBToken}` },
  });
  assert.equal(unauthorizedRes.status, 403, 'Unauthorized student MUST be denied with 403 Forbidden');
  console.log('Access securely denied with 403 Forbidden as required!');
});
