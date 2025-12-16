import { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface Announcement {
  id: string;
  user_id: string;
  class_id: string;
  title: string;
  message: string;
}

export default function ClassAnnouncements() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    class_id: '',
    title: '',
    message: '',
  });

  const [announcements] = useState<Announcement[]>([
    {
      id: '1',
      user_id: 'USR001',
      class_id: 'CLS001',
      title: 'Mathematics Class Rescheduled',
      message: 'The mathematics class scheduled for tomorrow has been moved to Friday at 3 PM.',
    },
    {
      id: '2',
      user_id: 'USR002',
      class_id: 'CLS002',
      title: 'New Study Material Available',
      message: 'Physics chapter 5 notes have been uploaded. Please review before next class.',
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setShowForm(false);
    setEditingId(null);
    setFormData({ user_id: '', class_id: '', title: '', message: '' });
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      user_id: announcement.user_id,
      class_id: announcement.class_id,
      title: announcement.title,
      message: announcement.message,
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    console.log('Delete announcement:', id);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">Class Announcements</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage and post announcements for your classes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 active:bg-blue-700 text-white px-5 py-3 rounded-lg transition-colors font-medium shadow-md text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          New
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                {editingId ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ user_id: '', class_id: '', title: '', message: '' });
                }}
                className="text-gray-500 active:text-gray-700 p-2 -mr-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class ID
                </label>
                <input
                  type="text"
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-safe">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 active:bg-blue-700 text-white py-3.5 rounded-lg transition-colors font-medium text-base"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ user_id: '', class_id: '', title: '', message: '' });
                  }}
                  className="sm:px-6 bg-gray-200 active:bg-gray-300 text-gray-700 py-3.5 rounded-lg transition-colors font-medium text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:gap-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="bg-white rounded-xl shadow-md active:shadow-lg transition-shadow p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{announcement.title}</h3>
                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3">
                  <span className="bg-gray-100 px-2 py-1 rounded">User: {announcement.user_id}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">Class: {announcement.class_id}</span>
                </div>
                <p className="text-sm sm:text-base text-gray-700">{announcement.message}</p>
              </div>
              <div className="flex sm:flex-col gap-2 sm:ml-4">
                <button
                  onClick={() => handleEdit(announcement)}
                  className="flex-1 sm:flex-initial p-2.5 text-blue-600 active:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="flex-1 sm:flex-initial p-2.5 text-red-600 active:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
