import { useEffect, useState, useMemo } from 'react'
import {
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  BookOpen,
  User,
  Check,
  Eye,
  FileText,
  HelpCircle,
  Sparkles,
  BarChart2,
  ArrowUpRight,
  Send,
  Save,
  MessageSquare,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react'

/* ========================================================================= */
/* ================================ TYPES ================================== */
/* ========================================================================= */

export type QuestionType = 'mcq' | 'descriptive'

export interface MCQOption {
  id: string // "A", "B", "C", "D"
  text: string
}

export interface ExamQuestion {
  id: string
  number: number
  type: QuestionType
  question: string
  marks: number
  options?: MCQOption[]
  correctAnswer?: string
  explanation?: string
  modelAnswer?: string
}

export interface Exam {
  id: string
  title: string
  course: string
  instructor: string
  status: 'live' | 'upcoming' | 'expired'
  scheduledDate: string
  scheduledTime: string
  durationMinutes: number
  totalMarks: number
  passingMarks: number
  mcqCount: number
  descriptiveCount: number
  syllabus: string[]
  instructions: string[]
  questions: ExamQuestion[]
}

export interface ExamSubmission {
  id: string
  examId: string
  examTitle: string
  course: string
  instructor: string
  studentEmail: string
  studentName?: string
  submittedAt: string
  status: 'graded' | 'under_evaluation'
  totalMarks: number
  scoreObtained?: number
  percentage?: number
  grade?: string
  isPassed?: boolean
  timeSpentMinutes: number
  teacherFeedback?: {
    overall: string
    strengths: string[]
    improvements: string[]
    evaluatedAt: string
  }
  answers: {
    questionId: string
    questionNumber: number
    type: QuestionType
    question: string
    marks: number
    studentAnswer: string
    correctAnswer?: string
    explanation?: string
    marksAwarded?: number
    teacherComment?: string
    isCorrect?: boolean
  }[]
}

/* ========================================================================= */
/* ========================== INITIAL SEED DATA ============================ */
/* ========================================================================= */

const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-macro-midterm',
    title: 'Macroeconomics Mid-Term Examination 2026',
    course: 'Macroeconomic Theory & Policy',
    instructor: 'Rishika',
    status: 'live',
    scheduledDate: 'Active Now',
    scheduledTime: 'Closes today at 6:00 PM IST',
    durationMinutes: 45,
    totalMarks: 50,
    passingMarks: 20,
    mcqCount: 4,
    descriptiveCount: 2,
    syllabus: [
      'National Income Accounting & GDP Deflator',
      'Keynesian Autonomous Investment Multiplier',
      'Open Market Operations & Reserve Requirements',
      'Short-run vs Long-run Phillips Curve',
      'Liquidity Trap & Monetary Policy Effectiveness'
    ],
    instructions: [
      'Total duration is 45 minutes.',
      'Section A: 4 Multiple Choice Questions (5 marks each = 20 marks).',
      'Section B: 2 Descriptive Essay Questions (15 marks each = 30 marks).',
      'Student answers are auto-saved in real time.'
    ],
    questions: [
      {
        id: 'q1',
        number: 1,
        type: 'mcq',
        question: 'Which of the following is NOT included in the calculation of Gross Domestic Product (GDP) using the expenditure approach?',
        marks: 5,
        options: [
          { id: 'A', text: 'Gross Private Domestic Investment (capital goods & inventory changes)' },
          { id: 'B', text: 'Government transfer payments (e.g., social security and unemployment pensions)' },
          { id: 'C', text: 'Government consumption expenditures and gross public investment' },
          { id: 'D', text: 'Net Exports of goods and services (Exports minus Imports)' }
        ],
        correctAnswer: 'B',
        explanation: 'Government transfer payments are excluded from GDP because they do not reflect compensation for current productive activities or new output.'
      },
      {
        id: 'q2',
        number: 2,
        type: 'mcq',
        question: 'In a closed Keynesian macroeconomic model with no government sector, if the Marginal Propensity to Consume (MPC) is 0.8, what is the value of the autonomous investment multiplier?',
        marks: 5,
        options: [
          { id: 'A', text: '2.5' },
          { id: 'B', text: '4.0' },
          { id: 'C', text: '5.0' },
          { id: 'D', text: '8.0' }
        ],
        correctAnswer: 'C',
        explanation: 'The autonomous multiplier formula is k = 1 / (1 - MPC). Substituting 0.8: k = 1 / (1 - 0.8) = 1 / 0.2 = 5.0.'
      },
      {
        id: 'q3',
        number: 3,
        type: 'mcq',
        question: 'When the Central Bank conducts Open Market Operations by purchasing government bonds from commercial banks, what is the primary consequence on the banking system and market interest rates?',
        marks: 5,
        options: [
          { id: 'A', text: 'Commercial bank reserves decrease, constraining credit and elevating bond yields' },
          { id: 'B', text: 'Commercial bank excess reserves rise, credit availability expands, and short-term interest rates fall' },
          { id: 'C', text: 'The statutory reserve requirement ratio automatically quadruples' },
          { id: 'D', text: 'Inflation is instantaneously pegged to zero with no shift in bank balance sheets' }
        ],
        correctAnswer: 'B',
        explanation: 'Purchasing government securities injects fresh liquidity directly into commercial bank reserves, lowering interbank borrowing rates and loan interest rates.'
      },
      {
        id: 'q4',
        number: 4,
        type: 'mcq',
        question: 'The traditional short-run Phillips curve illustrates an inverse empirical trade-off between which pair of macroeconomic indicators?',
        marks: 5,
        options: [
          { id: 'A', text: 'Fiscal deficit and the foreign currency exchange rate' },
          { id: 'B', text: 'The inflation rate and the unemployment rate' },
          { id: 'C', text: 'Nominal interest rates and capital account surplus' },
          { id: 'D', text: 'The current account deficit and velocity of money' }
        ],
        correctAnswer: 'B',
        explanation: 'A.W. Phillips showed that lower unemployment in the short-run puts upward pressure on nominal wages, generating higher price inflation.'
      },
      {
        id: 'q5',
        number: 5,
        type: 'descriptive',
        question: "Define the Keynesian concept of a 'Liquidity Trap'. Explain the precise economic conditions under which it develops, why conventional expansionary monetary policy becomes powerless, and what alternative policy measures Keynesian economists advocate to re-ignite aggregate demand.",
        marks: 15,
        modelAnswer: 'A liquidity trap is a situation where nominal interest rates approach the zero lower bound, causing money demand to become infinitely elastic. People expect asset prices to fall, so any increase in the money supply is hoarded rather than invested. Conventional open market operations fail. Keynesians argue that direct expansionary fiscal policy (state infrastructure spending) is required to restore aggregate demand.'
      },
      {
        id: 'q6',
        number: 6,
        type: 'descriptive',
        question: 'Critically distinguish between Cost-Push Inflation and Demand-Pull Inflation. In your response, illustrate the shifting mechanisms in the Aggregate Demand (AD) and Short-Run Aggregate Supply (SRAS) framework, and evaluate the policy dilemma central banks face when confronting stagflation.',
        marks: 15,
        modelAnswer: 'Demand-pull inflation occurs when aggregate spending outpaces aggregate productive capacity, shifting AD to the right. Cost-push inflation is caused by supply-side shocks (e.g. oil price surges) shifting SRAS to the left, causing prices to rise while GDP falls (stagflation). The central bank dilemma: hiking interest rates cools inflation but worsens unemployment; easing policy alleviates recession but fuels hyperinflation.'
      }
    ]
  },
  {
    id: 'exam-micro-structures',
    title: 'Microeconomics & Market Structures Unit Test',
    course: 'Foundations of Microeconomics',
    instructor: 'Rishika',
    status: 'upcoming',
    scheduledDate: 'In 2 Days (Wednesday)',
    scheduledTime: '10:00 AM - 11:00 AM IST',
    durationMinutes: 60,
    totalMarks: 60,
    passingMarks: 24,
    mcqCount: 6,
    descriptiveCount: 2,
    syllabus: [
      'Consumer Equilibrium & Indifference Curves',
      'Price Elasticity of Demand & Supply',
      'Perfect Competition vs Pure Monopoly',
      'Deadweight Loss & Welfare Economics'
    ],
    instructions: [
      'Scheduled live exam window opens precisely at 10:00 AM IST.',
      'Covers Chapters 3, 4 and 5 of Microeconomic Foundations.'
    ],
    questions: []
  },
  {
    id: 'exam-intl-trade',
    title: 'International Trade & Foreign Exchange Examination',
    course: 'Global Economics & Currency Markets',
    instructor: 'Rishika',
    status: 'upcoming',
    scheduledDate: 'Next Monday',
    scheduledTime: '11:00 AM - 12:00 PM IST',
    durationMinutes: 45,
    totalMarks: 50,
    passingMarks: 20,
    mcqCount: 5,
    descriptiveCount: 2,
    syllabus: [
      'Ricardian Comparative Advantage',
      'Tariffs, Quotas & Subsidies Analysis',
      'Floating vs Fixed Exchange Rate Systems'
    ],
    instructions: [
      'Scheduled live exam window opens precisely at 11:00 AM IST.',
      'Covers Chapters on International Trade and Currency Markets.'
    ],
    questions: []
  },
  {
    id: 'exam-stats-probability',
    title: 'Econometric Probability & Distributions Quiz',
    course: 'Quantitative Economics & Data Analysis',
    instructor: 'Rishika',
    status: 'expired',
    scheduledDate: 'Concluded',
    scheduledTime: 'Ended yesterday at 11:30 AM IST',
    durationMinutes: 40,
    totalMarks: 40,
    passingMarks: 16,
    mcqCount: 5,
    descriptiveCount: 1,
    syllabus: [
      'Normal, Binomial & Poisson Distributions',
      'Hypothesis Testing & Z-Scores'
    ],
    instructions: [
      'Exam submission window has expired for this test.'
    ],
    questions: []
  }
]

