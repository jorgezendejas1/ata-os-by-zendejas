
-- Users table (custom app users, not auth.users)
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'GENERICO',
  name TEXT NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  "assignedTerminals" TEXT[] DEFAULT '{}'
);

-- Attendance records
CREATE TABLE public.attendance_records (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "terminalName" TEXT NOT NULL,
  "zoneId" TEXT,
  "zoneName" TEXT,
  "scheduleId" TEXT NOT NULL,
  "scheduleTime" TEXT NOT NULL,
  "promoterCount" INTEGER NOT NULL DEFAULT 0,
  "plannedCount" INTEGER,
  "supervisorSignature" TEXT NOT NULL DEFAULT '',
  "dateRegistered" TEXT NOT NULL,
  "timeRegistered" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  history JSONB DEFAULT '[]'
);

-- Staffing distribution
CREATE TABLE public.staffing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "zoneId" TEXT NOT NULL DEFAULT 'default',
  "companyId" TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(date, "terminalId", "zoneId", "companyId")
);

-- Position targets
CREATE TABLE public.targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "terminalId" TEXT NOT NULL,
  "zoneId" TEXT NOT NULL DEFAULT 'default',
  "companyId" TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE("terminalId", "zoneId", "companyId")
);

-- Tasks (roadmap)
CREATE TABLE public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'TODO',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  "dueDate" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- Config (key-value store)
CREATE TABLE public.config (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'
);

-- Email logs
CREATE TABLE public.email_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  recipients TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL
);

-- Disable RLS for all tables (this app uses custom auth, not Supabase auth)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon access since this app uses custom authentication (not Supabase auth)
CREATE POLICY "Allow all access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.staffing FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.email_logs FOR ALL USING (true) WITH CHECK (true);

-- Insert initial master user
INSERT INTO public.users (id, email, password_hash, role, name, "createdAt")
VALUES ('u_master', 'admin@airport.com', 'admin123', 'MASTER', 'Master Admin', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
