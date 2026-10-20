import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { computeSlaDueDate, formatComplaintReference } from '../src/utils/complaintLogic.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'complaints.sqlite');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
    initSchema(dbInstance);
    seedInitialData(dbInstance);
    saveDb();
  }

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// SQL query helpers
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(sql: string, params: any[] = []): void {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  saveDb();
}

function initSchema(db: Database): void {
  db.run(`
    -- Departments Table
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    -- Profiles / Users Table
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      department_id TEXT,
      phone TEXT,
      roll_number TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    -- SLA Rules Table
    CREATE TABLE IF NOT EXISTS sla_rules (
      id TEXT PRIMARY KEY,
      priority TEXT UNIQUE NOT NULL,
      resolution_hours INTEGER NOT NULL,
      reminder_hours INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Complaints Table
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      reference_no TEXT UNIQUE NOT NULL,
      sequence_number INTEGER UNIQUE NOT NULL,
      student_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Pending',
      department_id TEXT,
      assigned_officer_id TEXT,
      due_date TEXT NOT NULL,
      resolved_at TEXT,
      resolution_notes TEXT,
      resolution_evidence_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES profiles(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (assigned_officer_id) REFERENCES profiles(id)
    );

    -- Complaint Status History Table
    CREATE TABLE IF NOT EXISTS complaint_status_history (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      changed_by_id TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      changed_by_role TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    );

    -- Complaint Assignments Table
    CREATE TABLE IF NOT EXISTS complaint_assignments (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      assigned_officer_id TEXT,
      assigned_by_id TEXT NOT NULL,
      assigned_by_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    );

    -- Complaint Attachments Table
    CREATE TABLE IF NOT EXISTS complaint_attachments (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_by_id TEXT NOT NULL,
      is_resolution_evidence INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    );

    -- Complaint Messages Table
    CREATE TABLE IF NOT EXISTS complaint_messages (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    );

    -- Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES profiles(id)
    );

    -- Announcements Table
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Normal',
      is_active INTEGER NOT NULL DEFAULT 1,
      publication_date TEXT NOT NULL,
      expiry_date TEXT,
      created_by_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Known Issues Table
    CREATE TABLE IF NOT EXISTS known_issues (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Identified',
      estimated_resolution TEXT,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Related Complaints Table
    CREATE TABLE IF NOT EXISTS related_complaints (
      id TEXT PRIMARY KEY,
      known_issue_id TEXT NOT NULL,
      complaint_id TEXT NOT NULL,
      linked_by_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (known_issue_id) REFERENCES known_issues(id),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    );

    -- Feedback Table
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      complaint_id TEXT UNIQUE NOT NULL,
      student_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      is_issue_resolved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id),
      FOREIGN KEY (student_id) REFERENCES profiles(id)
    );

    -- Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );

    -- Escalations Table
    CREATE TABLE IF NOT EXISTS escalations (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      from_role TEXT NOT NULL,
      to_role TEXT NOT NULL,
      reason TEXT NOT NULL,
      escalated_by_id TEXT NOT NULL,
      escalated_by_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id)
    );
  `);
}

