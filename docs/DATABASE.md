# DATABASE DESIGN & SCHEMA: SMART COLLEGE COMPLAINT SYSTEM

The database is built on a persistent relational model implemented with standard SQL DDL, UUID primary keys, foreign key constraints, and referential integrity.

---

## 1. Relational Entity Tables

### 1. `departments`
Stores academic and campus operational divisions.
- `id` (TEXT PRIMARY KEY) - e.g. `'dept-hostel'`
- `code` (TEXT UNIQUE NOT NULL) - e.g. `'HOSTEL'`
- `name` (TEXT NOT NULL) - e.g. `'Hostel Affairs'`
- `description` (TEXT)
- `created_at` (TEXT NOT NULL)

### 2. `profiles`
User accounts and identity records. Passwords are never stored in plain text; bcrypt hashes with 10 salt rounds are used.
- `id` (TEXT PRIMARY KEY) - UUID
- `full_name` (TEXT NOT NULL)
- `email` (TEXT UNIQUE NOT NULL)
- `password_hash` (TEXT NOT NULL)
- `role` (TEXT NOT NULL) - `STUDENT`, `DEPARTMENT_OFFICER`, `DEPARTMENT_HEAD`, `NODAL_OFFICER`, `SUPER_ADMIN`
- `department_id` (TEXT REFERENCES departments(id))
- `phone` (TEXT)
- `roll_number` (TEXT)
- `avatar_url` (TEXT)
- `created_at` (TEXT NOT NULL)
- `updated_at` (TEXT NOT NULL)

### 3. `sla_rules`
Configurable institutional resolution windows.
- `id` (TEXT PRIMARY KEY)
- `priority` (TEXT UNIQUE NOT NULL) - `High`, `Medium`, `Low`
- `resolution_hours` (INTEGER NOT NULL) - e.g. 24, 48, 72
- `reminder_hours` (INTEGER NOT NULL) - e.g. 18, 36, 48
- `created_at` (TEXT NOT NULL)

### 4. `complaints`
Central grievance records with sequential reference numbers.
- `id` (TEXT PRIMARY KEY) - UUID
- `reference_no` (TEXT UNIQUE NOT NULL) - e.g. `CMP-2026-000001`
- `sequence_number` (INTEGER UNIQUE NOT NULL) - Monotonic sequence
- `student_id` (TEXT NOT NULL REFERENCES profiles(id))
- `category` (TEXT NOT NULL)
- `title` (TEXT NOT NULL)
- `description` (TEXT NOT NULL)
- `location` (TEXT NOT NULL)
- `is_anonymous` (INTEGER NOT NULL DEFAULT 0)
- `priority` (TEXT NOT NULL DEFAULT 'Medium')
- `status` (TEXT NOT NULL DEFAULT 'Pending')
- `department_id` (TEXT REFERENCES departments(id))
- `assigned_officer_id` (TEXT REFERENCES profiles(id))
- `due_date` (TEXT NOT NULL)
- `resolved_at` (TEXT)
- `resolution_notes` (TEXT)
- `resolution_evidence_url` (TEXT)
- `created_at` (TEXT NOT NULL)
- `updated_at` (TEXT NOT NULL)

### 5. `complaint_status_history`
Immutable chronological audit log of all status transitions.
- `id` (TEXT PRIMARY KEY) - UUID
- `complaint_id` (TEXT NOT NULL REFERENCES complaints(id))
- `previous_status` (TEXT NOT NULL)
- `new_status` (TEXT NOT NULL)
- `changed_by_id` (TEXT NOT NULL)
- `changed_by_name` (TEXT NOT NULL)
- `changed_by_role` (TEXT NOT NULL)
- `reason` (TEXT)
- `created_at` (TEXT NOT NULL)

