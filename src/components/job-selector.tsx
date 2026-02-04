import React, { useState } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/theme';

interface JobCategory {
  category: string;
  jobs: string[];
}

const JOB_CATEGORIES: JobCategory[] = [
  {
    category: 'Software Development',
    jobs: [
      'Software Engineer',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Mobile Developer',
      'iOS Developer',
      'Android Developer',
      'Game Developer',
      'Embedded Systems Engineer',
      'Systems Programmer',
    ],
  },
  {
    category: 'Data & Analytics',
    jobs: [
      'Data Scientist',
      'Data Engineer',
      'Data Analyst',
      'Machine Learning Engineer',
      'ML Operations Engineer',
      'Analytics Engineer',
      'Business Intelligence Developer',
      'Research Scientist',
    ],
  },
  {
    category: 'Cloud & DevOps',
    jobs: [
      'DevOps Engineer',
      'Cloud Architect',
      'Cloud Engineer',
      'Infrastructure Engineer',
      'Site Reliability Engineer (SRE)',
      'Solutions Architect',
      'Platform Engineer',
    ],
  },
  {
    category: 'Security & IT',
    jobs: [
      'Security Engineer',
      'Information Security Analyst',
      'Cybersecurity Specialist',
      'Security Architect',
      'Penetration Tester',
      'IT System Administrator',
      'Network Engineer',
    ],
  },
  {
    category: 'Design & UX',
    jobs: [
      'UX Designer',
      'UI Designer',
      'Product Designer',
      'UX Researcher',
      'Interaction Designer',
      'Visual Designer',
      'Design System Lead',
      'Graphic Designer',
    ],
  },
  {
    category: 'Product & Management',
    jobs: [
      'Product Manager',
      'Product Owner',
      'Project Manager',
      'Program Manager',
      'Technical Project Manager',
      'Scrum Master',
      'Agile Coach',
      'Product Strategy Manager',
    ],
  },
  {
    category: 'Quality & Testing',
    jobs: [
      'Quality Assurance Engineer',
      'QA Automation Engineer',
      'Software Test Engineer',
      'SDET (Software Development Engineer in Test)',
      'Test Manager',
      'Quality Assurance Lead',
    ],
  },
  {
    category: 'Engineering Leadership',
    jobs: [
      'Engineering Manager',
      'Tech Lead',
      'Engineering Director',
      'VP of Engineering',
      'CTO (Chief Technology Officer)',
      'Staff Engineer',
      'Principal Engineer',
      'Architect',
    ],
  },
  {
    category: 'Finance & Accounting',
    jobs: [
      'Financial Analyst',
      'Accountant',
      'Senior Accountant',
      'Controller',
      'CFO (Chief Financial Officer)',
      'Investment Banker',
      'Auditor',
      'Tax Specialist',
      'Bookkeeper',
      'Accounts Payable Specialist',
    ],
  },
  {
    category: 'Healthcare',
    jobs: [
      'Registered Nurse (RN)',
      'Licensed Practical Nurse (LPN)',
      'Physician',
      'Dentist',
      'Pharmacist',
      'Physical Therapist',
      'Healthcare Administrator',
      'Medical Assistant',
      'Paramedic',
      'Radiologic Technologist',
      'Lab Technician',
    ],
  },
  {
    category: 'Marketing & Sales',
    jobs: [
      'Marketing Manager',
      'Digital Marketing Specialist',
      'SEO Specialist',
      'Content Marketing Manager',
      'Sales Manager',
      'Account Executive',
      'Sales Representative',
      'Business Development Manager',
      'Brand Manager',
      'Marketing Coordinator',
    ],
  },
  {
    category: 'Human Resources',
    jobs: [
      'HR Manager',
      'HR Specialist',
      'Recruiter',
      'Talent Acquisition Manager',
      'Compensation & Benefits Specialist',
      'Learning & Development Manager',
      'HR Director',
      'Employee Relations Manager',
    ],
  },
  {
    category: 'Construction & Engineering',
    jobs: [
      'Civil Engineer',
      'Mechanical Engineer',
      'Electrical Engineer',
      'Structural Engineer',
      'Construction Manager',
      'Project Engineer',
      'Site Supervisor',
      'Building Inspector',
    ],
  },
  {
    category: 'Legal',
    jobs: [
      'Attorney',
      'Lawyer',
      'Paralegal',
      'Legal Assistant',
      'Contract Manager',
      'Compliance Officer',
      'Legal Counsel',
      'Intellectual Property Attorney',
    ],
  },
  {
    category: 'Education',
    jobs: [
      'Teacher (K-12)',
      'High School Teacher',
      'College Professor',
      'Instructor',
      'Training Specialist',
      'Curriculum Developer',
      'Educational Administrator',
      'Tutor',
    ],
  },
  {
    category: 'Business & Operations',
    jobs: [
      'Business Analyst',
      'Systems Analyst',
      'Operations Manager',
      'Business Operations Manager',
      'Process Analyst',
      'Strategy Manager',
      'Process Manager',
      'Supply Chain Manager',
    ],
  },
  {
    category: 'Real Estate',
    jobs: [
      'Real Estate Agent',
      'Real Estate Broker',
      'Property Manager',
      'Real Estate Developer',
      'Commercial Real Estate Agent',
      'Appraiser',
    ],
  },
  {
    category: 'Trades & Skilled Work',
    jobs: [
      'Electrician',
      'Plumber',
      'HVAC Technician',
      'Carpenter',
      'Welder',
      'Auto Mechanic',
      'Heavy Equipment Operator',
      'Locksmith',
    ],
  },
  {
    category: 'Hospitality & Tourism',
    jobs: [
      'Hotel Manager',
      'Restaurant Manager',
      'Chef',
      'Sous Chef',
      'Event Planner',
      'Travel Agent',
      'Hospitality Manager',
      'Concierge',
    ],
  },
  {
    category: 'DevTools & Platforms',
    jobs: [
      'Developer Advocate',
      'Developer Relations Engineer',
      'Technical Writer',
      'API Designer',
      'Database Administrator',
      'Performance Engineer',
    ],
  },
];

