# ILO Mapping System - Setup Guide

This document provides instructions for setting up the ILO (Intended Learning Outcomes) mapping system that links course ILOs to Student Outcomes (SO), Institutional Graduate Attributes (IGA), CDIO Skills, and SDG Skills.

## Database Setup

1. **Run the database migration script** to create the necessary tables:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database_name

# Run the migration script
\i db/ilo_mapping_schema.sql
```

Alternatively, you can execute the SQL file directly:

```bash
psql -U your_username -d your_database_name -f db/ilo_mapping_schema.sql
```

## Database Tables Created

The migration script creates the following tables:

1. **student_outcomes** - Reference table for Student Outcomes (SO1, SO2, SO6, etc.)
2. **institutional_graduate_attributes** - Reference table for IGA (IGA1, IGA3, etc.)
3. **cdio_skills** - Reference table for CDIO Skills (CDIO1, CDIO2, etc.)
4. **sdg_skills** - Reference table for SDG Skills (SDG1, SDG3, etc.)
5. **ilo_so_mappings** - Maps ILOs to Student Outcomes with assessment tasks
6. **ilo_iga_mappings** - Maps ILOs to IGA with assessment tasks
7. **ilo_cdio_mappings** - Maps ILOs to CDIO Skills with assessment tasks
8. **ilo_sdg_mappings** - Maps ILOs to SDG Skills with assessment tasks

## Default Reference Data

The migration script includes default reference data:
- SO1, SO2, SO6 (Student Outcomes)
- IGA1, IGA3 (Institutional Graduate Attributes)
- CDIO1, CDIO2 (CDIO Skills)
- SDG1, SDG3 (SDG Skills)

You can customize these by updating the reference tables with your institution's specific outcomes and attributes.

## Assessment Task Codes

The system uses the following assessment task codes:
- **QZ** - Quiz
- **ME** - Major Exam
- **FP** - Final Project
- **P** - Presentation
- **LA** - Lab Activity
- **Q** - Question

## API Endpoints

### ILO Management
- `GET /api/ilos/syllabus/:syllabusId` - Get all ILOs for a syllabus
- `GET /api/ilos/:id` - Get a specific ILO with all mappings
- `POST /api/ilos` - Create a new ILO
- `PUT /api/ilos/:id` - Update an ILO
- `DELETE /api/ilos/:id` - Delete an ILO

### Reference Data
- `GET /api/ilos/references/so` - Get all Student Outcomes
- `GET /api/ilos/references/iga` - Get all IGA references
- `GET /api/ilos/references/cdio` - Get all CDIO references
- `GET /api/ilos/references/sdg` - Get all SDG references

### Mappings
- `POST /api/ilos/:iloId/mappings/so` - Create or update SO mapping
- `POST /api/ilos/:iloId/mappings/iga` - Create or update IGA mapping
- `POST /api/ilos/:iloId/mappings/cdio` - Create or update CDIO mapping
- `POST /api/ilos/:iloId/mappings/sdg` - Create or update SDG mapping
- `DELETE /api/ilos/:iloId/mappings/so/:soId` - Delete SO mapping
- `DELETE /api/ilos/:iloId/mappings/iga/:igaId` - Delete IGA mapping
- `DELETE /api/ilos/:iloId/mappings/cdio/:cdioId` - Delete CDIO mapping
- `DELETE /api/ilos/:iloId/mappings/sdg/:sdgId` - Delete SDG mapping

## Frontend Usage

1. Navigate to the Syllabus page in the faculty dashboard
2. Click on the "ILO Mapping" tab
3. Select a class from the sidebar
4. Select a syllabus from the list
5. You can now:
   - Create new ILOs
   - Edit existing ILOs
   - Map ILOs to SO, IGA, CDIO, and SDG
   - Assign assessment tasks to each mapping
   - Delete mappings

## Features

- **ILO Management**: Create, edit, and delete Intended Learning Outcomes
- **Mapping Table**: Visual table showing all ILOs and their mappings to SO, IGA, CDIO, and SDG
- **Assessment Tasks**: Assign multiple assessment tasks (QZ, ME, FP, P, LA, Q) to each mapping
- **Reference Data**: Manage reference data for SO, IGA, CDIO, and SDG
- **Syllabus Integration**: ILOs are linked to specific syllabi

## Customization

To customize the reference data (SO, IGA, CDIO, SDG), you can:

1. Update the reference tables directly in the database
2. Add new reference entries via SQL:
   ```sql
   INSERT INTO student_outcomes (so_code, description) 
   VALUES ('SO3', 'Student Outcome 3 Description');
   ```

3. Modify the default data in `db/ilo_mapping_schema.sql` before running the migration

## Notes

- ILOs are automatically linked to syllabi via the `syllabus_id` foreign key
- Assessment tasks are stored as arrays in the mapping tables
- The system supports multiple mappings per ILO (e.g., one ILO can map to multiple SOs)
- All mappings include assessment tasks to indicate how the outcome is measured