const INITIAL_SUBMISSIONS: ExamSubmission[] = [
  {
    id: 'res-macro-student1',
    examId: 'exam-macro-midterm',
    examTitle: 'Macroeconomics Mid-Term Examination 2026',
    course: 'Macroeconomic Theory & Policy',
    instructor: 'Rishika',
    studentEmail: 'aditya.sharma@example.com',
    studentName: 'Aditya Sharma',
    submittedAt: 'Today • 2:15 PM',
    status: 'under_evaluation',
    totalMarks: 50,
    scoreObtained: 20,
    timeSpentMinutes: 41,
    answers: [
      {
        questionId: 'q1',
        questionNumber: 1,
        type: 'mcq',
        question: 'Which of the following is NOT included in the calculation of Gross Domestic Product (GDP) using the expenditure approach?',
        marks: 5,
        studentAnswer: 'B',
        correctAnswer: 'B',
        isCorrect: true,
        marksAwarded: 5,
        explanation: 'Government transfer payments are excluded.'
      },
      {
        questionId: 'q2',
        questionNumber: 2,
        type: 'mcq',
        question: 'In a closed Keynesian macroeconomic model with no government sector, if the Marginal Propensity to Consume (MPC) is 0.8, what is the value of the autonomous investment multiplier?',
        marks: 5,
        studentAnswer: 'C',
        correctAnswer: 'C',
        isCorrect: true,
        marksAwarded: 5,
        explanation: 'k = 1 / (1 - 0.8) = 5.0'
      },
      {
        questionId: 'q3',
        questionNumber: 3,
        type: 'mcq',
        question: 'When the Central Bank conducts Open Market Operations by purchasing government bonds from commercial banks, what is the primary consequence on the banking system and market interest rates?',
        marks: 5,
        studentAnswer: 'B',
        correctAnswer: 'B',
        isCorrect: true,
        marksAwarded: 5,
        explanation: 'Reserves rise and rates fall.'
      },
      {
        questionId: 'q4',
        questionNumber: 4,
        type: 'mcq',
        question: 'The traditional short-run Phillips curve illustrates an inverse empirical trade-off between which pair of macroeconomic indicators?',
        marks: 5,
        studentAnswer: 'B',
        correctAnswer: 'B',
        isCorrect: true,
        marksAwarded: 5,
        explanation: 'Trade-off between inflation and unemployment.'
      },
      {
        questionId: 'q5',
        questionNumber: 5,
        type: 'descriptive',
        question: "Define the Keynesian concept of a 'Liquidity Trap'. Explain the precise economic conditions under which it develops, why conventional expansionary monetary policy becomes powerless, and what alternative policy measures Keynesian economists advocate to re-ignite aggregate demand.",
        marks: 15,
        studentAnswer: 'A liquidity trap occurs when interest rates are so low that individuals prefer holding cash instead of bonds. In this state, central bank bond purchases fail to stimulate borrowing because interest rates cannot go much lower (zero lower bound). Therefore monetary policy is ineffective. Keynesians recommend fiscal stimulus via government infrastructure spending to inject demand directly into the economy.',
        teacherComment: '',
        marksAwarded: undefined
      },
      {
        questionId: 'q6',
        questionNumber: 6,
        type: 'descriptive',
        question: 'Critically distinguish between Cost-Push Inflation and Demand-Pull Inflation. In your response, illustrate the shifting mechanisms in the Aggregate Demand (AD) and Short-Run Aggregate Supply (SRAS) framework, and evaluate the policy dilemma central banks face when confronting stagflation.',
        marks: 15,
        studentAnswer: 'Demand-pull inflation is caused by excess aggregate demand pulling up price levels as AD shifts rightward past full employment. Cost-push inflation happens when production costs rise (e.g. oil supply shock), causing SRAS to shift leftward. This creates stagflation: falling GDP accompanied by rising inflation. Central banks face a conflict: raising interest rates reduces inflation but worsens unemployment.',
        teacherComment: '',
        marksAwarded: undefined
      }
    ]
  },
  {
    id: 'res-micro-student2',
    examId: 'exam-macro-midterm',
    examTitle: 'Macroeconomics Mid-Term Examination 2026',
    course: 'Macroeconomic Theory & Policy',
    instructor: 'Rishika',
    studentEmail: 'priya.patel@example.com',
    studentName: 'Priya Patel',
    submittedAt: 'Yesterday • 4:30 PM',
    status: 'graded',
    totalMarks: 50,
    scoreObtained: 44,
    percentage: 88,
    grade: 'A+ Distinction',
    isPassed: true,
    timeSpentMinutes: 39,
    teacherFeedback: {
      evaluatedAt: 'Oct 8, 2026 by Rishika',
      overall: 'Superb command over macroeconomic theory. Analytical clarity on the liquidity trap and Keynesian fiscal mechanics was exemplary.',
      strengths: [
        'Precise mathematical exposition of the autonomous multiplier',
        'Flawless diagrammatic explanations for AD/SRAS shifts'
      ],
      improvements: [
        'Include real-world examples (such as Japan in the 1990s or 2008 GFC) for historical context.'
      ]
    },
    answers: []
  }
]

