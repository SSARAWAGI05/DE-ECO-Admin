import {
  parseQuestionsWithGroq,
  extractTextFromPdfFile,
  getStoredGroqApiKey,
  setStoredGroqApiKey,
  GroqParseResult
} from '../lib/groqExamParser'
import { supabase } from '../lib/supabaseClient'

import { useEffect, useState, useMemo, useRef } from 'react'
import {
  Calendar,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Check,
  CheckCircle2,
  Clock,
  Award,
  Download,
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
  RefreshCw,
  User,
  BookOpen,
  UserCheck,
  GraduationCap,
  Mail,
  Users
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
  courseId?: string
  assignedType?: 'course' | 'student'
  assignedStudentEmail?: string
  assignedStudentName?: string
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

export interface StudentProfileOption {
  id: string
  first_name?: string
  last_name?: string
  email: string
}

export interface CourseOption {
  id: string
  title: string
}

export interface ExamSubmission {
  id: string
  examId: string
  userId?: string
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

const INITIAL_EXAMS: Exam[] = []
const INITIAL_SUBMISSIONS: ExamSubmission[] = []

/* ================= STORAGE KEYS ================= */
const EXAMS_STORAGE_KEY = 'deeco_admin_exams'
const SUBMISSIONS_STORAGE_KEY = 'deeco_exam_results'
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']


/* ========================================================================= */
/* =========== DE-ECO OFFICIAL REPORT CARD & TRANSCRIPT DOWNLOADER ========= */
/* ========================================================================= */

const escapeHtml = (str: string = ''): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const stripHtmlTags = (html: string = ''): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

export const downloadReportCard = (
  data: any,
  options?: { studentName?: string; studentEmail?: string }
) => {
  const candidateName = options?.studentName || data.studentName || 'Student';
  const candidateEmail = options?.studentEmail || data.studentEmail || 'Registered Student';
  const examTitle = data.examTitle || 'Academic Examination';
  const rawCourse = (data.course || '').trim();
  let courseTitle = rawCourse || 'Economics & Finance Curriculum';
  let courseMetaLabel = 'Associated Course';
  if (/^1-on-1/i.test(rawCourse) || rawCourse.toLowerCase().includes('1-on-1')) {
    const match = rawCourse.match(/^1-on-1\s*[:\-–]?\s*(.*)$/i);
    const namePart = (match && match[1] ? match[1].trim() : '') || candidateName;
    courseTitle = namePart ? `Assessment #1: ${namePart}` : 'Assessment #1';
    courseMetaLabel = 'Academic Assessment';
  } else if (rawCourse.startsWith('Assessment #')) {
    courseMetaLabel = 'Academic Assessment';
  }
  const instructor = data.instructor || 'Instructor Rishika';
  const totalMarks = Number(data.totalMarks) || 100;
  const scoreObtained = data.scoreObtained !== undefined ? Number(data.scoreObtained) : 0;
  const percentage = data.percentage !== undefined ? Number(data.percentage) : Math.round((scoreObtained / (totalMarks || 1)) * 100);
  const grade = data.grade || 'Completed';
  const isPassed = data.isPassed !== undefined ? Boolean(data.isPassed) : percentage >= 40;
  const timeSpent = Number(data.timeSpentMinutes) || 0;
  const submittedAt = data.submittedAt || new Date().toLocaleDateString('en-US');
  const feedback = data.teacherFeedback;
  const transcriptCode = 'DEECO-' + (data.id ? String(data.id).slice(0, 8).toUpperCase() : 'TRANSCRIPT');

  const answersList: any[] = Array.isArray(data.answers) ? data.answers : [];
  const mcqQuestions = answersList.filter((a) => a.type === 'mcq');
  const descriptiveQuestions = answersList.filter((a) => a.type === 'descriptive');

  const mcqTotal = mcqQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
  const mcqAwarded = mcqQuestions.reduce(
    (acc, q) => acc + (q.marksAwarded !== undefined ? Number(q.marksAwarded) : (q.isCorrect ? Number(q.marks) : 0)),
    0
  );

  const descTotal = descriptiveQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
  const descAwarded = descriptiveQuestions.reduce((acc, q) => acc + (q.marksAwarded !== undefined ? Number(q.marksAwarded) : 0), 0);

  const issueDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const html = '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <title>DE-ECO Official Report Card - ' + escapeHtml(examTitle) + '</title>' +
'  <style>' +
'    @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap");' +
'    @page {' +
'      size: A4;' +
'      margin: 10mm 12mm;' +
'    }' +
'    * {' +
'      box-sizing: border-box;' +
'      margin: 0;' +
'      padding: 0;' +
'      -webkit-print-color-adjust: exact !important;' +
'      print-color-adjust: exact !important;' +
'    }' +
'    body {' +
'      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
'      background-color: #f8fafc;' +
'      color: #0f172a;' +
'      line-height: 1.45;' +
'      padding: 20px;' +
'    }' +
'    .report-card-wrapper {' +
'      max-width: 860px;' +
'      margin: 0 auto;' +
'      background: #ffffff;' +
'      border: 1px solid #e2e8f0;' +
'      border-radius: 16px;' +
'      box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08);' +
'      overflow: hidden;' +
'      position: relative;' +
'    }' +
'    .action-bar {' +
'      position: sticky;' +
'      top: 0;' +
'      z-index: 100;' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: center;' +
'      background: #0f172a;' +
'      color: #ffffff;' +
'      padding: 12px 24px;' +
'      border-radius: 12px;' +
'      margin-bottom: 20px;' +
'      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);' +
'    }' +
'    .action-bar h3 {' +
'      font-size: 14px;' +
'      font-weight: 700;' +
'      display: flex;' +
'      align-items: center;' +
'      gap: 8px;' +
'    }' +
'    .action-btns {' +
'      display: flex;' +
'      gap: 10px;' +
'    }' +
'    .btn {' +
'      cursor: pointer;' +
'      border: none;' +
'      border-radius: 8px;' +
'      padding: 8px 16px;' +
'      font-size: 13px;' +
'      font-weight: 700;' +
'      display: inline-flex;' +
'      align-items: center;' +
'      gap: 6px;' +
'      text-decoration: none;' +
'    }' +
'    .btn-primary {' +
'      background: #10b981;' +
'      color: #ffffff;' +
'    }' +
'    .btn-primary:hover {' +
'      background: #059669;' +
'    }' +
'    .btn-secondary {' +
'      background: #334155;' +
'      color: #ffffff;' +
'    }' +
'    .btn-secondary:hover {' +
'      background: #475569;' +
'    }' +
'    @media print {' +
'      body {' +
'        background: #ffffff;' +
'        padding: 0;' +
'      }' +
'      .action-bar {' +
'        display: none !important;' +
'      }' +
'      .report-card-wrapper {' +
'        border: none;' +
'        box-shadow: none;' +
'        max-width: 100%;' +
'        border-radius: 0;' +
'      }' +
'      .keep-together {' +
'        break-inside: avoid;' +
'        page-break-inside: avoid;' +
'      }' +
'    }' +
'    .header-banner {' +
'      background: linear-gradient(135deg, #0b1329 0%, #172554 100%);' +
'      color: #ffffff;' +
'      padding: 28px 36px;' +
'      border-bottom: 4px solid #10b981;' +
'    }' +
'    .header-top {' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: center;' +
'      margin-bottom: 18px;' +
'    }' +
'    .brand-group {' +
'      display: flex;' +
'      align-items: center;' +
'      gap: 14px;' +
'    }' +
'    .brand-logo-img {' +
'      height: 44px;' +
'      width: auto;' +
'      object-fit: contain;' +
'      background: #ffffff;' +
'      padding: 4px 8px;' +
'      border-radius: 8px;' +
'    }' +
'    .brand-text-name {' +
'      font-size: 24px;' +
'      font-weight: 900;' +
'      letter-spacing: -0.5px;' +
'      color: #ffffff;' +
'      line-height: 1.1;' +
'    }' +
'    .brand-text-sub {' +
'      font-size: 10px;' +
'      font-weight: 700;' +
'      letter-spacing: 1.5px;' +
'      text-transform: uppercase;' +
'      color: #94a3b8;' +
'    }' +
'    .header-doc-meta {' +
'      text-align: right;' +
'    }' +
'    .doc-badge {' +
'      display: inline-block;' +
'      background: rgba(16, 185, 129, 0.2);' +
'      color: #34d399;' +
'      border: 1px solid rgba(52, 211, 153, 0.4);' +
'      font-size: 10px;' +
'      font-weight: 800;' +
'      letter-spacing: 1px;' +
'      text-transform: uppercase;' +
'      padding: 4px 10px;' +
'      border-radius: 20px;' +
'      margin-bottom: 4px;' +
'    }' +
'    .doc-code {' +
'      font-size: 12px;' +
'      font-weight: 600;' +
'      color: #cbd5e1;' +
'    }' +
'    .header-title-box h1 {' +
'      font-size: 22px;' +
'      font-weight: 900;' +
'      color: #ffffff;' +
'      margin-bottom: 4px;' +
'      letter-spacing: -0.3px;' +
'    }' +
'    .header-title-box p {' +
'      font-size: 13px;' +
'      color: #cbd5e1;' +
'      font-weight: 500;' +
'    }' +
'    .card-content {' +
'      padding: 28px 36px;' +
'    }' +
'    .meta-grid {' +
'      display: grid;' +
'      grid-template-columns: repeat(2, 1fr);' +
'      gap: 12px;' +
'      background: #f8fafc;' +
'      border: 1px solid #e2e8f0;' +
'      border-radius: 12px;' +
'      padding: 16px 20px;' +
'      margin-bottom: 24px;' +
'    }' +
'    .meta-item {' +
'      display: flex;' +
'      flex-direction: column;' +
'    }' +
'    .meta-label {' +
'      font-size: 10px;' +
'      font-weight: 700;' +
'      text-transform: uppercase;' +
'      letter-spacing: 0.8px;' +
'      color: #64748b;' +
'      margin-bottom: 2px;' +
'    }' +
'    .meta-val {' +
'      font-size: 13px;' +
'      font-weight: 700;' +
'      color: #0f172a;' +
'    }' +
'    .score-summary-grid {' +
'      display: grid;' +
'      grid-template-columns: repeat(4, 1fr);' +
'      gap: 12px;' +
'      margin-bottom: 24px;' +
'    }' +
'    .score-box {' +
'      border: 1px solid #e2e8f0;' +
'      background: #ffffff;' +
'      border-radius: 12px;' +
'      padding: 14px;' +
'      text-align: center;' +
'    }' +
'    .score-box-primary {' +
'      background: #f0fdf4;' +
'      border-color: #bbf7d0;' +
'    }' +
'    .score-box-accent {' +
'      background: #eff6ff;' +
'      border-color: #bfdbfe;' +
'    }' +
'    .score-box-label {' +
'      font-size: 10px;' +
'      font-weight: 800;' +
'      text-transform: uppercase;' +
'      letter-spacing: 0.6px;' +
'      color: #64748b;' +
'      margin-bottom: 4px;' +
'    }' +
'    .score-box-val {' +
'      font-size: 26px;' +
'      font-weight: 900;' +
'      color: #0f172a;' +
'      line-height: 1.1;' +
'    }' +
'    .score-box-sub {' +
'      font-size: 11px;' +
'      font-weight: 600;' +
'      color: #64748b;' +
'      margin-top: 2px;' +
'    }' +
'    .status-badge-pass {' +
'      display: inline-block;' +
'      background: #059669;' +
'      color: #ffffff;' +
'      font-size: 11px;' +
'      font-weight: 800;' +
'      letter-spacing: 0.5px;' +
'      padding: 3px 10px;' +
'      border-radius: 6px;' +
'    }' +
'    .status-badge-fail {' +
'      display: inline-block;' +
'      background: #dc2626;' +
'      color: #ffffff;' +
'      font-size: 11px;' +
'      font-weight: 800;' +
'      letter-spacing: 0.5px;' +
'      padding: 3px 10px;' +
'      border-radius: 6px;' +
'    }' +
'    .breakdown-table {' +
'      width: 100%;' +
'      border-collapse: collapse;' +
'      margin-bottom: 24px;' +
'      border-radius: 8px;' +
'      overflow: hidden;' +
'      border: 1px solid #e2e8f0;' +
'    }' +
'    .breakdown-table th {' +
'      background: #f1f5f9;' +
'      font-size: 11px;' +
'      font-weight: 800;' +
'      text-transform: uppercase;' +
'      letter-spacing: 0.6px;' +
'      color: #475569;' +
'      padding: 10px 14px;' +
'      text-align: left;' +
'      border-bottom: 1px solid #e2e8f0;' +
'    }' +
'    .breakdown-table td {' +
'      font-size: 12px;' +
'      padding: 10px 14px;' +
'      border-bottom: 1px solid #f1f5f9;' +
'      color: #1e293b;' +
'    }' +
'    .breakdown-table tr:last-child td {' +
'      border-bottom: none;' +
'      font-weight: 700;' +
'      background: #f8fafc;' +
'    }' +
'    .section-title {' +
'      font-size: 13px;' +
'      font-weight: 800;' +
'      text-transform: uppercase;' +
'      letter-spacing: 0.5px;' +
'      color: #0f172a;' +
'      margin-bottom: 12px;' +
'      padding-bottom: 6px;' +
'      border-bottom: 2px solid #e2e8f0;' +
'    }' +
'    .feedback-box {' +
'      background: #fffbeb;' +
'      border: 1px solid #fde68a;' +
'      border-left: 4px solid #f59e0b;' +
'      border-radius: 10px;' +
'      padding: 16px 20px;' +
'      margin-bottom: 24px;' +
'    }' +
'    .feedback-header {' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: center;' +
'      margin-bottom: 6px;' +
'    }' +
'    .feedback-header h4 {' +
'      font-size: 13px;' +
'      font-weight: 800;' +
'      color: #92400e;' +
'    }' +
'    .feedback-eval-meta {' +
'      font-size: 11px;' +
'      font-weight: 600;' +
'      color: #b45309;' +
'    }' +
'    .feedback-body {' +
'      font-size: 12.5px;' +
'      color: #78350f;' +
'      line-height: 1.5;' +
'      font-style: italic;' +
'      margin-bottom: 10px;' +
'    }' +
'    .feedback-pillars {' +
'      display: grid;' +
'      grid-template-columns: 1fr 1fr;' +
'      gap: 12px;' +
'      padding-top: 10px;' +
'      border-top: 1px dashed rgba(245, 158, 11, 0.4);' +
'    }' +
'    .pillar-col h5 {' +
'      font-size: 11px;' +
'      font-weight: 800;' +
'      text-transform: uppercase;' +
'      letter-spacing: 0.5px;' +
'      margin-bottom: 4px;' +
'    }' +
'    .pillar-col.strengths h5 { color: #047857; }' +
'    .pillar-col.improvements h5 { color: #b45309; }' +
'    .pillar-col ul { list-style-type: none; padding-left: 0; }' +
'    .pillar-col li {' +
'      font-size: 11.5px;' +
'      line-height: 1.4;' +
'      margin-bottom: 3px;' +
'      padding-left: 14px;' +
'      position: relative;' +
'    }' +
'    .pillar-col.strengths li::before {' +
'      content: "✓";' +
'      position: absolute;' +
'      left: 0;' +
'      color: #059669;' +
'      font-weight: 900;' +
'    }' +
'    .pillar-col.improvements li::before {' +
'      content: "•";' +
'      position: absolute;' +
'      left: 0;' +
'      color: #d97706;' +
'      font-weight: 900;' +
'    }' +
'    .question-list {' +
'      display: flex;' +
'      flex-direction: column;' +
'      gap: 10px;' +
'      margin-bottom: 24px;' +
'    }' +
'    .q-card {' +
'      border: 1px solid #e2e8f0;' +
'      border-radius: 10px;' +
'      padding: 12px 14px;' +
'      background: #ffffff;' +
'      break-inside: avoid;' +
'    }' +
'    .q-card-head {' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: center;' +
'      margin-bottom: 4px;' +
'    }' +
'    .q-badge-row {' +
'      display: flex;' +
'      align-items: center;' +
'      gap: 8px;' +
'    }' +
'    .q-num {' +
'      font-size: 11px;' +
'      font-weight: 800;' +
'      background: #0f172a;' +
'      color: #ffffff;' +
'      padding: 2px 7px;' +
'      border-radius: 4px;' +
'    }' +
'    .q-type {' +
'      font-size: 10px;' +
'      font-weight: 700;' +
'      text-transform: uppercase;' +
'      color: #64748b;' +
'    }' +
'    .q-marks {' +
'      font-size: 12px;' +
'      font-weight: 800;' +
'      color: #0f172a;' +
'    }' +
'    .q-text {' +
'      font-size: 12px;' +
'      font-weight: 600;' +
'      color: #1e293b;' +
'      margin-bottom: 6px;' +
'    }' +
'    .q-answer-box {' +
'      background: #f8fafc;' +
'      border-left: 3px solid #cbd5e1;' +
'      padding: 6px 10px;' +
'      font-size: 11.5px;' +
'      color: #334155;' +
'      margin-bottom: 4px;' +
'      border-radius: 0 6px 6px 0;' +
'    }' +
'    .q-teacher-remark {' +
'      background: #fefce8;' +
'      border-left: 3px solid #facc15;' +
'      padding: 6px 10px;' +
'      font-size: 11.5px;' +
'      color: #854d0e;' +
'      border-radius: 0 6px 6px 0;' +
'      font-style: italic;' +
'    }' +
'    .auth-footer {' +
'      border-top: 2px solid #e2e8f0;' +
'      padding-top: 20px;' +
'      margin-top: 16px;' +
'      display: flex;' +
'      justify-content: space-between;' +
'      align-items: flex-end;' +
'      break-inside: avoid;' +
'    }' +
'    .auth-seal-block {' +
'      display: flex;' +
'      align-items: center;' +
'      gap: 12px;' +
'    }' +
'    .seal-badge {' +
'      width: 58px;' +
'      height: 58px;' +
'      border: 3px double #0f172a;' +
'      border-radius: 50%;' +
'      display: flex;' +
'      flex-direction: column;' +
'      align-items: center;' +
'      justify-content: center;' +
'      text-align: center;' +
'      background: #f8fafc;' +
'    }' +
'    .seal-text-top { font-size: 6px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a; }' +
'    .seal-icon { font-size: 13px; line-height: 1; color: #059669; margin: 1px 0; }' +
'    .seal-text-bot { font-size: 5.5px; font-weight: 800; color: #64748b; }' +
'    .auth-meta-text {' +
'      font-size: 10.5px;' +
'      color: #64748b;' +
'      line-height: 1.4;' +
'    }' +
'    .sig-block { text-align: right; }' +
'    .sig-name {' +
'      font-family: "Playfair Display", Georgia, serif;' +
'      font-size: 19px;' +
'      font-style: italic;' +
'      color: #0f172a;' +
'      font-weight: 700;' +
'      margin-bottom: 2px;' +
'    }' +
'    .sig-line {' +
'      width: 150px;' +
'      height: 1px;' +
'      background: #cbd5e1;' +
'      margin-left: auto;' +
'      margin-bottom: 4px;' +
'    }' +
'    .sig-title { font-size: 11px; font-weight: 800; color: #1e293b; }' +
'    .sig-org { font-size: 10px; color: #64748b; font-weight: 600; }' +
'    .doc-legal-note {' +
'      text-align: center;' +
'      font-size: 9.5px;' +
'      color: #94a3b8;' +
'      margin-top: 16px;' +
'      padding-top: 10px;' +
'      border-top: 1px solid #f1f5f9;' +
'    }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="action-bar">' +
'    <h3>🎓 DE-ECO Official Academic Report Card</h3>' +
'    <div class="action-btns">' +
'      <button onclick="window.print()" class="btn btn-primary">🖨️ Save as PDF / Print</button>' +
'      <button onclick="window.close()" class="btn btn-secondary">✕ Close</button>' +
'    </div>' +
'  </div>' +
'  <div class="report-card-wrapper">' +
'    <header class="header-banner">' +
'      <div class="header-top">' +
'        <div class="brand-group">' +
'          <img src="/logo/De-Eco-logo.png" alt="DE-ECO" class="brand-logo-img" onerror="this.style.display=\'none\'" />' +
'          <div>' +
'            <div class="brand-text-name">DE-ECO</div>' +
'            <div class="brand-text-sub">Academic Assessment & Evaluation</div>' +
'          </div>' +
'        </div>' +
'        <div class="header-doc-meta">' +
'          <span class="doc-badge">Verified Performance Record</span>' +
'          <div class="doc-code">Transcript ID: ' + escapeHtml(transcriptCode) + '</div>' +
'          <div class="doc-code">Issue Date: ' + escapeHtml(issueDate) + '</div>' +
'        </div>' +
'      </div>' +
'      <div class="header-title-box">' +
'        <h1>' + escapeHtml(examTitle) + '</h1>' +
'        <p>Comprehensive Academic Evaluation & Performance Transcript</p>' +
'      </div>' +
'    </header>' +
'    <div class="card-content">' +
'      <div class="meta-grid">' +
'        <div class="meta-item"><span class="meta-label">Candidate Name</span><span class="meta-val">' + escapeHtml(candidateName) + '</span></div>' +
'        <div class="meta-item"><span class="meta-label">' + courseMetaLabel + '</span><span class="meta-val">' + escapeHtml(courseTitle) + '</span></div>' +
'        <div class="meta-item"><span class="meta-label">Candidate Email</span><span class="meta-val">' + escapeHtml(candidateEmail) + '</span></div>' +
'        <div class="meta-item"><span class="meta-label">Evaluating Faculty</span><span class="meta-val">' + escapeHtml(instructor) + '</span></div>' +
'        <div class="meta-item"><span class="meta-label">Submission Date</span><span class="meta-val">' + escapeHtml(submittedAt) + '</span></div>' +
'        <div class="meta-item"><span class="meta-label">Time Spent</span><span class="meta-val">' + (timeSpent <= 0 ? '< 1 Minute' : timeSpent === 1 ? '1 Minute' : timeSpent + ' Minutes') + '</span></div>' +
'      </div>' +
'      <div class="score-summary-grid keep-together">' +
'        <div class="score-box score-box-primary">' +
'          <div class="score-box-label">Total Score Secured</div>' +
'          <div class="score-box-val" style="color: #047857;">' + scoreObtained + ' <span style="font-size: 15px; color: #64748b; font-weight: 600;">/ ' + totalMarks + '</span></div>' +
'          <div class="score-box-sub">Aggregate Marks</div>' +
'        </div>' +
'        <div class="score-box score-box-accent">' +
'          <div class="score-box-label">Percentage</div>' +
'          <div class="score-box-val" style="color: #1d4ed8;">' + percentage + '%</div>' +
'          <div class="score-box-sub">Overall Proficiency</div>' +
'        </div>' +
'        <div class="score-box">' +
'          <div class="score-box-label">Academic Grade</div>' +
'          <div class="score-box-val" style="font-size: 18px; color: #0f172a;">' + escapeHtml(grade) + '</div>' +
'          <div class="score-box-sub">Evaluation Tier</div>' +
'        </div>' +
'        <div class="score-box">' +
'          <div class="score-box-label">Evaluation Status</div>' +
'          <div style="margin-top: 6px;"><span class="status-badge-pass">✓ EVALUATED</span></div>' +
'          <div class="score-box-sub" style="margin-top: 6px;">Official Verification</div>' +
'        </div>' +
'      </div>' +
'      <table class="breakdown-table keep-together">' +
'        <thead><tr><th>Assessment Component</th><th>Questions</th><th>Max Marks</th><th>Marks Awarded</th><th>Accuracy</th></tr></thead>' +
'        <tbody>' +
          (mcqQuestions.length > 0 ? '<tr><td><strong>Section A: Multiple Choice Questions</strong></td><td>' + mcqQuestions.length + '</td><td>' + mcqTotal + '</td><td>' + mcqAwarded + '</td><td>' + (mcqTotal > 0 ? Math.round((mcqAwarded / mcqTotal) * 100) : 0) + '%</td></tr>' : '') +
          (descriptiveQuestions.length > 0 ? '<tr><td><strong>' + (mcqQuestions.length > 0 ? 'Section B: Descriptive Responses' : 'Descriptive Responses') + '</strong></td><td>' + descriptiveQuestions.length + '</td><td>' + descTotal + '</td><td>' + descAwarded + '</td><td>' + (descTotal > 0 ? Math.round((descAwarded / descTotal) * 100) : 0) + '%</td></tr>' : '') +
'          <tr><td>TOTAL PERFORMANCE</td><td>' + answersList.length + '</td><td>' + totalMarks + '</td><td>' + scoreObtained + '</td><td>' + percentage + '%</td></tr>' +
'        </tbody>' +
'      </table>' +
      (feedback && (
        (feedback.overall && feedback.overall.trim() !== '' && feedback.overall !== 'Good attempt on the paper.') ||
        (Array.isArray(feedback.strengths) && feedback.strengths.filter((s: string) => s && s !== 'Demonstrated understanding of key concepts').length > 0) ||
        (Array.isArray(feedback.improvements) && feedback.improvements.filter((i: string) => i && i !== 'Review questions where marks were deducted').length > 0)
      ) ?
'      <div class="feedback-box keep-together">' +
'        <div class="feedback-header"><h4><span>✍️</span> Official Faculty Evaluation & Commentary</h4><span class="feedback-eval-meta">' + escapeHtml(feedback.evaluatedAt || ('Evaluated by ' + instructor)) + '</span></div>' +
        (feedback.overall && feedback.overall.trim() !== '' && feedback.overall !== 'Good attempt on the paper.' ? '<p class="feedback-body">"' + escapeHtml(feedback.overall) + '"</p>' : '') +
        ((Array.isArray(feedback.strengths) && feedback.strengths.filter((s: string) => s && s !== 'Demonstrated understanding of key concepts').length > 0) || (Array.isArray(feedback.improvements) && feedback.improvements.filter((i: string) => i && i !== 'Review questions where marks were deducted').length > 0) ?
'        <div class="feedback-pillars">' +
          (Array.isArray(feedback.strengths) && feedback.strengths.filter((s: string) => s && s !== 'Demonstrated understanding of key concepts').length > 0 ? '<div class="pillar-col strengths"><h5>Key Strengths</h5><ul>' + feedback.strengths.filter((s: string) => s && s !== 'Demonstrated understanding of key concepts').map((s: string) => '<li>' + escapeHtml(s) + '</li>').join('') + '</ul></div>' : '') +
          (Array.isArray(feedback.improvements) && feedback.improvements.filter((i: string) => i && i !== 'Review questions where marks were deducted').length > 0 ? '<div class="pillar-col improvements"><h5>Areas for Growth</h5><ul>' + feedback.improvements.filter((i: string) => i && i !== 'Review questions where marks were deducted').map((i: string) => '<li>' + escapeHtml(i) + '</li>').join('') + '</ul></div>' : '') +
'        </div>' : '') +
'      </div>' : '') +
'      <h3 class="section-title">Itemized Assessment Details</h3>' +
'      <div class="question-list">' +
        answersList.map((ans, idx) => {
          const isMcq = ans.type === 'mcq';
          const marksAwarded = ans.marksAwarded !== undefined ? Number(ans.marksAwarded) : (isMcq && ans.isCorrect ? ans.marks : 0);
          const studentAnsText = stripHtmlTags(ans.studentAnswer || '');
          return '<div class="q-card keep-together">' +
            '<div class="q-card-head">' +
              '<div class="q-badge-row"><span class="q-num">Q' + (ans.questionNumber || idx + 1) + '</span><span class="q-type">' + (isMcq ? 'Multiple Choice' : 'Descriptive Response') + '</span></div>' +
              '<div class="q-marks"><span style="color: ' + (marksAwarded >= ans.marks ? '#059669' : marksAwarded > 0 ? '#d97706' : '#dc2626') + '">' + marksAwarded + '</span> / ' + ans.marks + ' Marks</div>' +
            '</div>' +
            '<div class="q-text">' + escapeHtml(ans.question) + '</div>' +
            '<div class="q-answer-box"><strong>Candidate Response:</strong> ' +
              (isMcq ? 'Option ' + escapeHtml(ans.studentAnswer || 'Unanswered') + (ans.isCorrect ? ' <span style="color:#059669; font-weight:800;">(Correct)</span>' : ' <span style="color:#dc2626; font-weight:800;">(Incorrect)</span>') : escapeHtml(studentAnsText || '(No response recorded)')) +
              (isMcq && ans.correctAnswer ? '<div style="margin-top: 4px; color: #475569;"><strong>Correct Key:</strong> Option ' + escapeHtml(ans.correctAnswer) + '</div>' : '') +
            '</div>' +
            (ans.teacherComment ? '<div class="q-teacher-remark"><strong>Feedback:</strong> "' + escapeHtml(ans.teacherComment) + '"</div>' : '') +
          '</div>';
        }).join('') +
'      </div>' +
'      <footer class="auth-footer keep-together">' +
'        <div class="auth-seal-block">' +
'          <div class="seal-badge">' +
'            <span class="seal-text-top">DE-ECO</span>' +
'            <span class="seal-icon">★</span>' +
'            <span class="seal-text-bot">VERIFIED</span>' +
'          </div>' +
'          <div class="auth-meta-text">' +
'            <strong>Certified Academic Document</strong><br>' +
'            Digitally authenticated via DE-ECO Assessment Engine.<br>' +
'            Verify certificate at <span style="color:#0284c7;">https://deeco.in</span>' +
'          </div>' +
'        </div>' +
'        <div class="sig-block">' +
'          <div class="sig-name">Rishika</div>' +
'          <div class="sig-line"></div>' +
'          <div class="sig-title">Instructor Rishika</div>' +
'          <div class="sig-org">Lead Faculty, DE-ECO Academy</div>' +
'        </div>' +
'      </footer>' +
'      <div class="doc-legal-note">© ' + new Date().getFullYear() + ' DE-ECO. All rights reserved. Official examination transcript.</div>' +
'    </div>' +
'  </div>' +
'  <script>' +
'    function triggerReportPrint() {' +
'      try {' +
'        window.focus();' +
'        window.print();' +
'      } catch(e) { console.warn(e); }' +
'    }' +
'    if (document.readyState === "complete" || document.readyState === "interactive") {' +
'      setTimeout(triggerReportPrint, 350);' +
'    } else {' +
'      window.addEventListener("DOMContentLoaded", function() { setTimeout(triggerReportPrint, 350); });' +
'      window.addEventListener("load", function() { setTimeout(triggerReportPrint, 350); });' +
'      setTimeout(triggerReportPrint, 1000);' +
'    }' +
'  <\/script>' +
'</body>' +
'</html>';

  // 1. Create a Blob URL so the report opens as a legitimate document
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  // 2. Open in a new tab without restrictive window dimensions (prevents popup blocker)
  let printWindow: Window | null = null;
  try {
    printWindow = window.open(blobUrl, '_blank');
  } catch (err) {
    console.warn('Window open error:', err);
  }

  // 3. Robust fallback if popup is blocked: use visible-dimension transparent iframe
  if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print failed', e);
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          } catch (e) {}
        }, 3000);
      }, 400);
    };
  }
};

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

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

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

  // Courses & Students from Supabase
  const [coursesList, setCoursesList] = useState<CourseOption[]>([
    { id: 'all', title: 'All Students (Open / General Exam)' },
    { id: 'c1', title: 'Macroeconomic Theory & Policy' },
    { id: 'c2', title: 'Foundations of Microeconomics' },
    { id: 'c3', title: 'Applied Econometrics & Statistics' },
    { id: 'c4', title: 'Development Economics & Public Policy' }
  ])
  const [studentsList, setStudentsList] = useState<StudentProfileOption[]>([])
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'course' | 'student'>('all')
  const [studentSearch, setStudentSearch] = useState('')

  // Streamlined Exam Form State (Title, Student-level Assignment, Date, Time, Duration, Total Marks)
  const [examForm, setExamForm] = useState({
    title: '',
    assignedType: 'all' as 'all' | 'student',
    assignedStudentEmails: [] as string[],
    scheduledDate: 'Anytime / Self-Paced',
    scheduledTime: 'Flexible',
    durationMinutes: 60,
    totalMarks: 50,
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

    const auto = localStorage.getItem('admin_auto_action')
    if (auto === 'new_exam') {
      localStorage.removeItem('admin_auto_action')
      setEditingExamId(null)
      setExamModalTab('settings')
      setStudentSearch('')
      setExamForm({
        title: '',
        assignedType: 'all',
        assignedStudentEmails: [],
        scheduledDate: 'Anytime / Self-Paced',
        scheduledTime: 'Flexible',
        durationMinutes: 60,
        totalMarks: 50,
        questions: []
      })
      setShowExamModal(true)
    }
  }, [])

  // Grading Form State (inside Evaluation Modal)
  const [gradeMarks, setGradeMarks] = useState<Record<string, number>>({})
  const [gradeComments, setGradeComments] = useState<Record<string, string>>({})
  const [overallFeedback, setOverallFeedback] = useState('')

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    // 1. Initial quick load from local cache for instant UI rendering
    const isMockId = (id: string) =>
      /^(a1111111|a2222222|a3333333|a4444444|b1111111|b2222222|exam-|res-)/i.test(id || '')

    try {
      const savedExams = localStorage.getItem(EXAMS_STORAGE_KEY)
      if (savedExams) {
        const parsed: Exam[] = JSON.parse(savedExams)
        const filtered = parsed.filter(e => !isMockId(e.id))
        setExams(filtered)
        if (filtered.length !== parsed.length) {
          localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(filtered))
        }
      } else {
        setExams([])
      }
    } catch {
      setExams([])
    }

    try {
      const savedSubs = localStorage.getItem(SUBMISSIONS_STORAGE_KEY)
      if (savedSubs) {
        const parsed: ExamSubmission[] = JSON.parse(savedSubs)
        const filtered = parsed.filter(s => !isMockId(s.id))
        setSubmissions(filtered)
        if (filtered.length !== parsed.length) {
          localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(filtered))
        }
      } else {
        setSubmissions([])
      }
    } catch {
      setSubmissions([])
    }

    // 2. Fetch courses and students from Supabase
    const fetchCoursesAndStudents = async () => {
      try {
        const { data: cData, error: cErr } = await supabase
          .from('courses')
          .select('id, title')
          .order('title')
        if (!cErr && cData && cData.length > 0) {
          setCoursesList([
            { id: 'all', title: 'All Students (Open / General Exam)' },
            ...cData
          ])
        }
      } catch (err) {
        console.warn('Could not load courses from Supabase:', err)
      }

      try {
        const { data: sData, error: sErr } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .order('first_name')
        if (!sErr && sData && sData.length > 0) {
          setStudentsList(sData)
        }
      } catch (err) {
        console.warn('Could not load student profiles from Supabase:', err)
      }
    }

    // 3. Fetch live exams from Supabase public.exams
    const fetchExamsFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('exams')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          const mapped: Exam[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            course: d.course_title || 'General Examination',
            courseId: d.course_id || undefined,
            assignedType: d.assigned_type || 'course',
            assignedStudentEmail: d.assigned_student_email || undefined,
            assignedStudentName: d.assigned_student_name || undefined,
            instructor: d.instructor_name || 'Rishika',
            status: d.status || 'live',
            scheduledDate: d.scheduled_date || 'Anytime / Self-Paced',
            scheduledTime: d.scheduled_time || 'Flexible',
            durationMinutes: Number(d.duration_minutes) || 60,
            totalMarks: Number(d.total_marks) || 100,
            passingMarks: Number(d.passing_marks) || 40,
            mcqCount: Number(d.mcq_count) || 0,
            descriptiveCount: Number(d.descriptive_count) || 0,
            syllabus: Array.isArray(d.syllabus) ? d.syllabus : [],
            instructions: Array.isArray(d.instructions) ? d.instructions : [],
            questions: Array.isArray(d.questions) ? d.questions : []
          }))
          setExams(mapped)
          localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(mapped))
        }
      } catch (err) {
        console.warn('Could not fetch exams from Supabase:', err)
      }
    }

    // 4. Fetch live submissions from Supabase public.exam_submissions
    const fetchSubmissionsFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('exam_submissions')
          .select('*')
          .order('submitted_at', { ascending: false })

        if (!error && data) {
          const mapped: ExamSubmission[] = data.map((d: any) => ({
            id: d.id,
            examId: d.exam_id,
            examTitle: d.exam_title,
            course: d.course_title || '',
            instructor: d.instructor_name || 'Rishika',
            studentEmail: d.student_email,
            studentName: d.student_name || undefined,
            submittedAt: d.submitted_at ? new Date(d.submitted_at).toLocaleString() : 'Just now',
            status: d.status || 'under_evaluation',
            totalMarks: Number(d.total_marks) || 100,
            scoreObtained: d.score_obtained !== null && d.score_obtained !== undefined ? Number(d.score_obtained) : undefined,
            percentage: d.percentage !== null && d.percentage !== undefined ? Number(d.percentage) : undefined,
            grade: d.grade || undefined,
            isPassed: d.is_passed !== null && d.is_passed !== undefined ? Boolean(d.is_passed) : undefined,
            timeSpentMinutes: Number(d.time_spent_minutes) || 0,
            userId: d.user_id || undefined,
            teacherFeedback: (() => {
              const tf = d.teacher_feedback;
              if (!tf) return undefined;
              const cleanOverall = tf.overall && tf.overall !== 'Good attempt on the paper.' ? String(tf.overall).trim() : '';
              const cleanStrengths = Array.isArray(tf.strengths)
                ? tf.strengths.filter((s: string) => s && s !== 'Demonstrated understanding of key concepts')
                : [];
              const cleanImprovements = Array.isArray(tf.improvements)
                ? tf.improvements.filter((i: string) => i && i !== 'Review questions where marks were deducted')
                : [];
              if (!cleanOverall && cleanStrengths.length === 0 && cleanImprovements.length === 0) return undefined;
              return { ...tf, overall: cleanOverall, strengths: cleanStrengths, improvements: cleanImprovements };
            })(),
            answers: Array.isArray(d.answers) ? d.answers : []
          }))
          setSubmissions(mapped)
          localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(mapped))
        }
      } catch (err) {
        console.warn('Could not fetch submissions from Supabase:', err)
      }
    }

    fetchCoursesAndStudents()
    fetchExamsFromSupabase()
    fetchSubmissionsFromSupabase()

    // Realtime subscriptions for exams and submissions
    const submissionsChannel = supabase
      .channel('admin_exam_submissions_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_submissions' }, () => {
        fetchSubmissionsFromSupabase()
      })
      .subscribe()

    const examsChannel = supabase
      .channel('admin_exams_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
        fetchExamsFromSupabase()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(submissionsChannel)
      supabase.removeChannel(examsChannel)
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
  const allStudentsExamsCount = useMemo(() => exams.filter((e) => e.assignedType !== 'student').length, [exams])
  const studentExamsCount = useMemo(() => exams.filter((e) => e.assignedType === 'student').length, [exams])

  const calculatedQuestionMarks = useMemo(() => {
    return examForm.questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0)
  }, [examForm.questions])

  /* ================= FILTERED DATA ================= */

  const filteredExams = useMemo(() => {
    let result = exams
    if (audienceFilter === 'course') {
      result = result.filter((e) => e.assignedType !== 'student')
    } else if (audienceFilter === 'student') {
      result = result.filter((e) => e.assignedType === 'student')
    }
    if (!searchTerm.trim()) return result
    const q = searchTerm.toLowerCase()
    return result.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.course && e.course.toLowerCase().includes(q)) ||
        (e.assignedStudentEmail && e.assignedStudentEmail.toLowerCase().includes(q)) ||
        (e.assignedStudentName && e.assignedStudentName.toLowerCase().includes(q))
    )
  }, [exams, searchTerm, audienceFilter])

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
      alert('Please enter your extraction API key (starts with gsk_...)')
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
      setAiParseError('Please provide your extraction API Key above to extract questions.')
      return
    }

    if (!textToAnalyze.trim()) {
      setAiParseError(
        aiSourceMode === 'pdf'
          ? 'Please upload a PDF file first and wait for text extraction.'
          : 'Please paste your question paper text first.'
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
      setAiParseError(err.message || 'Question extraction failed.')
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
    setStudentSearch('')
    setExamForm({
      title: '',
      assignedType: 'all',
      assignedStudentEmails: [],
      scheduledDate: 'Anytime / Self-Paced',
      scheduledTime: 'Flexible',
      durationMinutes: 60,
      totalMarks: 50,
      questions: []
    })
    closeQuestionForm()
    setShowExamModal(true)
  }

  const handleOpenEditExam = (exam: Exam) => {
    setEditingExamId(exam.id)
    setExamModalTab('settings')
    setStudentSearch('')
    let emails = exam.assignedStudentEmail
      ? exam.assignedStudentEmail.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
      : []
    if (emails.length === 0 && (exam.assignedType === 'all' || !exam.assignedType || exam.assignedType === 'course')) {
      emails = studentsList.map((s) => s.email.toLowerCase().trim())
    }
    setExamForm({
      title: exam.title,
      assignedType: 'student',
      assignedStudentEmails: emails,
      scheduledDate: exam.scheduledDate || 'Anytime / Self-Paced',
      scheduledTime: exam.scheduledTime || 'Flexible',
      durationMinutes: exam.durationMinutes || 60,
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

  const handleSaveExam = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!examForm.title.trim()) {
      alert('Please enter an exam title.')
      setExamModalTab('settings')
      return
    }

    if (examForm.assignedStudentEmails.length === 0) {
      alert('Please select at least one student, or click "Select All".')
      setExamModalTab('settings')
      return
    }

    const isAllSelected = studentsList.length > 0 && examForm.assignedStudentEmails.length >= studentsList.length
    const isStudent = !isAllSelected

    const mcqCount = examForm.questions.filter((q) => q.type === 'mcq').length
    const descriptiveCount = examForm.questions.filter((q) => q.type === 'descriptive').length
    const totalMarks = calculatedQuestionMarks > 0 ? calculatedQuestionMarks : (Number(examForm.totalMarks) || 50)

    // Resolve assigned student names
    const selectedNames = isStudent
      ? examForm.assignedStudentEmails.map((email) => {
          const st = studentsList.find((s) => s.email && s.email.toLowerCase().trim() === email.toLowerCase().trim())
          return st ? `${st.first_name || ''} ${st.last_name || ''}`.trim() || email : email
        })
      : []

    // Format display title
    let resolvedCourse = 'General Assessment'
    if (isStudent) {
      if (selectedNames.length === 1) {
        const studentExamsCount = exams.filter((e) =>
          e.assignedStudentEmail && e.assignedStudentEmail.toLowerCase().includes(examForm.assignedStudentEmails[0].toLowerCase())
        ).length
        const num = editingExamId ? (exams.findIndex((e) => e.id === editingExamId) + 1 || 1) : studentExamsCount + 1
        resolvedCourse = `Assessment #${num}: ${selectedNames[0]}`
      } else {
        resolvedCourse = `${examForm.title.trim()} (${selectedNames.length} Students)`
      }
    }

    const examId = editingExamId && isValidUUID(editingExamId) ? editingExamId : generateUUID()

    const examPayload = {
      id: examId,
      title: examForm.title.trim(),
      course_title: resolvedCourse,
      course_id: null,
      assigned_type: isAllSelected ? 'all' : 'student',
      assigned_student_id: null,
      assigned_student_email: examForm.assignedStudentEmails.join(', '),
      assigned_student_name: isAllSelected ? 'All Students' : selectedNames.join(', '),
      instructor_name: 'Rishika',
      status: 'live',
      scheduled_date: examForm.scheduledDate.trim() || 'Anytime / Self-Paced',
      scheduled_time: examForm.scheduledTime.trim() || 'Flexible',
      duration_minutes: Number(examForm.durationMinutes) || 60,
      total_marks: totalMarks,
      passing_marks: 0,
      mcq_count: mcqCount,
      descriptive_count: descriptiveCount,
      syllabus: [],
      instructions: ['Auto-saved in real time. Please submit before timer expires.'],
      questions: examForm.questions,
      is_active: true,
      updated_at: new Date().toISOString()
    }

    // Persist to Supabase
    try {
      const { error: dbError } = editingExamId
        ? await supabase.from('exams').update(examPayload).eq('id', examId)
        : await supabase.from('exams').insert(examPayload)

      if (dbError) {
        console.error('Supabase exam save error:', dbError)
        alert('Database save notice: ' + dbError.message + (dbError.hint ? '\n' + dbError.hint : ''))
      } else {
        console.log('Exam successfully saved to Supabase:', examId)
      }
    } catch (err: any) {
      console.error('Error saving exam to Supabase:', err)
      alert('Database error: ' + (err.message || String(err)))
    }

    const appExamObject: Exam = {
      id: examId,
      title: examForm.title.trim(),
      course: resolvedCourse,
      courseId: undefined,
      assignedType: examForm.assignedType,
      assignedStudentEmail: isStudent ? examForm.assignedStudentEmails.join(', ') : undefined,
      assignedStudentName: isStudent ? selectedNames.join(', ') : 'All Students',
      instructor: 'Rishika',
      status: 'live',
      scheduledDate: examForm.scheduledDate.trim() || 'Anytime / Self-Paced',
      scheduledTime: examForm.scheduledTime.trim() || 'Flexible',
      durationMinutes: Number(examForm.durationMinutes) || 60,
      totalMarks,
      passingMarks: 0,
      mcqCount,
      descriptiveCount,
      syllabus: [],
      instructions: ['Auto-saved in real time. Please submit before timer expires.'],
      questions: examForm.questions
    }

    if (editingExamId) {
      const updated = exams.map((ex) => (ex.id === editingExamId ? appExamObject : ex))
      saveExamsToStorage(updated)
    } else {
      saveExamsToStorage([appExamObject, ...exams])
    }

    setShowExamModal(false)
  }

  const handleDeleteExam = (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return
    if (isValidUUID(id)) {
      supabase
        .from('exams')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Supabase exam delete error:', error)
        })
    }
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
      initialComments[ans.questionId] = (ans.teacherComment && ans.teacherComment !== 'Pending instructor grading') ? ans.teacherComment : ''
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
    else if (percentage >= 40) grade = 'C Satisfactory'
    else grade = 'Completed'

    const updatedSub: ExamSubmission = {
      ...evaluatingSub,
      status: 'graded',
      scoreObtained: totalScore,
      percentage,
      grade,
      isPassed: true,
      answers: updatedAnswers,
      teacherFeedback: overallFeedback.trim()
        ? {
            overall: overallFeedback.trim(),
            evaluatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          }
        : undefined
    }

    if (isValidUUID(evaluatingSub.id)) {
      supabase
        .from('exam_submissions')
        .update({
          status: 'graded',
          score_obtained: totalScore,
          percentage,
          grade,
          is_passed: percentage >= 40,
          answers: updatedAnswers,
          teacher_feedback: updatedSub.teacherFeedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', evaluatingSub.id)
        .then(({ error }) => {
          if (error) console.error('Supabase grading update error:', error)
        })

      if (evaluatingSub.userId && isValidUUID(evaluatingSub.userId)) {
        supabase
          .from('exam_submissions')
          .select('percentage')
          .eq('user_id', evaluatingSub.userId)
          .eq('status', 'graded')
          .then(({ data: userGrades }) => {
            if (userGrades && userGrades.length > 0) {
              const allPercentages = [
                ...userGrades.map((g: any) => Number(g.percentage) || 0),
                percentage
              ]
              const avg = Math.round(
                allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length
              )
              supabase
                .from('user_class_stats')
                .update({ average_exam_score: avg, updated_at: new Date().toISOString() })
                .eq('user_id', evaluatingSub.userId)
                .then(() => {})
            }
          })
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
        <div className="space-y-4">
          {/* All Exams Quick Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
            <span className="font-bold text-slate-900 dark:text-white">
              {filteredExams.length} {filteredExams.length === 1 ? 'Exam' : 'Exams'} listed
            </span>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-neutral-800/60 border-b border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Exam Title & Assignment</th>
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
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <span>{ex.title}</span>
                            {ex.assignedType === 'student' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <User size={10} />
                                {ex.assignedStudentEmail && ex.assignedStudentEmail.includes(',')
                                  ? `${ex.assignedStudentEmail.split(',').length} Students`
                                  : 'Specific Student'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <BookOpen size={10} />
                                All Students
                              </span>
                            )}
                          </div>
                          {ex.assignedType === 'student' ? (
                            <div className="text-xs text-purple-700 dark:text-purple-300 font-medium mt-1 flex items-center gap-1 flex-wrap" title={ex.assignedStudentEmail}>
                              <span className="text-slate-400 dark:text-neutral-500">Assigned:</span>
                              <span className="font-semibold">{ex.assignedStudentName || ex.assignedStudentEmail}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Open for all enrolled students</div>
                          )}
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
                          <span>{ex.questions.length} questions ({ex.questions.filter(q => q.type === 'mcq').length} MCQ, {ex.questions.filter(q => q.type === 'descriptive').length} Descriptive)</span>
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
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{(() => {
    const raw = (sub.course || '').trim();
    if (/^1-on-1/i.test(raw)) {
      const m = raw.match(/^1-on-1\s*[:\-–]?\s*(.*)$/i);
      const p = (m && m[1] ? m[1].trim() : '') || sub.studentName || '';
      return p ? `Assessment #1: ${p}` : 'Assessment #1';
    }
    return raw;
  })()}</div>
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
                        <div className="flex items-center justify-end gap-2">
                          {sub.status === 'graded' && (
                            <button
                              type="button"
                              onClick={() => downloadReportCard(sub, { studentName: sub.studentName, studentEmail: sub.studentEmail })}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer flex items-center gap-1"
                              title="Download Official DE-ECO Report Card"
                            >
                              <Download size={13} />
                              <span>Download Report</span>
                            </button>
                          )}
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

              {/* TAB 1: EXAM DETAILS - CLEAN, STUDENT-LEVEL, INTUITIVE */}
              {examModalTab === 'settings' && (() => {
                const isSelfPaced = examForm.scheduledDate === 'Anytime / Self-Paced' || examForm.scheduledDate === 'No constraint';
                const filteredStudentOptions = studentsList.filter((s) => {
                  if (!studentSearch.trim()) return true;
                  const q = studentSearch.toLowerCase();
                  const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
                  return name.includes(q) || (s.email && s.email.toLowerCase().includes(q));
                });

                return (
                  <div className="space-y-6 max-w-2xl">
                    {/* Exam Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                        Exam Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Macroeconomics Mid-Term Examination"
                        value={examForm.title}
                        onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                        className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-3 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    {/* Assign To Students (Directly Unified with Select All) */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                          Assign To Students <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                          {examForm.assignedStudentEmails.length === studentsList.length && studentsList.length > 0 ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">✓ All Students Selected ({studentsList.length})</span>
                          ) : examForm.assignedStudentEmails.length > 0 ? (
                            <span className="text-purple-600 dark:text-purple-400 font-bold">{examForm.assignedStudentEmails.length} of {studentsList.length} Selected</span>
                          ) : (
                            <span className="text-slate-400 dark:text-neutral-500">None selected (click Select All to assign everyone)</span>
                          )}
                        </span>
                      </div>

                      {/* Multi-Student Selection Box (Always Directly Visible) */}
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-800/60 space-y-3">
                        {/* Search bar & Quick actions */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search students by name or email..."
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                              className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 pl-8 pr-3 py-1.5 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                const allEmails = studentsList.map((s) => s.email.toLowerCase().trim());
                                setExamForm({ ...examForm, assignedStudentEmails: allEmails });
                              }}
                              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              Select All ({studentsList.length})
                            </button>
                            <span className="text-slate-300 dark:text-neutral-600">|</span>
                            <button
                              type="button"
                              onClick={() => setExamForm({ ...examForm, assignedStudentEmails: [] })}
                              className="font-semibold text-slate-500 hover:text-rose-500 cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {/* Student List */}
                        <div className="max-h-52 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100 dark:divide-neutral-800/80">
                          {filteredStudentOptions.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">No students found</p>
                          ) : (
                            filteredStudentOptions.map((st) => {
                              const email = st.email.toLowerCase().trim();
                              const isChecked = examForm.assignedStudentEmails.includes(email);
                              const fullName = `${st.first_name || ''} ${st.last_name || ''}`.trim() || email;
                              return (
                                <label
                                  key={st.id || email}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none ${
                                    isChecked
                                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                                      : 'hover:bg-white dark:hover:bg-neutral-800/80 text-slate-700 dark:text-neutral-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        const next = isChecked
                                          ? examForm.assignedStudentEmails.filter((e) => e !== email)
                                          : [...examForm.assignedStudentEmails, email];
                                        setExamForm({ ...examForm, assignedStudentEmails: next });
                                      }}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold truncate">{fullName}</p>
                                      <p className="text-[11px] text-slate-400 dark:text-neutral-500 truncate">{email}</p>
                                    </div>
                                  </div>
                                  {isChecked && (
                                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 shrink-0">
                                      Selected ✓
                                    </span>
                                  )}
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Schedule Mode: Single Clean 2-Pill Selector */}
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Schedule Mode <span className="text-rose-500">*</span>
                      </label>

                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700">
                        <button
                          type="button"
                          onClick={() =>
                            setExamForm({
                              ...examForm,
                              scheduledDate: 'Anytime / Self-Paced',
                              scheduledTime: 'Flexible'
                            })
                          }
                          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSelfPaced
                              ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-300 shadow-2xs'
                              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Clock size={15} />
                          <span>Anytime / Self-Paced</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExamForm({
                              ...examForm,
                              scheduledDate: getTodayDateString(),
                              scheduledTime: '10:00'
                            })
                          }
                          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                            !isSelfPaced
                              ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                              : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Calendar size={15} />
                          <span>Set Date/Time</span>
                        </button>
                      </div>

                      {!isSelfPaced && (
                        /* If Scheduled: Clean Date & Time Pickers */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                              Date
                            </label>
                            <input
                              type="date"
                              value={examForm.scheduledDate === 'Active Now' ? '' : examForm.scheduledDate}
                              onChange={(e) => setExamForm({ ...examForm, scheduledDate: e.target.value })}
                              className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex gap-1.5 mt-2">
                              <button
                                type="button"
                                onClick={() => setExamForm({ ...examForm, scheduledDate: getTodayDateString() })}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              >
                                Today
                              </button>
                              <button
                                type="button"
                                onClick={() => setExamForm({ ...examForm, scheduledDate: getTomorrowDateString() })}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                              >
                                Tomorrow
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                              Time
                            </label>
                            <input
                              type="time"
                              value={examForm.scheduledTime}
                              onChange={(e) => setExamForm({ ...examForm, scheduledTime: e.target.value })}
                              className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex gap-1.5 mt-2">
                              {['09:00', '10:00', '14:00', '18:00'].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setExamForm({ ...examForm, scheduledTime: t })}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                          Duration (Minutes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          value={examForm.durationMinutes}
                          onChange={(e) => setExamForm({ ...examForm, durationMinutes: Number(e.target.value) })}
                          className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex gap-1.5 mt-2">
                          {[30, 45, 60, 90, 120].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setExamForm({ ...examForm, durationMinutes: mins })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                examForm.durationMinutes === mins
                                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs font-bold'
                                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                    </div>
                );
              })()}

              {/* TAB 2: QUESTIONS BUILDER */}
              {examModalTab === 'questions' && (
                <div className="space-y-5">
                  {/* Action buttons */}
                  {!isQuestionFormOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => openNewQuestionForm('mcq')}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-indigo-200 dark:border-neutral-700 bg-indigo-50/50 dark:bg-neutral-800 text-indigo-700 dark:text-neutral-200 hover:bg-indigo-100 dark:hover:bg-neutral-700 transition cursor-pointer"
                      >
                        <Plus size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold">+ Add MCQ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openNewQuestionForm('descriptive')}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-emerald-200 dark:border-neutral-700 bg-emerald-50/50 dark:bg-neutral-800 text-emerald-700 dark:text-neutral-200 hover:bg-emerald-100 dark:hover:bg-neutral-700 transition cursor-pointer"
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
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer shadow-xs"
                      >
                        <FileUp size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold">Upload PDF / Document</span>
                      </button>
                    </div>
                  )}

                  {/* TOTAL MARKS CONTROL: DISPLAYED AFTER QUESTIONS ARE ENTERED OR DOC PARSED */}
                  {examForm.questions.length > 0 && !isQuestionFormOpen && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/60 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Total Exam Marks
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                            {examForm.questions.length} {examForm.questions.length === 1 ? 'Question' : 'Questions'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                          {examForm.questions.filter((q) => q.type === 'mcq').length} MCQs •{' '}
                          {examForm.questions.filter((q) => q.type === 'descriptive').length} Descriptive
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 self-start sm:self-auto">
                        <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                          Total Marks:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={calculatedQuestionMarks > 0 ? calculatedQuestionMarks : examForm.totalMarks}
                          onChange={(e) => setExamForm({ ...examForm, totalMarks: Number(e.target.value) })}
                          className="w-20 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                        />
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                          Marks
                        </span>
                        {calculatedQuestionMarks > 0 && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold ml-0.5">
                            (auto-summed)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ACTIVE QUESTION EDITOR CARD */}
                  {isQuestionFormOpen && (
                    <div className="p-5 rounded-2xl border border-indigo-500/80 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/90 dark:bg-neutral-900 space-y-4 animate-in fade-in duration-150">
                      
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
                        <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <FileUp size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-neutral-300">No questions in this paper yet</p>
                          <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">Add manually above, or upload a question paper PDF to import automatically</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAiModalOpen(true)
                            setAiParseError(null)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition shadow-2xs"
                        >
                          <FileUp size={13} />
                          <span>Upload PDF / Import Questions</span>
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
                                      : 'border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400'
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

            {/* STICKY BOTTOM MODAL FOOTER - CLEAR LINEAR NAVIGATION */}
            <div className="p-4 border-t border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between shrink-0">
              {examModalTab === 'settings' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowExamModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!examForm.title.trim()) {
                        alert('Please enter an exam title first.');
                        return;
                      }
                      if (examForm.assignedStudentEmails.length === 0) {
                        alert('Please select at least one student, or click "Select All".');
                        return;
                      }
                      setExamModalTab('questions');
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <span>Next: Add Questions</span>
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setExamModalTab('settings')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Details</span>
                  </button>

                  <div className="text-xs text-slate-500 dark:text-neutral-400">
                    {examForm.questions.length > 0 ? (
                      <>
                        <span className="font-bold text-slate-900 dark:text-white">
                          Total: {calculatedQuestionMarks > 0 ? calculatedQuestionMarks : examForm.totalMarks} Marks
                        </span>
                        <span className="mx-1.5">•</span>
                        <span>{examForm.questions.length} {examForm.questions.length === 1 ? 'Question' : 'Questions'}</span>
                      </>
                    ) : (
                      <span>No questions added yet</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowExamModal(false)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-neutral-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveExam}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition hover:opacity-90 shadow-sm cursor-pointer"
                    >
                      <Check size={14} />
                      <span>{editingExamId ? 'Update Exam' : 'Publish / Save Exam'}</span>
                    </button>
                  </div>
                </>
              )}
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

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEvaluatingSub(null)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  {evaluatingSub.status === 'graded' && (
                    <button
                      type="button"
                      onClick={() => downloadReportCard(evaluatingSub, { studentName: evaluatingSub.studentName, studentEmail: evaluatingSub.studentEmail })}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download size={15} />
                      <span>Download Report</span>
                    </button>
                  )}
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
            <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-100 dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <FileUp size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Upload PDF / Import Questions</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    Upload an exam PDF or paste questions to automatically extract questions, options, and marks
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
                      Extraction API Key
                    </span>
                    {aiApiKey ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Configured ({aiApiKey.slice(0, 6)}...{aiApiKey.slice(-4)})
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        API key required for document extraction
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
                  <div className="pt-2 border-t border-slate-200 dark:border-neutral-700 flex items-center gap-2">
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
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    aiSourceMode === 'pdf'
                      ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <UploadCloud size={14} />
                  <span>Upload PDF / Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAiSourceMode('paste')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    aiSourceMode === 'paste'
                      ? 'bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText size={14} />
                  <span>Paste Question Text</span>
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
                    className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-violet-500 dark:hover:border-violet-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50 dark:bg-neutral-800/50 group"
                  >
                    <div className="w-12 h-12 mx-auto rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                      <UploadCloud size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                      {aiUploadedFile ? aiUploadedFile.name : 'Click to upload or drag & drop your PDF'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                      {aiUploadedFile
                        ? `${(aiUploadedFile.size / 1024).toFixed(1)} KB • Click to choose another file`
                        : 'Supports PDF (.pdf), Plain Text (.txt), or Markdown (.md)'}
                    </p>
                  </div>

                  {/* PDF Extraction Status & Preview */}
                  {isPdfExtracting && (
                    <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 flex items-center gap-3 text-xs text-violet-700 dark:text-violet-300">
                      <Loader2 size={16} className="animate-spin" />
                      <span>
                        Extracting digital text from PDF document{' '}
                        {pdfProgress ? `(${pdfProgress.current} / ${pdfProgress.total} pages)` : '...'}
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
                          className="w-full bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl p-3 text-[11px] font-mono text-slate-700 dark:text-neutral-300 outline-none"
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
                      Paste Question Paper Text
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {aiPastedText.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    placeholder="Paste question paper text here...&#10;&#10;Example:&#10;1. What is the multiplier in macroeconomics?&#10;A. 1 / (1 - MPC)&#10;B. MPC / MPS&#10;C. 1 - MPS&#10;Answer: A [2 Marks]&#10;&#10;2. Discuss monetary transmission mechanism. [5 Marks]"
                    value={aiPastedText}
                    onChange={(e) => setAiPastedText(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500 font-mono leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    💡 Tip: You can paste questions directly. The system will detect questions, options, and marks automatically.
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
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isAiParsing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Extracting questions from document (~1-2s)...</span>
                      </>
                    ) : (
                      <>
                        <FileUp size={16} />
                        <span>Extract Questions from Document</span>
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
                        {aiParseResult.examTitle ? ` • "${aiParseResult.examTitle}"` : ''}
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
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800/90 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Q{idx + 1}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-700 text-slate-700 dark:text-neutral-200">
                              {q.type === 'mcq' ? 'MCQ' : 'Descriptive'}
                            </span>
                            {q.marks > 0 && (
                              <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
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

                        <p className="text-xs font-medium text-slate-900 dark:text-neutral-100 leading-relaxed">
                          {q.question}
                        </p>

                        {q.type === 'mcq' && q.options && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-600 dark:text-neutral-400">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className={`truncate px-2 py-0.5 rounded ${
                                  opt.id === q.correctAnswer
                                    ? 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                                    : 'bg-white dark:bg-neutral-800'
                                }`}
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
