# ARCHITECTURE: SMART COLLEGE COMPLAINT SYSTEM

## 1. System Overview

The **Smart College Complaint System** is an enterprise-grade, full-stack web application designed for collegiate grievance management. It decouples client rendering from server-authoritative persistence and business rules, ensuring that authorization, data isolation, and state machine transitions are strictly verified on the backend.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (React)                        │
│  - Tailwind CSS + Lucide Icons + Recharts Analytics         │
│  - AuthContext (JWT Storage & Role Management)              │
│  - NotificationContext (Live Unread Polling)                │
│  - Role Views: Student, Officer, Head, Nodal, Admin         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON API + FormData
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server (Node.js / Express)                │
│  - JWT Middleware (authenticateToken)                       │
│  - Role Middleware (requireRoles)                           │
│  - Static Storage & Multer File Uploads (/uploads)          │
│  - State Machine Transition Validator                       │
│  - SLA Computation & Reminder Engine                        │
│  - Audit Logging Middleware                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Queries & Transactions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Database (Relational Engine)                │
│  - Persistent SQLite WASM File Store (data/complaints.sqlite)│
│  - 15 Relational Tables with Foreign Key Constraints        │
│  - Monotonic Sequential References (CMP-YYYY-XXXXXX)        │
│  - Full SQL Migrations & PostgreSQL Schema Compatibility    │
└─────────────────────────────────────────────────────────────┘
```

## 2. Directory Structure

```
├── data/
│   └── complaints.sqlite          # Persistent relational database file
├── docs/
│   ├── ARCHITECTURE.md            # System architecture & component design
│   ├── DATABASE.md                # Schema definitions, relational diagrams
│   ├── AUTHENTICATION.md          # Session lifecycle, JWT, bcrypt hashing
│   ├── SECURITY.md                # RBAC, privacy filtering, isolation
│   ├── TESTING.md                 # Test suite guides & test cases
│   └── DEPLOYMENT.md              # Production container & hosting setup
├── public/                        # Static public assets
├── server/
│   ├── db.ts                      # Database engine, schema setup & seeding
│   └── routes.ts                  # Express REST controllers & middleware
├── src/
│   ├── components/
│   │   ├── auth/                  # AuthModal (Sign In & Register)
│   │   ├── common/                # Navbar, Modal, Badges, Alert, EmptyState
│   │   └── complaints/            # DetailModal, FormModal, AssignModal, EscalateModal, Tracker
│   ├── context/
│   │   ├── AuthContext.tsx        # Authentication & Demo Role Switcher
│   │   └── NotificationContext.tsx# Live notification polling
│   ├── pages/
│   │   ├── AdminPage.tsx          # User governance, audit logs, SLA rules
│   │   ├── AnalyticsPage.tsx      # Recharts visualizations & CSV export
│   │   ├── AnnouncementsPage.tsx  # Campus maintenance notices
│   │   ├── AuthorityDashboard.tsx # Command desk for Officer, Head, Nodal, Admin
│   │   ├── KnownIssuesPage.tsx    # Campus issue registry & manual correlation
│   │   ├── LandingPage.tsx        # Public hero, workflow, live metrics ticker
│   │   └── StudentDashboard.tsx   # Student queue, filing, status tracking
│   ├── services/
│   │   └── api.ts                 # Typed fetch client
│   ├── types/
│   │   └── index.ts               # Domain models and TypeScript contracts
│   ├── utils/
│   │   ├── complaintLogic.ts      # Pure business logic & state machine
│   │   └── complaintLogic.test.ts # Fast logic unit tests
│   ├── App.tsx                    # Top-level application orchestrator
│   ├── index.css                  # Tailwind styles
│   └── main.tsx                   # React entry point
├── tests/
│   └── e2e-workflow.test.ts       # 24-step end-to-end integration test
├── uploads/                       # Secure file attachment storage
├── server.ts                      # Express + Vite server entry point
└── metadata.json                  # Application metadata
```

## 3. Workflow State Machine

```
               ┌───────────────────────┐
               │        Pending        │
               └───────────┬───────────┘
                           │
             ┌─────────────┴─────────────┐
             │ (Authorized Assign/Start) │ (Department Head / Admin Reject)
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│       In Progress       │ │        Rejected         │
└────────────┬────────────┘ └─────────────────────────┘
             │ (Work Complete & Notes Logged)
             ▼
┌─────────────────────────┐
│        Resolved         │
└────────────┬────────────┘
             │
             ├──────────────────────────┐
             │ ("Yes, Issue Resolved")  │ ("No, Reopen Complaint")
             ▼                          ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│     Feedback & 5★       │ │        Reopened         │
│     (Ticket Closed)     │ └───────────┬─────────────┘
└─────────────────────────┘             │ (Officer Resumes)
                                        ▼
                            ┌─────────────────────────┐
                            │       In Progress       │
                            └─────────────────────────┘
```
