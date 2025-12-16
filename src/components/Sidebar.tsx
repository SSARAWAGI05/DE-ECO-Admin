import { BookOpen, Bell, Video, Users, FileText, PlayCircle, LayoutDashboard, X } from 'lucide-react';

type Section = 'dashboard' | 'announcements' | 'classes' | 'enrollments' | 'notes' | 'recordings';

interface SidebarProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeSection, setActiveSection, isOpen, onClose }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as Section, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'announcements' as Section, label: 'Announcements', icon: Bell },
    { id: 'classes' as Section, label: 'Live Classes', icon: Video },
    { id: 'enrollments' as Section, label: 'Enrollments', icon: Users },
    { id: 'notes' as Section, label: 'Class Notes', icon: FileText },
    { id: 'recordings' as Section, label: 'Recordings', icon: PlayCircle },
  ];

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 lg:w-64
        bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="p-4 lg:p-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 lg:w-8 lg:h-8" />
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">DE-ECO</h1>
              <p className="text-xs text-blue-200">Admin Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-blue-700 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all active:scale-95 ${
                  isActive
                    ? 'bg-white text-blue-900 shadow-lg'
                    : 'text-blue-100 hover:bg-blue-700 active:bg-blue-600'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
