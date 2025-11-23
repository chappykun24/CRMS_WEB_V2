import React from 'react'
import { PrinterIcon } from '@heroicons/react/24/solid'

const ILOAttainmentSummaryTable = ({ 
  courseCode, 
  courseTitle, 
  sectionCode, 
  totalStudents,
  iloAttainment = [],
  assessments = [],
  passThreshold = 75
}) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const printContent = document.getElementById('ilo-attainment-summary-table').innerHTML
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ILO Attainment Summary - ${courseCode} ${sectionCode}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
            }
            body {
              font-family: 'Times New Roman', serif;
              font-size: 11pt;
              line-height: 1.4;
              color: #000;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 {
              font-size: 16pt;
              font-weight: bold;
              margin: 0 0 10px 0;
            }
            .course-info {
              margin-bottom: 20px;
            }
            .course-info table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .course-info td {
              padding: 5px 10px;
              border: 1px solid #000;
            }
            .course-info td:first-child {
              font-weight: bold;
              width: 150px;
              background-color: #f0f0f0;
            }
            .table-container {
              margin-bottom: 20px;
            }
            .table-container h3 {
              font-size: 12pt;
              font-weight: bold;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
              text-align: center;
            }
            td {
              text-align: center;
            }
            .assessment-task {
              text-align: left !important;
              font-weight: bold;
            }
            .attained {
              color: #008000;
              font-weight: bold;
            }
            .not-attained {
              color: #ff0000;
              font-weight: bold;
            }
            .interpretation {
              margin-top: 20px;
              padding: 15px;
              border: 1px solid #000;
              background-color: #f9f9f9;
            }
            .interpretation h3 {
              margin-top: 0;
              font-size: 12pt;
              font-weight: bold;
            }
            .interpretation ul {
              margin: 10px 0;
              padding-left: 25px;
            }
            .interpretation li {
              margin: 5px 0;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 9pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  // Extract parent assessment name from title
  // Examples: "Written Assessment 1" -> "Written Assessment"
  //           "Midterm Examination 2" -> "Midterm Examination"
  //           "Laboratory Assessment 3" -> "Laboratory Assessment"
  const extractParentAssessment = (title) => {
    if (!title) return 'Other'
    
    // Remove trailing numbers and common patterns
    const patterns = [
      /\s+\d+$/,  // "Assessment 1" -> "Assessment"
      /\s+\(.*\)$/,  // "Assessment (Code)" -> "Assessment"
      /\s*-\s*.*$/,  // "Assessment - Code" -> "Assessment"
    ]
    
    let parent = title
    patterns.forEach(pattern => {
      parent = parent.replace(pattern, '')
    })
    
    // If still has numbers, try to extract meaningful parent
    const commonParents = [
      'Written Assessment',
      'Midterm Examination',
      'Final Examination',
      'Laboratory Assessment',
      'Laboratory Activity',
      'Project',
      'Assignment',
      'Quiz',
      'Presentation',
      'Case Study'
    ]
    
    for (const commonParent of commonParents) {
      if (title.toLowerCase().includes(commonParent.toLowerCase())) {
        return commonParent
      }
    }
    
    return parent.trim() || 'Other'
  }

  // Group assessments by parent and calculate attainment
  const groupAssessmentsByParent = () => {
    const parentGroups = {}
    
    assessments.forEach(assessment => {
      const title = assessment.title || assessment.assessment_title || 'Unknown'
      const parentName = extractParentAssessment(title)
      const avgPercentage = parseFloat(assessment.average_percentage || 0)
      const submissionsCount = parseInt(assessment.submissions_count || assessment.total_students || 0)
      
      if (!parentGroups[parentName]) {
        parentGroups[parentName] = {
          name: parentName,
          subAssessments: [],
          totalSubmissions: 0,
          totalStudents: 0,
          avgPercentage: 0,
          iloData: {}
        }
      }
      
      parentGroups[parentName].subAssessments.push({
        title,
        code: assessment.code || assessment.abbreviation || '-',
        avgPercentage,
        submissionsCount,
        assessment
      })
      
      parentGroups[parentName].totalSubmissions += submissionsCount
      parentGroups[parentName].totalStudents = Math.max(
        parentGroups[parentName].totalStudents,
        totalStudents
      )
    })
    
    // Calculate average percentage and student counts for each parent assessment per ILO
    Object.keys(parentGroups).forEach(parentName => {
      const group = parentGroups[parentName]
      
      // Calculate average percentage across all sub-assessments
      if (group.subAssessments.length > 0) {
        const totalAvg = group.subAssessments.reduce((sum, sub) => sum + sub.avgPercentage, 0)
        group.avgPercentage = totalAvg / group.subAssessments.length
      }
      
      // For each ILO, calculate how many students attained the passing threshold
      iloAttainment.forEach(ilo => {
        // Check if any sub-assessment contributes to this ILO
        const contributingSubs = group.subAssessments.filter(sub => {
          const assessment = sub.assessment
          return assessment.ilo_id === ilo.ilo_id || 
                 (assessment.ilo_ids && assessment.ilo_ids.includes(ilo.ilo_id))
        })
        
        if (contributingSubs.length > 0) {
          // Calculate students who passed: based on average percentage
          // If average percentage >= passThreshold, count students who passed
          const avgPct = contributingSubs.reduce((sum, sub) => sum + sub.avgPercentage, 0) / contributingSubs.length
          
          // Estimate: if average is above threshold, assume proportional students passed
          // More accurate would require student-level data
          let attainedCount = 0
          if (avgPct >= passThreshold) {
            // Estimate based on average performance
            // If average is 80% and threshold is 75%, estimate ~80% of students passed
            const estimatedPassRate = Math.min(100, (avgPct / passThreshold) * 75)
            attainedCount = Math.round((estimatedPassRate / 100) * totalStudents)
          } else {
            // If average is below threshold, estimate lower pass rate
            const estimatedPassRate = Math.max(0, (avgPct / passThreshold) * 50)
            attainedCount = Math.round((estimatedPassRate / 100) * totalStudents)
          }
          
          // Use actual ILO attainment data if available (more accurate)
          const iloAttainedCount = Math.round((ilo.attainment_percentage / 100) * totalStudents)
          
          group.iloData[ilo.ilo_id] = {
            attained: iloAttainedCount,
            total: totalStudents,
            percentage: ilo.attainment_percentage,
            contributes: true
          }
        } else {
          group.iloData[ilo.ilo_id] = null
        }
      })
    })
    
    return Object.values(parentGroups)
  }

  const parentAssessments = groupAssessmentsByParent()

  // Generate interpretation
  const generateInterpretation = () => {
    const interpretations = []
    
    // Overall attainment
    const allAttained = iloAttainment.every(ilo => ilo.attainment_percentage >= passThreshold)
    if (allAttained) {
      interpretations.push('All ILOs are successfully attained.')
    } else {
      const notAttained = iloAttainment.filter(ilo => ilo.attainment_percentage < passThreshold)
      interpretations.push(`${notAttained.length} ILO(s) did not meet the ${passThreshold}% threshold.`)
    }
    
    // Best performing ILO
    if (iloAttainment.length > 0) {
      const bestILO = iloAttainment.reduce((best, current) => 
        current.attainment_percentage > best.attainment_percentage ? current : best
      , iloAttainment[0])
      
      if (bestILO && bestILO.attainment_percentage === 100) {
        interpretations.push(`${bestILO.ilo_code} (100%) reflects students' full proficiency in ${bestILO.description?.toLowerCase() || 'this learning outcome'}.`)
      }
    }
    
    return interpretations
  }

  const interpretations = generateInterpretation()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">ILO Attainment Summary</h3>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <PrinterIcon className="h-5 w-5" />
          <span>Print Summary</span>
        </button>
      </div>

      <div id="ilo-attainment-summary-table" className="print-content">
        {/* Header */}
        <div className="header print-only">
          <h1>Course Assessment and Continuous Improvement Plan</h1>
        </div>

        {/* Course Information */}
        <div className="course-info">
          <table>
            <tbody>
              <tr>
                <td>Course Code:</td>
                <td>{courseCode || 'N/A'}</td>
              </tr>
              <tr>
                <td>Course Title:</td>
                <td>{courseTitle || 'N/A'}</td>
              </tr>
              <tr>
                <td>Section:</td>
                <td>{sectionCode || 'N/A'}</td>
              </tr>
              <tr>
                <td>Total Number of Students:</td>
                <td>{totalStudents || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Assessment Results Analysis Table */}
        {parentAssessments.length > 0 && iloAttainment.length > 0 && (
          <div className="table-container">
            <h3 className="text-sm font-semibold mb-2">1. Assessment Results Analysis</h3>
            <table>
              <thead>
                <tr>
                  <th>Assessment Task</th>
                  {iloAttainment.map(ilo => (
                    <th key={ilo.ilo_id}>{ilo.ilo_code}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parentAssessments.map((parent, idx) => (
                  <tr key={idx}>
                    <td className="assessment-task">
                      {parent.name} ({parent.subAssessments.map(sub => sub.code).filter(Boolean).join(', ') || '-'})
                    </td>
                    {iloAttainment.map(ilo => {
                      const iloData = parent.iloData[ilo.ilo_id]
                      if (!iloData || !iloData.contributes) {
                        return <td key={ilo.ilo_id}>-</td>
                      }
                      return (
                        <td key={ilo.ilo_id}>
                          {iloData.attained}/{iloData.total} ({iloData.percentage.toFixed(0)}%)
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ILO Attainment Table */}
        {iloAttainment.length > 0 && (
          <div className="table-container">
            <h3 className="text-sm font-semibold mb-2">2. Intended Learning Outcomes (ILO) Attainment</h3>
            <table>
              <thead>
                <tr>
                  <th>ILO</th>
                  <th>Description</th>
                  <th>Students Attained</th>
                  <th>% Attained</th>
                  <th>Attainment Status</th>
                </tr>
              </thead>
              <tbody>
                {iloAttainment.map(ilo => {
                  const attainedCount = Math.round((ilo.attainment_percentage / 100) * totalStudents)
                  const isAttained = ilo.attainment_percentage >= passThreshold
                  
                  return (
                    <tr key={ilo.ilo_id}>
                      <td>{ilo.ilo_code}</td>
                      <td style={{ textAlign: 'left' }}>{ilo.description || 'N/A'}</td>
                      <td>{attainedCount}/{totalStudents}</td>
                      <td>{ilo.attainment_percentage.toFixed(2)}%</td>
                      <td className={isAttained ? 'attained' : 'not-attained'}>
                        {isAttained ? '✓ Attained' : '✗ Not Attained'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Interpretation */}
        {interpretations.length > 0 && (
          <div className="interpretation">
            <h3>Interpretation:</h3>
            <ul>
              {interpretations.map((interpretation, idx) => (
                <li key={idx}>{interpretation}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <p>Generated on {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .print-content {
            display: block;
          }
          .no-print {
            display: none !important;
          }
          button {
            display: none !important;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}} />
    </div>
  )
}

export default ILOAttainmentSummaryTable
