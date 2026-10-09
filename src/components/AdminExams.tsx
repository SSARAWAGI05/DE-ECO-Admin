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
  AlertCircle,
  Settings,
  HelpCircle,
  Copy,
  ChevronRight,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight
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
  const [examModalTab, setExamModalTab] = useState<'settings' | 'questions'>('settings')
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

  // Question Builder State (inside Exam Modal)
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [newQType, setNewQType] = useState<QuestionType>('mcq')
  const [newQPrompt, setNewQPrompt] = useState('')
  const [newQMarks, setNewQMarks] = useState(5)
  const [newQOptions, setNewQOptions] = useState<MCQOption[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' }
  ])
  const [newQCorrect, setNewQCorrect] = useState('A')
  const [newQModelAnswer, setNewQModelAnswer] = useState('')
  const [newQExplanation, setNewQExplanation] = useState('')

  // Grading Form State (inside Evaluation Modal)
  const [gradeMarks, setGradeMarks] = useState<Record<string, number>>({})
  const [gradeComments, setGradeComments] = useState<Record<string, string>>({})
  const [overallFeedback, setOverallFeedback] = useState('')

  /* ================= LOAD DATA ================= */

  useEffect(() => {
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

  const calculatedQuestionMarks = useMemo(() => {
    return examForm.questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0)
  }, [examForm.questions])

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
    setExamModalTab('settings')
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
    closeQuestionForm()
    setShowExamModal(true)
  }

  const handleOpenEditExam = (exam: Exam) => {
    setEditingExamId(exam.id)
    setExamModalTab('settings')
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
    closeQuestionForm()
    setShowExamModal(true)
  }

  const openNewQuestionForm = (type: QuestionType) => {
    setEditingQuestionId(null)
    setNewQType(type)
    setNewQPrompt('')
    setNewQMarks(type === 'mcq' ? 5 : 15)
    setNewQOptions([
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' }
    ])
    setNewQCorrect('A')
    setNewQModelAnswer('')
    setNewQExplanation('')
    setIsQuestionFormOpen(true)
  }

  const openEditQuestionForm = (q: ExamQuestion) => {
    setEditingQuestionId(q.id)
    setNewQType(q.type)
    setNewQPrompt(q.question)
    setNewQMarks(q.marks)
    setNewQOptions(
      q.options && q.options.length === 4
        ? q.options.map((o) => ({ ...o }))
        : [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' },
            { id: 'D', text: '' }
          ]
    )
    setNewQCorrect(q.correctAnswer || 'A')
    setNewQModelAnswer(q.modelAnswer || '')
    setNewQExplanation(q.explanation || '')
    setIsQuestionFormOpen(true)
  }

  const closeQuestionForm = () => {
    setIsQuestionFormOpen(false)
    setEditingQuestionId(null)
  }

  const handleSaveQuestion = () => {
    if (!newQPrompt.trim()) {
      alert('Please enter a question prompt.')
      return
    }

    if (newQType === 'mcq') {
      const emptyOpt = newQOptions.find((o) => !o.text.trim())
      if (emptyOpt) {
        alert(`Please fill in text for Option ${emptyOpt.id}.`)
        return
      }
    }

    let updatedQuestions: ExamQuestion[]

    if (editingQuestionId) {
      updatedQuestions = examForm.questions.map((q) => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            type: newQType,
            question: newQPrompt.trim(),
            marks: Number(newQMarks) || 5,
            ...(newQType === 'mcq'
              ? {
                  options: newQOptions.map((o) => ({ ...o })),
                  correctAnswer: newQCorrect,
                  explanation: newQExplanation.trim() || undefined,
                  modelAnswer: undefined
                }
              : {
                  modelAnswer: newQModelAnswer.trim() || undefined,
                  options: undefined,
                  correctAnswer: undefined,
                  explanation: undefined
                })
          }
        }
        return q
      })
    } else {
      const qNum = examForm.questions.length + 1
      const newQuestion: ExamQuestion = {
        id: 'q_' + Date.now(),
        number: qNum,
        type: newQType,
        question: newQPrompt.trim(),
        marks: Number(newQMarks) || 5,
        ...(newQType === 'mcq'
          ? {
              options: newQOptions.map((o) => ({ ...o })),
              correctAnswer: newQCorrect,
              explanation: newQExplanation.trim() || undefined
            }
          : {
              modelAnswer: newQModelAnswer.trim() || undefined
            })
      }
      updatedQuestions = [...examForm.questions, newQuestion]
    }

    // Auto-sync total marks
    const calcTotal = updatedQuestions.reduce((acc, q) => acc + q.marks, 0)
    setExamForm((prev) => ({
      ...prev,
      questions: updatedQuestions,
      totalMarks: calcTotal > 0 ? calcTotal : prev.totalMarks
    }))

    closeQuestionForm()
  }

  const handleRemoveQuestion = (id: string) => {
    const updated = examForm.questions
      .filter((q) => q.id !== id)
      .map((q, idx) => ({ ...q, number: idx + 1 }))
    const calcTotal = updated.reduce((acc, q) => acc + q.marks, 0)

    setExamForm((prev) => ({
      ...prev,
      questions: updated,
      totalMarks: calcTotal > 0 ? calcTotal : prev.totalMarks
    }))
  }

  const handleDuplicateQuestion = (q: ExamQuestion) => {
    const duplicated: ExamQuestion = {
      ...q,
      id: 'q_' + Date.now(),
      number: examForm.questions.length + 1,
      question: `${q.question} (Copy)`
    }
    const updated = [...examForm.questions, duplicated]
    const calcTotal = updated.reduce((acc, item) => acc + item.marks, 0)
    setExamForm((prev) => ({
      ...prev,
      questions: updated,
      totalMarks: calcTotal > 0 ? calcTotal : prev.totalMarks
    }))
  }

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!examForm.title.trim() || !examForm.course.trim()) {
      alert('Please fill in title and course name.')
      setExamModalTab('settings')
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

  /* ================= EVALUATION ACTIONS ================= */

  const handleOpenEvaluation = (sub: ExamSubmission) => {
    setEvaluatingSub(sub)

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
      {/* 1. HEADER */}
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

      {/* 2. COMPACT KPI STRIP */}
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

      {/* ========================================================================= */}
      {/* 6. REDESIGNED USER-FRIENDLY EXAM CREATOR MODAL                            */}
      {/* ========================================================================= */}
      {showExamModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
            
            {/* STICKY TOP HEADER */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-neutral-800 flex items-start justify-between bg-white dark:bg-neutral-900 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <FileText size={18} />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingExamId ? 'Edit Examination' : 'Create New Examination'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                  Configure scheduling settings, duration benchmarks, and author question papers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowExamModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                title="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* TAB SELECTOR BAR */}
            <div className="px-6 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setExamModalTab('settings')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  examModalTab === 'settings'
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
                }`}
              >
                <Settings size={15} />
                <span>1. Exam Settings & Scheduling</span>
              </button>

              <button
                type="button"
                onClick={() => setExamModalTab('questions')}
                className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  examModalTab === 'questions'
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200'
                }`}
              >
                <Layers size={15} />
                <span>2. Questions Paper Builder</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                  {examForm.questions.length}
                </span>
              </button>
            </div>

            {/* MODAL BODY (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">

              {/* ==================== TAB 1: EXAM SETTINGS ==================== */}
              {examModalTab === 'settings' && (
                <div className="space-y-6 max-w-3xl">
                  {/* General Identification */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-3">
                      Course & Subject Identification
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                          Examination Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Macroeconomics Mid-Term Examination 2026"
                          value={examForm.title}
                          onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                          Course or Subject Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Macroeconomic Theory & Policy"
                          value={examForm.course}
                          onChange={(e) => setExamForm({ ...examForm, course: e.target.value })}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status & Availability Selection */}
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-3">
                      Availability & Status
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {[
                        {
                          id: 'live',
                          label: 'Live (Active)',
                          desc: 'Available for immediate taking',
                          color: 'emerald'
                        },
                        {
                          id: 'upcoming',
                          label: 'Upcoming',
                          desc: 'Scheduled for future test window',
                          color: 'sky'
                        },
                        {
                          id: 'expired',
                          label: 'Concluded',
                          desc: 'Closed for new student submissions',
                          color: 'slate'
                        }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setExamForm({ ...examForm, status: item.id as any })}
                          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                            examForm.status === item.id
                              ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                              : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-slate-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {item.label}
                            </span>
                            {examForm.status === item.id && (
                              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 leading-snug">
                            {item.desc}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                          Schedule Window Text
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Active Now or Wednesday, Oct 15"
                          value={examForm.scheduledDate}
                          onChange={(e) => setExamForm({ ...examForm, scheduledDate: e.target.value })}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                          Timing Window (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Closes today at 6:00 PM IST"
                          value={examForm.scheduledTime}
                          onChange={(e) => setExamForm({ ...examForm, scheduledTime: e.target.value })}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Benchmark & Duration Parameters */}
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 mb-3">
                      Timing & Marking Benchmarks
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Duration */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                          Duration (Minutes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          value={examForm.durationMinutes}
                          onChange={(e) => setExamForm({ ...examForm, durationMinutes: Number(e.target.value) })}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <div className="flex gap-1.5 mt-2">
                          {[30, 45, 60, 90].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setExamForm({ ...examForm, durationMinutes: mins })}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Total Marks */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                            Total Marks
                          </label>
                          {calculatedQuestionMarks > 0 && (
                            <button
                              type="button"
                              onClick={() => setExamForm({ ...examForm, totalMarks: calculatedQuestionMarks })}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                              title="Sync to sum of question marks"
                            >
                              Sync ({calculatedQuestionMarks})
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={examForm.totalMarks}
                          onChange={(e) => setExamForm({ ...examForm, totalMarks: Number(e.target.value) })}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <span className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1 block">
                          Current sum: {calculatedQuestionMarks} Marks
                        </span>
                      </div>

                      {/* Passing Marks */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                          Passing Marks
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={examForm.passingMarks}
                          onChange={(e) => setExamForm({ ...examForm, passingMarks: Number(e.target.value) })}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <span className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1 block">
                          {examForm.totalMarks > 0
                            ? `${Math.round((examForm.passingMarks / examForm.totalMarks) * 100)}% benchmark`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Move to Step 2 Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setExamModalTab('questions')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition hover:opacity-90 cursor-pointer"
                    >
                      <span>Proceed to Question Paper</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ==================== TAB 2: QUESTIONS BUILDER ==================== */}
              {examModalTab === 'questions' && (
                <div className="space-y-6">
                  {/* Overview Stats Strip */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                        <span>Total Questions:</span>
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700">
                          {examForm.questions.length}
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-neutral-400">
                        MCQ: <span className="font-semibold text-slate-800 dark:text-white">{examForm.questions.filter(q => q.type === 'mcq').length}</span>
                      </div>
                      <div className="text-slate-500 dark:text-neutral-400">
                        Essay: <span className="font-semibold text-slate-800 dark:text-white">{examForm.questions.filter(q => q.type === 'descriptive').length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                      <span>Questions Marks:</span>
                      <span className={`px-2 py-0.5 rounded-md border ${
                        calculatedQuestionMarks === examForm.totalMarks
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                      }`}>
                        {calculatedQuestionMarks} / {examForm.totalMarks} Marks
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons to Add Question (When form is closed) */}
                  {!isQuestionFormOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => openNewQuestionForm('mcq')}
                        className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-500 dark:border-neutral-800 dark:hover:border-indigo-400 bg-white dark:bg-neutral-900/40 text-slate-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer group"
                      >
                        <Plus size={16} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold">+ Add Multiple Choice (MCQ)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openNewQuestionForm('descriptive')}
                        className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 dark:border-neutral-800 dark:hover:border-emerald-400 bg-white dark:bg-neutral-900/40 text-slate-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer group"
                      >
                        <Plus size={16} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold">+ Add Descriptive Essay Question</span>
                      </button>
                    </div>
                  )}

                  {/* ACTIVE QUESTION EDITOR CARD */}
                  {isQuestionFormOpen && (
                    <div className="p-5 sm:p-6 rounded-2xl border-2 border-indigo-500/80 dark:border-indigo-500/60 bg-white dark:bg-neutral-900 shadow-xl space-y-4 animate-in fade-in duration-150">
                      
                      {/* Editor Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            {editingQuestionId ? 'Editing Question' : `Question #${examForm.questions.length + 1}`}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {newQType === 'mcq' ? 'Multiple Choice' : 'Descriptive Essay'}
                          </span>
                        </div>

                        {/* Format & Marks controls */}
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1 bg-slate-100 dark:bg-neutral-800 p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setNewQType('mcq')}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                                newQType === 'mcq'
                                  ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs'
                                  : 'text-slate-600 dark:text-neutral-400'
                              }`}
                            >
                              MCQ
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewQType('descriptive')}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                                newQType === 'descriptive'
                                  ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs'
                                  : 'text-slate-600 dark:text-neutral-400'
                              }`}
                            >
                              Essay
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Marks:</span>
                            <input
                              type="number"
                              min="1"
                              value={newQMarks}
                              onChange={(e) => setNewQMarks(Number(e.target.value))}
                              className="w-16 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-2 py-1 rounded-md text-xs font-bold text-slate-900 dark:text-white text-center outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Question Prompt */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                          Question Prompt / Problem Statement <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder="e.g. In a closed Keynesian macroeconomic model, what is the value of the autonomous investment multiplier if the MPC is 0.8?"
                          value={newQPrompt}
                          onChange={(e) => setNewQPrompt(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-3 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                          autoFocus
                        />
                      </div>

                      {/* MCQ Options Builder */}
                      {newQType === 'mcq' && (
                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                              Options & Correct Answer Key:
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                              Select the circle for the correct answer
                            </span>
                          </div>

                          <div className="space-y-2">
                            {newQOptions.map((opt, idx) => {
                              const isCorrect = newQCorrect === opt.id
                              return (
                                <div
                                  key={opt.id}
                                  onClick={() => setNewQCorrect(opt.id)}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                                    isCorrect
                                      ? 'border-emerald-500 dark:border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                                      : 'border-slate-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/80 hover:border-slate-300 dark:hover:border-neutral-600'
                                  }`}
                                >
                                  {/* Radio indicator */}
                                  <div className="flex items-center justify-center shrink-0">
                                    <input
                                      type="radio"
                                      name="activeCorrectKey"
                                      checked={isCorrect}
                                      onChange={() => setNewQCorrect(opt.id)}
                                      className="w-4 h-4 accent-emerald-600 dark:accent-emerald-400 cursor-pointer"
                                    />
                                  </div>

                                  {/* Letter Badge */}
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                    isCorrect
                                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                                      : 'bg-slate-100 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300'
                                  }`}>
                                    {opt.id}
                                  </span>

                                  {/* Option Input */}
                                  <input
                                    type="text"
                                    placeholder={`Option ${opt.id} text...`}
                                    value={opt.text}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const copy = [...newQOptions]
                                      copy[idx].text = e.target.value
                                      setNewQOptions(copy)
                                    }}
                                    className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 outline-none"
                                  />

                                  {/* Correct Key Tag */}
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                                      Correct Key ✓
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Optional Solution Explanation */}
                          <div className="pt-2">
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1">
                              Solution Explanation / Rationale (Shown to students after submission):
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. The autonomous multiplier formula is k = 1 / (1 - MPC) = 1 / (1 - 0.8) = 5.0."
                              value={newQExplanation}
                              onChange={(e) => setNewQExplanation(e.target.value)}
                              className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-3 py-2 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Descriptive Model Answer Builder */}
                      {newQType === 'descriptive' && (
                        <div className="space-y-2 pt-1">
                          <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                            Model Answer & Evaluation Rubric (Guidelines for Instructor Grading):
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Detail the expected key arguments, core economic principles, and criteria for awarding full marks..."
                            value={newQModelAnswer}
                            onChange={(e) => setNewQModelAnswer(e.target.value)}
                            className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-3 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none leading-relaxed"
                          />
                        </div>
                      )}

                      {/* Action buttons inside Question Builder */}
                      <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={closeQuestionForm}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveQuestion}
                          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          <span>{editingQuestionId ? 'Update Question' : 'Save Question to Paper'}</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* LIST OF AUTHORED QUESTIONS */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                      Authored Questions ({examForm.questions.length})
                    </h3>

                    {examForm.questions.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30">
                        <HelpCircle className="w-8 h-8 text-slate-400 dark:text-neutral-600 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-700 dark:text-neutral-300">
                          No questions authored yet
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-neutral-500 mt-1 max-w-sm mx-auto">
                          Click above to add Multiple Choice questions with auto-scored keys, or Descriptive essays with grading rubrics.
                        </p>
                      </div>
                    ) : (
                      examForm.questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 hover:border-slate-300 dark:hover:border-neutral-700 transition space-y-2.5 group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-bold text-xs flex items-center justify-center">
                                Q{idx + 1}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                q.type === 'mcq'
                                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                              }`}>
                                {q.type === 'mcq' ? 'Multiple Choice' : 'Descriptive Essay'}
                              </span>

                              <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                                {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                              </span>
                            </div>

                            {/* Card Actions: Edit, Duplicate, Delete */}
                            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => openEditQuestionForm(q)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                                title="Edit question"
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestion(q)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                                title="Duplicate question"
                              >
                                <Copy size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                title="Delete question"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Prompt Snippet */}
                          <p className="text-xs text-slate-800 dark:text-neutral-200 font-medium leading-relaxed">
                            {q.question}
                          </p>

                          {/* MCQ Options Preview */}
                          {q.type === 'mcq' && q.options && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {q.options.map((opt) => (
                                <div
                                  key={opt.id}
                                  className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                    opt.id === q.correctAnswer
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                                      : 'bg-slate-50/50 dark:bg-neutral-800/40 border-slate-200/60 dark:border-neutral-700/60 text-slate-600 dark:text-neutral-400'
                                  }`}
                                >
                                  <span className="font-bold">{opt.id}.</span>
                                  <span className="truncate">{opt.text}</span>
                                  {opt.id === q.correctAnswer && <span className="ml-auto text-emerald-600 dark:text-emerald-400">✓</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Descriptive Model Snippet */}
                          {q.type === 'descriptive' && q.modelAnswer && (
                            <div className="text-[11px] text-slate-500 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-800/40 p-2 rounded-lg border border-slate-200/60 dark:border-neutral-700/60 truncate">
                              <span className="font-semibold text-slate-700 dark:text-neutral-300">Rubric: </span>
                              {q.modelAnswer}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* STICKY BOTTOM MODAL FOOTER */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 dark:text-neutral-400">
                <span className="font-bold text-slate-900 dark:text-white">Total: {examForm.totalMarks} Marks</span>
                <span className="mx-1.5">•</span>
                <span>Pass: {examForm.passingMarks}</span>
                <span className="mx-1.5">•</span>
                <span>{examForm.questions.length} Questions</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveExam}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  <Check size={14} />
                  <span>{editingExamId ? 'Update Exam' : 'Save Examination'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: GRADE / EVALUATE SUBMISSION                                      */}
      {/* ========================================================================= */}
      {evaluatingSub && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-neutral-800">
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
                  className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/60 space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Q{ans.questionNumber}. [{ans.type.toUpperCase()}] ({ans.marks} Marks)
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Awarded:</span>
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
                        className="w-16 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-2 py-1 rounded-md text-xs font-bold text-slate-900 dark:text-slate-50 text-center outline-none"
                      />
                      <span className="text-xs text-slate-400">/ {ans.marks}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-neutral-300 font-medium">
                    {ans.question}
                  </p>

                  <div className="p-3 rounded-lg bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-xs">
                    <span className="font-semibold text-slate-500 dark:text-neutral-400 block mb-1">
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