### 6. `complaint_assignments`
Records of manual departmental and personnel delegations.
- `id` (TEXT PRIMARY KEY) - UUID
- `complaint_id` (TEXT NOT NULL REFERENCES complaints(id))
- `department_id` (TEXT NOT NULL REFERENCES departments(id))
- `assigned_officer_id` (TEXT REFERENCES profiles(id))
- `assigned_by_id` (TEXT NOT NULL)
- `assigned_by_name` (TEXT NOT NULL)
- `notes` (TEXT)
- `created_at` (TEXT NOT NULL)

### 7. `complaint_attachments`
Evidence files uploaded by students or authorities.
- `id` (TEXT PRIMARY KEY) - UUID
- `complaint_id` (TEXT NOT NULL REFERENCES complaints(id))
- `file_name` (TEXT NOT NULL)
- `file_url` (TEXT NOT NULL)
- `file_size` (INTEGER NOT NULL)
- `mime_type` (TEXT NOT NULL)
- `uploaded_by_id` (TEXT NOT NULL)
- `is_resolution_evidence` (INTEGER NOT NULL DEFAULT 0)
- `created_at` (TEXT NOT NULL)

### 8. `complaint_messages`
Persistent two-way conversation between student and assigned authorities.
- `id` (TEXT PRIMARY KEY) - UUID
- `complaint_id` (TEXT NOT NULL REFERENCES complaints(id))
- `sender_id` (TEXT NOT NULL)
- `sender_name` (TEXT NOT NULL)
- `sender_role` (TEXT NOT NULL)
- `message` (TEXT NOT NULL)
- `is_internal` (INTEGER NOT NULL DEFAULT 0)
- `created_at` (TEXT NOT NULL)

### 9. `feedback`
Student resolution verification ratings and qualitative reviews.
- `id` (TEXT PRIMARY KEY) - UUID
- `complaint_id` (TEXT UNIQUE NOT NULL REFERENCES complaints(id))
- `student_id` (TEXT NOT NULL REFERENCES profiles(id))
- `rating` (INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5))
- `comment` (TEXT)
- `is_issue_resolved` (INTEGER NOT NULL DEFAULT 1)
- `created_at` (TEXT NOT NULL)

### 10. `audit_logs`
System-wide security event journal.
- `id` (TEXT PRIMARY KEY) - UUID
- `actor_id` (TEXT NOT NULL)
- `actor_name` (TEXT NOT NULL)
- `actor_role` (TEXT NOT NULL)
- `action` (TEXT NOT NULL)
- `entity_type` (TEXT NOT NULL)
- `entity_id` (TEXT NOT NULL)
- `metadata_json` (TEXT)
- `created_at` (TEXT NOT NULL)

### 11. `announcements` & `known_issues`
Campus bulletin broadcasts and known service interruption trackers.
- `announcements`: `id`, `title`, `description`, `priority`, `is_active`, `publication_date`, `expiry_date`, `created_by_id`, `created_at`
- `known_issues`: `id`, `title`, `category`, `location`, `description`, `status`, `estimated_resolution`, `updated_at`, `created_at`
- `related_complaints`: `id`, `known_issue_id`, `complaint_id`, `linked_by_id`, `created_at`

### 12. `escalations`
Supervisory escalation history.
- `id` (TEXT PRIMARY KEY)
- `complaint_id` (TEXT REFERENCES complaints(id))
- `from_role` (TEXT NOT NULL)
- `to_role` (TEXT NOT NULL)
- `reason` (TEXT NOT NULL)
- `escalated_by_id` (TEXT NOT NULL)
- `escalated_by_name` (TEXT NOT NULL)
- `status` (TEXT NOT NULL DEFAULT 'Active')
- `created_at` (TEXT NOT NULL)

---

## 2. PostgreSQL DDL Compatibility

All SQL statements in `server/db.ts` use standard ANSI SQL syntax compatible with PostgreSQL:
```sql
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no VARCHAR(20) UNIQUE NOT NULL,
  sequence_number SERIAL UNIQUE NOT NULL,
  student_id UUID NOT NULL REFERENCES profiles(id),
  category VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(200) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  department_id UUID REFERENCES departments(id),
  assigned_officer_id UUID REFERENCES profiles(id),
  due_date TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolution_evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
