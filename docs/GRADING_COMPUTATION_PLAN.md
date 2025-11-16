# Grading Computation Logic Plan

## Overview
Implement a non-zero based grading computation system that matches the spreadsheet logic, where:
1. Raw scores are transmuted to actual scores
2. Actual scores are weighted by percentiles to get transmuted scores
3. Transmuted scores are aggregated by parent assessment criteria
4. Final grade is calculated and converted to numeric grade

## Computation Flow

### Step 1: Raw Score → Actual Score (Transmutation)
**Formula:** `Actual Score = (Raw Score / Max Score) × 62.5 + 37.5`

- **Non-zero based**: Minimum score is 37.5 (not 0)
- **Maximum score**: 100 (when raw = max)
- **Example**: 
  - Raw: 50, Max: 50 → Actual: (50/50) × 62.5 + 37.5 = 100
  - Raw: 25, Max: 50 → Actual: (25/50) × 62.5 + 37.5 = 68.75
  - Raw: 0, Max: 50 → Actual: (0/50) × 62.5 + 37.5 = 37.5

### Step 2: Actual Score → Transmuted Score (Weighted)
**Formula:** `Transmuted Score = Actual Score × (Weight Percentage / 100)`

- Uses the `weight_percentage` from each assessment
- Example:
  - Actual: 100, Weight: 10% → Transmuted: 10.0
  - Actual: 68.75, Weight: 7.5% → Transmuted: 5.16

### Step 3: Aggregate by Parent Criteria
**Group sub-assessments by parent criterion and sum transmuted scores**

- Extract parent criterion from assessment description: "Sub-assessment from {CriterionName}"
- Group all sub-assessments under the same parent
- Sum transmuted scores within each group
- Example:
  - Written Assessment (PS):
    - PS1: Transmuted 7.50
    - PS2: Transmuted 3.75
    - **Aggregated PS: 11.25**
  - Midterm Exam (ME):
    - ME1: Transmuted 6.25
    - ME2: Transmuted 6.88
    - **Aggregated ME: 13.13**

### Step 4: Calculate Final Grade
**Formula:** `Final Grade = Sum of all Aggregated Transmuted Scores`

- Sum all aggregated scores from all parent criteria
- Example: PS (11.25) + ME (13.13) + FP (26.25) + LA (21.19) = **71.81**

### Step 5: Convert to Numeric Grade
**Grading Scale:**
```
Percentage → Numeric → Status
0          → 5       → FAILED
75         → 3       → PASSED
78         → 3       → PASSED (or 2.75?)
80         → 2.5     → PASSED
83         → 2.25    → PASSED
85         → 2       → PASSED
88         → 1.75    → PASSED
90         → 1.5     → PASSED
94         → 1.25    → PASSED
98         → 1       → PASSED
INC        → CONDITIONAL
DRP        → FAILED
```

**Note:** Need to clarify the exact mapping for values between thresholds.

## Database Schema Changes

### Add to `submissions` table:
```sql
ALTER TABLE submissions 
ADD COLUMN actual_score DOUBLE PRECISION,
ADD COLUMN transmuted_score DOUBLE PRECISION;
```

### Use `course_final_grades` table:
```sql
-- Already exists, needs to store:
-- - final_percentage (sum of transmuted scores)
-- - numeric_grade (converted using scale)
-- - status (PASSED/FAILED/CONDITIONAL)
```

## Implementation Steps

### 1. Frontend Changes (`frontend/src/pages/faculty/Assessments.jsx`)

#### A. Add Computation Functions
```javascript
// Transmutation: Raw → Actual
const calculateActualScore = (rawScore, maxScore) => {
  if (!maxScore || maxScore === 0) return 0
  const raw = parseFloat(rawScore) || 0
  return (raw / maxScore) * 62.5 + 37.5
}

// Weighting: Actual → Transmuted
const calculateTransmutedScore = (actualScore, weightPercentage) => {
  const actual = parseFloat(actualScore) || 0
  const weight = parseFloat(weightPercentage) || 0
  return (actual * weight) / 100
}

// Group assessments by parent criterion
const groupAssessmentsByCriterion = (assessments) => {
  // Extract from description: "Sub-assessment from {CriterionName}"
  // Return grouped structure
}

// Aggregate transmuted scores per group
const aggregateGroupScores = (groupedAssessments, studentGrades) => {
  // For each group, sum transmuted scores
}

// Calculate final grade
const calculateFinalGrade = (aggregatedScores) => {
  // Sum all aggregated scores
}

// Convert to numeric grade
const convertToNumericGrade = (finalPercentage) => {
  // Apply grading scale
}
```

#### B. Update Grading Interface
- Show grouped assessments (already implemented)
- Display Actual Score column
- Display Transmuted Score column
- Show aggregated scores per group
- Display Final Grade with numeric conversion

#### C. Add Computation Display Section
- Show computation breakdown:
  - Raw → Actual (with formula)
  - Actual → Transmuted (with weight)
  - Grouped aggregations
  - Final grade calculation

### 2. Backend Changes

#### A. Update Grade Submission (`backend/routes/grading.js`)
- Calculate and store `actual_score`
- Calculate and store `transmuted_score`
- Update submission record

#### B. Add Final Grade Calculation Endpoint
```javascript
POST /api/grading/calculate-final-grade
- Get all assessments for a student in a class
- Group by parent criterion
- Calculate transmuted scores
- Aggregate and calculate final grade
- Store in course_final_grades table
```

#### C. Update Database Schema
- Add `actual_score` and `transmuted_score` to submissions
- Ensure `course_final_grades` table is properly structured

### 3. Data Flow

```
1. Faculty enters Raw Score → Adjusted Score (raw - penalty)
2. System calculates Actual Score = (Adjusted / Max) × 62.5 + 37.5
3. System calculates Transmuted Score = Actual × (Weight / 100)
4. System groups assessments by parent criterion
5. System aggregates transmuted scores per group
6. System calculates Final Grade = Sum of all aggregated scores
7. System converts Final Grade to Numeric Grade using scale
8. System stores all computed values in database
```

## UI/UX Considerations

### Grading Tab Enhancements:
1. **Grouped View**: Show assessments grouped by parent criterion (already done)
2. **Computation Columns**: 
   - Raw Score (input)
   - Adjusted Score (raw - penalty)
   - Actual Score (computed, read-only)
   - Transmuted Score (computed, read-only)
3. **Summary Section**:
   - Per-group aggregated scores
   - Final grade display
   - Numeric grade conversion
4. **Visual Indicators**:
   - Color-code by grade ranges
   - Show computation formula on hover
   - Highlight final grade prominently

## Testing Scenarios

1. **Single Assessment**: Verify transmutation and weighting
2. **Multiple Sub-assessments**: Verify grouping and aggregation
3. **Edge Cases**:
   - Zero raw score → 37.5 actual
   - Perfect score → 100 actual
   - Missing submission → 0 transmuted
4. **Final Grade**: Verify aggregation and numeric conversion

## Questions to Clarify

1. **Grading Scale**: Exact mapping for values between thresholds (e.g., 76, 77, 79)
2. **Penalty Handling**: Should penalty be applied before or after transmutation?
3. **Missing Submissions**: How to handle missing assessments in final grade?
4. **Weight Validation**: Ensure weights sum to 100% per course?
5. **Rounding**: How many decimal places for each calculation step?

