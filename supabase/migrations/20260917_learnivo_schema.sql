-- ============================================================================
-- LEARNIVO PLATFORM - COMPLETE SUPABASE DATABASE MIGRATION
-- Project URL: https://hmfxzzfopfeaqajgfipe.supabase.co
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. AI TUTOR HISTORY TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_tutor_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    question TEXT,
    user_message TEXT,
    ai_response TEXT,
    role TEXT DEFAULT 'user',
    message TEXT,
    topic TEXT,
    subject TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist if table already existed
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS user_message TEXT;
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS ai_response TEXT;
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ai_tutor_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Enable RLS for ai_tutor_history
ALTER TABLE public.ai_tutor_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai_tutor_history" ON public.ai_tutor_history;
CREATE POLICY "Users can view own ai_tutor_history" ON public.ai_tutor_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ai_tutor_history" ON public.ai_tutor_history;
CREATE POLICY "Users can insert own ai_tutor_history" ON public.ai_tutor_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ai_tutor_history" ON public.ai_tutor_history;
CREATE POLICY "Users can update own ai_tutor_history" ON public.ai_tutor_history
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ai_tutor_history" ON public.ai_tutor_history;
CREATE POLICY "Users can delete own ai_tutor_history" ON public.ai_tutor_history
    FOR DELETE USING (auth.uid() = user_id);

-- Index for session and user lookups
CREATE INDEX IF NOT EXISTS idx_ai_tutor_history_user ON public.ai_tutor_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_history_session ON public.ai_tutor_history(session_id, created_at ASC);


-- ----------------------------------------------------------------------------
-- 2. COURSES / MATERIALS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT,
    subject_code TEXT,
    subject_name TEXT,
    course_name TEXT,
    syllabus_text TEXT,
    unit_1 TEXT,
    unit_2 TEXT,
    unit_3 TEXT,
    unit_4 TEXT,
    unit_5 TEXT,
    topics JSONB DEFAULT '[]'::jsonb,
    pdf_name TEXT,
    pdf_url TEXT,
    status TEXT DEFAULT 'ready',
    course_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS syllabus_text TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS unit_1 TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS unit_2 TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS unit_3 TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS unit_4 TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS unit_5 TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS topics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS pdf_name TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Enable RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own courses" ON public.courses;
CREATE POLICY "Users can view own courses" ON public.courses
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own courses" ON public.courses;
CREATE POLICY "Users can insert own courses" ON public.courses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own courses" ON public.courses;
CREATE POLICY "Users can update own courses" ON public.courses
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own courses" ON public.courses;
CREATE POLICY "Users can delete own courses" ON public.courses
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_courses_user_updated ON public.courses(user_id, updated_at DESC);


-- ----------------------------------------------------------------------------
-- 3. COURSE VIDEOS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    topic TEXT,
    video_id TEXT,
    video_title TEXT,
    video_url TEXT,
    channel_name TEXT,
    thumbnail_url TEXT,
    duration TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for course_videos
ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own course_videos" ON public.course_videos;
CREATE POLICY "Users can view own course_videos" ON public.course_videos
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own course_videos" ON public.course_videos;
CREATE POLICY "Users can insert own course_videos" ON public.course_videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own course_videos" ON public.course_videos;
CREATE POLICY "Users can update own course_videos" ON public.course_videos
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own course_videos" ON public.course_videos;
CREATE POLICY "Users can delete own course_videos" ON public.course_videos
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_course_videos_course ON public.course_videos(course_id);


-- ----------------------------------------------------------------------------
-- 4. ASSESSMENT HISTORY TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id TEXT,
    course_id TEXT,
    subject_code TEXT,
    subject_name TEXT,
    question_number INT,
    question TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_answer TEXT,
    selected_answer TEXT,
    is_correct BOOLEAN,
    topic TEXT,
    unit TEXT,
    difficulty TEXT,
    total_questions INT,
    correct_answers INT,
    wrong_answers INT,
    unanswered INT,
    score NUMERIC,
    percentage NUMERIC,
    details JSONB DEFAULT '[]'::jsonb,
    violations JSONB DEFAULT '[]'::jsonb,
    warning_count INT DEFAULT 0,
    status TEXT DEFAULT 'completed',
    completed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS assessment_id TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS question_number INT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS option_a TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS option_b TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS option_c TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS option_d TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS selected_answer TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS total_questions INT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS correct_answers INT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS wrong_answers INT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS unanswered INT;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS score NUMERIC;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS percentage NUMERIC;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS violations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS warning_count INT DEFAULT 0;
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.assessment_history ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT now();

-- Enable RLS for assessment_history
ALTER TABLE public.assessment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assessment_history" ON public.assessment_history;
CREATE POLICY "Users can view own assessment_history" ON public.assessment_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own assessment_history" ON public.assessment_history;
CREATE POLICY "Users can insert own assessment_history" ON public.assessment_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own assessment_history" ON public.assessment_history;
CREATE POLICY "Users can update own assessment_history" ON public.assessment_history
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own assessment_history" ON public.assessment_history;
CREATE POLICY "Users can delete own assessment_history" ON public.assessment_history
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_assessment_history_user ON public.assessment_history(user_id, completed_at DESC);


-- ----------------------------------------------------------------------------
-- 5. EVALUATION TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id TEXT,
    course_id TEXT,
    subject_code TEXT,
    subject_name TEXT,
    total_questions INT,
    attempted_questions INT,
    correct_answers INT,
    wrong_answers INT,
    score NUMERIC,
    percentage NUMERIC,
    time_taken TEXT,
    performance_level TEXT,
    topic TEXT,
    unit TEXT,
    warning_count INT DEFAULT 0,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for evaluation
ALTER TABLE public.evaluation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own evaluation" ON public.evaluation;
CREATE POLICY "Users can view own evaluation" ON public.evaluation
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own evaluation" ON public.evaluation;
CREATE POLICY "Users can insert own evaluation" ON public.evaluation
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own evaluation" ON public.evaluation;
CREATE POLICY "Users can update own evaluation" ON public.evaluation
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own evaluation" ON public.evaluation;
CREATE POLICY "Users can delete own evaluation" ON public.evaluation
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_user ON public.evaluation(user_id, created_at DESC);


-- ----------------------------------------------------------------------------
-- 6. PROFILE TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    college TEXT,
    department TEXT,
    year TEXT,
    bio TEXT,
    focus_area TEXT,
    level TEXT,
    daily_target_minutes INT,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for profile
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profile;
CREATE POLICY "Users can view own profile" ON public.profile
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profile;
CREATE POLICY "Users can insert own profile" ON public.profile
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profile;
CREATE POLICY "Users can update own profile" ON public.profile
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profile;
CREATE POLICY "Users can delete own profile" ON public.profile
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_profile_user ON public.profile(user_id);
