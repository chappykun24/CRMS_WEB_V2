# Cluster Visualization - Term ID Filtering

## ✅ Yes, Data is Filtered by Term ID

The cluster visualization **automatically uses term-filtered data**. Here's how it works:

## Data Flow with Term Filtering

```
1. User selects Term ID in frontend dropdown
   ↓
2. Frontend sends term_id to API:
   GET /api/assessments/dean-analytics/sample?term_id=3
   ↓
3. Backend filters ALL data by term_id:
   - Attendance data (filtered by term)
   - Score data (filtered by term)
   - Submission data (filtered by term)
   - Clustering (only students from that term)
   ↓
4. Filtered data returned to frontend
   ↓
5. ClusterVisualization component receives filtered data
   ↓
6. Visualization shows only students from selected term
```

## Implementation Details

### Frontend (Analytics.jsx)

The term filter is applied when fetching data:

```javascript
// Line 732-739 in dean/Analytics.jsx
const params = new URLSearchParams();
const activeTerm = schoolTerms.find(t => t.is_active);
const termToUse = selectedTermId || (activeTerm ? activeTerm.term_id.toString() : '');
if (termToUse) {
  params.append('term_id', termToUse);  // ✅ Term ID sent to API
}
const url = `${API_BASE_URL}/assessments/dean-analytics/sample?${params.toString()}`;
```

### Backend (assessments.js)

The backend applies term filtering to all queries:

```javascript
// Line 512: Extract term_id
const termIdValue = term_id && !isNaN(parseInt(term_id)) ? parseInt(term_id) : null;

// Applied to all subqueries:
// - Attendance: ${termIdValue ? `AND sc_att.term_id = ${termIdValue}` : ''}
// - Scores: ${termIdValue ? `AND sc_weighted.term_id = ${termIdValue}` : ''}
// - Submissions: ${termIdValue ? `AND sc_sub.term_id = ${termIdValue}` : ''}
```

### Visualization Component

The component receives **already-filtered data**:

```javascript
// ClusterVisualization receives data prop
<ClusterVisualization data={data} height={300} />
// data is already filtered by term_id at the API level
```

## How to Verify

1. **Select a Term**: Choose a term from the dropdown
2. **Load Data**: Click "Load Analytics" or refresh
3. **Check Visualization**: The scatter plot shows only students from that term
4. **Change Term**: Select a different term - visualization updates automatically

## Example

**Term 1 (2024-2025, 1st Semester):**
- Shows 50 students
- Clusters based on their performance in Term 1

**Term 2 (2024-2025, 2nd Semester):**
- Shows 45 students (different set)
- Clusters based on their performance in Term 2

## Additional Filters

The visualization also respects other filters:
- ✅ **Term ID** (applied at API level)
- ✅ **Section ID** (applied at API level)
- ✅ **Program ID** (applied at API level)
- ✅ **Department ID** (applied at API level)
- ✅ **Student ID** (applied at API level)
- ✅ **Section Course ID** (applied at API level)
- ✅ **Standard Filters** (SO, IGA, CDIO, SDG - applied at API level)
- ✅ **Year Level** (applied client-side)
- ✅ **Specialization** (applied client-side)
- ✅ **Search Query** (applied client-side)
- ✅ **Cluster Label** (applied client-side)

## Important Notes

1. **Term-Specific Clustering**: Clusters are computed **per term**
   - Students from Term 1 are clustered together
   - Students from Term 2 are clustered separately
   - This ensures accurate performance comparisons within the same academic period

2. **Cache Behavior**: Clustering results are cached per term
   - Cache key includes `term_id`
   - Changing term triggers new clustering computation
   - Use "Force Refresh" to recompute clusters for a term

3. **Data Consistency**: All metrics (attendance, scores, submissions) are filtered by the same term
   - Ensures visualization shows consistent data
   - No mixing of data from different terms

## Testing Term Filtering

To verify term filtering works:

1. **Test with Different Terms:**
   ```javascript
   // In browser console, check the API call:
   console.log('Term ID in URL:', new URLSearchParams(window.location.search).get('term_id'));
   ```

2. **Check Backend Logs:**
   ```
   [Backend] Filters - term_id: 3
   [Backend] Applying term filter: 3
   ```

3. **Verify Visualization:**
   - Select Term 1 → Count students in visualization
   - Select Term 2 → Count should be different (if different students)
   - Clusters should reflect term-specific performance

## Summary

✅ **Term filtering is fully implemented and working**
- Frontend sends `term_id` parameter
- Backend filters all data by `term_id`
- Visualization shows only students from selected term
- Clustering is computed per term
- No additional code needed - it's already working!

