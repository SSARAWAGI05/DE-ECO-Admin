import { useEffect, useState, useMemo } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Check,
  CheckCircle2,
  Clock,
  Award,
  FileText,
  AlertCircle
} from 'lucide-react'

/* ================= TYPES ================= */

export type QuestionType = 'mcq' | 'descriptive'

export interface MCQOption {
  id: string
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

/* ================= INITIAL SEED DATA ================= */

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
    scheduledDate: 'Oct 15, 2026',
    scheduledTime: '10:00 AM - 11:00 AM IST',
    durationMinutes: 60,
    totalMarks: 60,
    passingMarks: 24,
    mcqCount: 6,
    descriptiveCount: 2,
    syllabus: [
      'Consumer Equilibrium & Indifference Curves',
      'Price Elasticity of Demand & Supply',
      'Perfect Competition vs Pure Monopoly'
    ],
    instructions: [
      'Scheduled live exam window opens precisely at 10:00 AM IST.',
      'Covers Chapters 3, 4 and 5 of Microeconomic Foundations.'
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
        question: 'In a closed Keynesian macroeconomic model with no government sector, if MPC is 0.8, autonomous multiplier is:',
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
        question: 'Consequence of Central Bank Open Market Purchases on reserves:',
        marks: 5,
        studentAnswer: 'B',
        correctAnswer: 'B',
        isCorrect: true,
        marksAwarded: 5,
        explanation: 'Injects liquidity, rates fall.'
      },
      {
        questionId: 'q4',
        questionNumber: 4,
        type: 'mcq',
        question: 'Trade-off in short-run Phillips curve:',
        marks: 5,
        studentAnswer: 'B',
        correctAnswer: 'B',
        isCorrect: true,
        marksAwarded: 5,
        explanation: 'Inflation vs unemployment.'
      },
      {
        questionId: 'q5',
        questionNumber: 5,
        type: 'descriptive',
        question: "Define the Keynesian concept of a 'Liquidity Trap' and why conventional monetary policy fails.",
        marks: 15,
        studentAnswer: 'A liquidity trap happens when interest rates are practically zero. Even if the central bank floods money, nobody invests because they prefer holding cash. Monetary expansion fails because the IS curve does not move from interest rate cuts.',
        marksAwarded: undefined,
        teacherComment: ''
      },
      {
        questionId: 'q6',
        questionNumber: 6,
        type: 'descriptive',
        question: 'Critically distinguish between Cost-Push Inflation and Demand-Pull Inflation.',
        marks: 15,
        studentAnswer: 'Demand-pull inflation is caused by too much money chasing too few goods, shifting AD right. Cost-push is caused by supply shocks like oil price spikes shifting SRAS left, creating stagflation.',
        marksAwarded: undefined,
        teacherComment: ''
      }
    ]
  },
  {
    id: 'res-macro-student2',
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
    grade: 'A Distinction',
    isPassed: true,
    timeSpentMinutes: 38,
    teacherFeedback: {
      overall: 'Exceptional answers. Clear understanding of both macroeconomic models and policy trade-offs.',
      strengths: ['Analytical rigor in Phillips curve trade-off', 'Clear explanation of Keynesian multiplier'],
      improvements: ['Include graphical AD-AS shifts in stagflation'],
      evaluatedAt: 'Yesterday • 6:00 PM'
    },
    answers: []
  }
]

/* ================= STORAGE KEYS ================= */
const EXAMS_STORAGE_KEY = 'deeco_admin_exams'
const SUBMISSIONS_STORAGE_KEY = 'deeco_exam_results'

/* ================= MAIN COMPONENT ================= */