interface JobSelectorProps {
  onSelect: (job: string) => void;
  selectedJob: string | null;
}

export const JobSelector: React.FC<JobSelectorProps> = ({ onSelect, selectedJob }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customJob, setCustomJob] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const filteredCategories = JOB_CATEGORIES.map(cat => ({
    ...cat,
    jobs: cat.jobs.filter(job =>
      job.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(cat => cat.jobs.length > 0);

  // If search term is empty, expand first category by default
  React.useEffect(() => {
    if (!searchTerm && expandedCategory === null) {
      setExpandedCategory(JOB_CATEGORIES[0].category);
    }
  }, [searchTerm, expandedCategory]);

  const handleSelect = (job: string) => {
    onSelect(job);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomJob = () => {
    if (customJob.trim()) {
      onSelect(customJob.trim());
      setCustomJob('');
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className="mb-6 relative">
      <label className={cn("mb-3 block text-sm font-semibold", isDarkMode ? "text-slate-200" : "text-slate-700")}>
        🎯 Target Job Position
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full rounded-xl border-2 px-4 py-3 text-left transition-all flex items-center justify-between font-medium relative z-10',
            selectedJob
              ? isDarkMode
                ? 'border-blue-500/60 bg-blue-500/10 text-slate-100 shadow-lg shadow-blue-500/10'
                : 'border-blue-400/60 bg-blue-100 text-slate-900 shadow-lg shadow-blue-400/10'
              : isDarkMode
                ? 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-blue-500/40 hover:bg-slate-800/50'
                : 'border-gray-300 bg-gray-100 text-gray-600 hover:border-blue-300 hover:bg-gray-200'
          )}
        >
          <span>{selectedJob || 'Select or enter job title...'}</span>
          <Search className="h-5 w-5" />
        </button>

        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <div className={cn(
              "absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border shadow-2xl",
              isDarkMode
                ? "border-blue-500/20 bg-slate-800"
                : "border-gray-300 bg-white"
            )}>
            {/* Search Input */}
            <div className={cn("border-b p-3", isDarkMode ? "border-slate-700/50" : "border-gray-200")}>
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                  isDarkMode
                    ? "bg-slate-700/50 text-slate-100 placeholder-slate-500"
                    : "bg-gray-100 text-gray-900 placeholder-gray-500"
                )}
                autoFocus
              />
            </div>

            {/* Popular Jobs List by Category */}
            <div className="max-h-80 overflow-y-auto">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <div key={category.category} className={cn(
                    "border-b last:border-b-0",
                    isDarkMode ? "border-slate-700/30" : "border-gray-200"
                  )}>
                    <button
                      onClick={() => setExpandedCategory(
                        expandedCategory === category.category ? null : category.category
                      )}
                      className={cn(
                        "w-full px-4 py-3 flex items-center justify-between transition-colors text-sm font-semibold",
                        isDarkMode
                          ? "hover:bg-slate-700/30 text-slate-300"
                          : "hover:bg-gray-100 text-gray-700"
                      )}
                    >
                      <span>{category.category}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          expandedCategory === category.category ? 'rotate-180' : ''
                        )}
                      />
                    </button>
                    {expandedCategory === category.category && (
                      <div className={isDarkMode ? "bg-slate-900/30" : "bg-gray-50"}>
                        {category.jobs.map((job) => (
                          <button
                            key={job}
                            onClick={() => handleSelect(job)}
                            className={cn(
                              'w-full px-6 py-2 text-left text-sm transition-colors border-l-3',
                              selectedJob === job
                                ? isDarkMode
                                  ? 'bg-blue-500/30 text-blue-200 font-medium border-blue-500'
                                  : 'bg-blue-100 text-blue-900 font-medium border-blue-400'
                                : isDarkMode
                                  ? 'text-slate-300 hover:bg-slate-700/50 border-transparent'
                                  : 'text-gray-700 hover:bg-gray-100 border-transparent'
                            )}
                          >
                            {job}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className={cn("px-4 py-3 text-center text-xs", isDarkMode ? "text-slate-500" : "text-gray-500")}>
                  No jobs match "{searchTerm}"
                </div>
              )}
            </div>

            {/* Custom Job Input */}
            <div className={cn("border-t p-3", isDarkMode ? "border-slate-700/50 bg-slate-900/50" : "border-gray-200 bg-gray-50")}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter custom job title..."
                  value={customJob}
                  onChange={(e) => setCustomJob(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomJob()}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                    isDarkMode
                      ? "bg-slate-700/50 text-slate-100 placeholder-slate-500"
                      : "bg-white text-gray-900 placeholder-gray-500 border border-gray-300"
                  )}
                />
                <button
                  onClick={handleCustomJob}
                  disabled={!customJob.trim()}
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {selectedJob && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-4 py-2 border border-blue-500/30">
          <span className="text-sm font-medium text-blue-200">{selectedJob}</span>
          <button
            onClick={() => onSelect('')}
            className="hover:text-blue-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
