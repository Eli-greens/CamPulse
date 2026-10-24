# CamPulse 🎓

> **A University Student Complaint & Feedback Platform**  
> Live URL: [https://campulse-pi.vercel.app/](https://campulse-pi.vercel.app/)

CamPulse enables university students to voice concerns, report campus issues, and track resolutions with complete transparency, accountability, and department-level oversight.

---

## 🏛️ Institution Configuration

- **Target University**: Obafemi Awolowo University (OAU), Ile-Ife
- **Allowed Student Email Domain**: `@student.oauife.edu.ng`
- **Verification Rule**: Students must verify their official university email with a 6-digit verification code upon registration.

---

## ✨ Features & Completed Phases

### Phase 1 — Trust, Verification & Accessible Foundation
1. **Truth in Metrics**: Hardcoded vanity metrics have been removed. The live impact highlights strip only appears dynamically once at least **20 real tickets** exist in the system, computing real counts and resolution rates.
2. **"How It Works" Section**: Clearly illustrates the 3-step lifecycle:
   - **Step 1: Submit** — File your complaint or feedback anonymously or with your student ID in under 2 minutes.
   - **Step 2: Track** — Follow live status updates, department assignments, and official staff responses on your dashboard.
   - **Step 3: Resolved** — Get your issue officially fixed by university staff and rate your resolution satisfaction.
3. **Modal-Only Authentication**: Clean, isolated modal dialog accessible via the **"Register / Sign In"** navigation button. Completely decoupled from page flow with background scrolling lock and keyboard accessibility (`Escape`, tab trapping).
4. **Interactive Sample Ticket Preview**: When first-time students visit an empty dashboard, they are shown a clearly labeled `[EXAMPLE]` ticket card so they understand the tracking interface immediately, paired with a prominent **Submit Your First Complaint** button.
5. **University Email Domain Restriction & Verification**:
   - Only emails ending in `@student.oauife.edu.ng` are permitted to register.
   - 6-digit email verification code flow (Demo testing code: `482910`).
6. **Accessibility & Responsive Precision (WCAG AA)**:
   - Fully responsive down to **360px** compact mobile devices.
   - Accessible `<label>` associations, inline error feedback (`role="alert"`), input focus rings, and touch-target minimums.
   - Form button loading spinners and async state feedback.

### Phase 2 — Core Ticket Features
7. **Anonymous Submission Toggle**: Students can toggle "Submit Anonymously" on any complaint. Department staff only see `"Anonymous Student"`. Student identity is logged with encrypted access reserved strictly for super-administrators for abuse prevention and safety audits.
8. **Attachments Support (Up to 3 Files, Max 5MB Each)**: Drag-and-drop or click file dropzone supporting image formats (JPG, PNG, WEBP) and PDF documents. Includes file size validation, thumbnail previews, remove controls, and an image lightbox modal.
9. **University Location Picker**: Comprehensive picker covering OAU campus zones (Student Hostels: Awolowo, Fajuyi, Angola, Moremi, Mozambique, Alumni, ETF, Akintola; Academic Faculties: Science, Tech, Administration, Arts, Law, Social Sciences, Agriculture, Pharmacy, Health Sciences, EDM; and Campus Facilities: Library, Senate, Works, Health Centre, SUB, Sports Complex) plus free-text field for specific block/room details.
10. **Dedicated Ticket Detail Page (`ticket.html`) with Lifecycle Timeline**: Direct URL routing (`ticket.html?id=CP-2026-XXXX` or `ticket.html?demo=sample`) featuring a connected vertical timeline: `Submitted` → `Assigned` (with department SLA) → `In Progress` → `Resolved/Closed` with timestamps and actors.
11. **Two-Way Comments Thread & 7-Day Reopen**: Interactive communication thread between student and university officers with distinct staff verification badges. If an issue is marked resolved, students can reopen it within **7 days** with an explanatory note if the problem persists.
12. **Satisfaction Rating Widget (1–5 Stars)**: Interactive 5-star rating widget with optional feedback comment displayed when tickets are resolved, dynamically computing institutional satisfaction rates.
13. **Standard Readable Ticket IDs**: Sequential, readable ticket numbers formatted as `CP-YYYY-XXXX` (e.g. `CP-2026-0042`).

---

## 🗄️ Supabase Backend & Database Setup

CamPulse features a database abstraction layer (`supabase-client.js`) that operates in a resilient hybrid mode: connecting to Supabase when configured, and falling back gracefully to an enhanced local storage repository when working offline or in static preview.

### 1. Database Schema Migration
Run the SQL script located in [`supabase/schema.sql`](file:///c:/Users/HP/OneDrive/CamPulse/supabase/schema.sql) in your Supabase SQL Editor. This script creates:
- `profiles` table (linked to Supabase Auth with student, staff, dept_admin, and super_admin roles)
- `departments` table with OAU SLA mapping (24h urgent / 72h standard)
- `tickets` table with Row-Level Security (RLS)
- `ticket_attachments` table & `ticket-attachments` Storage Bucket
- `ticket_comments` table
- `ticket_upvotes` table
- `notifications` table

### 2. Configure Environment Variables in Vercel
In your Vercel Project Settings under **Environment Variables**, add:
- `CAMPULSE_SUPABASE_URL`: Your Supabase Project URL (`https://xyzcompany.supabase.co`)
- `CAMPULSE_SUPABASE_ANON_KEY`: Your Supabase Project Anon Public Key

---

## 🚀 Local Development Setup

No build tools or heavy node dependencies required for static preview.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Eli-greens/CamPulse.git
   cd CamPulse
   ```

2. **Serve locally**:
   Using Python:
   ```bash
   python -m http.server 8080
   ```
   Or using Node's `serve`:
   ```bash
   npx serve .
   ```

3. **Open in browser**:
   Navigate to `http://localhost:8080/index.html`.
   Preview the interactive sample ticket at `http://localhost:8080/ticket.html?demo=sample`.

---

## ☁️ Deployment on Vercel

CamPulse is pre-configured for static deployment on Vercel:
1. Connect the GitHub repository to [Vercel](https://vercel.com).
2. Framework Preset: **Other** (Static HTML/CSS/JS).
3. Root Directory: `./`
4. Build Command: *None*
5. Output Directory: *None*
6. Deploy! Every commit to `main` triggers an automatic production build.

---

### Phase 3 — Community Features
14. **Public Issue Board (`issues.html`)**: Browse anonymized campus complaints (no student IDs or names; sensitive categories like Safety are kept private by default). Filter by category, location zone, and status; sort by highest upvoted or newest.
15. **"Me Too" Upvotes**: Single-click student upvotes with optimistic count synchronization across all views to mobilize community priority.
16. **Live Duplicate Detection**: As the student types their complaint subject and description, open matching tickets are searched in real-time, inviting the user to upvote existing issues rather than fragmenting complaints.
17. **Keyword-Based Category Auto-Suggestion**: Suggests the optimal category (Facilities, Academic, Welfare, Safety, Health, etc.) in real-time based on complaint text analysis.
18. **Landing Page "Trending Issues"**: Live preview cards displaying top-voted open campus issues on the homepage.

### Phase 4 — Notifications & Preferences
19. **Multi-Channel Notification Dispatcher**: Pluggable notification service abstraction (`supabase-client.js`) handling in-app alerts, university email dispatches, and WhatsApp/SMS integration hooks.
20. **In-App Notification Center**: Bell icon with unread count badge, real-time trigger updates, and interactive dropdown popover with direct ticket navigation and "Mark all read" controls.
21. **User Notification Preferences**: Modal allowing students and staff to configure enabled notification channels and event triggers (status changes, staff comments, SLA warnings).

### Phase 5 — Department Admin & Staff Console (`admin.html`)
22. **Role-Based Access Control**:
    - **Super Admin**: Full institutional audit access, including encrypted submitter matriculation info on anonymous reports for safety investigations.
    - **Department Admin**: Scoped to department queue (Works, Student Affairs, ICT, Health, Security, Academic Affairs) with staff assignment permissions.
    - **Staff / Technician**: Operational access with status transition capabilities.
23. **Department Auto-Routing**: Automatic routing based on complaint category (`Facilities` &rarr; Works, `Academic` &rarr; Academic Affairs, `Welfare` &rarr; Student Affairs, `Health` &rarr; Medical Centre, `Safety` &rarr; Security Unit).
24. **Interactive Queue & Bulk Actions**: Sortable, filterable queue with bulk status updates and ticket inspector drawer.
25. **24h/72h SLA Timers**: Visual countdown timers (Green on-time, Yellow warning <=12h, Red pulsing overdue) enforcing university accountability.
26. **Private Internal Notes**: Dedicated technician work logs and supervisor notes isolated completely from student view.
27. **Analytics Dashboard & CSV Export**: Real-time breakdown of complaints by category, location, and department, tracking resolution metrics, satisfaction scores, and one-click CSV export.
28. **Safety Moderation & Rate Limiting**: Flags and suppresses abusive complaints while enforcing a 5-ticket/hour submission rate limit per student.

### Phase 6 — Polish & Production Readiness
29. **Unified Design System**: Semantic tokens for spacing, typography, colors, status badges, and glassmorphic elevations across all pages.
30. **Persistent Dark Mode**: Seamless theme switcher (`[data-theme="dark"]`) across all headers with system preference detection and localStorage persistence.
31. **4-Column Responsive Footer & Legal Modals**: Comprehensive footer with interactive modals for About CamPulse, Privacy & Anonymity Policy, Terms of Service, and Contact & Emergency Support.
32. **Skeleton Loaders & Toast Feedback**: High-performance shimmer skeletons during data fetch and accessible toast alerts for all state transitions.
33. **Security & Row-Level Security**: Server-side validation schema, sanitized inputs, and PostgreSQL RLS policies in [`supabase/schema.sql`](supabase/schema.sql).
34. **SEO & Sharing**: Complete Open Graph metadata, Twitter summary cards, responsive favicons, and dedicated 404 page (`404.html`).
35. **One-Click Presentation Seed Script**: `window.CamPulseDB.resetDemoData()` creates realistic OAU complaints across departments for live demonstrations.

---

## 🗄️ Supabase Backend & Database Setup

CamPulse features a database abstraction layer (`supabase-client.js`) that operates in a resilient hybrid mode: connecting to Supabase when configured, and falling back gracefully to an enhanced local storage repository when working offline or in static preview.

### 1. Database Schema Migration
Run the SQL script located in [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL Editor. This script creates:
- `profiles` table (linked to Supabase Auth with student, staff, dept_admin, and super_admin roles)
- `departments` table with OAU SLA mapping (24h urgent / 72h standard)
- `tickets` table with Row-Level Security (RLS)
- `ticket_attachments` table & `ticket-attachments` Storage Bucket
- `ticket_comments` table
- `ticket_upvotes` table
- `notifications` table

### 2. Configure Environment Variables in Vercel
In your Vercel Project Settings under **Environment Variables**, add:
- `CAMPULSE_SUPABASE_URL`: Your Supabase Project URL (`https://xyzcompany.supabase.co`)
- `CAMPULSE_SUPABASE_ANON_KEY`: Your Supabase Project Anon Public Key

---

## 🚀 Local Development Setup

No build tools or heavy node dependencies required for static preview.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Eli-greens/CamPulse.git
   cd CamPulse
   ```

2. **Serve locally**:
   Using Python:
   ```bash
   python -m http.server 8080
   ```
   Or using Node's `serve`:
   ```bash
   npx serve .
   ```

3. **Open in browser**:
   - Student Portal: `http://localhost:8080/index.html`
   - Community Issue Board: `http://localhost:8080/issues.html`
   - Student Dashboard: `http://localhost:8080/dashboard.html`
   - Interactive Ticket Timeline: `http://localhost:8080/ticket.html?demo=sample`
   - Department Admin Console: `http://localhost:8080/admin.html`
   - 404 Error Page: `http://localhost:8080/404.html`

---

## ☁️ Deployment on Vercel

CamPulse is pre-configured for static deployment on Vercel:
1. Connect the GitHub repository to [Vercel](https://vercel.com).
2. Framework Preset: **Other** (Static HTML/CSS/JS).
3. Root Directory: `./`
4. Build Command: *None*
5. Output Directory: *None*
6. Deploy! Every commit to `main` triggers an automatic production build.

---

## 🗺️ Completed Roadmap

- [x] **Phase 1: Fix Trust, First Impressions & Verification**
- [x] **Phase 2: Core Ticket Features**
- [x] **Phase 3: Community Features**
- [x] **Phase 4: Notifications & Preferences**
- [x] **Phase 5: Admin & Department Workflow**
- [x] **Phase 6: Polish & Production Readiness**

