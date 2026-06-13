import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, History, Clock, ArrowLeft } from 'lucide-react'

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  hourly_rate: number
  billing_currency: string
  is_active: boolean
}

interface PastClass {
  id: string
  title: string
  scheduled_datetime: string
  end_datetime: string
  duration_minutes: number
}

export default function PastClassHistory() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [pastClasses, setPastClasses] = useState<PastClass[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, hourly_rate, billing_currency, is_active')
      .order('first_name')
    if (!error) setProfiles(data ?? [])
  }

  useEffect(() => {
    if (selectedProfile) {
      fetchPastClasses(selectedProfile.id)
    }
  }, [selectedProfile])

  const fetchPastClasses = async (userId: string) => {
    setLoadingClasses(true)
    const { data } = await supabase
      .from('live_classes')
      .select('id, title, scheduled_datetime, end_datetime, duration_minutes')
      .eq('user_id', userId)
      .gte('scheduled_datetime', '2026-06-11T00:00:00.000Z')

    if (data) {
      const past = data.filter((c: any) => {
        if (!c.scheduled_datetime) return false
        return new Date(c.scheduled_datetime) < new Date()
      }).sort((a: any, b: any) => 
        new Date(b.scheduled_datetime).getTime() - new Date(a.scheduled_datetime).getTime()
      )
      setPastClasses(past)
    } else {
      setPastClasses([])
    }
    setLoadingClasses(false)
  }

  const filteredProfiles = useMemo(() => {
    let result = profiles
    if (showActiveOnly) {
      result = result.filter(p => p.is_active)
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      result = result.filter(p => 
        (p.first_name?.toLowerCase() || '').includes(s) ||
        (p.last_name?.toLowerCase() || '').includes(s) ||
        (p.email?.toLowerCase() || '').includes(s)
      )
    }
    return result
  }, [profiles, searchTerm, showActiveOnly])

  return (
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full flex flex-col min-h-screen space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Past Class History</h2>
          <p className="text-sm lg:text-base text-slate-500 mt-1">View historical class attendance and completion for specific students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Student List */}
        <div className={`${selectedProfile ? 'hidden lg:flex' : 'flex'} bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-col h-[600px] lg:h-[650px]`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
            <label className="flex items-center gap-2 mt-3 text-sm text-slate-700 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              Show Active Students Only
            </label>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {filteredProfiles.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-sm">No students found.</p>
            ) : (
              <div className="space-y-1">
                {filteredProfiles.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                      selectedProfile?.id === profile.id 
                        ? 'bg-slate-900 text-white' 
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      selectedProfile?.id === profile.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {profile.first_name?.[0] || 'U'}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-sm truncate">{profile.first_name} {profile.last_name}</div>
                      <div className={`text-xs truncate ${selectedProfile?.id === profile.id ? 'text-slate-300' : 'text-slate-500'}`}>
                        {profile.email}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Class History */}
        <div className={`${!selectedProfile ? 'hidden lg:flex' : 'flex'} lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8 h-[600px] lg:h-[650px] flex-col`}>
          {!selectedProfile ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <History className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-slate-500 mb-2">Select a Student</h3>
              <p className="text-sm text-center">Choose a student from the list to view their past class history.</p>
            </div>
          ) : (
            <>
              {/* Mobile Back Button */}
              <div className="lg:hidden mb-4">
                <button 
                  onClick={() => setSelectedProfile(null)} 
                  className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Students
                </button>
              </div>

              <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedProfile.first_name} {selectedProfile.last_name}'s History
                  </h3>
                  <p className="text-sm text-slate-500">{selectedProfile.email}</p>
                </div>
              </div>

              {loadingClasses ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full" />
                </div>
              ) : pastClasses.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <Clock className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">No past classes found for this student.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto -mx-2 px-2">
                  <div className="space-y-3">
                    {pastClasses.map(c => {
                      const earned = ((c.duration_minutes || 0) / 60) * (selectedProfile.hourly_rate || 0)
                      return (
                        <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-slate-900">{c.title || 'Unknown Class'}</h4>
                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                              <Clock className="w-4 h-4" />
                              {c.scheduled_datetime ? new Date(c.scheduled_datetime).toLocaleString() : 'N/A'}
                            </p>
                            <p className="text-sm text-slate-600 mt-2 font-medium">
                              Duration: {c.duration_minutes} mins • Earned: {selectedProfile.billing_currency || 'INR'} {earned.toFixed(2)}
                            </p>
                          </div>
                          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold uppercase">
                            Completed
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
