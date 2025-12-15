import { Bell, Video, Users, FileText, PlayCircle, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { label: 'Total Announcements', value: '24', icon: Bell, color: 'bg-blue-500' },
    { label: 'Active Classes', value: '12', icon: Video, color: 'bg-green-500' },
    { label: 'Total Enrollments', value: '156', icon: Users, color: 'bg-purple-500' },
    { label: 'Class Notes', value: '48', icon: FileText, color: 'bg-orange-500' },
    { label: 'Recordings', value: '36', icon: PlayCircle, color: 'bg-pink-500' },
    { label: 'Active Students', value: '89', icon: TrendingUp, color: 'bg-teal-500' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to DE-ECO Admin Portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-xl`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { action: 'New class scheduled', time: '2 minutes ago', color: 'bg-green-100 text-green-800' },
              { action: 'Notes uploaded', time: '15 minutes ago', color: 'bg-blue-100 text-blue-800' },
              { action: 'Announcement posted', time: '1 hour ago', color: 'bg-purple-100 text-purple-800' },
              { action: 'Recording added', time: '3 hours ago', color: 'bg-orange-100 text-orange-800' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${activity.color.split(' ')[0].replace('100', '500')}`}></div>
                  <span className="text-gray-700">{activity.action}</span>
                </div>
                <span className="text-sm text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
              Schedule New Class
            </button>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
              Post Announcement
            </button>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
              Upload Notes
            </button>
            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
              Add Recording
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
