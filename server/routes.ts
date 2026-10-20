import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  queryAll,
  queryOne,
  execute,
  getNextComplaintSequenceNumber,
} from './db.ts';
import {
  Role,
  ComplaintStatus,
  ComplaintPriority,
  isValidStatusTransition,
  formatComplaintReference,
  computeSlaDueDate,
  calculateSlaStatus,
  canUserViewComplaint,
  canUserAssign,
  canUserSetPriority,
} from '../src/utils/complaintLogic.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-college-complaint-system-secret-key-2026';
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, text, and doc files are allowed.'));
    }
  },
});

// Types
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  full_name: string;
  department_id?: string | null;
  roll_number?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Auth Middleware
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    // Verify user still exists in DB
    const user = queryOne<any>('SELECT id, email, role, full_name, department_id, roll_number FROM profiles WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token.' });
  }
}

// Require role middleware
export function requireRoles(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access forbidden for role ${req.user?.role || 'Guest'}. Required: ${roles.join(', ')}` });
    }
    next();
  };
}

// Helper to log audit events
export function logAudit(actor: AuthenticatedUser, action: string, entityType: string, entityId: string, metadata: any = {}) {
  const now = new Date().toISOString();
  execute(
    `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), actor.id, actor.full_name, actor.role, action, entityType, entityId, JSON.stringify(metadata), now]
  );
}

