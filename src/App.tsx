import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ClassAnnouncements from './components/ClassAnnouncements';
import LiveClasses from './components/LiveClasses';
import ClassEnrollments from './components/ClassEnrollments';
import ClassNotes from './components/ClassNotes';
import ClassRecordings from './components/ClassRecordings';
import Dashboard from './components/Dashboard';

type Section = 'dashboard' | 'announcements' | 'classes' | 'enrollments' | 'notes' | 'recordings';

function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'announcements':
        return <ClassAnnouncements />;
      case 'classes':
        return <LiveClasses />;
      case 'enrollments':
        return <ClassEnrollments />;
      case 'notes':
        return <ClassNotes />;
      case 'recordings':
        return <ClassRecordings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <main className="flex-1 overflow-auto">
        {renderSection()}
      </main>
    </div>
  );
}

export default App;
