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

## ✨ Features (Current Status: Phase 1 Completed)

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

## 🗺️ Roadmap & Phases

- [x] **Phase 1: Fix Trust, First Impressions & Verification**
- [ ] **Phase 2: Core Ticket Features** (Supabase migration, anonymous toggle with super-admin audit, up to 3 attachments max 5MB, location picker, ticket timeline, two-way comments thread with 7-day reopen, 5-star satisfaction rating, readable ticket IDs `CP-2026-XXXX`).
- [ ] **Phase 3: Community Features** (Public anonymized board, "Me too" upvotes, live duplicate detection, keyword auto-categorization, trending issues).
- [ ] **Phase 4: Notifications** (Email notifications via Resend/SendGrid, in-app notification bell, user notification preferences).
- [ ] **Phase 5: Admin & Department Workflow** (Role-based access control, auto-routing to departments, SLA timers: 24h urgent / 72h normal, internal private notes, analytics dashboard with CSV export).
- [ ] **Phase 6: Polish & Production** (Dark mode, legal pages, skeleton loaders, Row-Level Security, demo seed script).
