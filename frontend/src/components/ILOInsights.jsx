import React from 'react'
import {
  ChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/solid'

const ILOInsights = ({ iloData, assessments = [] }) => {
  if (!iloData) return null

  const {
    students_by_range = [],
    range_distribution = {},
    total_students = 0,
    attained_count = 0,
    high_performance_students = [],
    low_performance_students = [],
    students = []
  } = iloData

  // Calculate insights
  const calculateInsights = () => {
    const insights = []

    // 1. Overall Attainment Rate
    const attainmentRate = total_students > 0 ? (attained_count / total_students) * 100 : 0
    if (attainmentRate >= 80) {
      insights.push({
        type: 'success',
        icon: CheckCircleIcon,
        title: 'Strong Overall Performance',
        message: `${attainmentRate.toFixed(1)}% of students have attained this ILO (${attained_count}/${total_students} students). This indicates effective teaching and learning outcomes.`,
        recommendation: 'Continue current teaching strategies. Consider sharing best practices with other instructors.'
      })
    } else if (attainmentRate >= 60) {
      insights.push({
        type: 'warning',
        icon: ExclamationTriangleIcon,
        title: 'Moderate Attainment Rate',
        message: `${attainmentRate.toFixed(1)}% of students have attained this ILO (${attained_count}/${total_students} students). There's room for improvement.`,
        recommendation: 'Review assessment methods and consider additional support for students below the threshold.'
      })
    } else {
      insights.push({
        type: 'error',
        icon: ExclamationTriangleIcon,
        title: 'Low Attainment Rate',
        message: `Only ${attainmentRate.toFixed(1)}% of students have attained this ILO (${attained_count}/${total_students} students). Immediate attention needed.`,
        recommendation: 'Consider revising teaching methods, providing additional resources, or reviewing assessment alignment with learning objectives.'
      })
    }

    // 2. Distribution Analysis
    const rangeOrder = ['90-100', '80-89', '70-79', '60-69', '50-59', '0-49']
    const distribution = rangeOrder.map(range => ({
      range,
      count: range_distribution[range] || 0,
      percentage: total_students > 0 ? ((range_distribution[range] || 0) / total_students) * 100 : 0
    }))

    const largestRange = distribution.reduce((max, curr) => 
      curr.count > max.count ? curr : max
    , distribution[0])

    if (largestRange.count > 0) {
      if (['90-100', '80-89'].includes(largestRange.range)) {
        insights.push({
          type: 'success',
          icon: ArrowUpIcon,
          title: 'Positive Distribution Trend',
          message: `Most students (${largestRange.count} students, ${largestRange.percentage.toFixed(1)}%) are performing in the ${largestRange.range}% range.`,
          recommendation: 'The majority of students are achieving high performance. Consider challenging high performers with advanced activities.'
        })
      } else if (['70-79', '60-69'].includes(largestRange.range)) {
        insights.push({
          type: 'warning',
          icon: InformationCircleIcon,
          title: 'Concentrated Mid-Range Performance',
          message: `Most students (${largestRange.count} students, ${largestRange.percentage.toFixed(1)}%) are in the ${largestRange.range}% range.`,
          recommendation: 'Focus on moving students from mid-range to higher performance through targeted interventions and additional practice.'
        })
      } else {
        insights.push({
          type: 'error',
          icon: ArrowDownIcon,
          title: 'Concerning Distribution',
          message: `Most students (${largestRange.count} students, ${largestRange.percentage.toFixed(1)}%) are in the ${largestRange.range}% range.`,
          recommendation: 'Immediate intervention needed. Review curriculum alignment, provide remedial support, and consider alternative teaching approaches.'
        })
      }
    }

    // 3. High vs Low Performers
    const highPerformerCount = high_performance_students?.length || 0
    const lowPerformerCount = low_performance_students?.length || 0
    const highPerformerPct = total_students > 0 ? (highPerformerCount / total_students) * 100 : 0
    const lowPerformerPct = total_students > 0 ? (lowPerformerCount / total_students) * 100 : 0

    if (highPerformerPct > 30) {
      insights.push({
        type: 'success',
        icon: ChartBarIcon,
        title: 'Strong High Performer Group',
        message: `${highPerformerCount} students (${highPerformerPct.toFixed(1)}%) are high performers (80%+).`,
        recommendation: 'Leverage high performers as peer mentors or provide enrichment activities to maintain engagement.'
      })
    }

    if (lowPerformerPct > 20) {
      insights.push({
        type: 'warning',
        icon: ExclamationTriangleIcon,
        title: 'Significant Low Performer Group',
        message: `${lowPerformerCount} students (${lowPerformerPct.toFixed(1)}%) need additional support (below 75%).`,
        recommendation: 'Implement targeted interventions: one-on-one sessions, peer tutoring, or additional practice materials.'
      })
    }

    // 4. Performance Gap Analysis
    if (highPerformerCount > 0 && lowPerformerCount > 0) {
      const gapRatio = highPerformerCount / lowPerformerCount
      if (gapRatio > 2) {
        insights.push({
          type: 'info',
          icon: InformationCircleIcon,
          title: 'Performance Gap Identified',
          message: `There's a significant gap: ${highPerformerCount} high performers vs ${lowPerformerCount} low performers.`,
          recommendation: 'Consider differentiated instruction to address varying student needs and close the performance gap.'
        })
      }
    }

    // 5. Assessment Coverage Analysis
    if (assessments && assessments.length > 0) {
      const assessmentsWithScores = assessments.filter(a => 
        a.total_students > 0 && a.submissions_count > 0
      )
      const coverageRate = assessments.length > 0 
        ? (assessmentsWithScores.length / assessments.length) * 100 
        : 0

      if (coverageRate < 80) {
        insights.push({
          type: 'warning',
          icon: ExclamationTriangleIcon,
          title: 'Incomplete Assessment Coverage',
          message: `Only ${assessmentsWithScores.length} out of ${assessments.length} assessments have student submissions.`,
          recommendation: 'Review why some assessments lack submissions. Consider extending deadlines or providing alternative assessment methods.'
        })
      }

      // Average assessment performance
      const avgAssessmentScore = assessmentsWithScores.length > 0
        ? assessmentsWithScores.reduce((sum, a) => sum + (parseFloat(a.average_percentage) || 0), 0) / assessmentsWithScores.length
        : 0

      if (avgAssessmentScore < 70) {
        insights.push({
          type: 'warning',
          icon: ChartBarIcon,
          title: 'Low Average Assessment Scores',
          message: `Average assessment performance is ${avgAssessmentScore.toFixed(1)}%, which is below the typical passing threshold.`,
          recommendation: 'Review assessment difficulty, provide more practice opportunities, or adjust scoring rubrics.'
        })
      }
    }

    // 6. Range Distribution Balance
    const highRanges = (range_distribution['90-100'] || 0) + (range_distribution['80-89'] || 0)
    const midRanges = (range_distribution['70-79'] || 0) + (range_distribution['60-69'] || 0)
    const lowRanges = (range_distribution['50-59'] || 0) + (range_distribution['0-49'] || 0)

    if (highRanges > midRanges + lowRanges && highRanges > total_students * 0.5) {
      insights.push({
        type: 'success',
        icon: LightBulbIcon,
        title: 'Excellent Performance Distribution',
        message: `More than 50% of students are in high performance ranges (${highRanges} students).`,
        recommendation: 'This ILO is well-achieved. Consider documenting successful teaching strategies for future reference.'
      })
    }

    return insights
  }

  const insights = calculateInsights()

  const getInsightStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          title: 'text-green-900',
          text: 'text-green-800'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          text: 'text-yellow-800'
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          title: 'text-red-900',
          text: 'text-red-800'
        }
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          text: 'text-blue-800'
        }
    }
  }

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <InformationCircleIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Insights</h3>
        </div>
        <p className="text-sm text-gray-500">No insights available. Select an ILO to view performance insights.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <LightBulbIcon className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => {
          const styles = getInsightStyles(insight.type)
          const IconComponent = insight.icon

          return (
            <div
              key={index}
              className={`${styles.bg} border ${styles.border} rounded-lg p-4`}
            >
              <div className="flex items-start gap-3">
                <IconComponent className={`h-5 w-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold ${styles.title} mb-1`}>
                    {insight.title}
                  </h4>
                  <p className={`text-sm ${styles.text} mb-2`}>
                    {insight.message}
                  </p>
                  {insight.recommendation && (
                    <div className={`mt-2 pt-2 border-t ${styles.border}`}>
                      <p className={`text-xs font-medium ${styles.title} mb-1`}>Recommendation:</p>
                      <p className={`text-xs ${styles.text}`}>
                        {insight.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ILOInsights