// Helper to create notifications
export function createNotification(userId: string, title: string, message: string, link: string, type: string) {
  const now = new Date().toISOString();
  execute(
    `INSERT INTO notifications (id, user_id, title, message, link, is_read, type, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [uuidv4(), userId, title, message, link, type, now]
  );
}

export function registerRoutes(app: express.Express) {
  // Serve uploaded files statically
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  // Register Student (Public registration assigns ONLY STUDENT role)
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { full_name, email, password, phone, roll_number } = req.body;

      if (!full_name || !email || !password) {
        return res.status(400).json({ error: 'Full name, email, and password are required.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      const existing = queryOne('SELECT id FROM profiles WHERE email = ?', [email.toLowerCase().trim()]);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);
      const id = uuidv4();
      const now = new Date().toISOString();

      // Enforce strict security: public self-registration is strictly STUDENT
      execute(
        `INSERT INTO profiles (id, full_name, email, password_hash, role, phone, roll_number, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'STUDENT', ?, ?, ?, ?)`,
        [id, full_name.trim(), email.toLowerCase().trim(), password_hash, phone || null, roll_number || null, now, now]
      );

      const user: AuthenticatedUser = {
        id,
        email: email.toLowerCase().trim(),
        role: 'STUDENT',
        full_name: full_name.trim(),
        roll_number: roll_number || null,
      };

      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

      // Audit log
      logAudit(user, 'USER_REGISTERED', 'USER', id, { email: user.email });

      return res.status(201).json({ token, user });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Failed to complete registration.' });
    }
  });

  // Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = queryOne<any>(
        `SELECT p.*, d.name as department_name, d.code as department_code
         FROM profiles p
         LEFT JOIN departments d ON p.department_id = d.id
         WHERE LOWER(p.email) = ?`,
        [email.toLowerCase().trim()]
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const match = bcrypt.compareSync(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const safeUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        department_id: user.department_id,
        roll_number: user.roll_number,
      };

      const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });

      logAudit(safeUser, 'USER_LOGIN', 'USER', user.id);

      return res.json({
        token,
        user: {
          ...safeUser,
          phone: user.phone,
          department_name: user.department_name,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Authentication failed.' });
    }
  });

  // Get current user profile
  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
    const user = queryOne<any>(
      `SELECT p.id, p.full_name, p.email, p.role, p.department_id, p.phone, p.roll_number, p.avatar_url, p.created_at,
              d.name as department_name, d.code as department_code
       FROM profiles p
       LEFT JOIN departments d ON p.department_id = d.id
       WHERE p.id = ?`,
      [req.user!.id]
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  });

  // Update profile
  app.post('/api/auth/profile', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { full_name, phone, roll_number } = req.body;
      const now = new Date().toISOString();

      execute(
        `UPDATE profiles SET full_name = ?, phone = ?, roll_number = ?, updated_at = ? WHERE id = ?`,
        [full_name || req.user!.full_name, phone || null, roll_number || null, now, req.user!.id]
      );

      logAudit(req.user!, 'PROFILE_UPDATED', 'USER', req.user!.id);
      return res.json({ message: 'Profile updated successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  app.get('/api/departments', (_req: Request, res: Response) => {
    const departments = queryAll('SELECT * FROM departments ORDER BY name ASC');
    return res.json({ departments });
  });

  // ==========================================
  // COMPLAINTS
  // ==========================================

  // List complaints with role-based isolation & search filters
  app.get('/api/complaints', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { status, category, priority, department_id, search, sort = 'newest' } = req.query as Record<string, string>;

      let sql = `
        SELECT c.*,
               d.name as department_name,
               d.code as department_code,
               p_officer.full_name as assigned_officer_name,
               p_student.full_name as student_name,
               p_student.email as student_email,
               p_student.roll_number as student_roll
        FROM complaints c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN profiles p_officer ON c.assigned_officer_id = p_officer.id
        LEFT JOIN profiles p_student ON c.student_id = p_student.id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Role scoping
      if (user.role === 'STUDENT') {
        sql += ` AND c.student_id = ?`;
        params.push(user.id);
      } else if (user.role === 'DEPARTMENT_OFFICER') {
        sql += ` AND (c.assigned_officer_id = ? OR (c.department_id = ? AND c.assigned_officer_id IS NULL))`;
        params.push(user.id, user.department_id || '');
      } else if (user.role === 'DEPARTMENT_HEAD') {
        if (user.department_id) {
          sql += ` AND (c.department_id = ? OR c.department_id IS NULL)`;
          params.push(user.department_id);
        }
      }
      // NODAL_OFFICER and SUPER_ADMIN see all complaints

      // Search
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        sql += ` AND (c.reference_no LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR c.location LIKE ?)`;
        params.push(term, term, term, term);
      }

      // Filters
      if (status) {
        sql += ` AND c.status = ?`;
        params.push(status);
      }
      if (category) {
        sql += ` AND c.category = ?`;
        params.push(category);
      }
      if (priority) {
        sql += ` AND c.priority = ?`;
        params.push(priority);
      }
      if (department_id) {
        sql += ` AND c.department_id = ?`;
        params.push(department_id);
      }

      // Order
      if (sort === 'oldest') {
        sql += ` ORDER BY c.created_at ASC`;
      } else if (sort === 'priority') {
        sql += ` ORDER BY CASE c.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END, c.created_at DESC`;
      } else if (sort === 'deadline') {
        sql += ` ORDER BY c.due_date ASC`;
      } else {
        sql += ` ORDER BY c.created_at DESC`;
      }

      const complaints = queryAll<any>(sql, params);

      // Anonymity filter: if complaint is anonymous and viewer is not Super Admin (or the student themselves)
      const sanitized = complaints.map(c => {
        const slaStatus = calculateSlaStatus(c.due_date, c.status, c.resolved_at);
        if (c.is_anonymous && user.role !== 'SUPER_ADMIN' && user.id !== c.student_id) {
          return {
            ...c,
            sla_status: slaStatus,
            student_name: 'Anonymous Student',
            student_email: null,
            student_roll: null,
            student_id: null,
          };
        }
        return {
          ...c,
          sla_status: slaStatus,
        };
      });

      return res.json({ complaints: sanitized });
    } catch (err: any) {
      console.error('Fetch complaints error:', err);
      return res.status(500).json({ error: 'Failed to fetch complaints.' });
    }
  });

  // Track complaint publicly by reference number
  app.get('/api/complaints/track/:ref', (req: Request, res: Response) => {
    try {
      const ref = req.params.ref.trim().toUpperCase();
      const complaint = queryOne<any>(
        `SELECT c.id, c.reference_no, c.category, c.title, c.location, c.status, c.priority, c.due_date, c.created_at, c.resolved_at,
                d.name as department_name
         FROM complaints c
         LEFT JOIN departments d ON c.department_id = d.id
         WHERE UPPER(c.reference_no) = ?`,
        [ref]
      );

      if (!complaint) {
        return res.status(404).json({ error: `Complaint with reference ${ref} not found.` });
      }

      const history = queryAll(
        `SELECT previous_status, new_status, changed_by_role, reason, created_at
         FROM complaint_status_history
         WHERE complaint_id = ?
         ORDER BY created_at ASC`,
        [complaint.id]
      );

      const slaStatus = calculateSlaStatus(complaint.due_date, complaint.status, complaint.resolved_at);

      return res.json({
        complaint: {
          ...complaint,
          sla_status: slaStatus,
          history,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Tracking failed.' });
    }
  });

  // Submit Complaint
  app.post('/api/complaints', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { category, title, description, location, is_anonymous, attachments = [] } = req.body;

      if (!category || !title || !description || !location) {
        return res.status(400).json({ error: 'Category, title, description, and location are required.' });
      }

      if (title.length < 5 || title.length > 200) {
        return res.status(400).json({ error: 'Title must be between 5 and 200 characters.' });
      }

      if (description.length < 15) {
        return res.status(400).json({ error: 'Description must be at least 15 characters long to provide sufficient detail.' });
      }

      const seq = getNextComplaintSequenceNumber();
      const currentYear = new Date().getFullYear();
      const reference_no = formatComplaintReference(currentYear, seq);
      const id = uuidv4();
      const now = new Date().toISOString();
      const initialPriority: ComplaintPriority = 'Medium';
      const due_date = computeSlaDueDate(now, initialPriority).toISOString();

      // Determine initial department association if matches known category, but leave unassigned for manual authority assignment
      let defaultDeptId = null;
      if (category === 'Hostel') defaultDeptId = 'dept-hostel';
      else if (category === 'Electricity') defaultDeptId = 'dept-electric';
      else if (category === 'Water' || category === 'Cleanliness') defaultDeptId = 'dept-water';
      else if (category === 'Civil/Maintenance' || category === 'Classroom') defaultDeptId = 'dept-civil';
      else if (category === 'IT/Internet' || category === 'Laboratory') defaultDeptId = 'dept-it';
      else if (category === 'Library') defaultDeptId = 'dept-library';
      else if (category === 'Canteen') defaultDeptId = 'dept-canteen';

      execute(
        `INSERT INTO complaints (
          id, reference_no, sequence_number, student_id, category, title, description, location,
          is_anonymous, priority, status, department_id, assigned_officer_id, due_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, NULL, ?, ?, ?)`,
        [
          id, reference_no, seq, user.id, category, title.trim(), description.trim(), location.trim(),
          is_anonymous ? 1 : 0, initialPriority, defaultDeptId, due_date, now, now
        ]
      );

      // Record initial history
      execute(
        `INSERT INTO complaint_status_history (id, complaint_id, previous_status, new_status, changed_by_id, changed_by_name, changed_by_role, reason, created_at)
         VALUES (?, ?, 'None', 'Pending', ?, ?, ?, 'Complaint registered in system.', ?)`,
        [uuidv4(), id, user.id, user.full_name, user.role, now]
      );

      // Handle attachments
      if (Array.isArray(attachments)) {
        for (const att of attachments) {
          execute(
            `INSERT INTO complaint_attachments (id, complaint_id, file_name, file_url, file_size, mime_type, uploaded_by_id, is_resolution_evidence, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            [uuidv4(), id, att.file_name, att.file_url, att.file_size || 0, att.mime_type || 'application/octet-stream', user.id, now]
          );
        }
      }

      // Student notification
      createNotification(
        user.id,
        'Complaint Submitted Successfully',
        `Your complaint "${title.slice(0, 40)}..." has been logged with reference ${reference_no}.`,
        `/complaints/${id}`,
        'COMPLAINT_SUBMITTED'
      );

      // Notify Super Admin & Nodal Officers
      const admins = queryAll<any>(`SELECT id FROM profiles WHERE role IN ('SUPER_ADMIN', 'NODAL_OFFICER')`);
      for (const admin of admins) {
        createNotification(
          admin.id,
          'New Complaint Received',
          `New ${category} complaint ${reference_no} waiting for manual assignment.`,
          `/complaints/${id}`,
          'NEW_COMPLAINT'
        );
      }

      logAudit(user, 'COMPLAINT_CREATED', 'COMPLAINT', id, { reference_no, category, priority: initialPriority });

      return res.status(201).json({
        message: 'Complaint submitted successfully.',
        id,
        reference_no,
      });
    } catch (err: any) {
      console.error('Submit complaint error:', err);
      return res.status(500).json({ error: 'Failed to submit complaint.' });
    }
  });

  // Get single complaint details
  app.get('/api/complaints/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const complaintId = req.params.id;

      const complaint = queryOne<any>(
        `SELECT c.*,
                d.name as department_name,
                d.code as department_code,
                p_officer.full_name as assigned_officer_name,
                p_officer.email as assigned_officer_email,
                p_student.full_name as student_name,
                p_student.email as student_email,
                p_student.roll_number as student_roll,
                p_student.phone as student_phone
         FROM complaints c
         LEFT JOIN departments d ON c.department_id = d.id
         LEFT JOIN profiles p_officer ON c.assigned_officer_id = p_officer.id
         LEFT JOIN profiles p_student ON c.student_id = p_student.id
         WHERE c.id = ?`,
        [complaintId]
      );

      if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found.' });
      }

      // Verify authorization
      if (!canUserViewComplaint(user, complaint)) {
        return res.status(403).json({ error: 'Access denied. You do not have permission to view this complaint.' });
      }

      const history = queryAll(
        `SELECT * FROM complaint_status_history WHERE complaint_id = ? ORDER BY created_at ASC`,
        [complaintId]
      );

      const assignments = queryAll(
        `SELECT a.*, d.name as department_name, p.full_name as assigned_officer_name
         FROM complaint_assignments a
         LEFT JOIN departments d ON a.department_id = d.id
         LEFT JOIN profiles p ON a.assigned_officer_id = p.id
         WHERE a.complaint_id = ?
         ORDER BY a.created_at ASC`,
        [complaintId]
      );

      const attachments = queryAll(
        `SELECT * FROM complaint_attachments WHERE complaint_id = ? ORDER BY created_at ASC`,
        [complaintId]
      );

      const messages = queryAll(
        `SELECT * FROM complaint_messages WHERE complaint_id = ? ORDER BY created_at ASC`,
        [complaintId]
      );

      const feedback = queryOne(
        `SELECT * FROM feedback WHERE complaint_id = ?`,
        [complaintId]
      );

      const escalations = queryAll(
        `SELECT * FROM escalations WHERE complaint_id = ? ORDER BY created_at ASC`,
        [complaintId]
      );

      const slaStatus = calculateSlaStatus(complaint.due_date, complaint.status, complaint.resolved_at);

      // Anonymity filter
      if (complaint.is_anonymous && user.role !== 'SUPER_ADMIN' && user.id !== complaint.student_id) {
        complaint.student_name = 'Anonymous Student';
        complaint.student_email = null;
        complaint.student_roll = null;
        complaint.student_phone = null;
        complaint.student_id = null;
      }

      return res.json({
        complaint: {
          ...complaint,
          sla_status: slaStatus,
        },
        history,
        assignments,
        attachments,
        messages,
        feedback,
        escalations,
      });
    } catch (err: any) {
      console.error('Fetch complaint detail error:', err);
      return res.status(500).json({ error: 'Failed to retrieve complaint.' });
    }
  });

  // Update Status
  app.post('/api/complaints/:id/status', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const complaintId = req.params.id;
      const { new_status, reason, resolution_notes, resolution_evidence_url } = req.body;

      const complaint = queryOne<any>('SELECT * FROM complaints WHERE id = ?', [complaintId]);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      const validation = isValidStatusTransition(complaint.status, new_status, user.role);
      if (!validation.allowed) {
        return res.status(403).json({ error: validation.reason || 'Invalid status transition.' });
      }

      const now = new Date().toISOString();
      const resolvedAt = new_status === 'Resolved' ? now : complaint.resolved_at;

      execute(
        `UPDATE complaints
         SET status = ?, resolved_at = ?, resolution_notes = COALESCE(?, resolution_notes), resolution_evidence_url = COALESCE(?, resolution_evidence_url), updated_at = ?
         WHERE id = ?`,
        [new_status, resolvedAt, resolution_notes || null, resolution_evidence_url || null, now, complaintId]
      );

      execute(
        `INSERT INTO complaint_status_history (id, complaint_id, previous_status, new_status, changed_by_id, changed_by_name, changed_by_role, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), complaintId, complaint.status, new_status, user.id, user.full_name, user.role, reason || resolution_notes || `Status changed to ${new_status}`, now]
      );

      // Student notification
      createNotification(
        complaint.student_id,
        `Complaint Status Updated: ${new_status}`,
        `Your complaint ${complaint.reference_no} status changed from "${complaint.status}" to "${new_status}".`,
        `/complaints/${complaintId}`,
        'STATUS_UPDATE'
      );

      logAudit(user, 'COMPLAINT_STATUS_UPDATED', 'COMPLAINT', complaintId, {
        reference_no: complaint.reference_no,
        previous_status: complaint.status,
        new_status,
      });

      return res.json({ message: `Status updated to ${new_status}.`, new_status });
    } catch (err: any) {
      console.error('Update status error:', err);
      return res.status(500).json({ error: 'Failed to update complaint status.' });
    }
  });

  // Manual Assignment (Department and/or Officer)
  app.post('/api/complaints/:id/assign', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      if (!canUserAssign(user.role)) {
        return res.status(403).json({ error: 'Only Department Heads, Nodal Officers, and Super Admins can assign complaints.' });
      }

      const complaintId = req.params.id;
      const { department_id, assigned_officer_id, notes } = req.body;

      const complaint = queryOne<any>('SELECT * FROM complaints WHERE id = ?', [complaintId]);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      const now = new Date().toISOString();

      execute(
        `UPDATE complaints
         SET department_id = COALESCE(?, department_id),
             assigned_officer_id = ?,
             updated_at = ?
         WHERE id = ?`,
        [department_id || null, assigned_officer_id || null, now, complaintId]
      );

      execute(
        `INSERT INTO complaint_assignments (id, complaint_id, department_id, assigned_officer_id, assigned_by_id, assigned_by_name, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), complaintId, department_id || complaint.department_id, assigned_officer_id || null, user.id, user.full_name, notes || 'Manual assignment updated', now]
      );

      if (assigned_officer_id) {
        createNotification(
          assigned_officer_id,
          'New Complaint Assigned',
          `You have been assigned to handle complaint ${complaint.reference_no}.`,
          `/complaints/${complaintId}`,
          'ASSIGNMENT'
        );
      }

      logAudit(user, 'COMPLAINT_ASSIGNED', 'COMPLAINT', complaintId, {
        reference_no: complaint.reference_no,
        department_id,
        assigned_officer_id,
      });

      return res.json({ message: 'Assignment updated successfully.' });
    } catch (err: any) {
      console.error('Assignment error:', err);
      return res.status(500).json({ error: 'Failed to assign complaint.' });
    }
  });

  // Priority Update
  app.post('/api/complaints/:id/priority', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      if (!canUserSetPriority(user.role)) {
        return res.status(403).json({ error: 'You do not have permission to change complaint priority.' });
      }

      const complaintId = req.params.id;
      const { priority } = req.body;

      if (!['Low', 'Medium', 'High'].includes(priority)) {
        return res.status(400).json({ error: 'Priority must be Low, Medium, or High.' });
      }

      const complaint = queryOne<any>('SELECT * FROM complaints WHERE id = ?', [complaintId]);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      const newDueDate = computeSlaDueDate(complaint.created_at, priority as ComplaintPriority).toISOString();
      const now = new Date().toISOString();

      execute(
        `UPDATE complaints SET priority = ?, due_date = ?, updated_at = ? WHERE id = ?`,
        [priority, newDueDate, now, complaintId]
      );

      logAudit(user, 'COMPLAINT_PRIORITY_UPDATED', 'COMPLAINT', complaintId, {
        previous_priority: complaint.priority,
        new_priority: priority,
      });

      return res.json({ message: `Priority updated to ${priority}.`, priority, due_date: newDueDate });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update priority.' });
    }
  });

  // Escalate Complaint
  app.post('/api/complaints/:id/escalate', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const complaintId = req.params.id;
      const { reason } = req.body;

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ error: 'Escalation reason is required.' });
      }

      const complaint = queryOne<any>('SELECT * FROM complaints WHERE id = ?', [complaintId]);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      // Workflow: Officer -> Head -> Nodal -> Super Admin
      let toRole: Role = 'SUPER_ADMIN';
      if (user.role === 'DEPARTMENT_OFFICER') toRole = 'DEPARTMENT_HEAD';
      else if (user.role === 'DEPARTMENT_HEAD') toRole = 'NODAL_OFFICER';
      else if (user.role === 'NODAL_OFFICER') toRole = 'SUPER_ADMIN';

      const now = new Date().toISOString();
      execute(
        `INSERT INTO escalations (id, complaint_id, from_role, to_role, reason, escalated_by_id, escalated_by_name, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
        [uuidv4(), complaintId, user.role, toRole, reason.trim(), user.id, user.full_name, now]
      );

      // Notify recipient role
      const targets = queryAll<any>(`SELECT id FROM profiles WHERE role = ?`, [toRole]);
      for (const t of targets) {
        createNotification(
          t.id,
          `Escalation: Complaint ${complaint.reference_no}`,
          `${user.full_name} (${user.role}) escalated complaint: "${reason.slice(0, 50)}..."`,
          `/complaints/${complaintId}`,
          'ESCALATION'
        );
      }

      logAudit(user, 'COMPLAINT_ESCALATED', 'COMPLAINT', complaintId, { from_role: user.role, to_role: toRole, reason });

      return res.json({ message: `Complaint escalated to ${toRole}.` });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to escalate complaint.' });
    }
  });

  // Messaging (Persistent complaint-specific communication)
  app.post('/api/complaints/:id/messages', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const complaintId = req.params.id;
      const { message, is_internal = false } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
      }

      const complaint = queryOne<any>('SELECT * FROM complaints WHERE id = ?', [complaintId]);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      if (!canUserViewComplaint(user, complaint)) {
        return res.status(403).json({ error: 'You are not authorized to message on this complaint.' });
      }

      const now = new Date().toISOString();
      const msgId = uuidv4();

      execute(
        `INSERT INTO complaint_messages (id, complaint_id, sender_id, sender_name, sender_role, message, is_internal, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [msgId, complaintId, user.id, user.full_name, user.role, message.trim(), is_internal ? 1 : 0, now]
      );

      // If sent by authority, notify student
      if (user.role !== 'STUDENT') {
        createNotification(
          complaint.student_id,
          `New Message on ${complaint.reference_no}`,
          `${user.full_name} sent: "${message.trim().slice(0, 60)}..."`,
          `/complaints/${complaintId}`,
          'NEW_MESSAGE'
        );
      } else {
        // If sent by student, notify assigned officer or department head
        if (complaint.assigned_officer_id) {
          createNotification(
            complaint.assigned_officer_id,
            `Student Reply on ${complaint.reference_no}`,
            `Student replied: "${message.trim().slice(0, 60)}..."`,
            `/complaints/${complaintId}`,
            'NEW_MESSAGE'
          );
        }
      }

      return res.status(201).json({
        message: 'Message sent.',
        entry: {
          id: msgId,
          complaint_id: complaintId,
          sender_id: user.id,
          sender_name: user.full_name,
          sender_role: user.role,
          message: message.trim(),
          is_internal: is_internal ? 1 : 0,
          created_at: now,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to send message.' });
    }
  });

  // Resolution Verification and Feedback
  app.post('/api/complaints/:id/verify', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const complaintId = req.params.id;
      const { is_issue_resolved, rating, comment, reopen_reason } = req.body;

      const complaint = queryOne<any>('SELECT * FROM complaints WHERE id = ?', [complaintId]);
      if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

      if (user.role === 'STUDENT' && user.id !== complaint.student_id) {
        return res.status(403).json({ error: 'Only the submitting student can verify or reopen this complaint.' });
      }

      const now = new Date().toISOString();

      if (is_issue_resolved) {
        // Issue is confirmed resolved! Record feedback
        if (!rating || rating < 1 || rating > 5) {
          return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
        }

        const existingFeedback = queryOne('SELECT id FROM feedback WHERE complaint_id = ?', [complaintId]);
        if (existingFeedback) {
          return res.status(409).json({ error: 'Feedback has already been submitted for this complaint.' });
        }

        execute(
          `INSERT INTO feedback (id, complaint_id, student_id, rating, comment, is_issue_resolved, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          [uuidv4(), complaintId, user.id, rating, comment || null, now]
        );

        logAudit(user, 'RESOLUTION_VERIFIED', 'COMPLAINT', complaintId, { rating, comment });
        return res.json({ message: 'Resolution verified and feedback saved. Thank you!' });
      } else {
        // Student rejected resolution -> Reopen complaint!
        const reason = reopen_reason || 'Student indicated issue is not resolved after inspection.';
        execute(
          `UPDATE complaints SET status = 'Reopened', updated_at = ? WHERE id = ?`,
          [now, complaintId]
        );

        execute(
          `INSERT INTO complaint_status_history (id, complaint_id, previous_status, new_status, changed_by_id, changed_by_name, changed_by_role, reason, created_at)
           VALUES (?, ?, 'Resolved', 'Reopened', ?, ?, ?, ?, ?)`,
          [uuidv4(), complaintId, user.id, user.full_name, user.role, reason, now]
        );

        // Notify assigned officer and department head
        if (complaint.assigned_officer_id) {
          createNotification(
            complaint.assigned_officer_id,
            `Complaint Reopened: ${complaint.reference_no}`,
            `Student reopened complaint: "${reason.slice(0, 60)}"`,
            `/complaints/${complaintId}`,
            'COMPLAINT_REOPENED'
          );
        }

        logAudit(user, 'COMPLAINT_REOPENED', 'COMPLAINT', complaintId, { reason });
        return res.json({ message: 'Complaint has been reopened.', status: 'Reopened' });
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      return res.status(500).json({ error: 'Failed to record resolution verification.' });
    }
  });

  // ==========================================
  // REAL FILE UPLOADS
  // ==========================================

  app.post('/api/upload', authenticateToken, upload.single('file'), (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      return res.json({
        file_name: req.file.originalname,
        file_url: fileUrl,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'File upload failed.' });
    }
  });

  app.post('/api/complaints/:id/attachments', authenticateToken, upload.single('file'), (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file attached.' });
      const complaintId = req.params.id;
      const isResolution = req.body.is_resolution_evidence === 'true' || req.body.is_resolution_evidence === true;

      const now = new Date().toISOString();
      const fileUrl = `/uploads/${req.file.filename}`;
      const attId = uuidv4();

      execute(
        `INSERT INTO complaint_attachments (id, complaint_id, file_name, file_url, file_size, mime_type, uploaded_by_id, is_resolution_evidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [attId, complaintId, req.file.originalname, fileUrl, req.file.size, req.file.mimetype, req.user!.id, isResolution ? 1 : 0, now]
      );

      return res.status(201).json({
        message: 'Attachment uploaded successfully.',
        attachment: {
          id: attId,
          file_name: req.file.originalname,
          file_url: fileUrl,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          is_resolution_evidence: isResolution ? 1 : 0,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to upload attachment.' });
    }
  });

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  app.get('/api/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
    const list = queryAll(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      [req.user!.id]
    );
    const unreadCount = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.user!.id]
    )?.count || 0;

    return res.json({ notifications: list, unreadCount });
  });

  app.put('/api/notifications/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
    execute(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [req.params.id, req.user!.id]);
    return res.json({ message: 'Notification marked as read.' });
  });

  app.put('/api/notifications/read-all', authenticateToken, (req: AuthRequest, res: Response) => {
    execute(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [req.user!.id]);
    return res.json({ message: 'All notifications marked as read.' });
  });

  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================

  app.get('/api/announcements', (_req: Request, res: Response) => {
    const announcements = queryAll(
      `SELECT a.*, p.full_name as created_by_name
       FROM announcements a
       LEFT JOIN profiles p ON a.created_by_id = p.id
       WHERE a.is_active = 1
       ORDER BY a.created_at DESC`
    );
    return res.json({ announcements });
  });

  app.post('/api/announcements', authenticateToken, requireRoles('SUPER_ADMIN', 'NODAL_OFFICER'), (req: AuthRequest, res: Response) => {
    const { title, description, priority = 'Normal', expiry_date } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description are required.' });

    const now = new Date().toISOString();
    const id = uuidv4();
    execute(
      `INSERT INTO announcements (id, title, description, priority, is_active, publication_date, expiry_date, created_by_id, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [id, title.trim(), description.trim(), priority, now.split('T')[0], expiry_date || null, req.user!.id, now]
    );

    logAudit(req.user!, 'ANNOUNCEMENT_CREATED', 'ANNOUNCEMENT', id, { title });
    return res.status(201).json({ message: 'Announcement published successfully.', id });
  });

  app.delete('/api/announcements/:id', authenticateToken, requireRoles('SUPER_ADMIN'), (req: AuthRequest, res: Response) => {
    execute('UPDATE announcements SET is_active = 0 WHERE id = ?', [req.params.id]);
    logAudit(req.user!, 'ANNOUNCEMENT_DELETED', 'ANNOUNCEMENT', req.params.id);
    return res.json({ message: 'Announcement archived.' });
  });

  // ==========================================
  // KNOWN ISSUES
  // ==========================================

  app.get('/api/known-issues', (_req: Request, res: Response) => {
    const issues = queryAll(`SELECT * FROM known_issues ORDER BY updated_at DESC`);
    return res.json({ issues });
  });

  app.post('/api/known-issues', authenticateToken, requireRoles('SUPER_ADMIN', 'NODAL_OFFICER', 'DEPARTMENT_HEAD'), (req: AuthRequest, res: Response) => {
    const { title, category, location, description, status = 'Identified', estimated_resolution } = req.body;
    if (!title || !category || !location || !description) {
      return res.status(400).json({ error: 'Title, category, location, and description are required.' });
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    execute(
      `INSERT INTO known_issues (id, title, category, location, description, status, estimated_resolution, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title.trim(), category, location.trim(), description.trim(), status, estimated_resolution || null, now, now]
    );

    logAudit(req.user!, 'KNOWN_ISSUE_CREATED', 'KNOWN_ISSUE', id, { title });
    return res.status(201).json({ message: 'Known issue registered.', id });
  });

  app.post('/api/known-issues/:id/link', authenticateToken, requireRoles('SUPER_ADMIN', 'NODAL_OFFICER', 'DEPARTMENT_HEAD', 'DEPARTMENT_OFFICER'), (req: AuthRequest, res: Response) => {
    const { complaint_id } = req.body;
    if (!complaint_id) return res.status(400).json({ error: 'complaint_id is required' });

    const now = new Date().toISOString();
    execute(
      `INSERT INTO related_complaints (id, known_issue_id, complaint_id, linked_by_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), req.params.id, complaint_id, req.user!.id, now]
    );

    return res.json({ message: 'Complaint linked to known issue.' });
  });

  // ==========================================
  // PUBLIC STATS (For landing page hero ticker)
  // ==========================================
  app.get('/api/public-stats', (_req: Request, res: Response) => {
    try {
      const total = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM complaints')?.count || 0;
      const resolved = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'")?.count || 0;
      const allOpen = queryAll<any>(`SELECT due_date, status, resolved_at FROM complaints`);
      let onTime = 0;
      let late = 0;
      for (const c of allOpen) {
        const sla = calculateSlaStatus(c.due_date, c.status, c.resolved_at);
        if (sla === 'Resolved Within SLA') onTime++;
        if (sla === 'Resolved After SLA') late++;
      }
      const totalRes = onTime + late;
      const slaCompliancePercent = totalRes > 0 ? Math.round((onTime / totalRes) * 100) : 100;
      const avgRatingResult = queryOne<{ avg_rating: number | null }>('SELECT AVG(rating) as avg_rating FROM feedback');
      const averageRating = avgRatingResult?.avg_rating ? Number(avgRatingResult.avg_rating.toFixed(1)) : 5.0;

      return res.json({
        summary: {
          total,
          resolved,
          slaCompliancePercent,
          averageRating,
        },
      });
    } catch {
      return res.json({
        summary: { total: 0, resolved: 0, slaCompliancePercent: 100, averageRating: 5.0 },
      });
    }
  });

  // ==========================================
  // ANALYTICS & REPORTS (Authenticated full analytics)
  // ==========================================

  app.get('/api/analytics', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      // Total complaints
      const total = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM complaints')?.count || 0;
      const pending = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM complaints WHERE status = 'Pending'")?.count || 0;
      const inProgress = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM complaints WHERE status = 'In Progress'")?.count || 0;
      const resolved = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'")?.count || 0;
      const rejected = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM complaints WHERE status = 'Rejected'")?.count || 0;
      const reopened = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM complaints WHERE status = 'Reopened'")?.count || 0;
      const highPriority = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM complaints WHERE priority = 'High'")?.count || 0;

      // By Category
      const byCategory = queryAll<{ category: string; count: number }>(
        `SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC`
      );

      // By Department
      const byDepartment = queryAll<{ department_name: string; count: number }>(
        `SELECT COALESCE(d.name, 'Unassigned') as department_name, COUNT(c.id) as count
         FROM complaints c
         LEFT JOIN departments d ON c.department_id = d.id
         GROUP BY c.department_id
         ORDER BY count DESC`
      );

      // By Priority
      const byPriority = queryAll<{ priority: string; count: number }>(
        `SELECT priority, COUNT(*) as count FROM complaints GROUP BY priority`
      );

      // By Status
      const byStatus = [
        { status: 'Pending', count: pending },
        { status: 'In Progress', count: inProgress },
        { status: 'Resolved', count: resolved },
        { status: 'Rejected', count: rejected },
        { status: 'Reopened', count: reopened },
      ];

      // SLA Compliance & Overdue calculation
      const allOpen = queryAll<any>(`SELECT due_date, status, resolved_at FROM complaints`);
      let overdueCount = 0;
      let onTimeResolutions = 0;
      let lateResolutions = 0;

      for (const c of allOpen) {
        const sla = calculateSlaStatus(c.due_date, c.status, c.resolved_at);
        if (sla === 'Overdue') overdueCount++;
        if (sla === 'Resolved Within SLA') onTimeResolutions++;
        if (sla === 'Resolved After SLA') lateResolutions++;
      }

      const totalResolved = onTimeResolutions + lateResolutions;
      const slaCompliancePercent = totalResolved > 0 ? Math.round((onTimeResolutions / totalResolved) * 100) : 100;

      // Recurring Problem Locations
      const topLocations = queryAll<{ location: string; count: number }>(
        `SELECT location, COUNT(*) as count FROM complaints GROUP BY location HAVING count > 0 ORDER BY count DESC LIMIT 6`
      );

      // Average feedback rating
      const avgRatingResult = queryOne<{ avg_rating: number | null }>(
        `SELECT AVG(rating) as avg_rating FROM feedback`
      );
      const averageRating = avgRatingResult?.avg_rating ? Number(avgRatingResult.avg_rating.toFixed(1)) : 5.0;

      return res.json({
        summary: {
          total,
          pending,
          inProgress,
          resolved,
          rejected,
          reopened,
          highPriority,
          overdue: overdueCount,
          slaCompliancePercent,
          averageRating,
        },
        byCategory,
        byDepartment,
        byPriority,
        byStatus,
        topLocations,
      });
    } catch (err: any) {
      console.error('Analytics error:', err);
      return res.status(500).json({ error: 'Failed to compute analytics.' });
    }
  });

  // Export CSV
  app.get('/api/reports/export-csv', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      let sql = `
        SELECT c.reference_no, c.category, c.title, c.location, c.priority, c.status,
               COALESCE(d.name, 'Unassigned') as department,
               c.created_at, c.due_date, c.resolved_at
        FROM complaints c
        LEFT JOIN departments d ON c.department_id = d.id
      `;
      const params: any[] = [];

      if (user.role === 'STUDENT') {
        sql += ` WHERE c.student_id = ?`;
        params.push(user.id);
      } else if (user.role === 'DEPARTMENT_OFFICER' || user.role === 'DEPARTMENT_HEAD') {
        if (user.department_id) {
          sql += ` WHERE c.department_id = ?`;
          params.push(user.department_id);
        }
      }

      sql += ` ORDER BY c.created_at DESC`;
      const rows = queryAll<any>(sql, params);

      // Build CSV
      const headers = ['Reference', 'Category', 'Title', 'Location', 'Priority', 'Status', 'Department', 'Created At', 'Due Date', 'Resolved At'];
      const csvLines = [headers.join(',')];

      for (const r of rows) {
        const line = [
          `"${r.reference_no}"`,
          `"${r.category}"`,
          `"${(r.title || '').replace(/"/g, '""')}"`,
          `"${(r.location || '').replace(/"/g, '""')}"`,
          `"${r.priority}"`,
          `"${r.status}"`,
          `"${r.department}"`,
          `"${r.created_at}"`,
          `"${r.due_date}"`,
          `"${r.resolved_at || 'N/A'}"`,
        ];
        csvLines.push(line.join(','));
      }

      const csvContent = csvLines.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=complaints-export-${Date.now()}.csv`);
      return res.send(csvContent);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to export CSV.' });
    }
  });

  // ==========================================
  // SUPER ADMIN & AUDIT
  // ==========================================

  // Users management
  app.get('/api/admin/users', authenticateToken, requireRoles('SUPER_ADMIN'), (_req: Request, res: Response) => {
    const users = queryAll(
      `SELECT p.id, p.full_name, p.email, p.role, p.department_id, p.phone, p.roll_number, p.created_at,
              d.name as department_name
       FROM profiles p
       LEFT JOIN departments d ON p.department_id = d.id
       ORDER BY p.created_at DESC`
    );
    return res.json({ users });
  });

  // Role update
  app.put('/api/admin/users/:id/role', authenticateToken, requireRoles('SUPER_ADMIN'), (req: AuthRequest, res: Response) => {
    const { role, department_id } = req.body;
    const targetUserId = req.params.id;

    const validRoles: Role[] = ['STUDENT', 'DEPARTMENT_OFFICER', 'DEPARTMENT_HEAD', 'NODAL_OFFICER', 'SUPER_ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const now = new Date().toISOString();
    execute(
      `UPDATE profiles SET role = ?, department_id = ?, updated_at = ? WHERE id = ?`,
      [role, department_id || null, now, targetUserId]
    );

    logAudit(req.user!, 'USER_ROLE_CHANGED', 'USER', targetUserId, { role, department_id });
    return res.json({ message: 'User role updated successfully.' });
  });

  // Audit Logs
  app.get('/api/admin/audit-logs', authenticateToken, requireRoles('SUPER_ADMIN', 'NODAL_OFFICER'), (req: AuthRequest, res: Response) => {
    const logs = queryAll(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`);
    return res.json({ logs });
  });

  // SLA Rules
  app.get('/api/sla-rules', (_req: Request, res: Response) => {
    const rules = queryAll(`SELECT * FROM sla_rules ORDER BY resolution_hours ASC`);
    return res.json({ rules });
  });

  app.put('/api/sla-rules/:id', authenticateToken, requireRoles('SUPER_ADMIN'), (req: AuthRequest, res: Response) => {
    const { resolution_hours, reminder_hours } = req.body;
    execute(
      `UPDATE sla_rules SET resolution_hours = ?, reminder_hours = ? WHERE id = ?`,
      [Number(resolution_hours), Number(reminder_hours), req.params.id]
    );
    logAudit(req.user!, 'SLA_RULE_UPDATED', 'SLA_RULE', req.params.id, { resolution_hours, reminder_hours });
    return res.json({ message: 'SLA rule updated.' });
  });

  // Officers list for assignment modal
  app.get('/api/officers', authenticateToken, requireRoles('DEPARTMENT_HEAD', 'NODAL_OFFICER', 'SUPER_ADMIN'), (req: AuthRequest, res: Response) => {
    const department_id = req.query.department_id as string;
    let sql = `SELECT id, full_name, email, department_id, role FROM profiles WHERE role IN ('DEPARTMENT_OFFICER', 'DEPARTMENT_HEAD')`;
    const params: any[] = [];
    if (department_id) {
      sql += ` AND department_id = ?`;
      params.push(department_id);
    }
    const officers = queryAll(sql, params);
    return res.json({ officers });
  });
}
