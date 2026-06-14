import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Receipt, Printer, ArrowLeft } from 'lucide-react'

/* ================= TYPES & CONSTANTS ================= */

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  hourly_rate: number
  billing_currency: string
  is_active: boolean
}

interface LiveClass {
  id: string
  user_id: string
  title: string
  duration_minutes: number
  scheduled_datetime: string
  status: string
}

const CURRENCIES: Record<string, string> = {
  INR: '₹', USD: '$', CHF: '₣', EUR: '€', GBP: '£'
}

/* ================= HELPERS ================= */

const getTodayStart = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const getWeekStart = (offsetWeeks: number = 0) => {
  const d = getTodayStart()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  d.setDate(diff + (offsetWeeks * 7))
  return d
}

/* ================= COMPONENT ================= */

export default function Invoices() {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [loading, setLoading] = useState(true)

  // Date Range
  const [startDate, setStartDate] = useState(() => {
    const d = getWeekStart(-1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  
  const [endDate, setEndDate] = useState(() => {
    const d = getWeekStart(0)
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const [viewInvoiceFor, setViewInvoiceFor] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, hourly_rate, billing_currency, is_active')

    const profileMap: Record<string, Profile> = {}
    if (profilesData) {
      profilesData.forEach(p => {
        profileMap[p.id] = p
      })
    }
    setProfiles(profileMap)

    const { data: classesData } = await supabase
      .from('live_classes')
      .select('id, user_id, title, duration_minutes, scheduled_datetime, status')
      .neq('status', 'cancelled')
      .gte('scheduled_datetime', '2026-06-11T00:00:00.000Z')
      .order('scheduled_datetime', { ascending: true })

    if (classesData) {
      setClasses(classesData)
    }

    setLoading(false)
  }

  // Group classes by student for the selected date range
  const studentSummaries = useMemo(() => {
    if (!startDate || !endDate) return []

    const [sy, sm, sd] = startDate.split('-').map(Number)
    const [ey, em, ed] = endDate.split('-').map(Number)
    
    const startObj = new Date(sy, sm - 1, sd)
    const endObj = new Date(ey, em - 1, ed, 23, 59, 59, 999)

    const grouped: Record<string, { profile: Profile, classes: LiveClass[], totalMins: number, totalAmount: number }> = {}

    classes.forEach(c => {
      const d = new Date(c.scheduled_datetime)
      // Only include classes that have actually happened (past)
      if (d >= startObj && d <= endObj && d < new Date()) {
        const p = profiles[c.user_id]
        if (!p) return

        if (!grouped[c.user_id]) {
          grouped[c.user_id] = { profile: p, classes: [], totalMins: 0, totalAmount: 0 }
        }

        grouped[c.user_id].classes.push(c)
        grouped[c.user_id].totalMins += (c.duration_minutes || 0)
      }
    })

    Object.values(grouped).forEach(g => {
      g.totalAmount = (g.totalMins / 60) * (g.profile.hourly_rate || 0)
      g.classes.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime())
    })

    return Object.values(grouped).sort((a, b) => {
      const nameA = `${a.profile.first_name || ''} ${a.profile.last_name || ''}`
      const nameB = `${b.profile.first_name || ''} ${b.profile.last_name || ''}`
      return nameA.localeCompare(nameB)
    })
  }, [classes, profiles, startDate, endDate])

  const handlePrint = () => {
    window.print()
  }

  // --- PRINTABLE INVOICE VIEW ---
  if (viewInvoiceFor) {
    const summary = studentSummaries.find(s => s.profile.id === viewInvoiceFor)
    if (!summary) {
      setViewInvoiceFor(null)
      return null
    }

    const { profile, classes: studentClasses, totalMins, totalAmount } = summary
    const currencySym = CURRENCIES[profile.billing_currency] || profile.billing_currency || ''

    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex justify-center">
        {/* Screen-only controls */}
        <div className="fixed top-6 left-6 flex gap-4 print:hidden z-50">
          <button 
            onClick={() => setViewInvoiceFor(null)}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-md hover:bg-slate-50 font-bold text-slate-700 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
        </div>
        <div className="fixed top-6 right-6 flex gap-4 print:hidden z-50">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-indigo-700 font-bold transition-colors"
          >
            <Printer size={20} /> Print / Save PDF
          </button>
        </div>

        {/* The Printable A4 Invoice Document */}
        <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl p-0 mx-auto print:shadow-none print:m-0 print:p-0 flex flex-col font-sans">
          
          {/* Solid Top Banner */}
          <div className="h-4 bg-zinc-900 w-full mb-12"></div>

          <div className="px-12 sm:px-16 flex-1 flex flex-col">
            {/* Header: Logo and Invoice Text */}
            <div className="flex justify-between items-start mb-16">
              <div className="flex items-center gap-6">
                <img src="/logo.png" alt="DEECO Logo" className="w-20 h-20 object-contain" />
                <div>
                  <h1 className="text-4xl font-serif font-bold text-zinc-900 tracking-tight">DE-ECO</h1>
                  <h2 className="text-xl font-serif text-zinc-500 uppercase tracking-widest mt-1">Education</h2>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-5xl font-serif font-black text-zinc-900 uppercase tracking-widest mb-4">Invoice</h2>
                <p className="text-sm font-bold text-zinc-500 tracking-widest uppercase">INV-{new Date().getTime().toString().slice(-6)}</p>
              </div>
            </div>

            {/* Address and Bill To Grid */}
            <div className="grid grid-cols-2 gap-12 mb-16">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4">From</h3>
                <p className="font-bold text-zinc-900">DE-ECO Education</p>
                <p className="text-zinc-600 text-sm leading-relaxed mt-1">
                  6/1A Moira Street, Mangaldeep Building<br/>
                  Kolkata - 700017<br/>
                  +91 9903996663<br/>
                  www.deecobyrishika.com
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-2 mb-4">Bill To</h3>
                <p className="font-bold text-lg text-zinc-900">{profile.first_name} {profile.last_name}</p>
                <p className="text-zinc-600 text-sm mt-1">{profile.email}</p>
                
                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-bold text-zinc-400 uppercase text-xs">Date of Issue</p>
                    <p className="font-semibold text-zinc-900 mt-1">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-400 uppercase text-xs">Billing Period</p>
                    <p className="font-semibold text-zinc-900 mt-1">{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Strict Data Table */}
            <table className="w-full text-left mb-12 border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-white">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-xs">Date</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-xs">Description</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-xs text-right">Duration</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-xs text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {studentClasses.map((c) => {
                  const date = new Date(c.scheduled_datetime)
                  const hours = (c.duration_minutes || 0) / 60
                  const amt = hours * (profile.hourly_rate || 0)
                  return (
                    <tr key={c.id} className="border-b border-zinc-200 text-sm">
                      <td className="py-4 px-4 text-zinc-600 font-medium">
                        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 font-bold text-zinc-900">{c.title || 'Live Class'}</td>
                      <td className="py-4 px-4 text-zinc-600 text-right">{c.duration_minutes} mins</td>
                      <td className="py-4 px-4 font-bold text-zinc-900 text-right">{currencySym}{amt.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="flex justify-end mb-16">
              <div className="w-80">
                <div className="flex justify-between py-2 border-b border-zinc-200 text-sm">
                  <span className="font-bold text-zinc-500 uppercase tracking-widest">Total Hours</span>
                  <span className="font-bold text-zinc-900">{(totalMins / 60).toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-200 text-sm">
                  <span className="font-bold text-zinc-500 uppercase tracking-widest">Hourly Rate</span>
                  <span className="font-bold text-zinc-900">{currencySym}{(profile.hourly_rate || 0).toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between py-5 mt-4 border-t-4 border-zinc-900 bg-zinc-50 px-4">
                  <span className="font-black text-xl text-zinc-900 uppercase tracking-widest">Total Due</span>
                  <span className="font-black text-2xl text-zinc-900">{currencySym}{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-zinc-200 pt-8 pb-12 text-zinc-500 text-xs flex justify-between items-start">
              <div>
                <p className="font-bold text-zinc-800 uppercase tracking-wider mb-2">Payment Terms</p>
                <p>1. Please pay within 15 days of receiving this invoice.</p>
                <p>2. Make all payments payable to DE-ECO Education.</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-zinc-800 uppercase tracking-wider mb-2">Thank you for your business.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Print Styles injection */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:hidden {
              display: none !important;
            }
            .min-h-screen {
              background: white !important;
            }
            .bg-white.w-full.max-w-\\[210mm\\] {
              visibility: visible;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              box-shadow: none;
            }
            .bg-white.w-full.max-w-\\[210mm\\] * {
              visibility: visible;
            }
          }
        `}} />
      </div>
    )
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="p-4 sm:p-6 lg:p-10 w-full flex flex-col min-h-screen overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-2">Invoices</h1>
          <p className="text-slate-500 font-medium text-lg">Generate itemized invoices for any date range instantly.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Start Date</label>
              <input 
                type="date"
                className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium bg-slate-50"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">End Date</label>
              <input 
                type="date"
                className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium bg-slate-50"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => {
                const d = getWeekStart(-1)
                setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
                const e = getWeekStart(0)
                e.setDate(e.getDate() - 1)
                setEndDate(`${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`)
              }}
              className="flex-1 md:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              Last Week
            </button>
            <button 
              onClick={() => {
                const d = new Date()
                setEndDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
                d.setDate(1)
                setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
              }}
              className="flex-1 md:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full" />
        </div>
      ) : studentSummaries.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
          <Receipt className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Classes Found</h3>
          <p className="text-slate-500">There are no completed classes in the selected date range.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentSummaries.map(summary => {
            const currencySym = CURRENCIES[summary.profile.billing_currency] || summary.profile.billing_currency || ''
            return (
              <div key={summary.profile.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 truncate">
                    {summary.profile.first_name} {summary.profile.last_name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 truncate">{summary.profile.email}</p>
                </div>
                <div className="p-6 bg-slate-50 flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Classes</span>
                    <span className="font-bold text-slate-900">{summary.classes.length} completed</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Time</span>
                    <span className="font-bold text-slate-900">{(summary.totalMins / 60).toFixed(2)} hrs</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-auto">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Amount Due</span>
                    <span className="text-xl font-black text-indigo-600">{currencySym}{summary.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100">
                  <button
                    onClick={() => setViewInvoiceFor(summary.profile.id)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Printer size={18} />
                    View & Print Invoice
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
