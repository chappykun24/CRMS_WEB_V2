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
  mappingData = {} // Add mapping data with descriptions: { so: [], sdg: [], iga: [], cdio: [], ilo_so_combinations: [], ilo_sdg_combinations: [], ilo_iga_combinations: [], ilo_cdio_combinations: [] }
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
    
    // For each parent assessment and ILO, count students who passed
    Object.keys(parentGroups).forEach(parentName => {
      const group = parentGroups[parentName]
      
      // Initialize ILO data
      group.iloData = {}
      
      iloAttainment.forEach(ilo => {
        // Get all sub-assessments for this parent that contribute to this ILO
        const contributingAssessments = group.subAssessments.filter(sub => {
          const assessment = sub.assessment
          // Check if assessment is connected to this ILO
          return assessment.ilo_id === ilo.ilo_id || 
                 (assessment.ilo_ids && assessment.ilo_ids.includes(ilo.ilo_id)) ||
                 // If no explicit connection, check if assessment is in the same syllabus (default connection)
                 true // All assessments in syllabus contribute to all ILOs by default
        })
        
        if (contributingAssessments.length > 0 && students.length > 0) {
          // Count students who passed at least one of the contributing assessments
          // A student passes if they scored >= passThreshold on at least one assessment in this parent group
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
                {parentAssessments.map((parent, idx) => {
                  const codesDisplay = parent.codes.length > 0 
                    ? `(${parent.codes.join(', ')})` 
                    : '(-)'
                  
                  return (
                    <tr key={idx}>
                      <td className="assessment-task">
                        {parent.name} {codesDisplay}
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

        {/* Student Outcomes (SO) / SDG / IGA / CDIO Attainment Table */}
        {(() => {
          // Collect all mappings from ILOs
          const allMappings = []
          
          iloAttainment.forEach(ilo => {
            // Get mappings from ilo.mapped_to if available
            if (ilo.mapped_to && Array.isArray(ilo.mapped_to)) {
              ilo.mapped_to.forEach(mapping => {
                allMappings.push({
                  type: mapping.type,
                  code: mapping.code,
                  ilo_code: ilo.ilo_code,
                  ilo_description: ilo.description,
                  attainment_percentage: ilo.attainment_percentage,
                  attained_count: Math.round((ilo.attainment_percentage / 100) * totalStudents),
                  total_students: totalStudents
                })
              })
            }
            
            // Also check mappingData for combinations with descriptions
            if (mappingData.ilo_so_combinations) {
              mappingData.ilo_so_combinations.forEach(combo => {
                if (combo.ilo_id === ilo.ilo_id) {
                  allMappings.push({
                    type: 'SO',
                    code: combo.so_code,
                    description: combo.so_description,
                    ilo_code: ilo.ilo_code,
                    ilo_description: ilo.description,
                    attainment_percentage: ilo.attainment_percentage,
                    attained_count: Math.round((ilo.attainment_percentage / 100) * totalStudents),
                    total_students: totalStudents
                  })
                }
              })
            }
            
            if (mappingData.ilo_sdg_combinations) {
              mappingData.ilo_sdg_combinations.forEach(combo => {
                if (combo.ilo_id === ilo.ilo_id) {
                  allMappings.push({
                    type: 'SDG',
                    code: combo.sdg_code,
                    description: combo.sdg_description,
                    ilo_code: ilo.ilo_code,
                    ilo_description: ilo.description,
                    attainment_percentage: ilo.attainment_percentage,
                    attained_count: Math.round((ilo.attainment_percentage / 100) * totalStudents),
                    total_students: totalStudents
                  })
                }
              })
            }
            
            if (mappingData.ilo_iga_combinations) {
              mappingData.ilo_iga_combinations.forEach(combo => {
                if (combo.ilo_id === ilo.ilo_id) {
                  allMappings.push({
                    type: 'IGA',
                    code: combo.iga_code,
                    description: combo.iga_description,
                    ilo_code: ilo.ilo_code,
                    ilo_description: ilo.description,
                    attainment_percentage: ilo.attainment_percentage,
                    attained_count: Math.round((ilo.attainment_percentage / 100) * totalStudents),
                    total_students: totalStudents
                  })
                }
              })
            }
            
            if (mappingData.ilo_cdio_combinations) {
              mappingData.ilo_cdio_combinations.forEach(combo => {
                if (combo.ilo_id === ilo.ilo_id) {
                  allMappings.push({
                    type: 'CDIO',
                    code: combo.cdio_code,
                    description: combo.cdio_description,
                    ilo_code: ilo.ilo_code,
                    ilo_description: ilo.description,
                    attainment_percentage: ilo.attainment_percentage,
                    attained_count: Math.round((ilo.attainment_percentage / 100) * totalStudents),
                    total_students: totalStudents
                  })
                }
              })
            }
          })
          
          // Group by type and remove duplicates, also enrich with descriptions from reference data
          const soMappings = []
          const sdgMappings = []
          const igaMappings = []
          const cdioMappings = []
          
          const seen = new Set()
          allMappings.forEach(mapping => {
            const key = `${mapping.type}_${mapping.code}`
            if (!seen.has(key)) {
              seen.add(key)
              
              // Enrich with description from reference data if not already present
              if (!mapping.description) {
                if (mapping.type === 'SO' && mappingData.so) {
                  const soRef = mappingData.so.find(r => r.so_code === mapping.code)
                  if (soRef) mapping.description = soRef.description || soRef.name
                } else if (mapping.type === 'SDG' && mappingData.sdg) {
                  const sdgRef = mappingData.sdg.find(r => r.sdg_code === mapping.code)
                  if (sdgRef) mapping.description = sdgRef.description || sdgRef.name
                } else if (mapping.type === 'IGA' && mappingData.iga) {
                  const igaRef = mappingData.iga.find(r => r.iga_code === mapping.code)
                  if (igaRef) mapping.description = igaRef.description || igaRef.name
                } else if (mapping.type === 'CDIO' && mappingData.cdio) {
                  const cdioRef = mappingData.cdio.find(r => r.cdio_code === mapping.code)
                  if (cdioRef) mapping.description = cdioRef.description || cdioRef.name
                }
              }
              
              if (mapping.type === 'SO') soMappings.push(mapping)
              else if (mapping.type === 'SDG') sdgMappings.push(mapping)
              else if (mapping.type === 'IGA') igaMappings.push(mapping)
              else if (mapping.type === 'CDIO') cdioMappings.push(mapping)
            }
          })
          
          // Render tables for each mapping type
          const tables = []
          
          if (soMappings.length > 0) {
            tables.push(
              <div key="so" className="table-container">
                <h3 className="text-sm font-semibold mb-2">3. Student Outcomes (SO) Attainment</h3>
                <table>
                  <thead>
                    <tr>
                      <th>SO</th>
                      <th>Description</th>
                      <th>Students Attained</th>
                      <th>% Attained</th>
                      <th>Attainment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soMappings.map((mapping, idx) => {
                      const isAttained = mapping.attainment_percentage >= passThreshold
                      return (
                        <tr key={`so-${idx}`}>
                          <td>{mapping.code}</td>
                          <td style={{ textAlign: 'left' }}>{mapping.description || 'N/A'}</td>
                          <td>{mapping.attained_count}/{mapping.total_students}</td>
                          <td>{mapping.attainment_percentage.toFixed(2)}%</td>
                          <td className={isAttained ? 'attained' : 'not-attained'}>
                            {isAttained ? '✓ Attained' : '✗ Not Attained'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
          
          if (sdgMappings.length > 0) {
            tables.push(
              <div key="sdg" className="table-container">
                <h3 className="text-sm font-semibold mb-2">4. Sustainable Development Goals (SDG) Attainment</h3>
                <table>
                  <thead>
                    <tr>
                      <th>SDG</th>
                      <th>Description</th>
                      <th>Students Attained</th>
                      <th>% Attained</th>
                      <th>Attainment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sdgMappings.map((mapping, idx) => {
                      const isAttained = mapping.attainment_percentage >= passThreshold
                      return (
                        <tr key={`sdg-${idx}`}>
                          <td>{mapping.code}</td>
                          <td style={{ textAlign: 'left' }}>{mapping.description || 'N/A'}</td>
                          <td>{mapping.attained_count}/{mapping.total_students}</td>
                          <td>{mapping.attainment_percentage.toFixed(2)}%</td>
                          <td className={isAttained ? 'attained' : 'not-attained'}>
                            {isAttained ? '✓ Attained' : '✗ Not Attained'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
          
          if (igaMappings.length > 0) {
            tables.push(
              <div key="iga" className="table-container">
                <h3 className="text-sm font-semibold mb-2">5. Institutional Graduate Attributes (IGA) Attainment</h3>
                <table>
                  <thead>
                    <tr>
                      <th>IGA</th>
                      <th>Description</th>
                      <th>Students Attained</th>
                      <th>% Attained</th>
                      <th>Attainment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {igaMappings.map((mapping, idx) => {
                      const isAttained = mapping.attainment_percentage >= passThreshold
                      return (
                        <tr key={`iga-${idx}`}>
                          <td>{mapping.code}</td>
                          <td style={{ textAlign: 'left' }}>{mapping.description || 'N/A'}</td>
                          <td>{mapping.attained_count}/{mapping.total_students}</td>
                          <td>{mapping.attainment_percentage.toFixed(2)}%</td>
                          <td className={isAttained ? 'attained' : 'not-attained'}>
                            {isAttained ? '✓ Attained' : '✗ Not Attained'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
          
          if (cdioMappings.length > 0) {
            tables.push(
              <div key="cdio" className="table-container">
                <h3 className="text-sm font-semibold mb-2">6. CDIO Skills Attainment</h3>
                <table>
                  <thead>
                    <tr>
                      <th>CDIO</th>
                      <th>Description</th>
                      <th>Students Attained</th>
                      <th>% Attained</th>
                      <th>Attainment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cdioMappings.map((mapping, idx) => {
                      const isAttained = mapping.attainment_percentage >= passThreshold
                      return (
                        <tr key={`cdio-${idx}`}>
                          <td>{mapping.code}</td>
                          <td style={{ textAlign: 'left' }}>{mapping.description || 'N/A'}</td>
                          <td>{mapping.attained_count}/{mapping.total_students}</td>
                          <td>{mapping.attainment_percentage.toFixed(2)}%</td>
                          <td className={isAttained ? 'attained' : 'not-attained'}>
                            {isAttained ? '✓ Attained' : '✗ Not Attained'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
          
          return tables.length > 0 ? <>{tables}</> : null
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
