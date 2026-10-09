import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import MobileHeader from './components/MobileHeader'
import ClassAnnouncements from './components/ClassAnnouncements'
import LiveClasses from './components/LiveClasses'
import ClassEnrollments from './components/ClassEnrollments'
import ClassNotes from './components/ClassNotes'
import ClassRecordings from './components/ClassRecordings'
import Dashboard from './components/Dashboard'
import MarketPulse from './components/MarketPulse'
import AdminContactMessages from './components/AdminContactMessages'
import AdminCourses from './components/AdminCourses'
import StudentBilling from './components/StudentBilling' // ✅ NEW
import PastClassHistory from './components/PastClassHistory'
import EarningsAnalytics from './components/EarningsAnalytics'
import Invoices from './components/Invoices'
import AdminExams from './components/AdminExams'
import { useDarkMode } from './hooks/useDarkMode'

type Section =
  | 'dashboard'
  | 'announcements'
  | 'classes'
  | 'courses'           
  | 'enrollments'
  | 'notes'
  | 'recordings'
  | 'market_pulse'
  | 'contact_messages'
  | 'billing'           // ✅ NEW
  | 'invoices'
  | 'past_history'
  | 'earnings_analytics'
  | 'exams'

function App() {
  useDarkMode() // Initialize theme
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  
  const [activeSection, setActiveSection] = useState<Section>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (passcode === '7056') {
      setIsAuthenticated(true)
      localStorage.setItem('admin_auth', 'true')
    } else {
      setErrorMsg('Incorrect passcode')
      setPasscode('')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0f172a] p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full">
          <div className="w-14 h-14 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg className="w-7 h-7 text-white dark:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-1.5">Admin Portal</h2>
          <p className="text-center text-slate-500 dark:text-slate-400 text-xs mb-6">Enter your secure passcode to access the dashboard.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="••••"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value)
                  setErrorMsg('')
                }}
                className="w-full text-center text-2xl tracking-[0.3em] font-mono p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                autoFocus
              />
              {errorMsg && <p className="text-rose-500 dark:text-rose-400 text-xs font-semibold text-center mt-2">{errorMsg}</p>}
            </div>
            <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-sm cursor-pointer text-sm">
              Unlock Console
            </button>
          </form>
        </div>
      </div>
    )
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard setActiveSection={handleSectionChange} />
      case 'announcements':
        return <ClassAnnouncements />
      case 'classes':
        return <LiveClasses />
      case 'courses':               
        return <AdminCourses />
      case 'enrollments':
        return <ClassEnrollments />
      case 'notes':
        return <ClassNotes />
      case 'recordings':
        return <ClassRecordings />
      case 'market_pulse':
        return <MarketPulse />
      case 'contact_messages':
        return <AdminContactMessages />
      case 'billing':               // ✅ NEW
        return <StudentBilling />
      case 'invoices':
        return <Invoices />
      case 'past_history':
        return <PastClassHistory />
      case 'earnings_analytics':
        return <EarningsAnalytics />
      case 'exams':
        return <AdminExams />
      default:
        return <Dashboard />
    }
  }

  const handleSectionChange = (section: Section) => {
    setActiveSection(section)
    setSidebarOpen(false)
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 overflow-hidden font-sans flex flex-col relative pt-0 xl:pt-16">
      <Navbar
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          {renderSection()}
        </main>
      </div>

    </div>
  )
}

export default App
