# Memory Optimization Guide

## Problem
Render service was running out of memory (hitting 512MB limit) due to large base64-encoded student photos being loaded in every API response.

## Solution
Implemented memory-efficient photo handling by excluding photos from queries by default and providing a separate endpoint for on-demand photo fetching.

## Changes Made

### Backend Optimizations

1. **Student Endpoints - Photos Excluded by Default**
   - `/api/section-courses/:id/students` - Photos excluded by default
   - `/api/grading/class/:sectionCourseId/student-grades` - Photos excluded by default
   - `/api/grading/class/:sectionCourseId/assessment-scores` - Photos excluded by default
   - `/api/grading/assessment/:id/grades` - Photos excluded by default
   - `/api/assessments/:id/students` - Photos excluded by default

2. **New Photo Endpoint**
   - `GET /api/students/:id/photo` - Fetch individual student photos on-demand
   - Includes cache headers (1 hour cache)
   - Returns: `{ photo: "base64_string" }`

3. **Optional Photo Inclusion**
   - Add `?includePhotos=true` query parameter to any endpoint to include photos
   - Example: `/api/section-courses/123/students?includePhotos=true`

4. **Response Compression**
   - Already enabled via `compression` middleware
   - Compresses responses > 1KB
   - Level 6 compression (good balance)

### Frontend Compatibility

The frontend already handles missing photos gracefully:
- Shows skeleton/placeholder when photos are not available
- Uses lazy loading for images
- Photos can be fetched separately when needed

## Memory Impact

**Before:**
- Loading 50 students with photos: ~50-100MB in memory
- Each photo: ~1-2MB base64 string
- Total: 50-100MB just for photos

**After:**
- Loading 50 students without photos: ~1-2MB in memory
- Photos loaded on-demand: Only when needed
- Total: ~1-2MB for student data

**Estimated Memory Savings: 95-98%** for student list queries

## Usage

### Default Behavior (No Photos)
```javascript
// Photos excluded by default - saves memory
fetch('/api/section-courses/123/students')
  .then(res => res.json())
  .then(students => {
    // students[].student_photo will be null
  })
```

### Include Photos (When Needed)
```javascript
// Include photos if really needed
fetch('/api/section-courses/123/students?includePhotos=true')
  .then(res => res.json())
  .then(students => {
    // students[].student_photo will contain base64 string
  })
```

### Fetch Photos On-Demand
```javascript
// Fetch individual photo when needed
fetch(`/api/students/${studentId}/photo`)
  .then(res => res.json())
  .then(data => {
    const photo = data.photo; // base64 string
  })
```

## Recommendations

1. **Keep photos excluded by default** - Only include when absolutely necessary
2. **Use on-demand photo fetching** - Fetch photos individually when displaying student details
3. **Implement photo caching** - Cache photos in browser sessionStorage/localStorage
4. **Consider image optimization** - Compress/resize photos before storing as base64
5. **Monitor memory usage** - Check Render logs to ensure memory stays under limit

## Additional Optimizations (Future)

1. **Pagination** - Add pagination to large student lists
2. **Image CDN** - Move photos to CDN instead of database
3. **Thumbnail generation** - Store smaller thumbnails for lists
4. **Streaming responses** - Stream large JSON responses
5. **Database indexing** - Ensure proper indexes on frequently queried columns

## Testing

After deployment, monitor:
- Memory usage in Render dashboard
- API response times
- Frontend image loading behavior
- Error rates

If memory issues persist, consider:
- Upgrading Render plan (more memory)
- Implementing pagination
- Moving photos to external storage (S3, Cloudinary, etc.)

