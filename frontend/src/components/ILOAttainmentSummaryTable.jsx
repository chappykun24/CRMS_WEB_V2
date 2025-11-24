import React from 'react'
import { PrinterIcon } from '@heroicons/react/24/solid'

const ILOAttainmentSummaryTable = ({ 
  courseCode, 
  courseTitle, 
  sectionCode, 
  totalStudents,
  iloAttainment = [],
  assessments = [],
  passThreshold = 75,
  students = [], // Add students data to count actual attainment
  mappingData = {}, // Add mapping data with descriptions: { so: [], sdg: [], iga: [], cdio: [], ilo_so_combinations: [], ilo_sdg_combinations: [], ilo_iga_combinations: [], ilo_cdio_combinations: [] }
  selectedPair = null // Selected pair: { type: 'SO'|'SDG'|'IGA'|'CDIO', key: 'ilo_so_key' etc }
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
              border: 2px solid #000;
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
              border: 1px solid #000;
            }
            td {
              text-align: center;
              border: 1px solid #000;
            }
            tr {
              border: 1px solid #000;
            }
            tbody tr {
              border-bottom: 1px solid #000;
            }
            thead {
              border-bottom: 2px solid #000;
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
    
    // Common parent assessment patterns
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

  // Group assessments by parent and calculate actual student counts
  const groupAssessmentsByParent = () => {
    const parentGroups = {}
    
    // First, group assessments by parent
    assessments.forEach(assessment => {
      const title = assessment.title || assessment.assessment_title || 'Unknown'
      const parentName = extractParentAssessment(title)
      const code = assessment.code || assessment.abbreviation || '-'
      
      if (!parentGroups[parentName]) {
        parentGroups[parentName] = {
          name: parentName,
          subAssessments: [],
          codes: []
        }
      }
      
      parentGroups[parentName].subAssessments.push({
        assessment_id: assessment.assessment_id,
        title,
        code,
        assessment
      })
      
      if (code !== '-') {
        parentGroups[parentName].codes.push(code)
      }
    })
    
    // For each parent assessment and sub-assessment, calculate ILO data
    Object.keys(parentGroups).forEach(parentName => {
      const group = parentGroups[parentName]
      
      // Initialize parent ILO data
      group.iloData = {}
      
      // Calculate ILO data for each sub-assessment
      group.subAssessments.forEach(sub => {
        sub.iloData = {}
        
        iloAttainment.forEach(ilo => {
          // Check if this sub-assessment contributes to this ILO
          const assessment = sub.assessment
          const contributes = assessment.ilo_id === ilo.ilo_id || 
                             (assessment.ilo_ids && assessment.ilo_ids.includes(ilo.ilo_id)) ||
                             true // All assessments in syllabus contribute to all ILOs by default
          
          if (contributes && students.length > 0) {
            // Count students who passed this specific sub-assessment for this ILO
            const passedStudents = new Set()
            
            students.forEach(student => {
              if (student.assessment_scores) {
                const assessmentScore = student.assessment_scores.find(
                  score => score.assessment_id === sub.assessment_id
                )
                if (assessmentScore) {
                  const scorePct = parseFloat(assessmentScore.score_percentage || 0)
                  if (scorePct >= passThreshold) {
                    passedStudents.add(student.student_id)
                  }
                }
              }
            })
            
            const finalCount = passedStudents.size
            
            sub.iloData[ilo.ilo_id] = {
              attained: finalCount,
              total: totalStudents,
              percentage: totalStudents > 0 ? (finalCount / totalStudents) * 100 : 0,
              contributes: true
            }
          } else {
            sub.iloData[ilo.ilo_id] = null
          }
        })
      })
      
      // Calculate parent-level ILO data (aggregate of all sub-assessments)
      iloAttainment.forEach(ilo => {
        // Get all sub-assessments for this parent that contribute to this ILO
        const contributingAssessments = group.subAssessments.filter(sub => {
          const iloData = sub.iloData[ilo.ilo_id]
          return iloData && iloData.contributes
        })
        
        if (contributingAssessments.length > 0 && students.length > 0) {
          // Count students who passed at least one of the contributing assessments
          const passedStudents = new Set()
          
          contributingAssessments.forEach(sub => {
            students.forEach(student => {
              if (student.assessment_scores) {
                const assessmentScore = student.assessment_scores.find(
                  score => score.assessment_id === sub.assessment_id
                )
                if (assessmentScore) {
                  const scorePct = parseFloat(assessmentScore.score_percentage || 0)
                  if (scorePct >= passThreshold) {
                    passedStudents.add(student.student_id)
                  }
                }
              }
            })
          })
          
          const finalCount = passedStudents.size
          
          group.iloData[ilo.ilo_id] = {
            attained: finalCount,
            total: totalStudents,
            percentage: totalStudents > 0 ? (finalCount / totalStudents) * 100 : 0,
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
    <div className="bg-white">
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
          <table style={{ border: '2px solid #000', borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 'bold', width: '150px', backgroundColor: '#f0f0f0' }}>Course Code:</td>
                <td style={{ border: '1px solid #000', padding: '5px 10px' }}>{courseCode || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>Course Title:</td>
                <td style={{ border: '1px solid #000', padding: '5px 10px' }}>{courseTitle || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>Section:</td>
                <td style={{ border: '1px solid #000', padding: '5px 10px' }}>{sectionCode || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>Total Number of Students:</td>
                <td style={{ border: '1px solid #000', padding: '5px 10px' }}>{totalStudents || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Assessment Results Analysis Table */}
        {parentAssessments.length > 0 && iloAttainment.length > 0 && (
          <div className="table-container">
            <h3 className="text-sm font-semibold mb-2">1. Assessment Results Analysis</h3>
            <table style={{ border: '2px solid #000', borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>Assessment Task</th>
                  {iloAttainment.map(ilo => (
                    <th key={ilo.ilo_id} style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>{ilo.ilo_code}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parentAssessments.map((parent, parentIdx) => {
                  return (
                    <React.Fragment key={parentIdx}>
                      {/* Parent Assessment Row */}
                      <tr>
                        <td className="assessment-task" style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>
                          {parent.name}
                        </td>
                        {iloAttainment.map(ilo => {
                          const iloData = parent.iloData[ilo.ilo_id]
                          if (!iloData || !iloData.contributes) {
                            return <td key={ilo.ilo_id} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>-</td>
                          }
                          return (
                            <td key={ilo.ilo_id} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                              {iloData.attained}/{iloData.total} ({iloData.percentage.toFixed(0)}%)
                            </td>
                          )
                        })}
                      </tr>
                      {/* Sub-Assessment Rows */}
                      {parent.subAssessments.map((sub, subIdx) => (
                        <tr key={`${parentIdx}-${subIdx}`}>
                          <td className="assessment-task" style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', paddingLeft: '24px', fontStyle: 'italic' }}>
                            {sub.title}
                          </td>
                          {iloAttainment.map(ilo => {
                            const iloData = sub.iloData[ilo.ilo_id]
                            if (!iloData || !iloData.contributes) {
                              return <td key={ilo.ilo_id} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>-</td>
                            }
                            return (
                              <td key={ilo.ilo_id} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                                {iloData.attained}/{iloData.total} ({iloData.percentage.toFixed(0)}%)
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ILO Attainment Table */}
        {iloAttainment.length > 0 && (
          <div className="table-container">
            <h3 className="text-sm font-semibold mb-2">2. Intended Learning Outcomes (ILO) Attainment</h3>
            <table style={{ border: '2px solid #000', borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>ILO</th>
                  <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>Description</th>
                  <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>Students Attained</th>
                  <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>% Attained</th>
                  <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>Attainment Status</th>
                </tr>
              </thead>
              <tbody>
                {iloAttainment.map(ilo => {
                  const attainedCount = Math.round((ilo.attainment_percentage / 100) * totalStudents)
                  const isAttained = ilo.attainment_percentage >= passThreshold
                  
                  return (
                    <tr key={ilo.ilo_id}>
                      <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{ilo.ilo_code}</td>
                      <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>{ilo.description || 'N/A'}</td>
                      <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{attainedCount}/{totalStudents}</td>
                      <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{ilo.attainment_percentage.toFixed(2)}%</td>
                      <td className={isAttained ? 'attained' : 'not-attained'} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                        {isAttained ? '✓ Attained' : '✗ Not Attained'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected Pair (SO/SDG/IGA/CDIO) Attainment Table */}
        {(() => {
          if (!selectedPair || !selectedPair.type || !selectedPair.key) {
            return null
          }
          
          // Find the selected combination
          let selectedCombination = null
          let pairType = selectedPair.type
          let pairCode = ''
          let pairDescription = ''
          let pairLabel = ''
          
          if (pairType === 'SO' && mappingData.ilo_so_combinations) {
            selectedCombination = mappingData.ilo_so_combinations.find(c => c.ilo_so_key === selectedPair.key)
            if (selectedCombination) {
              pairCode = selectedCombination.so_code
              pairDescription = selectedCombination.so_description || ''
              pairLabel = 'Student Outcomes (SO)'
            }
          } else if (pairType === 'SDG' && mappingData.ilo_sdg_combinations) {
            selectedCombination = mappingData.ilo_sdg_combinations.find(c => c.ilo_sdg_key === selectedPair.key)
            if (selectedCombination) {
              pairCode = selectedCombination.sdg_code
              pairDescription = selectedCombination.sdg_description || ''
              pairLabel = 'Sustainable Development Goals (SDG)'
            }
          } else if (pairType === 'IGA' && mappingData.ilo_iga_combinations) {
            selectedCombination = mappingData.ilo_iga_combinations.find(c => c.ilo_iga_key === selectedPair.key)
            if (selectedCombination) {
              pairCode = selectedCombination.iga_code
              pairDescription = selectedCombination.iga_description || ''
              pairLabel = 'Institutional Graduate Attributes (IGA)'
            }
          } else if (pairType === 'CDIO' && mappingData.ilo_cdio_combinations) {
            selectedCombination = mappingData.ilo_cdio_combinations.find(c => c.ilo_cdio_key === selectedPair.key)
            if (selectedCombination) {
              pairCode = selectedCombination.cdio_code
              pairDescription = selectedCombination.cdio_description || ''
              pairLabel = 'CDIO Skills'
            }
          }
          
          if (!selectedCombination) {
            return null
          }
          
          // Find the ILO that matches this combination
          const matchingILO = iloAttainment.find(ilo => ilo.ilo_id === selectedCombination.ilo_id)
          if (!matchingILO) {
            return null
          }
          
          const attainedCount = Math.round((matchingILO.attainment_percentage / 100) * totalStudents)
          const isAttained = matchingILO.attainment_percentage >= passThreshold
          
          return (
            <div className="table-container">
              <h3 className="text-sm font-semibold mb-2">3. {pairLabel} Attainment</h3>
              <table style={{ border: '2px solid #000', borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>{pairType}</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>Description</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>Students Attained</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>% Attained</th>
                    <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>Attainment Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{pairCode}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>{pairDescription || 'N/A'}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{attainedCount}/{totalStudents}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{matchingILO.attainment_percentage.toFixed(2)}%</td>
                    <td className={isAttained ? 'attained' : 'not-attained'} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                      {isAttained ? '✓ Attained' : '✗ Not Attained'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })()}

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
