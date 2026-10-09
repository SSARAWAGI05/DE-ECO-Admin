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

  const handleCancelClass = async (classId: string) => {
    if (!confirm('Are you sure you want to cancel and delete this past class? This will also revert the earnings for this class.')) return
    
    await supabase.from('live_classes').delete().eq('id', classId)
    
    if (selectedProfile) {
      fetchPastClasses(selectedProfile.id)
    }
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
    <div className="p-4 sm:p-6 lg:p-8 overflow-x-hidden w-full flex flex-col min-h-screen space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Past Class History</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View historical class attendance and completion for specific students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Student List */}
        <div className={`${selectedProfile ? 'hidden lg:flex' : 'flex'} bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex-col h-[600px] lg:h-[650px]`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600"
              />
            </div>
            <label className="flex items-center gap-2 mt-3 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-slate-400 cursor-pointer"
              />
              Show Active Students Only
            </label>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {filteredProfiles.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 py-6 text-sm">No students found.</p>
            ) : (
              <div className="space-y-1">
                {filteredProfiles.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                    className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                      selectedProfile?.id === profile.id 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      selectedProfile?.id === profile.id 
                        ? 'bg-white/20 dark:bg-slate-900/10 text-white dark:text-slate-900' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {profile.first_name?.[0] || 'U'}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-sm truncate">{profile.first_name} {profile.last_name}</div>
                      <div className={`text-xs truncate ${selectedProfile?.id === profile.id ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>
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
        <div className={`${!selectedProfile ? 'hidden lg:flex' : 'flex'} lg:col-span-2 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-5 lg:p-6 h-[600px] lg:h-[650px] flex-col relative overflow-hidden shadow-xs`}>
          {!selectedProfile ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <History className="w-12 h-12 mb-3 opacity-40 text-slate-400" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">Select a Student</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Choose a student from the list to view their past class history.</p>
            </div>
          ) : (
            <>
              {/* Mobile Back Button */}
              <div className="lg:hidden mb-4">
                <button 
                  onClick={() => setSelectedProfile(null)} 
                  className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Students
                </button>
              </div>

              <div className="mb-5 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedProfile.first_name} {selectedProfile.last_name}'s History
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedProfile.email}</p>
                </div>
              </div>

              {loadingClasses ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full" />
                </div>
              ) : pastClasses.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <Clock className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No past classes found for this student.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto -mx-2 px-2">
                  <div className="space-y-3">
                    {pastClasses.map(c => {
                      const earned = ((c.duration_minutes || 0) / 60) * (selectedProfile.hourly_rate || 0)
                      return (
                        <div key={c.id} className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{c.title || 'Unknown Class'}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {c.scheduled_datetime ? new Date(c.scheduled_datetime).toLocaleString() : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium">
                              Duration: <span className="text-slate-900 dark:text-white font-semibold">{c.duration_minutes} mins</span> • Earned: <span className="text-slate-900 dark:text-white font-semibold">{selectedProfile.billing_currency || 'INR'} {earned.toFixed(2)}</span>
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center gap-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                              Completed
                            </span>
                            <button
                              onClick={() => handleCancelClass(c.id)}
                              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-800/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel Class
                            </button>
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
