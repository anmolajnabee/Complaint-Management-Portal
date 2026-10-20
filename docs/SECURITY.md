# SECURITY & DATA PRIVACY: SMART COLLEGE COMPLAINT SYSTEM

## 1. Multi-Role Authorization & Row-Level Scoping

Client-side button hiding is **never** considered security. Every request is filtered and authorized on the server before database execution:

### Role Scoping Matrix:
1. **`STUDENT`:**
   - Can only query complaints where `complaints.student_id = req.user.id`.
   - Cannot view other students' complaints even by guessing or modifying the UUID in the URL.
   - Unauthorized attempts return **`HTTP 403 Forbidden`**.
2. **`DEPARTMENT_OFFICER`:**
   - Can only view complaints assigned to them or unassigned complaints belonging to their designated department.
3. **`DEPARTMENT_HEAD`:**
   - Has visibility over all complaints belonging to their designated department.
4. **`NODAL_OFFICER` & `SUPER_ADMIN`:**
   - Full institutional cross-departmental oversight.

---

## 2. Anonymous Grievance Privacy Enforcement

When a student checks **"Submit Anonymously"**:
1. The server stores `is_anonymous = 1` in the database.
2. In all API responses delivered to `DEPARTMENT_OFFICER`, `DEPARTMENT_HEAD`, and `NODAL_OFFICER`, the identity fields are permanently scrubbed:
   - `student_name` is replaced with `'Anonymous Student'`
   - `student_email` is set to `null`
   - `student_roll` is set to `null`
   - `student_id` is set to `null`
3. Only the submitting student and the `SUPER_ADMIN` (for audit and legal investigations) can inspect the original ownership link.

---

## 3. File Upload Hardening

- **Storage Isolation:** Files are written to an isolated `/uploads` directory on disk with randomly generated timestamp filenames.
- **MIME Type Whitelisting:** Enforces allowed formats: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, and `text/plain`.
- **Size Limitation:** Capped at 10 MB per attachment.
- **Filename Sanitization:** Original file extensions are preserved, but filenames are hashed to prevent path traversal attacks (`../`).

---

## 4. Immutable Audit Trail

Every major operational mutation generates a permanent entry in `audit_logs`:
- `USER_REGISTERED`
- `USER_LOGIN`
- `COMPLAINT_CREATED`
- `COMPLAINT_ASSIGNED`
- `COMPLAINT_PRIORITY_UPDATED`
- `COMPLAINT_STATUS_UPDATED`
- `COMPLAINT_ESCALATED`
- `RESOLUTION_VERIFIED`
- `COMPLAINT_REOPENED`
- `ANNOUNCEMENT_CREATED`
- `USER_ROLE_CHANGED`

Logs store actor ID, name, role, action, entity type, entity ID, and JSON metadata. Super Admins cannot delete or overwrite audit logs.