export default function AdminExams() {
  const [exams, setExams] = useState<Exam[]>([])
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([])
  const [activeTab, setActiveTab] = useState<'exams' | 'submissions'>('exams')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [showExamModal, setShowExamModal] = useState(false)
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [evaluatingSub, setEvaluatingSub] = useState<ExamSubmission | null>(null)

  // Exam Form State
  const [examForm, setExamForm] = useState({
    title: '',
    course: '',
    instructor: 'Rishika',
    status: 'live' as 'live' | 'upcoming' | 'expired',
    scheduledDate: 'Active Now',
    scheduledTime: '',
    durationMinutes: 45,
    totalMarks: 50,
    passingMarks: 20,
    questions: [] as ExamQuestion[]
  })

  // New Question Form State (inside Exam Modal)
  const [newQType, setNewQType] = useState<QuestionType>('mcq')
  const [newQPrompt, setNewQPrompt] = useState('')
  const [newQMarks, setNewQMarks] = useState(5)
  const [newQOptions, setNewQOptions] = useState([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' }
  ])
  const [newQCorrect, setNewQCorrect] = useState('A')
  const [newQModelAnswer, setNewQModelAnswer] = useState('')

  // Grading Form State (inside Evaluation Modal)
  const [gradeMarks, setGradeMarks] = useState<Record<string, number>>({})
  const [gradeComments, setGradeComments] = useState<Record<string, string>>({})
  const [overallFeedback, setOverallFeedback] = useState('')

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    // Load exams
    try {
      const savedExams = localStorage.getItem(EXAMS_STORAGE_KEY)
      if (savedExams) {
        setExams(JSON.parse(savedExams))
      } else {
        setExams(INITIAL_EXAMS)
        localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(INITIAL_EXAMS))
      }
    } catch {
      setExams(INITIAL_EXAMS)
    }

    // Load submissions
    try {
      const savedSubs = localStorage.getItem(SUBMISSIONS_STORAGE_KEY)
      if (savedSubs) {
        setSubmissions(JSON.parse(savedSubs))
      } else {
        setSubmissions(INITIAL_SUBMISSIONS)
        localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(INITIAL_SUBMISSIONS))
      }
    } catch {
      setSubmissions(INITIAL_SUBMISSIONS)
    }
  }, [])

  const saveExamsToStorage = (updated: Exam[]) => {
    setExams(updated)
    localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(updated))
  }

  const saveSubmissionsToStorage = (updated: ExamSubmission[]) => {
    setSubmissions(updated)
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated))
  }

  /* ================= STATS ================= */

  const liveExamsCount = useMemo(() => exams.filter((e) => e.status === 'live').length, [exams])
  const pendingCount = useMemo(() => submissions.filter((s) => s.status === 'under_evaluation').length, [submissions])
  const gradedCount = useMemo(() => submissions.filter((s) => s.status === 'graded').length, [submissions])

  /* ================= FILTERED DATA ================= */

  const filteredExams = useMemo(() => {
    if (!searchTerm.trim()) return exams
    const q = searchTerm.toLowerCase()
    return exams.filter((e) => e.title.toLowerCase().includes(q) || e.course.toLowerCase().includes(q))
  }, [exams, searchTerm])

  const filteredSubmissions = useMemo(() => {
    if (!searchTerm.trim()) return submissions
    const q = searchTerm.toLowerCase()
    return submissions.filter(
      (s) =>
        s.studentEmail.toLowerCase().includes(q) ||
        (s.studentName && s.studentName.toLowerCase().includes(q)) ||
        s.examTitle.toLowerCase().includes(q)
    )
  }, [submissions, searchTerm])

  /* ================= EXAM MODAL ACTIONS ================= */

  const handleOpenAddExam = () => {
    setEditingExamId(null)
    setExamForm({
      title: '',
      course: '',
      instructor: 'Rishika',
      status: 'live',
      scheduledDate: 'Active Now',
      scheduledTime: '',
      durationMinutes: 45,
      totalMarks: 50,
      passingMarks: 20,
      questions: []
    })
    resetNewQForm()
    setShowExamModal(true)
  }

  const handleOpenEditExam = (exam: Exam) => {
    setEditingExamId(exam.id)
    setExamForm({
      title: exam.title,
      course: exam.course,
      instructor: exam.instructor,
      status: exam.status,
      scheduledDate: exam.scheduledDate,
      scheduledTime: exam.scheduledTime || '',
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      questions: exam.questions || []
    })
    resetNewQForm()
    setShowExamModal(true)
  }

  const resetNewQForm = () => {
    setNewQPrompt('')
    setNewQMarks(5)
    setNewQOptions([
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' }
    ])
    setNewQCorrect('A')
    setNewQModelAnswer('')
  }

  const handleAddQuestionToForm = () => {
    if (!newQPrompt.trim()) {
      alert('Please enter the question prompt.')
      return
    }

    const qNum = examForm.questions.length + 1
    const newQ: ExamQuestion = {
      id: 'q_' + Date.now(),
      number: qNum,
      type: newQType,
      question: newQPrompt.trim(),
      marks: Number(newQMarks) || 5,
      ...(newQType === 'mcq'
        ? {
            options: newQOptions.map((o) => ({ ...o })),
            correctAnswer: newQCorrect
          }
        : {
            modelAnswer: newQModelAnswer.trim()
          })
    }

    const updatedQs = [...examForm.questions, newQ]
    const calcTotal = updatedQs.reduce((acc, q) => acc + q.marks, 0)

    setExamForm((prev) => ({
      ...prev,
      questions: updatedQs,
      totalMarks: calcTotal > 0 ? calcTotal : prev.totalMarks
    }))

    resetNewQForm()
  }

  const handleRemoveQuestionFromForm = (id: string) => {
    const updatedQs = examForm.questions
      .filter((q) => q.id !== id)
      .map((q, idx) => ({ ...q, number: idx + 1 }))
    const calcTotal = updatedQs.reduce((acc, q) => acc + q.marks, 0)

    setExamForm((prev) => ({
      ...prev,
      questions: updatedQs,
      totalMarks: calcTotal > 0 ? calcTotal : prev.totalMarks
    }))
  }

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!examForm.title.trim() || !examForm.course.trim()) {
      alert('Please fill in title and course name.')
      return
    }

    const mcqCount = examForm.questions.filter((q) => q.type === 'mcq').length
    const descriptiveCount = examForm.questions.filter((q) => q.type === 'descriptive').length

    if (editingExamId) {
      const updated = exams.map((ex) =>
        ex.id === editingExamId
          ? {
              ...ex,
              ...examForm,
              mcqCount,
              descriptiveCount
            }
          : ex
      )
      saveExamsToStorage(updated)
    } else {
      const newExam: Exam = {
        id: 'exam_' + Date.now(),
        ...examForm,
        mcqCount,
        descriptiveCount,
        syllabus: [],
        instructions: ['Auto-saved in real time. Please submit before timer expires.']
      }
      saveExamsToStorage([newExam, ...exams])
    }

    setShowExamModal(false)
  }

  const handleDeleteExam = (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return
    saveExamsToStorage(exams.filter((e) => e.id !== id))
  }

  /* ================= GRADING / EVALUATION ACTIONS ================= */

  const handleOpenEvaluation = (sub: ExamSubmission) => {
    setEvaluatingSub(sub)

    // Pre-populate existing awarded marks and comments
    const initialMarks: Record<string, number> = {}
    const initialComments: Record<string, string> = {}

    sub.answers.forEach((ans) => {
      if (ans.type === 'mcq') {
        initialMarks[ans.questionId] = ans.isCorrect ? ans.marks : 0
      } else {
        initialMarks[ans.questionId] = ans.marksAwarded !== undefined ? ans.marksAwarded : 0
      }
      initialComments[ans.questionId] = ans.teacherComment || ''
    })

    setGradeMarks(initialMarks)
    setGradeComments(initialComments)
    setOverallFeedback(sub.teacherFeedback?.overall || '')
  }

  const handlePublishGrade = () => {
    if (!evaluatingSub) return

    let totalScore = 0
    const updatedAnswers = evaluatingSub.answers.map((ans) => {
      const awarded = gradeMarks[ans.questionId] !== undefined ? gradeMarks[ans.questionId] : (ans.isCorrect ? ans.marks : 0)
      totalScore += awarded
      return {
        ...ans,
        marksAwarded: awarded,
        teacherComment: gradeComments[ans.questionId] || ''
      }
    })

    const percentage = Math.round((totalScore / (evaluatingSub.totalMarks || 50)) * 100)
    let grade = 'B'
    if (percentage >= 90) grade = 'A+ Outstanding'
    else if (percentage >= 80) grade = 'A Distinction'
    else if (percentage >= 70) grade = 'B+ Meritorious'
    else if (percentage >= 60) grade = 'B Qualified'
    else if (percentage >= 40) grade = 'C Pass'
    else grade = 'F Needs Retake'

    const updatedSub: ExamSubmission = {
      ...evaluatingSub,
      status: 'graded',
      scoreObtained: totalScore,
      percentage,
      grade,
      isPassed: percentage >= 40,
      answers: updatedAnswers,
      teacherFeedback: {
        overall: overallFeedback.trim() || 'Good attempt on the paper.',
        strengths: ['Demonstrated understanding of key concepts'],
        improvements: ['Review questions where marks were deducted'],
        evaluatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }
    }

    const updatedAll = submissions.map((s) => (s.id === evaluatingSub.id ? updatedSub : s))
    saveSubmissionsToStorage(updatedAll)
    setEvaluatingSub(null)
  }

  /* ================= UI RENDER ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* 1. HEADER (Matches AdminCourses.tsx clean aesthetic) */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-neutral-800 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-1">
            Exams & Grading
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Manage examination papers and evaluate student submissions
          </p>
        </div>

        <button
          onClick={handleOpenAddExam}
          className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors text-white dark:text-slate-900 px-5 py-2.5 rounded-lg font-semibold w-full sm:w-auto cursor-pointer"
        >
          <Plus size={18} /> Add Exam
        </button>
      </div>

      {/* 2. COMPACT KPI STRIP (Minimal, to the point) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-slate-200 dark:border-neutral-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Exams</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{exams.length}</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-slate-200 dark:border-neutral-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Live Exams</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{liveExamsCount}</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-slate-200 dark:border-neutral-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pending Grading</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-slate-200 dark:border-neutral-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Graded Papers</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{gradedCount}</div>
        </div>
      </div>

      {/* 3. TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-neutral-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'exams'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Exams ({exams.length})
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Submissions ({submissions.length})</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'exams' ? 'Search exams by title...' : 'Search student or exam...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
          />
        </div>
      </div>

      {/* 4. VIEW: EXAMS TABLE */}
      {activeTab === 'exams' && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-neutral-800/60 border-b border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Exam Title & Course</th>
                  <th className="px-5 py-3.5">Schedule</th>
                  <th className="px-5 py-3.5">Duration & Marks</th>
                  <th className="px-5 py-3.5">Questions</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {filteredExams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      No exams found
                    </td>
                  </tr>
                ) : (
                  filteredExams.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{ex.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ex.course}</div>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                        <div>{ex.scheduledDate}</div>
                        {ex.scheduledTime && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{ex.scheduledTime}</div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                        <div>{ex.durationMinutes} mins</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{ex.totalMarks} Marks (Pass: {ex.passingMarks})</div>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                        {ex.questions.length > 0 ? (
                          <span>{ex.questions.length} questions ({ex.questions.filter(q => q.type === 'mcq').length} MCQ, {ex.questions.filter(q => q.type === 'descriptive').length} Essay)</span>
                        ) : (
                          <span className="text-slate-400">{ex.mcqCount + ex.descriptiveCount} Qs (Default)</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            ex.status === 'live'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80'
                              : ex.status === 'upcoming'
                              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/80'
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {ex.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditExam(ex)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                            title="Edit Exam"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteExam(ex.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Delete Exam"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. VIEW: SUBMISSIONS TABLE */}
      {activeTab === 'submissions' && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-neutral-800/60 border-b border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Exam</th>
                  <th className="px-5 py-3.5">Submitted</th>
                  <th className="px-5 py-3.5">Score / Grade</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                      No student submissions found
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {sub.studentName || 'Student'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub.studentEmail}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900 dark:text-white text-xs">{sub.examTitle}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub.course}</div>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                        {sub.submittedAt}
                      </td>

                      <td className="px-5 py-4 text-xs">
                        {sub.status === 'graded' ? (
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {sub.scoreObtained}/{sub.totalMarks} ({sub.percentage}%) • {sub.grade}
                          </div>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Pending Review</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            sub.status === 'graded'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80'
                          }`}
                        >
                          {sub.status === 'graded' ? 'GRADED' : 'NEEDS REVIEW'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleOpenEvaluation(sub)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            sub.status === 'graded'
                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-slate-200'
                              : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-2xs'
                          }`}
                        >
                          {sub.status === 'graded' ? 'View Review' : 'Grade Paper'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. MODAL: CREATE / EDIT EXAM */}
      {showExamModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-neutral-800">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-neutral-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {editingExamId ? 'Edit Exam' : 'Create New Exam'}
              </h2>
              <button
                onClick={() => setShowExamModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExam} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Exam Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Macroeconomics Mid-Term"
                    value={examForm.title}
                    onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Course Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Macroeconomic Theory & Policy"
                    value={examForm.course}
                    onChange={(e) => setExamForm({ ...examForm, course: e.target.value })}
                    className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="5"
                    required
                    value={examForm.durationMinutes}
                    onChange={(e) => setExamForm({ ...examForm, durationMinutes: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={examForm.totalMarks}
                    onChange={(e) => setExamForm({ ...examForm, totalMarks: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={examForm.passingMarks}
                    onChange={(e) => setExamForm({ ...examForm, passingMarks: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={examForm.status}
                    onChange={(e) => setExamForm({ ...examForm, status: e.target.value as any })}
                    className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="live">Live (Active)</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* QUESTIONS BUILDER SECTION */}
              <div className="pt-4 border-t border-slate-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Questions ({examForm.questions.length})
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Sum: {examForm.questions.reduce((a, b) => a + b.marks, 0)} / {examForm.totalMarks} Marks
                  </span>
                </div>

                {/* Existing Questions List */}
                <div className="space-y-2 mb-4">
                  {examForm.questions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-neutral-800/60 border border-slate-200/80 dark:border-neutral-700/80 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white mr-2">
                          Q{q.number}. [{q.type.toUpperCase()}] ({q.marks} Marks)
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          {q.question}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestionFromForm(q.id)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer"
                        title="Remove question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Question Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-850/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Add New Question</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewQType('mcq')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                          newQType === 'mcq'
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        MCQ
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewQType('descriptive')}
                        className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                          newQType === 'descriptive'
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Descriptive Essay
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Enter question text..."
                    value={newQPrompt}
                    onChange={(e) => setNewQPrompt(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2 rounded-lg text-xs text-slate-900 dark:text-slate-50 focus:ring-1 focus:ring-slate-900 outline-none"
                  />

                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Marks:</label>
                    <input
                      type="number"
                      min="1"
                      value={newQMarks}
                      onChange={(e) => setNewQMarks(Number(e.target.value))}
                      className="w-20 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-2 py-1 rounded text-xs text-slate-900 dark:text-slate-50"
                    />
                  </div>

                  {newQType === 'mcq' ? (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Options & Correct Key:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {newQOptions.map((opt, idx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span className="text-xs font-bold w-4 text-slate-600 dark:text-slate-400">{opt.id}.</span>
                            <input
                              type="text"
                              placeholder={`Option ${opt.id}`}
                              value={opt.text}
                              onChange={(e) => {
                                const copy = [...newQOptions]
                                copy[idx].text = e.target.value
                                setNewQOptions(copy)
                              }}
                              className="flex-1 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-2 py-1 rounded text-xs text-slate-900 dark:text-slate-50"
                            />
                            <input
                              type="radio"
                              name="correctOption"
                              checked={newQCorrect === opt.id}
                              onChange={() => setNewQCorrect(opt.id)}
                              title={`Set ${opt.id} as correct`}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Model Answer / Rubric Guidelines:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Expected answer or grading rubric..."
                        value={newQModelAnswer}
                        onChange={(e) => setNewQModelAnswer(e.target.value)}
                        className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2 rounded-lg text-xs text-slate-900 dark:text-slate-50 focus:ring-1 focus:ring-slate-900 outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddQuestionToForm}
                    className="w-full py-2 bg-slate-200 dark:bg-neutral-700 hover:bg-slate-300 dark:hover:bg-neutral-600 text-slate-800 dark:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    + Add Question to Exam
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-sm font-bold transition cursor-pointer"
                >
                  {editingExamId ? 'Update Exam' : 'Save Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: GRADE / EVALUATE SUBMISSION */}
      {evaluatingSub && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-neutral-800">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-neutral-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  Grade Student Submission
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {evaluatingSub.studentName || 'Student'} ({evaluatingSub.studentEmail}) • {evaluatingSub.examTitle}
                </p>
              </div>
              <button
                onClick={() => setEvaluatingSub(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Questions Grading Area */}
            <div className="p-6 space-y-6">
              {evaluatingSub.answers.map((ans, idx) => (
                <div
                  key={ans.questionId || idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/30 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Q{ans.questionNumber}. [{ans.type.toUpperCase()}] ({ans.marks} Marks)
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Awarded:</span>
                      <input
                        type="number"
                        min="0"
                        max={ans.marks}
                        value={gradeMarks[ans.questionId] ?? (ans.isCorrect ? ans.marks : 0)}
                        onChange={(e) =>
                          setGradeMarks({
                            ...gradeMarks,
                            [ans.questionId]: Math.min(ans.marks, Math.max(0, Number(e.target.value)))
                          })
                        }
                        className="w-16 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-2 py-1 rounded text-xs font-bold text-slate-900 dark:text-slate-50 text-center"
                      />
                      <span className="text-xs text-slate-400">/ {ans.marks}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {ans.question}
                  </p>

                  <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Student's Answer:
                    </span>
                    <div className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                      {ans.studentAnswer || '(No answer submitted)'}
                    </div>
                  </div>

                  {ans.type === 'mcq' && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Correct Key: <span className="font-bold text-emerald-600 dark:text-emerald-400">{ans.correctAnswer}</span>
                      {ans.isCorrect !== undefined && (
                        <span className="ml-2 font-semibold">
                          ({ans.isCorrect ? '✓ Correct' : '✗ Incorrect'})
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      placeholder="Feedback for this question (optional)..."
                      value={gradeComments[ans.questionId] || ''}
                      onChange={(e) =>
                        setGradeComments({ ...gradeComments, [ans.questionId]: e.target.value })
                      }
                      className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-3 py-1.5 rounded-lg text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>
              ))}

              {/* Overall Commentary */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Overall Instructor Commentary
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide comprehensive feedback for the student..."
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-3 rounded-lg text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Total Calculated Score:{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {Object.values(gradeMarks).reduce((a, b) => a + b, 0)} / {evaluatingSub.totalMarks} Marks
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEvaluatingSub(null)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePublishGrade}
                    className="px-6 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-sm font-bold transition cursor-pointer"
                  >
                    Publish Grade & Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
