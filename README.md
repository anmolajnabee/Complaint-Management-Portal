# SMART COLLEGE COMPLAINT SYSTEM
> **Tagline:** *"Your Voice. Our Responsibility."*

A full-stack, production-ready, role-based college grievance management system built with React, TypeScript, Express, Tailwind CSS, Lucide icons, Recharts, and a persistent relational database engine.

---

## 🌟 Highlights & Key Features

- **Full-Stack Architecture:** Express backend mounted with Vite in development and production build serving, running seamlessly on port 3000.
- **Relational Persistent Database:** Persistent SQLite WASM relational database (`data/complaints.sqlite`) with foreign keys, sequential reference generation (`CMP-YYYY-XXXXXX`), and ACID compliance.
- **Real Authentication & RBAC:** Secure password hashing with bcrypt, signed JWT authentication sessions, and five distinct user roles:
  1. `STUDENT`: File complaints, upload evidence, choose anonymous submission, track status, chat with officers, verify resolution, rate satisfaction (1-5 stars).
  2. `DEPARTMENT_OFFICER`: View assigned complaints, update progress, resolve with technical notes, upload resolution evidence, communicate with students.
  3. `DEPARTMENT_HEAD`: Department-wide visibility, manual officer delegation, overdue review, rejection & reopening management.
  4. `NODAL_OFFICER`: Cross-departmental oversight, supervisory escalation handling, institutional reports, notice publication.
  5. `SUPER_ADMIN`: User & role governance, department management, SLA threshold configuration, immutable security audit logs.
- **No AI Prohibition Compliant:** Strictly deterministic, rules-based logic. No AI chatbots, AI routing, or AI duplicate detection. Delegation is performed manually by authorized authorities.
- **Milestone Workflow:** `REPORT` → `REVIEW` → `ASSIGN` → `RESOLVE` → `VERIFY`.
- **Student Resolution Verification:** When marked resolved, students verify if the issue meets satisfaction. If unsatisfied, the complaint is reopened with a single click.
- **SLA & Escalation Engine:** Priority deadlines (High: 24h, Medium: 48h, Low: 72h) with countdowns, approaching deadline alerts, overdue flags, and tiered escalation (`Officer` → `Head` → `Nodal` → `Admin`).
- **Institutional Analytics:** Interactive Recharts charts for category distribution, status breakdown, department workloads, recurring problem locations, and CSV export.
- **Quick Demo Account Switcher:** Built-in demo accounts to allow immediate role evaluation with real database-authenticated sessions.

---

## 🚀 Quick Start & Development

### 1. Installation & Start
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run Test Suite
```bash
# Unit tests (business logic, SLA calculations, role transitions)
node --test src/utils/complaintLogic.test.ts

# Full 24-step end-to-end integration test with live database
node --test tests/e2e-workflow.test.ts
```

### 3. Build for Production
```bash
npm run build
npm start
```

---

## 👥 Seed Demo Credentials

| Role | Name | Email | Password |
|---|---|---|---|
| **Super Admin** | Dr. Rajesh Sharma | `admin@smartcollege.edu` | `Admin@123` |
| **Nodal Officer** | Prof. Sunita Rao | `nodal@smartcollege.edu` | `Nodal@123` |
| **Department Head (Hostel)** | Prof. K. Verma | `head.hostel@smartcollege.edu` | `Head@123` |
| **Department Officer (Hostel)** | Er. Amit Kumar | `officer.hostel@smartcollege.edu` | `Officer@123` |
| **Student A** | Alex Morgan | `student.alex@smartcollege.edu` | `Student@123` |
| **Student B** | Priya Patel | `student.priya@smartcollege.edu` | `Student@123` |

*Note: Students can also self-register at any time using the registration form.*
