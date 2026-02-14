import React, { useState } from 'react';
import { 
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  ChartBarIcon
} from '@heroicons/react/24/solid';

const SystemEvaluation = () => {
  const [evaluations, setEvaluations] = useState({
    ui: {
      designAesthetics: 0,
      userInterface: 0,
      responsiveness: 0,
      accessibility: 0,
      navigation: 0
    },
    functionality: {
      authentication: 0,
      dataManagement: 0,
      performance: 0,
      errorHandling: 0,
      integrations: 0
    },
    analytics: {
      dataAccuracy: 0,
      reporting: 0,
      visualization: 0,
      insights: 0,
      realTimeUpdates: 0
    }
  });

  const [comments, setComments] = useState({
    ui: '',
    functionality: '',
    analytics: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleRatingChange = (category, subcategory, rating) => {
    setEvaluations(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: rating
      }
    }));
  };

  const handleCommentChange = (category, comment) => {
    setComments(prev => ({
      ...prev,
      [category]: comment
    }));
  };

  const calculateCategoryScore = (category) => {
    const scores = Object.values(evaluations[category]);
    const total = scores.reduce((sum, score) => sum + score, 0);
    const maxPossible = scores.length * 5;
    return { total, maxPossible, percentage: (total / maxPossible) * 100 };
  };

  const calculateOverallScore = () => {
    const uiScore = calculateCategoryScore('ui');
    const funcScore = calculateCategoryScore('functionality');
    const analyticsScore = calculateCategoryScore('analytics');
    
    const totalScore = uiScore.total + funcScore.total + analyticsScore.total;
    const maxPossible = uiScore.maxPossible + funcScore.maxPossible + analyticsScore.maxPossible;
    
    return { total: totalScore, maxPossible, percentage: (totalScore / maxPossible) * 100 };
  };

  const handleSubmit = () => {
    setSubmitted(true);
    // Here you would typically send the evaluation to the backend
    console.log('Evaluation submitted:', { evaluations, comments, overallScore: calculateOverallScore() });
  };

  const StarRating = ({ value, onChange, maxRating = 5 }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`transition-colors ${
              rating <= value
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <StarIcon className="h-6 w-6" />
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {value > 0 ? `${value}/5` : 'Not rated'}
        </span>
      </div>
    );
  };

  const CategorySection = ({ title, icon: Icon, category, items, description }) => {
    const score = calculateCategoryScore(category);
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Icon className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {score.total}/{score.maxPossible}
            </div>
            <div className="text-sm text-gray-600">
              {score.percentage.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(items).map(([key, label]) => (
            <div key={key} className="border-b border-gray-100 pb-4 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-900 mb-1 block">
                    {label}
                  </label>
                </div>
                <StarRating
                  value={evaluations[category][key]}
                  onChange={(rating) => handleRatingChange(category, key, rating)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Additional Comments
          </label>
          <textarea
            value={comments[category]}
            onChange={(e) => handleCommentChange(category, e.target.value)}
            placeholder={`Share your thoughts on ${title.toLowerCase()}...`}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>
      </div>
    );
  };

  const overallScore = calculateOverallScore();

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">System Evaluation</h1>
            </div>
            {submitted && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Evaluation Submitted</span>
              </div>
            )}
          </div>
          <p className="text-gray-600">
            Rate each aspect of the system on a scale of 1-5, where 5 is the highest score.
            Provide detailed feedback to help improve the system.
          </p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Overall System Score</h2>
              <p className="text-sm text-gray-600">
                Based on UI, System Functionality, and Analytical Results
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600 mb-1">
                {overallScore.total}/{overallScore.maxPossible}
              </div>
              <div className="text-lg font-semibold text-gray-700">
                {overallScore.percentage.toFixed(1)}%
              </div>
              <div className="mt-2">
                <div className="w-48 bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      overallScore.percentage >= 80
                        ? 'bg-green-500'
                        : overallScore.percentage >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${overallScore.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Categories */}
        <div className="space-y-6 mb-8">
          <CategorySection
            title="User Interface (UI)"
            icon={ComputerDesktopIcon}
            category="ui"
            items={{
              designAesthetics: 'Design Aesthetics & Visual Appeal',
              userInterface: 'User Interface Clarity & Intuitiveness',
              responsiveness: 'Responsiveness & Mobile Compatibility',
              accessibility: 'Accessibility & Usability',
              navigation: 'Navigation & Information Architecture'
            }}
            description="Evaluate the visual design, user experience, and interface quality"
          />

          <CategorySection
            title="System Functionality"
            icon={CheckCircleIcon}
            category="functionality"
            items={{
              authentication: 'Authentication & Security',
              dataManagement: 'Data Management & CRUD Operations',
              performance: 'System Performance & Speed',
              errorHandling: 'Error Handling & Reliability',
              integrations: 'System Integrations & APIs'
            }}
            description="Assess the core functionality, performance, and reliability"
          />

          <CategorySection
            title="Analytical Results"
            icon={ChartBarIcon}
            category="analytics"
            items={{
              dataAccuracy: 'Data Accuracy & Quality',
              reporting: 'Reporting Capabilities',
              visualization: 'Data Visualization & Charts',
              insights: 'Insights & Analytics Depth',
              realTimeUpdates: 'Real-time Updates & Data Freshness'
            }}
            description="Review analytics, reporting features, and data insights"
          />
        </div>

        {/* Summary Comments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Summary</h2>
          <textarea
            value={comments.summary || ''}
            onChange={(e) => handleCommentChange('summary', e.target.value)}
            placeholder="Provide an overall summary of your evaluation, including strengths, weaknesses, and recommendations..."
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => {
              setEvaluations({
                ui: {
                  designAesthetics: 0,
                  userInterface: 0,
                  responsiveness: 0,
                  accessibility: 0,
                  navigation: 0
                },
                functionality: {
                  authentication: 0,
                  dataManagement: 0,
                  performance: 0,
                  errorHandling: 0,
                  integrations: 0
                },
                analytics: {
                  dataAccuracy: 0,
                  reporting: 0,
                  visualization: 0,
                  insights: 0,
                  realTimeUpdates: 0
                }
              });
              setComments({ ui: '', functionality: '', analytics: '', summary: '' });
              setSubmitted(false);
            }}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={overallScore.total === 0}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <CheckCircleIcon className="h-5 w-5" />
            Submit Evaluation
          </button>
        </div>

        {/* Score Breakdown */}
        {overallScore.total > 0 && (
          <div className="mt-8 bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'UI Score', category: 'ui', color: 'blue' },
                { label: 'Functionality Score', category: 'functionality', color: 'green' },
                { label: 'Analytics Score', category: 'analytics', color: 'purple' }
              ].map(({ label, category, color }) => {
                const score = calculateCategoryScore(category);
                return (
                  <div key={category} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {score.total}/{score.maxPossible}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-${color}-500`}
                        style={{ width: `${score.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {score.percentage.toFixed(1)}% of maximum
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemEvaluation;
