// Dynamic import for xlsx to avoid blocking initial render
let XLSX = null

/**
 * Export syllabus data to Excel format
 * @param {Object} syllabus - The syllabus object with all details
 * @param {Array} ilos - Array of ILOs with their mappings
 * @param {Array} soReferences - SO reference data
 * @param {Array} igaReferences - IGA reference data
 * @param {Array} cdioReferences - CDIO reference data
 * @param {Array} sdgReferences - SDG reference data
 */
export const exportSyllabusToExcel = async (
  syllabus,
  ilos = [],
  soReferences = [],
  igaReferences = [],
  cdioReferences = [],
  sdgReferences = []
) => {
  // Validate syllabus object
  if (!syllabus || typeof syllabus !== 'object') {
    console.error('Invalid syllabus object:', syllabus)
    alert('Error: Invalid syllabus data. Cannot export to Excel.')
    return
  }

  // Load xlsx library dynamically if not already loaded
  if (!XLSX) {
    try {
      const xlsxModule = await import('xlsx')
      XLSX = xlsxModule.default || xlsxModule
    } catch (error) {
      console.error('Error loading xlsx library:', error)
      alert('Error: Failed to load Excel export library. Please refresh the page and try again.')
      return
    }
  }

  console.log('Exporting syllabus to Excel:', {
    syllabusId: syllabus.syllabus_id,
    title: syllabus.title,
    ilosCount: Array.isArray(ilos) ? ilos.length : 0,
    soRefsCount: Array.isArray(soReferences) ? soReferences.length : 0,
    igaRefsCount: Array.isArray(igaReferences) ? igaReferences.length : 0,
    cdioRefsCount: Array.isArray(cdioReferences) ? cdioReferences.length : 0,
    sdgRefsCount: Array.isArray(sdgReferences) ? sdgReferences.length : 0,
  })

  const workbook = XLSX.utils.book_new()

  // Helper function to format JSON fields
  const formatJSONField = (field) => {
    if (!field) return ''
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field)
        return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : parsed
      } catch {
        return field
      }
    }
    if (typeof field === 'object') {
      return JSON.stringify(field, null, 2)
    }
    return String(field)
  }

  // Helper function to format array fields
  const formatArrayField = (field) => {
    if (!field) return ''
    if (Array.isArray(field)) {
      return field.join(', ')
    }
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field)
        if (Array.isArray(parsed)) {
          return parsed.join(', ')
        }
      } catch {
        return field
      }
    }
    return String(field)
  }

  // Sheet 1: Basic Syllabus Information
  const basicInfo = [
    ['Syllabus Information', ''],
    ['Syllabus ID', String(syllabus.syllabus_id || 'N/A')],
    ['Title', String(syllabus.title || 'N/A')],
    ['Course Code', String(syllabus.course_code || 'N/A')],
    ['Course Title', String(syllabus.course_title || 'N/A')],
    ['Section Code', String(syllabus.section_code || 'N/A')],
    ['Version', String(syllabus.version || 'N/A')],
    ['School Year', String(syllabus.school_year || 'N/A')],
    ['Semester', String(syllabus.semester || 'N/A')],
    ['Instructor', String(syllabus.instructor_name || 'N/A')],
    ['Review Status', String(syllabus.review_status || 'N/A')],
    ['Approval Status', String(syllabus.approval_status || 'N/A')],
    ['Reviewed By', String(syllabus.reviewer_name || 'N/A')],
    ['Reviewed At', syllabus.reviewed_at ? new Date(syllabus.reviewed_at).toLocaleString() : 'N/A'],
    ['Approved By', String(syllabus.approver_name || 'N/A')],
    ['Approved At', syllabus.approved_at ? new Date(syllabus.approved_at).toLocaleString() : 'N/A'],
    ['Created At', syllabus.created_at ? new Date(syllabus.created_at).toLocaleString() : 'N/A'],
    ['Updated At', syllabus.updated_at ? new Date(syllabus.updated_at).toLocaleString() : 'N/A'],
    ['', ''],
    ['Description', ''],
    [String(syllabus.description || 'N/A'), ''],
    ['', ''],
    ['Course Objectives', ''],
    [String(syllabus.course_objectives || 'N/A'), ''],
    ['', ''],
    ['Prerequisites', ''],
    [String(syllabus.prerequisites || 'N/A'), ''],
    ['', ''],
    ['Course Outline', ''],
    [String(syllabus.course_outline || 'N/A'), ''],
    ['', ''],
    ['Learning Resources', ''],
    [String(formatArrayField(syllabus.learning_resources) || 'N/A'), ''],
  ]

  const basicInfoSheet = XLSX.utils.aoa_to_sheet(basicInfo)
  
  // Set column widths for better readability
  basicInfoSheet['!cols'] = [
    { wch: 25 }, // First column (labels)
    { wch: 50 }, // Second column (values)
  ]
  
  XLSX.utils.book_append_sheet(workbook, basicInfoSheet, 'Syllabus Info')

  // Sheet 2: ILOs
  if (ilos && ilos.length > 0) {
    const iloHeaders = [
      'ILO Code',
      'Description',
      'Category',
      'Level',
      'Weight Percentage',
      'Assessment Methods',
      'Learning Activities',
    ]

    const iloData = ilos.map((ilo) => [
      ilo.code || '',
      ilo.description || '',
      ilo.category || '',
      ilo.level || '',
      ilo.weight_percentage || '',
      formatArrayField(ilo.assessment_methods),
      formatArrayField(ilo.learning_activities),
    ])

    const iloSheet = XLSX.utils.aoa_to_sheet([iloHeaders, ...iloData])
    
    // Set column widths
    iloSheet['!cols'] = [
      { wch: 12 }, // ILO Code
      { wch: 50 }, // Description
      { wch: 15 }, // Category
      { wch: 10 }, // Level
      { wch: 15 }, // Weight Percentage
      { wch: 30 }, // Assessment Methods
      { wch: 30 }, // Learning Activities
    ]
    
    XLSX.utils.book_append_sheet(workbook, iloSheet, 'ILOs')
  }

  // Sheet 3: ILO-SO Mappings
  if (soReferences && soReferences.length > 0 && ilos && ilos.length > 0) {
    const soHeaders = ['ILO Code', 'ILO Description', ...soReferences.map((so) => so.so_code)]
    const soData = ilos.map((ilo) => {
      const row = [ilo.code || '', ilo.description || '']
      soReferences.forEach((so) => {
        const mapping = ilo.so_mappings?.find((m) => m.so_id === so.so_id)
        const tasks = mapping?.assessment_tasks || []
        row.push(tasks.length > 0 ? tasks.join(', ') : '')
      })
      return row
    })
    const soSheet = XLSX.utils.aoa_to_sheet([soHeaders, ...soData])
    
    // Set column widths (first two columns + dynamic SO columns)
    const soCols = [
      { wch: 12 }, // ILO Code
      { wch: 50 }, // ILO Description
      ...soReferences.map(() => ({ wch: 15 })) // SO columns
    ]
    soSheet['!cols'] = soCols
    
    XLSX.utils.book_append_sheet(workbook, soSheet, 'ILO-SO Mappings')
  }

  // Sheet 4: ILO-IGA Mappings
  if (igaReferences && igaReferences.length > 0 && ilos && ilos.length > 0) {
    const igaHeaders = ['ILO Code', 'ILO Description', ...igaReferences.map((iga) => iga.iga_code)]
    const igaData = ilos.map((ilo) => {
      const row = [ilo.code || '', ilo.description || '']
      igaReferences.forEach((iga) => {
        const mapping = ilo.iga_mappings?.find((m) => m.iga_id === iga.iga_id)
        const tasks = mapping?.assessment_tasks || []
        row.push(tasks.length > 0 ? tasks.join(', ') : '')
      })
      return row
    })
    const igaSheet = XLSX.utils.aoa_to_sheet([igaHeaders, ...igaData])
    XLSX.utils.book_append_sheet(workbook, igaSheet, 'ILO-IGA Mappings')
  }

  // Sheet 5: ILO-CDIO Mappings
  if (cdioReferences && cdioReferences.length > 0 && ilos && ilos.length > 0) {
    const cdioHeaders = ['ILO Code', 'ILO Description', ...cdioReferences.map((cdio) => cdio.cdio_code)]
    const cdioData = ilos.map((ilo) => {
      const row = [ilo.code || '', ilo.description || '']
      cdioReferences.forEach((cdio) => {
        const mapping = ilo.cdio_mappings?.find((m) => m.cdio_id === cdio.cdio_id)
        const tasks = mapping?.assessment_tasks || []
        row.push(tasks.length > 0 ? tasks.join(', ') : '')
      })
      return row
    })
    const cdioSheet = XLSX.utils.aoa_to_sheet([cdioHeaders, ...cdioData])
    XLSX.utils.book_append_sheet(workbook, cdioSheet, 'ILO-CDIO Mappings')
  }

  // Sheet 6: ILO-SDG Mappings
  if (sdgReferences && sdgReferences.length > 0 && ilos && ilos.length > 0) {
    const sdgHeaders = ['ILO Code', 'ILO Description', ...sdgReferences.map((sdg) => sdg.sdg_code)]
    const sdgData = ilos.map((ilo) => {
      const row = [ilo.code || '', ilo.description || '']
      sdgReferences.forEach((sdg) => {
        const mapping = ilo.sdg_mappings?.find((m) => m.sdg_id === sdg.sdg_id)
        const tasks = mapping?.assessment_tasks || []
        row.push(tasks.length > 0 ? tasks.join(', ') : '')
      })
      return row
    })
    const sdgSheet = XLSX.utils.aoa_to_sheet([sdgHeaders, ...sdgData])
    XLSX.utils.book_append_sheet(workbook, sdgSheet, 'ILO-SDG Mappings')
  }

  // Sheet 7: Assessment Framework
  if (syllabus.assessment_framework) {
    const assessmentFramework = formatJSONField(syllabus.assessment_framework)
    const frameworkData = [
      ['Assessment Framework', ''],
      [assessmentFramework, ''],
    ]
    const frameworkSheet = XLSX.utils.aoa_to_sheet(frameworkData)
    
    // Set column widths
    frameworkSheet['!cols'] = [
      { wch: 25 },
      { wch: 80 },
    ]
    
    XLSX.utils.book_append_sheet(workbook, frameworkSheet, 'Assessment Framework')
  }

  // Sheet 8: Grading Policy
  if (syllabus.grading_policy) {
    const gradingPolicy = formatJSONField(syllabus.grading_policy)
    
    // Try to parse and create a structured view
    let gradingData = [['Grading Policy', '']]
    
    try {
      const policy = typeof gradingPolicy === 'string' ? JSON.parse(gradingPolicy) : gradingPolicy
      
      if (policy.assessment_criteria && Array.isArray(policy.assessment_criteria)) {
        gradingData.push(['', ''])
        gradingData.push(['Assessment Criteria', ''])
        gradingData.push(['Name', 'Abbreviation', 'Weight %', 'Cognitive', 'Psychomotor', 'Affective'])
        
        policy.assessment_criteria.forEach((criterion) => {
          gradingData.push([
            criterion.name || '',
            criterion.abbreviation || '',
            criterion.weight_percentage || '',
            criterion.cognitive || '',
            criterion.psychomotor || '',
            criterion.affective || '',
          ])
        })
      }
      
      if (policy.sub_assessments && typeof policy.sub_assessments === 'object') {
        gradingData.push(['', ''])
        gradingData.push(['Sub-Assessments', ''])
        
        Object.entries(policy.sub_assessments).forEach(([criterionIndex, subAssessments]) => {
          if (Array.isArray(subAssessments)) {
            gradingData.push(['', ''])
            gradingData.push([`Criterion ${criterionIndex} Sub-Assessments`, ''])
            gradingData.push(['Name', 'Abbreviation', 'Weight %', 'Score'])
            
            subAssessments.forEach((sub) => {
              gradingData.push([
                sub.name || '',
                sub.abbreviation || '',
                sub.weight_percentage || '',
                sub.score || '',
              ])
            })
          }
        })
      }
      
      // Add raw JSON as well
      gradingData.push(['', ''])
      gradingData.push(['Raw JSON', ''])
      gradingData.push([JSON.stringify(policy, null, 2), ''])
    } catch (e) {
      // If parsing fails, just add as text
      gradingData.push([gradingPolicy, ''])
    }
    
    const gradingSheet = XLSX.utils.aoa_to_sheet(gradingData)
    
    // Set column widths
    gradingSheet['!cols'] = [
      { wch: 30 },
      { wch: 80 },
    ]
    
    XLSX.utils.book_append_sheet(workbook, gradingSheet, 'Grading Policy')
  }

  // Ensure we have at least one sheet
  if (workbook.SheetNames.length === 0) {
    // Create a basic sheet with error message if no data
    const errorSheet = XLSX.utils.aoa_to_sheet([
      ['Error', 'No data available to export'],
      ['Syllabus ID', syllabus.syllabus_id || 'N/A'],
      ['Title', syllabus.title || 'N/A'],
    ])
    XLSX.utils.book_append_sheet(workbook, errorSheet, 'Error')
  }

  // Generate filename
  const courseCode = syllabus.course_code || 'Syllabus'
  const sectionCode = syllabus.section_code || ''
  const filename = `${courseCode}${sectionCode ? '_' + sectionCode : ''}_Syllabus_${new Date().toISOString().split('T')[0]}.xlsx`

  try {
    // Ensure XLSX is available
    if (!XLSX || !XLSX.utils || !XLSX.writeFile) {
      throw new Error('XLSX library not loaded properly')
    }
    
    // Write file
    XLSX.writeFile(workbook, filename)
    console.log('Excel file exported successfully:', filename)
  } catch (error) {
    console.error('Error writing Excel file:', error)
    alert(`Failed to export Excel file: ${error.message}. Please check the console for details.`)
  }
}

