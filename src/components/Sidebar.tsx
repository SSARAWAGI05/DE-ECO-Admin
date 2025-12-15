import { BookOpen, Bell, Video, Users, FileText, PlayCircle, LayoutDashboard } from 'lucide-react';

type Section = 'dashboard' | 'announcements' | 'classes' | 'enrollments' | 'notes' | 'recordings';

interface SidebarProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
}

export default function Sidebar({ activeSection, setActiveSection }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as Section, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'announcements' as Section, label: 'Announcements', icon: Bell },
    { id: 'classes' as Section, label: 'Live Classes', icon: Video },
    { id: 'enrollments' as Section, label: 'Enrollments', icon: Users },
    { id: 'notes' as Section, label: 'Class Notes', icon: FileText },
    { id: 'recordings' as Section, label: 'Recordings', icon: PlayCircle },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">DE-ECO</h1>
            <p className="text-xs text-blue-200">Admin Portal</p>
          </div>
        </div>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-white text-blue-900 shadow-lg'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
