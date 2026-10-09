import {
  parseQuestionsWithGroq,
  extractTextFromPdfFile,
  getStoredGroqApiKey,
  setStoredGroqApiKey,
  GroqParseResult
} from '../lib/groqExamParser'

import { useEffect, useState, useMemo, useRef } from 'react'
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
  Layers,
  ArrowRight,
  Sparkles,
  UploadCloud,
  FileUp,
  Key,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw
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
    totalMarks: 100,
    passingMarks: 20,
    mcqCount: 4,
    descriptiveCount: 2,
    syllabus: [
      'National Income Accounting & GDP Deflator',
      'Keynesian Autonomous Investment Multiplier',
      'Open Market Operations & Reserve Requirements'
    ],
    instructions: [
      'Total duration is 45 minutes.',
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
        correctAnswer: 'B'
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
        correctAnswer: 'C'
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
          { id: 'C', text: 'The statutory reserve requirement ratio automatically quadruples' }
        ],
        correctAnswer: 'B'
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
          { id: 'C', text: 'Nominal interest rates and capital account surplus' }
        ],
        correctAnswer: 'B'
      },
      {
        id: 'q5',
        number: 5,
        type: 'descriptive',
        question: "Define the Keynesian concept of a 'Liquidity Trap'. Explain the precise economic conditions under which it develops and why conventional expansionary monetary policy becomes powerless.",
        marks: 15
      },
      {
        id: 'q6',
        number: 6,
        type: 'descriptive',
        question: 'Critically distinguish between Cost-Push Inflation and Demand-Pull Inflation.',
        marks: 15
      }
    ]
  },
  {
    id: 'exam-micro-structures',
    title: 'Microeconomics & Market Structures Unit Test',
    course: 'Foundations of Microeconomics',
    instructor: 'Rishika',
    status: 'live',
    scheduledDate: 'Oct 15, 2026',
    scheduledTime: '10:00 AM - 11:00 AM IST',
    durationMinutes: 60,
    totalMarks: 60,
    passingMarks: 24,
    mcqCount: 6,
    descriptiveCount: 2,
    syllabus: [],
    instructions: ['Scheduled live exam.'],
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
        marksAwarded: 5
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
        marksAwarded: 5
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
        marksAwarded: 5
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
        marksAwarded: 5
      },
      {
        questionId: 'q5',
        questionNumber: 5,
        type: 'descriptive',
        question: "Define the Keynesian concept of a 'Liquidity Trap' and why conventional monetary policy fails.",
        marks: 15,
        studentAnswer: 'A liquidity trap happens when interest rates are practically zero. Even if the central bank floods money, nobody invests because they prefer holding cash.',
        marksAwarded: undefined,
        teacherComment: ''
      },
      {
        questionId: 'q6',
        questionNumber: 6,
        type: 'descriptive',
        question: 'Critically distinguish between Cost-Push Inflation and Demand-Pull Inflation.',
        marks: 15,
        studentAnswer: 'Demand-pull inflation is caused by aggregate demand exceeding productive capacity. Cost-push is caused by supply shocks like oil price spikes.',
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
      overall: 'Exceptional answers. Clear understanding of macroeconomic models.',
      strengths: ['Analytical rigor in Phillips curve trade-off'],
      improvements: ['Include graphical AD-AS shifts'],
      evaluatedAt: 'Yesterday • 6:00 PM'
    },
    answers: []
  }
]

/* ================= STORAGE KEYS ================= */
const EXAMS_STORAGE_KEY = 'deeco_admin_exams'
const SUBMISSIONS_STORAGE_KEY = 'deeco_exam_results'
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

/* ================= MAIN COMPONENT ================= */

/* ================= DATE HELPERS ================= */

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};

const getTomorrowDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};

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

  // Streamlined Exam Form State (Title, Date, Time, Duration, Total Marks)
  const [examForm, setExamForm] = useState({
    title: '',
    scheduledDate: 'Anytime / Self-Paced',
    scheduledTime: 'Flexible',
    durationMinutes: 45,
    totalMarks: 100,
    questions: [] as ExamQuestion[]
  })

  // Streamlined Question Builder State
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [newQType, setNewQType] = useState<QuestionType>('mcq')
  const [newQPrompt, setNewQPrompt] = useState('')
  const [newQMarks, setNewQMarks] = useState<number | ''>(5)
  const [newQOptions, setNewQOptions] = useState<MCQOption[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' }
  ])
  const [newQCorrect, setNewQCorrect] = useState('A')

  // Groq AI Auto-Fill State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiApiKey, setAiApiKey] = useState('')
  const [tempApiKeyInput, setTempApiKeyInput] = useState('')
  const [isApiKeyExpanded, setIsApiKeyExpanded] = useState(false)
  const [aiSourceMode, setAiSourceMode] = useState<'pdf' | 'paste'>('pdf')
  const [aiPastedText, setAiPastedText] = useState('')
  const [aiUploadedFile, setAiUploadedFile] = useState<File | null>(null)
  const [aiExtractedPdfText, setAiExtractedPdfText] = useState('')
  const [aiPdfPages, setAiPdfPages] = useState(0)
  const [isPdfExtracting, setIsPdfExtracting] = useState(false)
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null)
  const [isAiParsing, setIsAiParsing] = useState(false)
  const [aiParseError, setAiParseError] = useState<string | null>(null)
  const [aiParseResult, setAiParseResult] = useState<GroqParseResult | null>(null)
  const [showTextPreview, setShowTextPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const stored = getStoredGroqApiKey()
    if (stored) {
      setAiApiKey(stored)
      setTempApiKeyInput(stored)
    }
  }, [])

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
    return exams.filter((e) => e.title.toLowerCase().includes(q) || (e.course && e.course.toLowerCase().includes(q)))
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

  /* ================= GROQ AI AUTO-FILL ACTIONS ================= */

  const handleSaveGroqKey = () => {
    if (!tempApiKeyInput.trim()) {
      alert('Please enter your Groq API key (starts with gsk_...)')
      return
    }
    setStoredGroqApiKey(tempApiKeyInput.trim())
    setAiApiKey(tempApiKeyInput.trim())
    setIsApiKeyExpanded(false)
    setAiParseError(null)
  }

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0])
    }
  }

  const processSelectedFile = async (file: File) => {
    setAiUploadedFile(file)
    setAiParseError(null)
    setAiParseResult(null)
    setIsPdfExtracting(true)
    setPdfProgress(null)
    try {
      const { text, pageCount } = await extractTextFromPdfFile(file, (p) => setPdfProgress(p))
      setAiExtractedPdfText(text)
      setAiPdfPages(pageCount)
    } catch (err: any) {
      setAiParseError(err.message || 'Failed to extract text from PDF.')
    } finally {
      setIsPdfExtracting(false)
    }
  }

  const handleRunGroqExtraction = async () => {
    const textToAnalyze = aiSourceMode === 'pdf' ? aiExtractedPdfText : aiPastedText
    const currentKey = aiApiKey.trim() || tempApiKeyInput.trim()

    if (!currentKey) {
      setIsApiKeyExpanded(true)
      setAiParseError('Please provide your Groq API Key above to extract questions.')
      return
    }

    if (!textToAnalyze.trim()) {
      setAiParseError(
        aiSourceMode === 'pdf'
          ? 'Please upload a PDF file first and wait for text extraction.'
          : 'Please paste your ChatGPT questions text first.'
      )
      return
    }

    setAiParseError(null)
    setIsAiParsing(true)
    try {
      const result = await parseQuestionsWithGroq(textToAnalyze, currentKey)
      setAiParseResult(result)
      if (!aiApiKey.trim() && currentKey) {
        setStoredGroqApiKey(currentKey)
        setAiApiKey(currentKey)
      }
    } catch (err: any) {
      setAiParseError(err.message || 'Groq question extraction failed.')
    } finally {
      setIsAiParsing(false)
    }
  }

  const handleApplyAiQuestions = (mode: 'append' | 'replace') => {
    if (!aiParseResult || aiParseResult.questions.length === 0) return

    let finalQuestions: ExamQuestion[]

    if (mode === 'append') {
      const baseNum = examForm.questions.length
      const mapped: ExamQuestion[] = aiParseResult.questions.map((q, idx) => ({
        id: 'q_' + Date.now() + '_' + idx,
        number: baseNum + idx + 1,
        type: q.type,
        question: q.question,
        marks: q.marks,
        options: q.options,
        correctAnswer: q.correctAnswer
      }))
      finalQuestions = [...examForm.questions, ...mapped]
    } else {
      finalQuestions = aiParseResult.questions.map((q, idx) => ({
        id: 'q_' + Date.now() + '_' + idx,
        number: idx + 1,
        type: q.type,
        question: q.question,
        marks: q.marks,
        options: q.options,
        correctAnswer: q.correctAnswer
      }))
    }

    const calcTotal = finalQuestions.reduce((acc, q) => acc + q.marks, 0)

    setExamForm((prev) => ({
      ...prev,
      questions: finalQuestions,
      totalMarks: calcTotal > 0 ? calcTotal : prev.totalMarks,
      ...(mode === 'replace' && aiParseResult.examTitle && !prev.title
        ? { title: aiParseResult.examTitle }
        : {})
    }))

    setIsAiModalOpen(false)
    setAiParseResult(null)
  }

  /* ================= EXAM MODAL ACTIONS ================= */

  const handleOpenAddExam = () => {
    setEditingExamId(null)
    setExamModalTab('settings')
    setExamForm({
      title: '',
      scheduledDate: 'Anytime / Self-Paced',
      scheduledTime: 'Flexible',
      durationMinutes: 45,
      totalMarks: 100,
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
      scheduledDate: exam.scheduledDate || 'Active Now',
      scheduledTime: exam.scheduledTime || '',
      durationMinutes: exam.durationMinutes || 45,
      totalMarks: exam.totalMarks || 50,
      questions: exam.questions || []
    })
    closeQuestionForm()
    setShowExamModal(true)
  }

  const openNewQuestionForm = (type: QuestionType) => {
    setEditingQuestionId(null)
    setNewQType(type)
    setNewQPrompt('')
    setNewQMarks(type === 'mcq' ? 5 : '')
    setNewQOptions([
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' }
    ])
    setNewQCorrect('A')
    setIsQuestionFormOpen(true)
  }

  const openEditQuestionForm = (q: ExamQuestion) => {
    setEditingQuestionId(q.id)
    setNewQType(q.type)
    setNewQPrompt(q.question)
    setNewQMarks(q.marks || '')
    setNewQOptions(
      q.options && q.options.length >= 2
        ? q.options.map((o) => ({ ...o }))
        : [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' },
            { id: 'D', text: '' }
          ]
    )
    setNewQCorrect(q.correctAnswer || 'A')
    setIsQuestionFormOpen(true)
  }

  const closeQuestionForm = () => {
    setIsQuestionFormOpen(false)
    setEditingQuestionId(null)
  }

  /* Dynamic MCQ Options Handling (X options) */
  const handleAddOption = () => {
    if (newQOptions.length >= 10) return
    const nextLetter = OPTION_LETTERS[newQOptions.length] || `Option ${newQOptions.length + 1}`
    setNewQOptions([...newQOptions, { id: nextLetter, text: '' }])
  }

  const handleRemoveOption = (indexToRemove: number) => {
    if (newQOptions.length <= 2) {
      alert('An MCQ question must have at least 2 options.')
      return
    }
    const filtered = newQOptions.filter((_, idx) => idx !== indexToRemove)
    const reIndexed = filtered.map((opt, idx) => ({
      ...opt,
      id: OPTION_LETTERS[idx] || `${idx + 1}`
    }))
    setNewQOptions(reIndexed)
    if (!reIndexed.some((o) => o.id === newQCorrect)) {
      setNewQCorrect(reIndexed[0].id)
    }
  }

  const handleOptionTextChange = (idx: number, text: string) => {
    const copy = [...newQOptions]
    copy[idx].text = text
    setNewQOptions(copy)
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

    const assignedMarks = Number(newQMarks) > 0 ? Number(newQMarks) : 0
    let updatedQuestions: ExamQuestion[]

    if (editingQuestionId) {
      updatedQuestions = examForm.questions.map((q) => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            type: newQType,
            question: newQPrompt.trim(),
            marks: assignedMarks,
            ...(newQType === 'mcq'
              ? {
                  options: newQOptions.map((o) => ({ ...o })),
                  correctAnswer: newQCorrect
                }
              : {
                  options: undefined,
                  correctAnswer: undefined
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
        marks: assignedMarks,
        ...(newQType === 'mcq'
          ? {
              options: newQOptions.map((o) => ({ ...o })),
              correctAnswer: newQCorrect
            }
          : {})
      }
      updatedQuestions = [...examForm.questions, newQuestion]
    }

    // Auto-sync total marks if set to 0 or if sum is higher
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
    if (!examForm.title.trim()) {
      alert('Please enter an exam title.')
      setExamModalTab('settings')
      return
    }

    const mcqCount = examForm.questions.filter((q) => q.type === 'mcq').length
    const descriptiveCount = examForm.questions.filter((q) => q.type === 'descriptive').length
    const totalMarks = Number(examForm.totalMarks) || (calculatedQuestionMarks || 50)
    const passingMarks = Math.round(totalMarks * 0.4) // Auto-calculate 40% benchmark

    if (editingExamId) {
      const updated = exams.map((ex) =>
        ex.id === editingExamId
          ? {
              ...ex,
              title: examForm.title.trim(),
              scheduledDate: examForm.scheduledDate.trim() || 'Active Now',
              scheduledTime: examForm.scheduledTime.trim() || '',
              durationMinutes: Number(examForm.durationMinutes) || 45,
              totalMarks,
              passingMarks,
              mcqCount,
              descriptiveCount,
              questions: examForm.questions
            }
          : ex
      )
      saveExamsToStorage(updated)
    } else {
      const newExam: Exam = {
        id: 'exam_' + Date.now(),
        title: examForm.title.trim(),
        course: 'General Examination',
        instructor: 'Rishika',
        status: 'live',
        scheduledDate: examForm.scheduledDate.trim() || 'Active Now',
        scheduledTime: examForm.scheduledTime.trim() || '',
        durationMinutes: Number(examForm.durationMinutes) || 45,
        totalMarks,
        passingMarks,
        mcqCount,
        descriptiveCount,
        syllabus: [],
        instructions: ['Auto-saved in real time. Please submit before timer expires.'],
        questions: examForm.questions
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
                  <th className="px-5 py-3.5">Exam Title</th>
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
                        {ex.course && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ex.course}</div>}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                        <div>{ex.scheduledDate}</div>
                        {ex.scheduledTime && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{ex.scheduledTime}</div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                        <div>{ex.durationMinutes} mins</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{ex.totalMarks} Marks</div>
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
      {/* 6. STREAMLINED EXAM CREATOR MODAL                                         */}
      {/* ========================================================================= */}
      {showExamModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
            
            {/* TOP HEADER */}
            <div className="p-5 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <FileText size={18} />
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingExamId ? 'Edit Examination' : 'Create New Exam'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowExamModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                title="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* TAB SELECTOR */}
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
                <Settings size={14} />
                <span>1. Exam Details</span>
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
                <Layers size={14} />
                <span>2. Questions ({examForm.questions.length})</span>
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

              {/* TAB 1: EXAM DETAILS (ONLY: Title, Date, Time, Duration, Total Marks) */}
              {examModalTab === 'settings' && (
                <div className="space-y-4 max-w-2xl">
                  {/* Exam Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                      Exam Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Macroeconomics Mid-Term Examination 2026"
                      value={examForm.title}
                      onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                      className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-3 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Scheduling Mode (Specific Date/Time vs Anytime / Self-Paced) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-850/60">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={(examForm.scheduledDate === 'Anytime / Self-Paced' || examForm.scheduledDate === 'No constraint')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExamForm({
                                ...examForm,
                                scheduledDate: 'Anytime / Self-Paced',
                                scheduledTime: 'Flexible'
                              })
                            } else {
                              setExamForm({
                                ...examForm,
                                scheduledDate: getTodayDateString(),
                                scheduledTime: '10:00'
                              })
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                          No date or time constraint (Anytime / Self-paced)
                        </span>
                      </label>

                      <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
                        {(examForm.scheduledDate === 'Anytime / Self-Paced' || examForm.scheduledDate === 'No constraint') ? '✓ Self-paced exam' : 'Scheduled window'}
                      </span>
                    </div>

                    {(examForm.scheduledDate === 'Anytime / Self-Paced' || examForm.scheduledDate === 'No constraint') ? (
                      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-base">
                            ∞
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              No Date/Time Constraint
                            </p>
                            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                              Students can take this exam whenever they want without any schedule restriction.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExamForm({
                              ...examForm,
                              scheduledDate: getTodayDateString(),
                              scheduledTime: '10:00'
                            })
                          }
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                        >
                          Set specific slot
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                              Date
                            </label>
                            {examForm.scheduledDate && (
                              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                {examForm.scheduledDate}
                              </span>
                            )}
                          </div>
                          <input
                            type="date"
                            value={examForm.scheduledDate === 'Active Now' ? '' : examForm.scheduledDate}
                            onChange={(e) => setExamForm({ ...examForm, scheduledDate: e.target.value })}
                            className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                          />
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <button
                              type="button"
                              onClick={() => setExamForm({ ...examForm, scheduledDate: getTodayDateString() })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                examForm.scheduledDate === getTodayDateString()
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={() => setExamForm({ ...examForm, scheduledDate: getTomorrowDateString() })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                examForm.scheduledDate === getTomorrowDateString()
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              Tomorrow
                            </button>
                            <button
                              type="button"
                              onClick={() => setExamForm({ ...examForm, scheduledDate: 'Active Now' })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                examForm.scheduledDate === 'Active Now'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              Active Now
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                              Time
                            </label>
                            {examForm.scheduledTime && (
                              <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                {examForm.scheduledTime}
                              </span>
                            )}
                          </div>
                          <input
                            type="time"
                            value={examForm.scheduledTime}
                            onChange={(e) => setExamForm({ ...examForm, scheduledTime: e.target.value })}
                            className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                          />
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {['09:00', '10:00', '14:00', '18:00'].map((timePreset) => (
                              <button
                                key={timePreset}
                                type="button"
                                onClick={() => setExamForm({ ...examForm, scheduledTime: timePreset })}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                  examForm.scheduledTime === timePreset
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                {timePreset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Duration & Total Marks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>

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
                          >
                            Sync ({calculatedQuestionMarks} Marks)
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={examForm.totalMarks}
                        onChange={(e) => setExamForm({ ...examForm, totalMarks: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <div className="flex gap-1.5 mt-2">
                        {[25, 50, 80, 100].map((presetMarks) => (
                          <button
                            key={presetMarks}
                            type="button"
                            onClick={() => setExamForm({ ...examForm, totalMarks: presetMarks })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              examForm.totalMarks === presetMarks
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {presetMarks}M
                          </button>
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1 block">
                        Sum of questions: {calculatedQuestionMarks} Marks
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setExamModalTab('questions')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition hover:opacity-90 cursor-pointer"
                    >
                      <span>Proceed to Questions</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: QUESTIONS BUILDER */}
              {examModalTab === 'questions' && (
                <div className="space-y-5">
                  {/* Action buttons */}
                  {!isQuestionFormOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => openNewQuestionForm('mcq')}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-indigo-200 dark:border-neutral-700 bg-indigo-50/50 dark:bg-neutral-800 text-indigo-700 dark:text-neutral-200 hover:bg-indigo-100 dark:hover:bg-neutral-750 transition cursor-pointer"
                      >
                        <Plus size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold">+ Add MCQ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openNewQuestionForm('descriptive')}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-emerald-200 dark:border-neutral-700 bg-emerald-50/50 dark:bg-neutral-800 text-emerald-700 dark:text-neutral-200 hover:bg-emerald-100 dark:hover:bg-neutral-750 transition cursor-pointer"
                      >
                        <Plus size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold">+ Add Descriptive</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAiModalOpen(true)
                          setAiParseError(null)
                        }}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-violet-300 dark:border-violet-700/60 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 text-violet-700 dark:text-violet-300 hover:from-violet-100 hover:to-indigo-100 dark:hover:from-violet-900/50 dark:hover:to-indigo-900/50 transition cursor-pointer shadow-xs"
                      >
                        <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
                        <span className="text-xs font-bold">✨ AI Auto-Fill (Groq)</span>
                      </button>
                    </div>
                  )}

                  {/* ACTIVE QUESTION EDITOR CARD */}
                  {isQuestionFormOpen && (
                    <div className="p-5 rounded-2xl border border-indigo-500/80 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-850/60 dark:bg-neutral-900 space-y-4 animate-in fade-in duration-150">
                      
                      {/* Editor Title & Type */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-neutral-800">
                        <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                          {editingQuestionId ? 'Edit Question' : 'New Question'}: {newQType === 'mcq' ? 'Multiple Choice' : 'Descriptive'}
                        </span>

                        <div className="flex gap-1.5 bg-slate-200 dark:bg-neutral-800 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setNewQType('mcq')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
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
                            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                              newQType === 'descriptive'
                                ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs'
                                : 'text-slate-600 dark:text-neutral-400'
                            }`}
                          >
                            Descriptive
                          </button>
                        </div>
                      </div>

                      {/* Question Prompt */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                          Question <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder={newQType === 'mcq' ? "Enter the multiple choice question..." : "Enter the descriptive question..."}
                          value={newQPrompt}
                          onChange={(e) => setNewQPrompt(e.target.value)}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed"
                          autoFocus
                        />
                      </div>

                      {/* Marks Field */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                          {newQType === 'descriptive' ? 'Marks (Optional):' : 'Marks:'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder={newQType === 'descriptive' ? 'Optional' : '5'}
                          value={newQMarks}
                          onChange={(e) => setNewQMarks(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-24 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      {/* MCQ: Dynamic X Options */}
                      {newQType === 'mcq' && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                              Options ({newQOptions.length}) & Correct Key:
                            </span>
                            <button
                              type="button"
                              onClick={handleAddOption}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={14} /> Add Option
                            </button>
                          </div>

                          <div className="space-y-2">
                            {newQOptions.map((opt, idx) => {
                              const isCorrect = newQCorrect === opt.id
                              return (
                                <div
                                  key={opt.id}
                                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                                    isCorrect
                                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                                      : 'border-slate-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="mcqCorrectOption"
                                    checked={isCorrect}
                                    onChange={() => setNewQCorrect(opt.id)}
                                    title={`Set Option ${opt.id} as correct`}
                                    className="w-4 h-4 accent-emerald-600 dark:accent-emerald-400 cursor-pointer ml-1"
                                  />

                                  <span
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                      isCorrect
                                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                                        : 'bg-slate-100 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300'
                                    }`}
                                  >
                                    {opt.id}
                                  </span>

                                  <input
                                    type="text"
                                    placeholder={`Option ${opt.id} text...`}
                                    value={opt.text}
                                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                                    className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 outline-none"
                                  />

                                  {isCorrect && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                                      Correct ✓
                                    </span>
                                  )}

                                  {newQOptions.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(idx)}
                                      className="text-slate-400 hover:text-rose-500 p-1 rounded transition cursor-pointer"
                                      title="Remove this option"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Question Actions */}
                      <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={closeQuestionForm}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveQuestion}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          <span>{editingQuestionId ? 'Update Question' : 'Add to Paper'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AUTHORED QUESTIONS LIST */}
                  <div className="space-y-2.5">
                    {examForm.questions.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800 space-y-3">
                        <div className="w-10 h-10 mx-auto rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-neutral-300">No questions in this paper yet</p>
                          <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">Add manually above, or auto-fill in seconds from a PDF or ChatGPT</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAiModalOpen(true)
                            setAiParseError(null)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold cursor-pointer transition shadow-2xs"
                        >
                          <Sparkles size={13} />
                          <span>AI Auto-Fill with Groq</span>
                        </button>
                      </div>
                    ) : (
                      examForm.questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-bold text-xs flex items-center justify-center">
                                Q{idx + 1}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                                {q.type === 'mcq' ? 'MCQ' : 'Descriptive'}
                              </span>
                              {q.marks > 0 && (
                                <span className="text-xs text-slate-500 dark:text-neutral-400">
                                  {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditQuestionForm(q)}
                                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestion(q)}
                                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                title="Duplicate"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-800 dark:text-neutral-200 font-medium">
                            {q.question}
                          </p>

                          {q.type === 'mcq' && q.options && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {q.options.map((opt) => (
                                <span
                                  key={opt.id}
                                  className={`text-[11px] px-2 py-0.5 rounded border ${
                                    opt.id === q.correctAnswer
                                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold'
                                      : 'border-slate-200 dark:border-neutral-750 text-slate-600 dark:text-neutral-400'
                                  }`}
                                >
                                  {opt.id}. {opt.text} {opt.id === q.correctAnswer && '✓'}
                                </span>
                              ))}
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
            <div className="p-4 border-t border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 dark:text-neutral-400">
                <span className="font-bold text-slate-900 dark:text-white">Total: {examForm.totalMarks} Marks</span>
                <span className="mx-1.5">•</span>
                <span>{examForm.questions.length} Questions</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveExam}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  <Check size={14} />
                  <span>{editingExamId ? 'Update Exam' : 'Save Exam'}</span>
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

      {/* GROQ AI QUESTION IMPORTER MODAL */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between bg-slate-50/50 dark:bg-neutral-850/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>AI Question Importer</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50">
                      Groq Llama 3.3 70B
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    Extract MCQs with options and descriptive questions directly from ChatGPT PDF or text
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAiModalOpen(false)
                  setAiParseError(null)
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* GROQ API KEY CONFIGURATION STRIP */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key size={14} className={aiApiKey ? "text-emerald-500" : "text-amber-500"} />
                    <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                      Groq API Key
                    </span>
                    {aiApiKey ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Configured ({aiApiKey.slice(0, 6)}...{aiApiKey.slice(-4)})
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        Key required for instant extraction
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsApiKeyExpanded(!isApiKeyExpanded)}
                    className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{aiApiKey ? 'Change Key' : 'Enter Key'}</span>
                    {isApiKeyExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {(!aiApiKey || isApiKeyExpanded) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-neutral-750 flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="gsk_..."
                      value={tempApiKeyInput}
                      onChange={(e) => setTempApiKeyInput(e.target.value)}
                      className="flex-1 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSaveGroqKey}
                      className="px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold cursor-pointer hover:opacity-90"
                    >
                      Save Key
                    </button>
                  </div>
                )}
              </div>

              {/* MODE SELECTOR (PDF vs TEXT PASTE) */}
              <div className="flex bg-slate-100 dark:bg-neutral-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAiSourceMode('pdf')}
                  className={\`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer \${
                    aiSourceMode === 'pdf'
                      ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }\`}
                >
                  <UploadCloud size={14} />
                  <span>Upload PDF / Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAiSourceMode('paste')}
                  className={\`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer \${
                    aiSourceMode === 'paste'
                      ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }\`}
                >
                  <FileText size={14} />
                  <span>Paste ChatGPT Text</span>
                </button>
              </div>

              {/* PDF UPLOAD TAB */}
              {aiSourceMode === 'pdf' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-neutral-750 hover:border-violet-500 dark:hover:border-violet-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-neutral-850/50 group"
                  >
                    <div className="w-12 h-12 mx-auto rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      {aiUploadedFile ? aiUploadedFile.name : 'Click to upload or drag & drop your PDF'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                      {aiUploadedFile
                        ? \`\${(aiUploadedFile.size / 1024).toFixed(1)} KB • Click to choose another file\`
                        : 'Supports PDF (.pdf), Plain Text (.txt), or Markdown (.md)'}
                    </p>
                  </div>

                  {/* PDF Extraction Status & Preview */}
                  {isPdfExtracting && (
                    <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 flex items-center gap-3 text-xs text-violet-700 dark:text-violet-300">
                      <Loader2 size={16} className="animate-spin" />
                      <span>
                        Extracting digital text with Mozilla PDF.js{' '}
                        {pdfProgress ? \`(\${pdfProgress.current} / \${pdfProgress.total} pages)\` : '...'}
                      </span>
                    </div>
                  )}

                  {aiExtractedPdfText && !isPdfExtracting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          <span>Extracted {aiPdfPages} page(s) ({aiExtractedPdfText.length} characters)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowTextPreview(!showTextPreview)}
                          className="text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200 underline cursor-pointer text-[11px]"
                        >
                          {showTextPreview ? 'Hide Text' : 'Preview Extracted Text'}
                        </button>
                      </div>

                      {showTextPreview && (
                        <textarea
                          readOnly
                          rows={4}
                          value={aiExtractedPdfText}
                          className="w-full bg-slate-100 dark:bg-neutral-850 border border-slate-200 dark:border-neutral-750 rounded-xl p-3 text-[11px] font-mono text-slate-700 dark:text-neutral-300 outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PASTE TEXT TAB */}
              {aiSourceMode === 'paste' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                      Paste ChatGPT Response or Question Text
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {aiPastedText.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    placeholder="Paste ChatGPT output here...&#10;&#10;Example:&#10;1. What is the multiplier in macroeconomics?&#10;A. 1 / (1 - MPC)&#10;B. MPC / MPS&#10;C. 1 - MPS&#10;Answer: A [2 Marks]&#10;&#10;2. Discuss monetary transmission mechanism. [5 Marks]"
                    value={aiPastedText}
                    onChange={(e) => setAiPastedText(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-850 border border-slate-300 dark:border-neutral-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500 font-mono leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    💡 Tip: You can paste the direct answer from ChatGPT without modifying the formatting. Groq will parse the questions, options, and marks cleanly.
                  </p>
                </div>
              )}

              {/* ERROR BANNER */}
              {aiParseError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="space-y-1">
                    <p className="font-semibold">{aiParseError}</p>
                  </div>
                </div>
              )}

              {/* PARSE ACTION BUTTON */}
              {!aiParseResult && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRunGroqExtraction}
                    disabled={isAiParsing || isPdfExtracting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isAiParsing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Analyzing with Groq Llama 3.3 70B (~1-2s)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Parse & Extract Questions with Groq</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* EXTRACTION RESULTS PREVIEW */}
              {aiParseResult && (
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-neutral-800 animate-in fade-in duration-200">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 size={15} />
                        <span>Successfully Extracted {aiParseResult.questions.length} Questions</span>
                      </p>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                        {aiParseResult.questions.filter((q) => q.type === 'mcq').length} MCQs •{' '}
                        {aiParseResult.questions.filter((q) => q.type === 'descriptive').length} Descriptive •{' '}
                        {aiParseResult.totalMarks} Total Marks
                        {aiParseResult.examTitle ? \` • "\${aiParseResult.examTitle}"\` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAiParseResult(null)}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={11} />
                      <span>Re-parse</span>
                    </button>
                  </div>

                  {/* Questions Preview List */}
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {aiParseResult.questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-850/50 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-neutral-200">
                              Q{idx + 1}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-neutral-750 text-slate-700 dark:text-neutral-300">
                              {q.type === 'mcq' ? 'MCQ' : 'Descriptive'}
                            </span>
                            {q.marks > 0 && (
                              <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                                {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                              </span>
                            )}
                          </div>

                          {q.type === 'mcq' && q.correctAnswer && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              Key: {q.correctAnswer}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-800 dark:text-neutral-200 line-clamp-2">
                          {q.question}
                        </p>

                        {q.type === 'mcq' && q.options && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-600 dark:text-neutral-400">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className={\`truncate px-2 py-0.5 rounded \${
                                  opt.id === q.correctAnswer
                                    ? 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                                    : 'bg-white dark:bg-neutral-800'
                                }\`}
                              >
                                <span className="font-bold mr-1">{opt.id}:</span>
                                {opt.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons to Apply */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleApplyAiQuestions('append')}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition cursor-pointer"
                    >
                      Append to Exam (+{aiParseResult.questions.length} Questions)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyAiQuestions('replace')}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-slate-300 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    >
                      Replace All Questions
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  )
}
