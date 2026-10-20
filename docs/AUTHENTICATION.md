# AUTHENTICATION & SESSION MANAGEMENT: SMART COLLEGE COMPLAINT SYSTEM

## 1. Authentication Strategy

The system enforces **real authentication** with zero fake or simulated logins. 

1. **Password Hashing:**
   - Evaluated with pure JavaScript `bcryptjs` using 10 rounds of salt (`bcrypt.genSaltSync(10)`).
   - Plaintext passwords are never stored in the database or written to logs.
2. **Session Tokens:**
   - Stateless signed JSON Web Tokens (JWT) using HMAC-SHA256.
   - Tokens contain user ID, email, role, and full name.
   - Default validity: 7 days.
3. **Public Self-Registration Security:**
   - Public self-registration through `/api/auth/register` assigns **strictly** the `STUDENT` role.
   - Privilege escalation via registration payload injection is blocked on the server.
   - Administrative and officer roles can only be granted by Super Admins through the `/api/admin/users/:id/role` endpoint.

---

## 2. Protected Route Middleware

The Express server gates all authenticated routes with `authenticateToken`:
```ts
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    const user = queryOne('SELECT id, email, role, full_name, department_id FROM profiles WHERE id = ?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User account not found.' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token.' });
  }
}
```

Role enforcement is performed via `requireRoles(...roles: Role[])`:
```ts
app.get('/api/admin/users', authenticateToken, requireRoles('SUPER_ADMIN'), ...)
```

---

## 3. Seed Accounts for Evaluation

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@smartcollege.edu` | `Admin@123` |
| Nodal Officer | `nodal@smartcollege.edu` | `Nodal@123` |
| Department Head (Hostel) | `head.hostel@smartcollege.edu` | `Head@123` |
| Department Officer (Hostel) | `officer.hostel@smartcollege.edu` | `Officer@123` |
| Student A | `student.alex@smartcollege.edu` | `Student@123` |
| Student B | `student.priya@smartcollege.edu` | `Student@123` |