/* ========================================================================= */
/* =============================== COMPONENT =============================== */
/* ========================================================================= */

export default function AdminExams() {
  const [activeTab, setActiveTab] = useState<'exams' | 'submissions'>('exams')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'expired'>('all')
  const [subFilter, setSubFilter] = useState<'all' | 'under_evaluation' | 'graded'>('all')

  // Data states
  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const saved = localStorage.getItem('deeco_admin_exams')
      return saved ? JSON.parse(saved) : INITIAL_EXAMS
    } catch {
      return INITIAL_EXAMS
    }
  })

  const [submissions, setSubmissions] = useState<ExamSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('deeco_exam_results')
      return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS
    } catch {
      return INITIAL_SUBMISSIONS
    }
  })

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('deeco_admin_exams', JSON.stringify(exams))
    } catch (e) {
      console.error('Failed to sync exams to storage:', e)
    }
  }, [exams])

  useEffect(() => {
    try {
      localStorage.setItem('deeco_exam_results', JSON.stringify(submissions))
    } catch (e) {
      console.error('Failed to sync submissions to storage:', e)
    }
  }, [submissions])

  // Exam Builder / Editor Modal State
  const [showExamModal, setShowExamModal] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [examFormData, setExamFormData] = useState<Partial<Exam>>({
    title: '',
    course: 'Macroeconomic Theory & Policy',
    instructor: 'Rishika',
    status: 'upcoming',
    scheduledDate: '',
    scheduledTime: '',
    durationMinutes: 45,
    totalMarks: 50,
    passingMarks: 20,
    syllabus: [''],
    instructions: [''],
    questions: []
  })

  // Question Creator State inside Exam Modal
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('mcq')
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionMarks, setNewQuestionMarks] = useState(5)
  const [newQuestionOptions, setNewQuestionOptions] = useState<MCQOption[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' }
  ])
  const [newCorrectOption, setNewCorrectOption] = useState('A')
  const [newExplanation, setNewExplanation] = useState('')
  const [newModelAnswer, setNewModelAnswer] = useState('')

  // Grading Studio Modal State
  const [gradingSubmission, setGradingSubmission] = useState<ExamSubmission | null>(null)
  const [gradingMarks, setGradingMarks] = useState<Record<string, number>>({})
  const [gradingComments, setGradingComments] = useState<Record<string, string>>({})
  const [overallFeedback, setOverallFeedback] = useState('')
  const [feedbackStrengths, setFeedbackStrengths] = useState<string[]>([])
  const [feedbackImprovements, setFeedbackImprovements] = useState<string[]>([])
  const [newStrengthInput, setNewStrengthInput] = useState('')
  const [newImprovementInput, setNewImprovementInput] = useState('')

  /* ================= METRIC COMPUTATIONS ================= */
  const scheduledCount = useMemo(() => {
    return exams.filter((e) => e.status === 'live' || e.status === 'upcoming').length
  }, [exams])

  const totalExamsGiven = useMemo(() => {
    return submissions.length
  }, [submissions])

  const waitingReviewCount = useMemo(() => {
    return submissions.filter((s) => s.status === 'under_evaluation').length
  }, [submissions])

  const reviewedCount = useMemo(() => {
    return submissions.filter((s) => s.status === 'graded').length
  }, [submissions])

  /* ================= FILTERED LISTS ================= */
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.course.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || exam.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [exams, searchTerm, statusFilter])

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesSearch =
        sub.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.studentName && sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesFilter = subFilter === 'all' || sub.status === subFilter
      return matchesSearch && matchesFilter
    })
  }, [submissions, searchTerm, subFilter])

  /* ================= EXAM BUILDER HANDLERS ================= */
  const handleOpenCreateExam = () => {
    setEditingExam(null)
    setExamFormData({
      title: '',
      course: 'Macroeconomic Theory & Policy',
      instructor: 'Rishika',
      status: 'upcoming',
      scheduledDate: 'Next Monday',
      scheduledTime: '10:00 AM - 11:00 AM IST',
      durationMinutes: 45,
      totalMarks: 50,
      passingMarks: 20,
      syllabus: ['Core Principles', 'Monetary Policy Framework'],
      instructions: [
        'Total duration is 45 minutes.',
        'Review your answers thoroughly before submission.'
      ],
      questions: []
    })
    setShowExamModal(true)
  }

  const handleOpenEditExam = (exam: Exam) => {
    setEditingExam(exam)
    setExamFormData({
      ...exam,
      syllabus: exam.syllabus.length ? exam.syllabus : [''],
      instructions: exam.instructions.length ? exam.instructions : ['']
    })
    setShowExamModal(true)
  }

  const handleDeleteExam = (id: string) => {
    if (confirm('Are you sure you want to delete this examination?')) {
      setExams((prev) => prev.filter((e) => e.id !== id))
    }
  }

  const handleAddQuestionToForm = () => {
    if (!newQuestionText.trim()) {
      alert('Please enter question prompt')
      return
    }

    const currentQuestions = examFormData.questions || []
    const newNumber = currentQuestions.length + 1

    const newQ: ExamQuestion = {
      id: 'q_' + Date.now(),
      number: newNumber,
      type: newQuestionType,
      question: newQuestionText.trim(),
      marks: Number(newQuestionMarks) || 5,
      ...(newQuestionType === 'mcq'
        ? {
            options: newQuestionOptions,
            correctAnswer: newCorrectOption,
            explanation: newExplanation
          }
        : {
            modelAnswer: newModelAnswer
          })
    }

    const updatedQuestions = [...currentQuestions, newQ]
    const calculatedTotalMarks = updatedQuestions.reduce((acc, q) => acc + q.marks, 0)
    const mcqCnt = updatedQuestions.filter((q) => q.type === 'mcq').length
    const descCnt = updatedQuestions.filter((q) => q.type === 'descriptive').length

    setExamFormData((prev) => ({
      ...prev,
      questions: updatedQuestions,
      totalMarks: calculatedTotalMarks,
      mcqCount: mcqCnt,
      descriptiveCount: descCnt
    }))

    // Reset question builder inputs
    setNewQuestionText('')
    setNewExplanation('')
    setNewModelAnswer('')
    setNewQuestionOptions([
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' }
    ])
  }

  const handleRemoveQuestionFromForm = (qId: string) => {
    const updated = (examFormData.questions || []).filter((q) => q.id !== qId)
    const renumbered = updated.map((q, idx) => ({ ...q, number: idx + 1 }))
    const calculatedTotal = renumbered.reduce((acc, q) => acc + q.marks, 0)

    setExamFormData((prev) => ({
      ...prev,
      questions: renumbered,
      totalMarks: calculatedTotal,
      mcqCount: renumbered.filter((q) => q.type === 'mcq').length,
      descriptiveCount: renumbered.filter((q) => q.type === 'descriptive').length
    }))
  }

  const handleSaveExam = () => {
    if (!examFormData.title?.trim()) {
      alert('Please enter exam title')
      return
    }

    const mcqCnt = (examFormData.questions || []).filter((q) => q.type === 'mcq').length
    const descCnt = (examFormData.questions || []).filter((q) => q.type === 'descriptive').length
    const calculatedTotal = (examFormData.questions || []).reduce((acc, q) => acc + q.marks, 0)

    const finalExam: Exam = {
      id: editingExam ? editingExam.id : 'exam-' + Date.now(),
      title: examFormData.title || 'Untitled Exam',
      course: examFormData.course || 'Macroeconomic Theory',
      instructor: examFormData.instructor || 'Rishika',
      status: examFormData.status || 'upcoming',
      scheduledDate: examFormData.scheduledDate || 'Active',
      scheduledTime: examFormData.scheduledTime || 'Flexible window',
      durationMinutes: Number(examFormData.durationMinutes) || 45,
      totalMarks: calculatedTotal || Number(examFormData.totalMarks) || 50,
      passingMarks: Number(examFormData.passingMarks) || 20,
      mcqCount: mcqCnt,
      descriptiveCount: descCnt,
      syllabus: (examFormData.syllabus || []).filter(Boolean),
      instructions: (examFormData.instructions || []).filter(Boolean),
      questions: examFormData.questions || []
    }

    if (editingExam) {
      setExams((prev) => prev.map((e) => (e.id === editingExam.id ? finalExam : e)))
    } else {
      setExams((prev) => [finalExam, ...prev])
    }

    setShowExamModal(false)
  }

  /* ================= GRADING STUDIO HANDLERS ================= */
  const handleOpenGradingStudio = (submission: ExamSubmission) => {
    setGradingSubmission(submission)

    const initialMarks: Record<string, number> = {}
    const initialComments: Record<string, string> = {}

    submission.answers.forEach((ans) => {
      if (ans.type === 'mcq') {
        initialMarks[ans.questionId] = ans.isCorrect ? ans.marks : 0
      } else {
        initialMarks[ans.questionId] = ans.marksAwarded !== undefined ? ans.marksAwarded : 0
      }
      initialComments[ans.questionId] = ans.teacherComment || ''
    })

    setGradingMarks(initialMarks)
    setGradingComments(initialComments)
    setOverallFeedback(submission.teacherFeedback?.overall || '')
    setFeedbackStrengths(submission.teacherFeedback?.strengths || [
      'Strong conceptual clarity in Section A',
      'Accurate definition of core macroeconomic terms'
    ])
    setFeedbackImprovements(submission.teacherFeedback?.improvements || [
      'Elaborate more on empirical examples in essay questions'
    ])
  }

  const handleSaveGrading = () => {
    if (!gradingSubmission) return

    let totalScore = 0
    const updatedAnswers = gradingSubmission.answers.map((ans) => {
      const awarded = gradingMarks[ans.questionId] !== undefined ? gradingMarks[ans.questionId] : (ans.marksAwarded || 0)
      totalScore += awarded
      return {
        ...ans,
        marksAwarded: awarded,
        teacherComment: gradingComments[ans.questionId] || ''
      }
    })

    const percentage = Math.round((totalScore / gradingSubmission.totalMarks) * 100)
    let grade = 'B'
    if (percentage >= 90) grade = 'A+ Outstanding'
    else if (percentage >= 80) grade = 'A Distinction'
    else if (percentage >= 70) grade = 'B+ Good'
    else if (percentage >= 60) grade = 'B Fair'
    else if (percentage >= 50) grade = 'C Pass'
    else grade = 'Needs Improvement'

    const isPassed = totalScore >= 20

    const updatedSub: ExamSubmission = {
      ...gradingSubmission,
      status: 'graded',
      scoreObtained: totalScore,
      percentage,
      grade,
      isPassed,
      teacherFeedback: {
        overall: overallFeedback || 'Well attempted! Detailed feedback recorded.',
        strengths: feedbackStrengths.filter(Boolean),
        improvements: feedbackImprovements.filter(Boolean),
        evaluatedAt: 'Just now by Instructor Rishika'
      },
      answers: updatedAnswers
    }

    setSubmissions((prev) => prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)))
    setGradingSubmission(null)
    alert(`Evaluation published successfully! Student score: ${totalScore}/${gradingSubmission.totalMarks} (${percentage}%)`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
              <Award className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Exams & Assessment Studio
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-300 font-medium text-sm sm:text-base">
            Author tests, schedule examination windows, and review student essay submissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateExam}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Exam</span>
          </button>
        </div>
      </div>

      {/* 4 METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Scheduled Exams */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 shadow-sm backdrop-blur-md relative overflow-hidden group hover:border-slate-300 dark:hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300">
              Scheduled Exams
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {scheduledCount}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
              Active & Upcoming
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            Open in student examination catalog
          </p>
        </div>

        {/* Metric 2: Exams Given (Submissions) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 shadow-sm backdrop-blur-md relative overflow-hidden group hover:border-slate-300 dark:hover:border-neutral-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300">
              Exams Given
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {totalExamsGiven}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
              Attempts Total
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            Total candidate exam submissions
          </p>
        </div>

        {/* Metric 3: Waiting for Review */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 shadow-sm backdrop-blur-md relative overflow-hidden group hover:border-amber-400/60 dark:hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300">
              Waiting for Review
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-300">
              {waitingReviewCount}
            </span>
            {waitingReviewCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                Action Required
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            Descriptive papers pending evaluation
          </p>
        </div>

        {/* Metric 4: Exams Reviewed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 shadow-sm backdrop-blur-md relative overflow-hidden group hover:border-emerald-400/60 dark:hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300">
              Exams Reviewed
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-300">
              {reviewedCount}
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Graded & Released
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            Scores and report cards finalized
          </p>
        </div>
      </div>

      {/* TABS & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Toggle View Mode */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-neutral-800/90 border border-slate-200 dark:border-neutral-700 w-fit">
          <button
            onClick={() => setActiveTab('exams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'exams'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Exams Repository ({exams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
              activeTab === 'submissions'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Student Submissions ({submissions.length})</span>
            {waitingReviewCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'exams' ? 'Search exams by title...' : 'Search student or exam...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {activeTab === 'exams' ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="live">Live Only</option>
              <option value="upcoming">Upcoming Only</option>
              <option value="expired">Expired Only</option>
            </select>
          ) : (
            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-white focus:outline-none"
            >
              <option value="all">All Submissions</option>
              <option value="under_evaluation">Waiting for Review ({waitingReviewCount})</option>
              <option value="graded">Graded ({reviewedCount})</option>
            </select>
          )}
        </div>
      </div>

      {/* VIEW 1: EXAMS REPOSITORY */}
      {activeTab === 'exams' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-neutral-700 transition"
            >
              <div>
                {/* Status & Course */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-800/40">
                    {exam.course}
                  </span>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                      exam.status === 'live'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : exam.status === 'upcoming'
                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-neutral-700'
                    }`}
                  >
                    {exam.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {exam.status.toUpperCase()}
                  </span>
                </div>

                {/* Exam Title */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {exam.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  Instructor: <span className="font-semibold text-slate-700 dark:text-white">{exam.instructor}</span> • Window: {exam.scheduledDate} ({exam.scheduledTime})
                </p>

                {/* Exam Key Specs */}
                <div className="grid grid-cols-3 gap-2.5 mt-4 py-3 border-y border-slate-100 dark:border-neutral-800/80 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-neutral-800/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-300 block">Duration</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">{exam.durationMinutes} Mins</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-neutral-800/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-300 block">Marks</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">{exam.totalMarks} (Pass: {exam.passingMarks})</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-neutral-800/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-300 block">Questions</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                      {exam.questions.length || exam.mcqCount + exam.descriptiveCount} Qs
                    </span>
                  </div>
                </div>

                {/* Syllabus Preview */}
                {exam.syllabus && exam.syllabus.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 block mb-1">
                      Topics Covered:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {exam.syllabus.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-200">
                          {item}
                        </span>
                      ))}
                      {exam.syllabus.length > 3 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-slate-300">
                          +{exam.syllabus.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-300">
                  {exam.questions.length} Questions authored
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditExam(exam)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-200 transition cursor-pointer"
                    title="Edit Exam"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Delete Exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredExams.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-3xl p-6">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-neutral-700 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">No examinations found</h4>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or click "Create New Exam".</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: STUDENT SUBMISSIONS & GRADING */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => {
            const isPending = sub.status === 'under_evaluation'

            return (
              <div
                key={sub.id}
                className={`rounded-2xl border p-5 sm:p-6 transition flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                  isPending
                    ? 'border-amber-300/80 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm'
                    : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 shadow-xs'
                }`}
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                        isPending
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60'
                      }`}
                    >
                      {isPending ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isPending ? 'Waiting for Evaluation' : 'Graded & Published'}
                    </span>

                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-300">
                      Submitted {sub.submittedAt}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                      {sub.examTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 flex items-center gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {sub.studentName ? `${sub.studentName} (${sub.studentEmail})` : sub.studentEmail}
                      </span>
                      <span>•</span>
                      <span>{sub.course}</span>
                      <span>•</span>
                      <span>{sub.timeSpentMinutes} mins taken</span>
                    </p>
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 dark:text-slate-300 block font-medium">Score</span>
                    <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {sub.scoreObtained !== undefined ? sub.scoreObtained : '—'}{' '}
                      <span className="text-xs text-slate-400 dark:text-slate-300 font-medium">/ {sub.totalMarks}</span>
                    </span>
                    {sub.grade && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                        {sub.grade}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenGradingStudio(sub)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      isPending
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                    }`}
                  >
                    <span>{isPending ? 'Evaluate & Grade' : 'Review Feedback'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}

          {filteredSubmissions.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-3xl p-6">
              <Award className="w-12 h-12 text-slate-300 dark:text-neutral-700 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">No submissions found</h4>
              <p className="text-xs text-slate-400 mt-1">When students complete exams, their papers will arrive here for evaluation.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: EXAM AUTHORING & BUILDER */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="rounded-3xl max-w-4xl w-full p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {editingExam ? 'Edit Examination' : 'Author New Examination'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                  Configure assessment parameters, schedule windows, and questions.
                </p>
              </div>

              <button
                onClick={() => setShowExamModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Basic Info Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Exam Title</label>
                <input
                  type="text"
                  placeholder="e.g. Principles of Macroeconomics Mid-Term 2026"
                  value={examFormData.title || ''}
                  onChange={(e) => setExamFormData((p) => ({ ...p, title: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Course Code & Name</label>
                <input
                  type="text"
                  placeholder="e.g. Macroeconomic Theory & Policy"
                  value={examFormData.course || ''}
                  onChange={(e) => setExamFormData((p) => ({ ...p, course: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Instructor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rishika"
                  value={examFormData.instructor || ''}
                  onChange={(e) => setExamFormData((p) => ({ ...p, instructor: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Scheduled Date</label>
                <input
                  type="text"
                  placeholder="e.g. Active Now or In 2 Days (Wednesday)"
                  value={examFormData.scheduledDate || ''}
                  onChange={(e) => setExamFormData((p) => ({ ...p, scheduledDate: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Scheduled Time Window</label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 AM - 11:00 AM IST"
                  value={examFormData.scheduledTime || ''}
                  onChange={(e) => setExamFormData((p) => ({ ...p, scheduledTime: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={examFormData.durationMinutes || 45}
                  onChange={(e) => setExamFormData((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Status</label>
                <select
                  value={examFormData.status || 'upcoming'}
                  onChange={(e) => setExamFormData((p) => ({ ...p, status: e.target.value as any }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-white"
                >
                  <option value="live">Live (Active Now)</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Questions Authoring Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Questions ({examFormData.questions?.length || 0})
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-300">Total Marks computed: {examFormData.totalMarks || 0} Marks</p>
                </div>
              </div>

              {/* Existing questions list */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {examFormData.questions?.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-800/40 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">Q{q.number}.</span>
                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-slate-200 font-semibold text-[10px]">
                          {q.type.toUpperCase()} • {q.marks} Marks
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 line-clamp-2">{q.question}</p>
                    </div>

                    <button
                      onClick={() => handleRemoveQuestionFromForm(q.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition"
                      title="Remove question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {(!examFormData.questions || examFormData.questions.length === 0) && (
                  <div className="text-center py-6 text-slate-400 dark:text-slate-300 text-xs border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                    No questions authored yet. Add one below.
                  </div>
                )}
              </div>

              {/* Add New Question Box */}
              <div className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                    Add New Question
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewQuestionType('mcq')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        newQuestionType === 'mcq'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-200'
                      }`}
                    >
                      Multiple Choice (MCQ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewQuestionType('descriptive')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        newQuestionType === 'descriptive'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-200'
                      }`}
                    >
                      Descriptive Essay
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="sm:col-span-3">
                    <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Question Prompt</label>
                    <textarea
                      rows={2}
                      placeholder="Type the question statement..."
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Marks</label>
                    <input
                      type="number"
                      value={newQuestionMarks}
                      onChange={(e) => setNewQuestionMarks(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* If MCQ: Options & Correct answer */}
                {newQuestionType === 'mcq' && (
                  <div className="space-y-2 pt-1 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block">Options & Correct Answer:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {newQuestionOptions.map((opt, i) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setNewCorrectOption(opt.id)}
                            className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer ${
                              newCorrectOption === opt.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-neutral-700 text-slate-600 dark:text-slate-300'
                            }`}
                            title="Mark as correct answer"
                          >
                            {opt.id}
                          </button>
                          <input
                            type="text"
                            placeholder={`Option ${opt.id} text...`}
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...newQuestionOptions]
                              updated[i].text = e.target.value
                              setNewQuestionOptions(updated)
                            }}
                            className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="pt-1">
                      <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Explanation / Solution Notes</label>
                      <input
                        type="text"
                        placeholder="Why is this answer correct? (Displayed to student after grading)"
                        value={newExplanation}
                        onChange={(e) => setNewExplanation(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* If Descriptive: Model Answer */}
                {newQuestionType === 'descriptive' && (
                  <div className="pt-1 text-xs">
                    <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Model Answer / Grading Rubrics</label>
                    <textarea
                      rows={2}
                      placeholder="Outline key economic concepts, formulas, or diagrams expected from the candidate..."
                      value={newModelAnswer}
                      onChange={(e) => setNewModelAnswer(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddQuestionToForm}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Insert Question into Exam</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExamModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExam}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-md transition active:scale-95"
              >
                Save & Publish Examination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TEACHER GRADING STUDIO */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="rounded-3xl max-w-4xl w-full p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-900/60">
                  Paper Assessment Studio
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  Evaluating {gradingSubmission.studentName || gradingSubmission.studentEmail}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {gradingSubmission.examTitle} • Completed in {gradingSubmission.timeSpentMinutes} mins
                </p>
              </div>

              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions Grading List */}
            <div className="space-y-6">
              {gradingSubmission.answers.map((ans, idx) => (
                <div
                  key={ans.questionId || idx}
                  className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/30 p-5 space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Question {ans.questionNumber} of {gradingSubmission.answers.length}
                      </span>
                      <span className="text-slate-300 dark:text-neutral-700 mx-2">•</span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                        {ans.type === 'mcq' ? 'Multiple Choice' : 'Descriptive Essay'} ({ans.marks} Marks max)
                      </span>
                    </div>

                    {ans.type === 'mcq' ? (
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          ans.isCorrect
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {ans.isCorrect ? `+${ans.marks} Marks (Auto-Correct)` : `0 Marks (Incorrect)`}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Award Marks:</span>
                        <input
                          type="number"
                          min={0}
                          max={ans.marks}
                          value={gradingMarks[ans.questionId] !== undefined ? gradingMarks[ans.questionId] : 0}
                          onChange={(e) =>
                            setGradingMarks((p) => ({
                              ...p,
                              [ans.questionId]: Math.min(ans.marks, Math.max(0, Number(e.target.value)))
                            }))
                          }
                          className="w-16 p-1.5 rounded-lg text-center font-bold text-xs border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400"
                        />
                        <span className="text-xs text-slate-400 dark:text-slate-300">/ {ans.marks}</span>
                      </div>
                    )}
                  </div>

                  {/* Question Prompt */}
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {ans.question}
                  </div>

                  {/* Student's Written Answer */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 block">
                      Candidate's Response:
                    </span>
                    <div
                      className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-normal whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: ans.studentAnswer || '<span class="italic text-slate-400">No response provided</span>' }}
                    />
                  </div>

                  {/* For Descriptive: Teacher Comment on this Answer */}
                  {ans.type === 'descriptive' && (
                    <div className="text-xs space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-300 block">Instructor Annotation for this Question:</label>
                      <input
                        type="text"
                        placeholder="e.g. Excellent explanation of shifting curves, remember to cite empirical instances."
                        value={gradingComments[ans.questionId] || ''}
                        onChange={(e) =>
                          setGradingComments((p) => ({
                            ...p,
                            [ans.questionId]: e.target.value
                          }))
                        }
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Overall Feedback Section */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-800/40 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Comprehensive Assessment & Teacher Remarks
              </h3>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-200 block">Overall Feedback Commentary</label>
                <textarea
                  rows={3}
                  placeholder="Provide personalized commentary summarizing candidate strengths and exam performance..."
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1.5">
                    Demonstrated Strengths
                  </label>
                  <div className="space-y-1.5">
                    {feedbackStrengths.map((str, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={str}
                          onChange={(e) => {
                            const updated = [...feedbackStrengths]
                            updated[idx] = e.target.value
                            setFeedbackStrengths(updated)
                          }}
                          className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setFeedbackStrengths((p) => p.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add another strength..."
                        value={newStrengthInput}
                        onChange={(e) => setNewStrengthInput(e.target.value)}
                        className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newStrengthInput.trim()) {
                            setFeedbackStrengths((p) => [...p, newStrengthInput.trim()])
                            setNewStrengthInput('')
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-amber-700 dark:text-amber-400 block mb-1.5">
                    Target Areas for Improvement
                  </label>
                  <div className="space-y-1.5">
                    {feedbackImprovements.map((imp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={imp}
                          onChange={(e) => {
                            const updated = [...feedbackImprovements]
                            updated[idx] = e.target.value
                            setFeedbackImprovements(updated)
                          }}
                          className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setFeedbackImprovements((p) => p.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add recommendation..."
                        value={newImprovementInput}
                        onChange={(e) => setNewImprovementInput(e.target.value)}
                        className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newImprovementInput.trim()) {
                            setFeedbackImprovements((p) => [...p, newImprovementInput.trim()])
                            setNewImprovementInput('')
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                Passing Requirement: 20 / {gradingSubmission.totalMarks} Marks
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGrading}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalize & Publish Evaluation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
