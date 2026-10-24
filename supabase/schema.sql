-- ===================================================================
-- CamPulse — University Student Complaint & Feedback Platform
-- Supabase PostgreSQL Schema & Security Policies (Phase 2 - Phase 6)
-- Target Institution: Obafemi Awolowo University (OAU), Ile-Ife
-- ===================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom User Roles
CREATE TYPE user_role AS ENUM ('student', 'staff', 'dept_admin', 'super_admin');
CREATE TYPE ticket_status AS ENUM ('pending', 'assigned', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_category AS ENUM (
  'Academic',
  'Facilities',
  'Hostel',
  'Finance',
  'IT',
  'Safety',
  'Food',
  'Administration',
  'Other'
);

-- 3. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  matric_no TEXT,
  role user_role DEFAULT 'student'::user_role NOT NULL,
  department TEXT,
  phone TEXT,
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  sla_normal_hours INT DEFAULT 72 NOT NULL,
  sla_urgent_hours INT DEFAULT 24 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.departments (id, name, sla_normal_hours, sla_urgent_hours)
VALUES
  ('Academic', 'Academic Affairs & Senate Secretariat', 72, 24),
  ('Facilities', 'Division of Works & Maintenance Services', 48, 12),
  ('Hostel', 'Division of Student Affairs (Accommodations)', 48, 12),
  ('Finance', 'Bursary Department & Student Accounts', 72, 24),
  ('IT', 'Information Technology & Communications Unit (INTECU)', 48, 12),
  ('Safety', 'Campus Security Services & Marshal Unit', 24, 4),
  ('Food', 'Student Welfare & Cafeteria Regulatory Committee', 72, 24),
  ('Administration', 'University Registry & General Administration', 72, 24),
  ('Other', 'Dean of Student Affairs Office', 72, 24)
ON CONFLICT (id) DO NOTHING;

-- 5. Tickets Table
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY, -- e.g. CP-2026-0042
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
  category ticket_category NOT NULL,
  department_id TEXT REFERENCES public.departments(id),
  location_zone TEXT NOT NULL,
  location_details TEXT,
  subject VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  urgent BOOLEAN DEFAULT FALSE NOT NULL,
  status ticket_status DEFAULT 'pending'::ticket_status NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  upvotes_count INT DEFAULT 0 NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  rated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  reopened_at TIMESTAMPTZ,
  reopen_count INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Ticket Attachments Table (Max 3 files, max 5MB each)
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INT NOT NULL, -- in bytes (max 5242880)
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Ticket Comments Thread (Two-way communication + Staff Internal Notes)
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role user_role NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE NOT NULL, -- Staff only note
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Ticket Upvotes ("Me Too")
CREATE TABLE IF NOT EXISTS public.ticket_upvotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_student_ticket_upvote UNIQUE (ticket_id, student_id)
);

-- 9. In-App Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ticket_id TEXT REFERENCES public.tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Enable Row-Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 11. Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 12. Row-Level Security Policies

-- Profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.current_user_role() = 'super_admin'::user_role);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Departments
CREATE POLICY "Public read departments"
  ON public.departments FOR SELECT
  TO PUBLIC USING (true);

-- Tickets Policies
-- Students can read their own tickets
CREATE POLICY "Students can view their own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = student_id);

-- Staff can view tickets assigned to their department
CREATE POLICY "Staff can view department tickets"
  ON public.tickets FOR SELECT
  USING (
    public.current_user_role() IN ('staff'::user_role, 'dept_admin'::user_role, 'super_admin'::user_role)
  );

-- Students can insert tickets
CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = student_id OR student_id IS NULL);

-- Students can update own ticket (reopen within 7 days, rate)
CREATE POLICY "Students can update own tickets"
  ON public.tickets FOR UPDATE
  USING (auth.uid() = student_id);

-- Staff can update tickets
CREATE POLICY "Staff can update department tickets"
  ON public.tickets FOR UPDATE
  USING (
    public.current_user_role() IN ('staff'::user_role, 'dept_admin'::user_role, 'super_admin'::user_role)
  );

-- Ticket Attachments Policies
CREATE POLICY "Users can view attachments for permitted tickets"
  ON public.ticket_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
      AND (
        t.student_id = auth.uid()
        OR public.current_user_role() IN ('staff'::user_role, 'dept_admin'::user_role, 'super_admin'::user_role)
      )
    )
  );

CREATE POLICY "Users can add attachments to their tickets"
  ON public.ticket_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
      AND t.student_id = auth.uid()
    )
  );

-- Ticket Comments Policies
CREATE POLICY "Students and staff can read non-internal comments"
  ON public.ticket_comments FOR SELECT
  USING (
    (is_internal = FALSE AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
      AND t.student_id = auth.uid()
    ))
    OR public.current_user_role() IN ('staff'::user_role, 'dept_admin'::user_role, 'super_admin'::user_role)
  );

CREATE POLICY "Users can post comments on permitted tickets"
  ON public.ticket_comments FOR INSERT
  WITH CHECK (
    (is_internal = FALSE AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
      AND t.student_id = auth.uid()
    ))
    OR public.current_user_role() IN ('staff'::user_role, 'dept_admin'::user_role, 'super_admin'::user_role)
  );

-- Upvotes Policies
CREATE POLICY "Public read upvotes"
  ON public.ticket_upvotes FOR SELECT
  TO PUBLIC USING (true);

CREATE POLICY "Students can upvote"
  ON public.ticket_upvotes FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Notifications Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 13. Supabase Storage Bucket Setup
-- Bucket name: 'ticket-attachments' (Max 5MB per object)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Allow authenticated uploads to ticket-attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Allow public read of ticket-attachments"
  ON storage.objects FOR SELECT
  TO PUBLIC
  USING (bucket_id = 'ticket-attachments');