/**
 * Export multiple syllabi to Excel (summary report)
 * @param {Array} syllabi - Array of syllabus objects
 */
export const exportSyllabiSummaryToExcel = async (syllabi = []) => {
  // Load xlsx library dynamically if not already loaded
  if (!XLSX) {
    try {
      const xlsxModule = await import('xlsx')
      XLSX = xlsxModule.default || xlsxModule
    } catch (error) {
      console.error('Error loading xlsx library:', error)
      alert('Error: Failed to load Excel export library. Please refresh the page and try again.')
      return
    }
  }

  const workbook = XLSX.utils.book_new()

  const headers = [
    'Syllabus ID',
    'Title',
    'Course Code',
    'Course Title',
    'Section Code',
    'Version',
    'School Year',
    'Semester',
    'Instructor',
    'Review Status',
    'Approval Status',
    'Reviewed By',
    'Reviewed At',
    'Approved By',
    'Approved At',
    'Created At',
  ]

  const data = syllabi.map((syllabus) => [
    syllabus.syllabus_id || '',
    syllabus.title || '',
    syllabus.course_code || '',
    syllabus.course_title || '',
    syllabus.section_code || '',
    syllabus.version || '',
    syllabus.school_year || '',
    syllabus.semester || '',
    syllabus.instructor_name || '',
    syllabus.review_status || '',
    syllabus.approval_status || '',
    syllabus.reviewer_name || '',
    syllabus.reviewed_at ? new Date(syllabus.reviewed_at).toLocaleString() : '',
    syllabus.approver_name || '',
    syllabus.approved_at ? new Date(syllabus.approved_at).toLocaleString() : '',
    syllabus.created_at ? new Date(syllabus.created_at).toLocaleString() : '',
  ])

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...data])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Syllabi Summary')

  const filename = `Syllabi_Summary_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, filename)
}

