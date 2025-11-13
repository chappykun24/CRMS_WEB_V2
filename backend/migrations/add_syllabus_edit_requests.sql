-- Migration: Add syllabus_edit_requests table
-- This enables faculty to request edits to approved syllabuses, which are sent to dean and program chair

CREATE TABLE IF NOT EXISTS syllabus_edit_requests (
  edit_request_id SERIAL PRIMARY KEY,
  syllabus_id INTEGER NOT NULL REFERENCES syllabi(syllabus_id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed')),
  dean_approved BOOLEAN DEFAULT FALSE,
  program_chair_approved BOOLEAN DEFAULT FALSE,
  dean_approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  program_chair_approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  dean_approved_at TIMESTAMP,
  program_chair_approved_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments
COMMENT ON TABLE syllabus_edit_requests IS 'Tracks edit requests for approved syllabuses, requiring approval from both dean and program chair';
COMMENT ON COLUMN syllabus_edit_requests.status IS 'Overall status: pending, approved (both approved), rejected, in_progress, completed';
COMMENT ON COLUMN syllabus_edit_requests.dean_approved IS 'Whether the dean has approved the edit request';
COMMENT ON COLUMN syllabus_edit_requests.program_chair_approved IS 'Whether the program chair has approved the edit request';

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_syllabus_id ON syllabus_edit_requests(syllabus_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_requested_by ON syllabus_edit_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_status ON syllabus_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_dean_approved ON syllabus_edit_requests(dean_approved) WHERE dean_approved = FALSE;
CREATE INDEX IF NOT EXISTS idx_syllabus_edit_requests_program_chair_approved ON syllabus_edit_requests(program_chair_approved) WHERE program_chair_approved = FALSE;

