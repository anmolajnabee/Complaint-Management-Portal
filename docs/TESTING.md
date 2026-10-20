# TESTING STRATEGY: SMART COLLEGE COMPLAINT SYSTEM

## 1. Overview

Testing follows the Ultra Mode guidelines:
1. Fast-feedback pure logic unit tests decoupled from UI (`src/utils/complaintLogic.test.ts`).
2. Live database 24-step end-to-end integration tests (`tests/e2e-workflow.test.ts`).
3. Automated visual verification via Playwright CLI.

---

## 2. Running Automated Tests

```bash
# 1. Run unit tests
node --test src/utils/complaintLogic.test.ts

# 2. Run the 24-step end-to-end integration workflow
node --test tests/e2e-workflow.test.ts

# 3. Run all tests together
npm test
```

---

## 3. End-to-End Test Plan

The integration test in `tests/e2e-workflow.test.ts` executes the following sequence:
1. Registers Student A with email `student.test.<timestamp>@smartcollege.edu`.
2. Authenticates Student A with password `Password@123`.
3. Submits a real complaint with location, title, and description.
4. Attaches a file attachment to the complaint.
5. Verifies complaint is saved with initial status `'Pending'`.
6. Records the sequential reference number (e.g. `CMP-2026-000004`).
7. Logs in as Department Head (Hostel Affairs).
8. Queries the complaint record from the authority queue.
9. Manually assigns the department (`dept-hostel`).
10. Manually assigns the designated officer (`usr-officer-hostel`).
11. Updates priority to `'High'` and verifies SLA due date recalculation.
12. Advances status to `'In Progress'`.
13. Posts an official message to the student.
14. Adds technical resolution notes.
15. Moves complaint to `'Resolved'`.
16. Logs back in as Student A.
17. Confirms status persistence across sessions.
18. Reads the authority's message in the conversation thread.
19. Submits student resolution verification ("Yes, Issue Resolved").
20. Records a 5-star rating and written review.
21. Verifies database records, feedback entry, and chronological status history.
22. Registers an unrelated Student B.
23. Attempts to access Student A's complaint record using Student B's token.
24. Confirms that access is rejected with `HTTP 403 Forbidden`.
