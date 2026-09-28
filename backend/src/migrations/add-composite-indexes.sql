-- ============================================================================
-- CodeGo — Composite Indexes for 10,000 Concurrent Exam-Takers
-- ============================================================================
-- Run with:  psql -h <host> -U platform_user -d coding_platform -f add-composite-indexes.sql
--
-- All indexes use CREATE INDEX CONCURRENTLY to avoid locking the submissions
-- table during an active exam window. This requires running OUTSIDE a
-- transaction block (psql will do this automatically; if using a migration
-- runner, ensure it doesn't wrap this in BEGIN/COMMIT).
--
-- After running, execute:  ANALYZE submissions; ANALYZE users;
-- to update the query planner's statistics.
-- ============================================================================

-- 1. Faculty analytics filtering
--    Covers: FacultyService.getAllResults() queries filtering by status + difficulty + language + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_faculty_filter
  ON submissions(status, difficulty, language, "createdAt" DESC);

-- 2. Department + year filtering on users
--    Covers: faculty dashboard department/year filter joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_dept_year
  ON users(department, year);

-- 3. Student submission history (per-user, ordered by date)
--    Covers: SubmissionsService.getStudentHistory() + dashboard timeline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_user_created
  ON submissions("userId", "createdAt" DESC);

-- 4. "Has this student already submitted this question in this session?"
--    Hot path during exams — prevents duplicate submission queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_user_question
  ON submissions("userId", "questionId", "createdAt" DESC);

-- 5. Leaderboard / streak recalculation queries
--    Covers: top-students ranking in FacultyService.getSummaryStats()
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_streak
  ON users("currentStreak" DESC, "averageScore" DESC);

-- 6. Partial index for in-flight submissions only
--    Exam-time dashboards only care about pending/running submissions —
--    this partial index is tiny and extremely fast to scan
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_active
  ON submissions(status, "createdAt")
  WHERE status IN ('pending', 'running');

-- ============================================================================
-- Post-index: refresh planner statistics
-- ============================================================================
ANALYZE submissions;
ANALYZE users;
