-- Migration: Add banner customization columns to section_courses table
-- Date: 2024-01-XX
-- Description: Adds banner_color, banner_image, and banner_type columns to store custom banner colors and images for class cards

-- Add banner_color column to section_courses table
ALTER TABLE section_courses 
ADD COLUMN IF NOT EXISTS banner_color VARCHAR(7) DEFAULT '#3B82F6';

-- Add banner_image column to section_courses table (for base64 image storage)
ALTER TABLE section_courses 
ADD COLUMN IF NOT EXISTS banner_image TEXT;

-- Add banner_type column to indicate whether to use color or image
ALTER TABLE section_courses 
ADD COLUMN IF NOT EXISTS banner_type VARCHAR(10) DEFAULT 'color' CHECK (banner_type IN ('color', 'image'));

-- Add created_at and updated_at columns if they don't exist
ALTER TABLE section_courses 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE section_courses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add comments to document the columns
COMMENT ON COLUMN section_courses.banner_color IS 'Hex color code for class banner background (e.g., #3B82F6)';
COMMENT ON COLUMN section_courses.banner_image IS 'Base64 encoded image data for banner image';
COMMENT ON COLUMN section_courses.banner_type IS 'Type of banner: color or image';

-- Update existing records to have a default banner color
UPDATE section_courses 
SET banner_color = '#3B82F6', banner_type = 'color'
WHERE banner_color IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_section_courses_banner_type ON section_courses(banner_type);
CREATE INDEX IF NOT EXISTS idx_section_courses_banner_color ON section_courses(banner_color);
CREATE INDEX IF NOT EXISTS idx_section_courses_created_at ON section_courses(created_at);
CREATE INDEX IF NOT EXISTS idx_section_courses_updated_at ON section_courses(updated_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_section_courses_instructor_term ON section_courses(instructor_id, term_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_section_term ON section_courses(section_id, term_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_course_term ON section_courses(course_id, term_id);
CREATE INDEX IF NOT EXISTS idx_section_courses_section_course_term ON section_courses(section_id, course_id, term_id);

