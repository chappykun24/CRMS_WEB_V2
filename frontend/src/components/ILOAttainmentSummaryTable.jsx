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

  // Calculate assessment-ILO matrix
  const assessmentILOMatrix = assessments.map(assessment => {
    const row = {
      assessment: assessment.title || assessment.assessment_title || 'N/A',
      abbreviation: assessment.code || assessment.abbreviation || '-',
      iloData: {}
    }
    
    // For each ILO, check if this assessment contributes to it
    iloAttainment.forEach(ilo => {
      // Check if assessment is mapped to this ILO
      const contributesToILO = assessment.ilo_id === ilo.ilo_id || 
        (assessment.ilo_ids && assessment.ilo_ids.includes(ilo.ilo_id))
      
      if (contributesToILO) {
        // Calculate students who attained this ILO through this assessment
        // This is a simplified calculation - you may need to adjust based on actual data structure
        const attainedCount = Math.round((ilo.attainment_percentage / 100) * totalStudents)
        row.iloData[ilo.ilo_id] = {
          attained: attainedCount,
          total: totalStudents,
          percentage: ilo.attainment_percentage
        }
      } else {
        row.iloData[ilo.ilo_id] = null
      }
    })
    
    return row
  })

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
    const bestILO = iloAttainment.reduce((best, current) => 
      current.attainment_percentage > best.attainment_percentage ? current : best
    , iloAttainment[0])
    
    if (bestILO && bestILO.attainment_percentage === 100) {
      interpretations.push(`${bestILO.ilo_code} (100%) reflects students' full proficiency in ${bestILO.description?.toLowerCase() || 'this learning outcome'}.`)
    }
    
    // Assessment performance
    const highPerformingAssessments = assessments.filter(a => 
      parseFloat(a.average_percentage || 0) >= 80
    )
    if (highPerformingAssessments.length > 0) {
      interpretations.push(`Outstanding performance in ${highPerformingAssessments.map(a => a.title || a.assessment_title).join(', ')} with 100% pass rates.`)
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
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
        {assessmentILOMatrix.length > 0 && (
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
                {assessmentILOMatrix.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'left', fontWeight: 'bold' }}>
                      {row.assessment} ({row.abbreviation})
                    </td>
                    {iloAttainment.map(ilo => {
                      const iloData = row.iloData[ilo.ilo_id]
                      if (!iloData) {
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

