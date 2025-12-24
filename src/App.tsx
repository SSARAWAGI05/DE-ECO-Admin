import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MobileHeader from './components/MobileHeader'
import ClassAnnouncements from './components/ClassAnnouncements'
import LiveClasses from './components/LiveClasses'
import ClassEnrollments from './components/ClassEnrollments'
import ClassNotes from './components/ClassNotes'
import ClassRecordings from './components/ClassRecordings'
import Dashboard from './components/Dashboard'
import MarketPulse from './components/MarketPulse'
import AdminContactMessages from './components/AdminContactMessages'
import AdminCourses from './components/AdminCourses' // ✅ NEW

type Section =
  | 'dashboard'
  | 'announcements'
  | 'classes'
  | 'courses'           // ✅ NEW
  | 'enrollments'
  | 'notes'
  | 'recordings'
  | 'market_pulse'
  | 'contact_messages'

function App() {
  const [activeSection, setActiveSection] =
    useState<Section>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />
      case 'announcements':
        return <ClassAnnouncements />
      case 'classes':
        return <LiveClasses />
      case 'courses':               // ✅ NEW
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
      default:
        return <Dashboard />
    }
  }

  const handleSectionChange = (section: Section) => {
    setActiveSection(section)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto">
          {renderSection()}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default App