function seedInitialData(db: Database): void {
  const now = new Date().toISOString();

  // 1. SLA Rules
  db.run(`
    INSERT INTO sla_rules (id, priority, resolution_hours, reminder_hours, created_at) VALUES
    ('sla-1', 'High', 24, 18, ?),
    ('sla-2', 'Medium', 48, 36, ?),
    ('sla-3', 'Low', 72, 48, ?)
  `, [now, now, now]);

  // 2. Departments
  db.run(`
    INSERT INTO departments (id, code, name, description, created_at) VALUES
    ('dept-hostel', 'HOSTEL', 'Hostel Affairs', 'Hostel rooms, water geysers, cleanliness and accommodation', ?),
    ('dept-electric', 'ELECTRIC', 'Electrical & Power', 'Power supply, lighting, wiring, switches and lab equipment power', ?),
    ('dept-water', 'WATER', 'Water & Sanitation', 'Drinking water filtration, restrooms, drainage and plumbing', ?),
    ('dept-civil', 'CIVIL', 'Civil & Maintenance', 'Desks, doors, windows, paint, masonry and physical infrastructure', ?),
    ('dept-it', 'IT', 'IT & Network Infrastructure', 'Campus Wi-Fi, Ethernet, computer labs and college portals', ?),
    ('dept-library', 'LIBRARY', 'Library Services', 'Quiet zones, books, e-resource kiosks, and air conditioning', ?),
    ('dept-canteen', 'CANTEEN', 'Canteen & Food Quality', 'Hygiene standards, mess dining, cafeteria food quality and drinking water', ?),
    ('dept-academic', 'ACADEMIC', 'Academic Affairs', 'Lecture halls, audio-visual projectors and timetables', ?)
  `, [now, now, now, now, now, now, now, now]);

  // 3. User Profiles with bcrypt passwords
  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('Admin@123', salt);
  const nodalPass = bcrypt.hashSync('Nodal@123', salt);
  const headPass = bcrypt.hashSync('Head@123', salt);
  const officerPass = bcrypt.hashSync('Officer@123', salt);
  const studentPass = bcrypt.hashSync('Student@123', salt);

  db.run(`
    INSERT INTO profiles (id, full_name, email, password_hash, role, department_id, phone, roll_number, created_at, updated_at) VALUES
    ('usr-admin-1', 'Dr. Rajesh Sharma', 'admin@smartcollege.edu', ?, 'SUPER_ADMIN', NULL, '+91 98765 43210', 'FAC-001', ?, ?),
    ('usr-nodal-1', 'Prof. Sunita Rao', 'nodal@smartcollege.edu', ?, 'NODAL_OFFICER', NULL, '+91 98765 43211', 'FAC-014', ?, ?),
    ('usr-head-hostel', 'Prof. K. Verma (Hostel Warden)', 'head.hostel@smartcollege.edu', ?, 'DEPARTMENT_HEAD', 'dept-hostel', '+91 98765 43212', 'FAC-028', ?, ?),
    ('usr-officer-hostel', 'Er. Amit Kumar', 'officer.hostel@smartcollege.edu', ?, 'DEPARTMENT_OFFICER', 'dept-hostel', '+91 98765 43213', 'STAFF-105', ?, ?),
    ('usr-head-it', 'Dr. Srinivas Reddy (Head IT)', 'head.it@smartcollege.edu', ?, 'DEPARTMENT_HEAD', 'dept-it', '+91 98765 43214', 'FAC-035', ?, ?),
    ('usr-officer-it', 'Mr. Rohan Nair (Network Admin)', 'officer.it@smartcollege.edu', ?, 'DEPARTMENT_OFFICER', 'dept-it', '+91 98765 43215', 'STAFF-112', ?, ?),
    ('usr-student-alex', 'Alex Morgan', 'student.alex@smartcollege.edu', ?, 'STUDENT', NULL, '+91 98765 88990', '2024-CSE-042', ?, ?),
    ('usr-student-priya', 'Priya Patel', 'student.priya@smartcollege.edu', ?, 'STUDENT', NULL, '+91 98765 88991', '2024-CSE-098', ?, ?)
  `, [
    adminPass, now, now,
    nodalPass, now, now,
    headPass, now, now,
    officerPass, now, now,
    headPass, now, now,
    officerPass, now, now,
    studentPass, now, now,
    studentPass, now, now,
  ]);

  // 4. Seed Seed Complaints (Real persistent data with reference format CMP-2026-000001, CMP-2026-000002, etc.)
  const due1 = computeSlaDueDate(now, 'High').toISOString();
  const due2 = computeSlaDueDate(now, 'Medium').toISOString();
  const due3 = computeSlaDueDate(now, 'Low').toISOString();

  db.run(`
    INSERT INTO complaints (
      id, reference_no, sequence_number, student_id, category, title, description, location,
      is_anonymous, priority, status, department_id, assigned_officer_id, due_date, created_at, updated_at
    ) VALUES
    ('cmp-seed-1', 'CMP-2026-000001', 1, 'usr-student-alex', 'Hostel', 'Geyser not heating in Block B 3rd Floor Washroom', 'Water geyser trips the circuit breaker whenever turned on. Over 20 students in Block B are without hot water during morning hours.', 'Hostel Block B, 3rd Floor East Wing', 0, 'High', 'In Progress', 'dept-hostel', 'usr-officer-hostel', ?, ?, ?),
    ('cmp-seed-2', 'CMP-2026-000002', 2, 'usr-student-alex', 'IT/Internet', 'Campus Wi-Fi connectivity drop in CS Lab 3', 'Frequent disconnects and DNS resolution timeouts while connecting to the student portal in CS Computer Lab 3.', 'Main Academic Block, 2nd Floor, Lab 3', 0, 'Medium', 'Pending', 'dept-it', NULL, ?, ?, ?),
    ('cmp-seed-3', 'CMP-2026-000003', 3, 'usr-student-priya', 'Cleanliness', 'Water cooler filter overdue for replacement in Central Library', 'Drinking water cooler on 1st floor shows red filter warning LED and taste is metallic.', 'Central Library, 1st Floor Stacks', 1, 'Low', 'Resolved', 'dept-water', NULL, ?, ?, ?)
  `, [due1, now, now, due2, now, now, due3, now, now]);

  // Set resolved details for cmp-seed-3
  db.run(`
    UPDATE complaints SET resolved_at = ?, resolution_notes = 'Water cooler filter and ultraviolet unit replaced with certified RO cartridge. Water tested and certified pure.' WHERE id = 'cmp-seed-3'
  `, [now]);

  // 5. Status History
  db.run(`
    INSERT INTO complaint_status_history (id, complaint_id, previous_status, new_status, changed_by_id, changed_by_name, changed_by_role, reason, created_at) VALUES
    ('hist-1', 'cmp-seed-1', 'Pending', 'In Progress', 'usr-officer-hostel', 'Er. Amit Kumar', 'DEPARTMENT_OFFICER', 'Electrician dispatched with replacement circuit breaker and heating coil.', ?),
    ('hist-2', 'cmp-seed-3', 'Pending', 'In Progress', 'usr-head-hostel', 'Prof. K. Verma', 'DEPARTMENT_HEAD', 'Sanitation technician assigned.', ?),
    ('hist-3', 'cmp-seed-3', 'In Progress', 'Resolved', 'usr-officer-hostel', 'Er. Amit Kumar', 'DEPARTMENT_OFFICER', 'Replacement completed and verified.', ?)
  `, [now, now, now]);

  // 6. Complaint Assignment
  db.run(`
    INSERT INTO complaint_assignments (id, complaint_id, department_id, assigned_officer_id, assigned_by_id, assigned_by_name, notes, created_at) VALUES
    ('asgn-1', 'cmp-seed-1', 'dept-hostel', 'usr-officer-hostel', 'usr-head-hostel', 'Prof. K. Verma (Hostel Warden)', 'Assigned to Senior Hostel Electrical Officer for immediate repair.', ?)
  `, [now]);

  // 7. Seed Messages
  db.run(`
    INSERT INTO complaint_messages (id, complaint_id, sender_id, sender_name, sender_role, message, is_internal, created_at) VALUES
    ('msg-1', 'cmp-seed-1', 'usr-officer-hostel', 'Er. Amit Kumar (Hostel Officer)', 'DEPARTMENT_OFFICER', 'Hello Alex, our technician will visit Block B between 2:00 PM and 4:00 PM today to inspect the geyser.', 0, ?),
    ('msg-2', 'cmp-seed-1', 'usr-student-alex', 'Alex Morgan', 'STUDENT', 'Thank you officer, I will be in room B-304 if you need access to the panel.', 0, ?)
  `, [now, now]);

  // 8. Seed Feedback for resolved complaint
  db.run(`
    INSERT INTO feedback (id, complaint_id, student_id, rating, comment, is_issue_resolved, created_at) VALUES
    ('fb-1', 'cmp-seed-3', 'usr-student-priya', 5, 'Water filter was changed swiftly. Very satisfied with the quick turnaround!', 1, ?)
  `, [now]);

  // 9. Seed Announcements
  db.run(`
    INSERT INTO announcements (id, title, description, priority, is_active, publication_date, created_by_id, created_at) VALUES
    ('ann-1', 'Scheduled Power Grid Maintenance - West Campus', 'Maintenance of main electrical transformers will take place on Saturday from 6:00 AM to 9:00 AM. Backup generators will supply essential hostels.', 'High', 1, '2026-10-21', 'usr-admin-1', ?),
    ('ann-2', 'New Water Filter Stations Commissioned', 'Four new multi-stage RO water purification kiosks are now active across Science Block and Library.', 'Normal', 1, '2026-10-18', 'usr-admin-1', ?)
  `, [now, now]);

  // 10. Seed Known Issues
  db.run(`
    INSERT INTO known_issues (id, title, category, location, description, status, estimated_resolution, updated_at, created_at) VALUES
    ('ki-1', 'Campus Core Fiber Switch Upgrade', 'IT/Internet', 'Central Server Room & All Blocks', 'Core backbone upgrade causing intermittent 30-second link renegotiations in academic wings.', 'In Progress', 'Tomorrow, 6:00 PM', ?, ?)
  `, [now, now]);

  // 11. Initial Audit Log
  db.run(`
    INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, metadata_json, created_at) VALUES
    ('audit-1', 'usr-admin-1', 'Dr. Rajesh Sharma', 'SUPER_ADMIN', 'SYSTEM_INITIALIZATION', 'SYSTEM', 'ROOT', '{"version":"1.0.0","status":"initialized"}', ?)
  `, [now]);
}

export function getNextComplaintSequenceNumber(): number {
  const result = queryOne<{ max_seq: number | null }>(`SELECT MAX(sequence_number) as max_seq FROM complaints`);
  return (result?.max_seq || 0) + 1;
}
