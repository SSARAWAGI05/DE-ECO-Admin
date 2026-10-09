import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  DollarSign, Clock, Users, Edit3, Check, X, 
  TrendingUp, Calendar as CalendarIcon, 
  Search, Filter, ArrowUpDown, AlertCircle, History,
  ArrowLeft, Receipt, Download, Share2
} from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/* ================= TYPES & CONSTANTS ================= */

const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'CHF', symbol: '₣' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' }
]

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  hourly_rate: number
  billing_currency: string
  is_active: boolean
  total_paid: number // Added to track manual settlements
  manual_outstanding: number // Track manual extra charges
  guardian_email: string | null
}

interface LiveClass {
  id: string
  user_id: string
  title: string
  duration_minutes: number
  scheduled_datetime: string
  status: string
}

interface CourseEnrollment {
  user_id: string
  custom_hourly_rate: number | null
  courses: {
    title: string
  }
}

interface BillingHistory {
  id: string
  user_id: string
  type: 'SETTLEMENT' | 'CHARGE'
  amount: number
  description: string | null
  created_at: string
  undone: boolean
}

type FilterPeriod = 'current_month' | 'last_month' | 'all_time'
type SortOption = 'name_asc' | 'amount_desc' | 'hours_desc'

/* ================= COMPONENT ================= */

export default function StudentBilling() {
  /* ---------- STATE ---------- */
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([])
  
  // Filters & Sorting
  const [period, setPeriod] = useState<FilterPeriod>('all_time')
  const [searchTerm, setSearchTerm] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true) // User requested default to active
  const [sortBy, setSortBy] = useState<SortOption>('name_asc')

  // Settlement Modal State
  const [settleProfile, setSettleProfile] = useState<Profile | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [isSettling, setIsSettling] = useState(false)

  // Add Charge Modal State
  const [chargeProfile, setChargeProfile] = useState<Profile | null>(null)
  const [chargeAmount, setChargeAmount] = useState('')
  const [isCharging, setIsCharging] = useState(false)

  // History Modal State
  const [historyProfile, setHistoryProfile] = useState<Profile | null>(null)
  const [historyData, setHistoryData] = useState<BillingHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  
  // Receipt State
  const [receiptRecord, setReceiptRecord] = useState<BillingHistory | null>(null)
  const [receiptProfile, setReceiptProfile] = useState<Profile | null>(null)

  // Breakdown Modal State
  const [breakdownProfile, setBreakdownProfile] = useState<any | null>(null)
  
  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    fetchData()
  }, [])

  /* ================= DATA FETCHING ================= */
  const fetchData = async () => {
    const { data: profilesData, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, hourly_rate, billing_currency, is_active, total_paid, manual_outstanding, guardian_email')
      .order('first_name')

    if (profilesErr) console.error('Failed to fetch profiles:', profilesErr)
    else setProfiles(profilesData ?? [])

    const { data: classesData, error: classesErr } = await supabase
      .from('live_classes')
      .select('id, user_id, title, duration_minutes, scheduled_datetime, status')
      .neq('status', 'cancelled')

    if (classesErr) console.error('Failed to fetch classes:', classesErr)
    else setClasses(classesData ?? [])

    const { data: courseEnrollData, error: courseEnrollErr } = await supabase
      .from('course_enrollments')
      .select('user_id, status, custom_hourly_rate, courses(id, title)')

    if (courseEnrollErr) console.error('Failed to fetch course enrollments:', courseEnrollErr)
    else setCourseEnrollments(courseEnrollData ?? [])
  }

  /* ================= CALCULATION LOGIC ================= */
  const filteredClasses = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return classes.filter(c => {
      const classDate = new Date(c.scheduled_datetime)

      if (period === 'all_time') return true
      if (period === 'current_month') {
        return classDate.getMonth() === currentMonth && classDate.getFullYear() === currentYear
      }
      if (period === 'last_month') {
        let lastMonth = currentMonth - 1
        let year = currentYear
        if (lastMonth < 0) {
          lastMonth = 11
          year -= 1
        }
        return classDate.getMonth() === lastMonth && classDate.getFullYear() === year
      }
      return true
    })
  }, [classes, period])

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || '₹'
  }

  // Calculate stats for a single user
  const getUserStats = (userId: string, defaultRate: number, isActiveProfile: boolean, totalPaid: number, manualOutstanding: number) => {
    const studentClasses = filteredClasses.filter(c => c.user_id === userId)
    const allTimeClasses = classes.filter(c => c.user_id === userId)
    const enrollments = courseEnrollments.filter(e => e.user_id === userId)

    const getClassRate = (c: LiveClass) => {
      const matchingEnrollments = enrollments.filter(e => {
        const courseTitle = Array.isArray(e.courses) ? e.courses[0]?.title : e.courses?.title;
        return (courseTitle || '').trim().toLowerCase() === (c.title || '').trim().toLowerCase();
      })
      
      // Prefer the enrollment that has a custom hourly rate set
      const validEnrollment = matchingEnrollments.find(e => e.custom_hourly_rate != null) || matchingEnrollments[0]

      return validEnrollment && validEnrollment.custom_hourly_rate != null ? validEnrollment.custom_hourly_rate : (defaultRate || 0)
    }

    // Period specific
    let periodAmountDue = 0
    let periodMinutes = 0
    studentClasses.forEach(c => {
      periodMinutes += c.duration_minutes
      periodAmountDue += (c.duration_minutes / 60) * getClassRate(c)
    })
    const periodHours = periodMinutes / 60
    
    // All time specific (for total due calculation)
    let allTimeAmountDue = 0
    const activeRates = new Set<number>()
    
    // 1. Add rates from all course enrollments
    enrollments.forEach(e => {
      activeRates.add(e.custom_hourly_rate != null ? e.custom_hourly_rate : (defaultRate || 0))
    })
    
    // If they have no enrollments but have taken classes, allTimeClasses loop below will add those.
    // If they have no classes and no enrollments, we still want to show the base rate.
    if (activeRates.size === 0 && allTimeClasses.length === 0) {
      activeRates.add(defaultRate || 0)
    }

    const classBreakdown: any[] = []
    
    allTimeClasses.forEach(c => {
      const rate = getClassRate(c)
      activeRates.add(rate)
      const cost = (c.duration_minutes / 60) * rate
      allTimeAmountDue += cost
      classBreakdown.push({
        ...c,
        rateApplied: rate,
        cost: cost
      })
    })
    
    // Sort classBreakdown by date descending
    classBreakdown.sort((a, b) => new Date(b.scheduled_datetime).getTime() - new Date(a.scheduled_datetime).getTime())
    
    const allTimeDue = allTimeAmountDue + (manualOutstanding || 0) - (totalPaid || 0)

    return {
      classCount: studentClasses.length,
      totalHours: periodHours,
      periodAmountDue: periodAmountDue,
      totalDue: allTimeDue, // Overall remaining balance
      isEnrolled: isActiveProfile,
      activeRates: Array.from(activeRates),
      classBreakdown,
      allTimeAmountDue,
      manualOutstanding,
      totalPaid
    }
  }

  // Pre-calculate all stats for filtering and sorting
  const profilesWithStats = useMemo(() => {
    return profiles.map(p => ({
      ...p,
      stats: getUserStats(p.id, p.hourly_rate, p.is_active, p.total_paid, p.manual_outstanding)
    }))
  }, [profiles, filteredClasses, classes, courseEnrollments])

  // Apply Search, Filter, and Sort
  const processedProfiles = useMemo(() => {
    let result = [...profilesWithStats]

    // 1. Search Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p => 
        p.first_name?.toLowerCase().includes(term) ||
        p.last_name?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term)
      )
    }

    // 2. Active Only Filter
    // In the billing context, "Active" means they are officially enrolled (is_active) AND have classes scheduled.
    if (showActiveOnly) {
      result = result.filter(p => p.stats.classCount > 0 && p.stats.isEnrolled)
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'amount_desc') {
        return b.stats.totalDue - a.stats.totalDue
      } else if (sortBy === 'hours_desc') {
        return b.stats.totalHours - a.stats.totalHours
      } else {
        // default: name_asc
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim()
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim()
        return nameA.localeCompare(nameB)
      }
    })

    return result
  }, [profilesWithStats, searchTerm, showActiveOnly, sortBy])

  // Summary Stats
  const summaryStats = useMemo(() => {
    let activeStudents = 0
    let totalScheduledHours = 0
    let totalOutstandingDue: Record<string, number> = {}
    
    profilesWithStats.forEach(p => {
      if (p.stats.classCount > 0 && p.stats.isEnrolled) activeStudents++
      totalScheduledHours += p.stats.totalHours
      
      if (p.stats.totalDue > 0) {
        const currency = p.billing_currency || 'INR'
        totalOutstandingDue[currency] = (totalOutstandingDue[currency] || 0) + p.stats.totalDue
      }
    })

    return { activeStudents, totalScheduledHours, totalOutstandingDue }
  }, [profilesWithStats])

  /* ================= HANDLERS ================= */
  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settleProfile) return
    
    const amount = parseFloat(settleAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive amount.")
      return
    }

    setIsSettling(true)
    const newTotalPaid = (settleProfile.total_paid || 0) + amount

    const { error } = await supabase
      .from('profiles')
      .update({ total_paid: newTotalPaid })
      .eq('id', settleProfile.id)

    setIsSettling(false)

    if (error) {
      console.error("Failed to settle amount:", error)
      alert("Failed to settle: Make sure 'total_paid' column exists in 'profiles' table.")
      return
    }

    // Insert history record
    const { data: newRecord } = await supabase.from('billing_history').insert({
      user_id: settleProfile.id,
      type: 'SETTLEMENT',
      amount: amount,
      description: 'Manual settlement added'
    }).select().single()

    if (newRecord) {
      setReceiptRecord(newRecord as BillingHistory)
      setReceiptProfile(settleProfile)
    }

    setSettleProfile(null)
    setSettleAmount('')
    fetchData() // Refresh data
  }

  const handleAddChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chargeProfile) return
    
    const amount = parseFloat(chargeAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive amount.")
      return
    }

    setIsCharging(true)
    const newManualOutstanding = (chargeProfile.manual_outstanding || 0) + amount

    const { error } = await supabase
      .from('profiles')
      .update({ manual_outstanding: newManualOutstanding })
      .eq('id', chargeProfile.id)

    setIsCharging(false)

    if (error) {
      console.error("Failed to add charge:", error)
      alert("Failed to add charge: Make sure 'manual_outstanding' column exists in 'profiles' table.")
      return
    }

    // Insert history record
    await supabase.from('billing_history').insert({
      user_id: chargeProfile.id,
      type: 'CHARGE',
      amount: amount,
      description: 'Manual due amount added'
    })

    setChargeProfile(null)
    setChargeAmount('')
    fetchData() // Refresh data
  }

  const handleViewHistory = async (profile: Profile) => {
    setHistoryProfile(profile)
    setIsLoadingHistory(true)
    
    const { data, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error("Error fetching history", error)
      alert("Make sure you created the billing_history table in Supabase!")
    } else {
      setHistoryData(data as BillingHistory[])
    }
    
    setIsLoadingHistory(false)
  }

  const handleUndo = async (record: BillingHistory) => {
    if (!historyProfile || record.undone) return
    if (!confirm(`Are you sure you want to undo this ${record.type}?`)) return
    
    setIsLoadingHistory(true)
    
    // Reverse the amount in profiles
    if (record.type === 'SETTLEMENT') {
      const newTotalPaid = (historyProfile.total_paid || 0) - record.amount
      await supabase.from('profiles').update({ total_paid: newTotalPaid }).eq('id', historyProfile.id)
      historyProfile.total_paid = newTotalPaid // local update
    } else if (record.type === 'CHARGE') {
      const newManualOutstanding = (historyProfile.manual_outstanding || 0) - record.amount
      await supabase.from('profiles').update({ manual_outstanding: newManualOutstanding }).eq('id', historyProfile.id)
      historyProfile.manual_outstanding = newManualOutstanding // local update
    }

    // Mark as undone
    await supabase.from('billing_history').update({ undone: true }).eq('id', record.id)
    
    fetchData() // Refresh overall data
    
    // Refresh modal
    const { data } = await supabase
      .from('billing_history')
      .select('*')
      .eq('user_id', historyProfile.id)
      .order('created_at', { ascending: false })
      
    setHistoryData((data as BillingHistory[]) || [])
    setIsLoadingHistory(false)
  }

  /* ================= UI ================= */

  /* ================= PRINT RECEIPT ================= */
  const generatePdfBlob = async () => {
    const element = document.getElementById('receipt-pdf-content')
    if (!element) return null
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const margin = 12 // 12mm margin
      const printWidth = pdfWidth - margin * 2
      const printHeight = pdfHeight - margin * 2
      const totalImgHeightInMM = (canvas.height * printWidth) / canvas.width
      
      let position = 0
      
      pdf.addImage(imgData, 'PNG', margin, margin, printWidth, totalImgHeightInMM)
      
      // Mask bottom margin of first page
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F')

      let heightLeft = totalImgHeightInMM - printHeight

      while (heightLeft > 0) {
        position -= printHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, margin + position, printWidth, totalImgHeightInMM)
        
        // Mask top and bottom margins of subsequent pages
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 0, pdfWidth, margin, 'F')
        pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F')
        
        heightLeft -= printHeight
      }
      return pdf.output('blob')
    } catch (err) {
      console.error('Failed to generate PDF', err)
      return null
    }
  }

  const getPdfFilename = () => {
    let fullName = 'RECEIPT'
    if (receiptProfile) {
      const firstName = receiptProfile.first_name?.toUpperCase().trim() || ''
      const lastName = receiptProfile.last_name?.toUpperCase().trim() || ''
      fullName = `${firstName}_${lastName}`.replace(/_+/g, '_').replace(/^_|_$/g, '') || 'RECEIPT'
    }
    return fullName
  }

  const handlePrint = async () => {
    const blob = await generatePdfBlob()
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DEECO_${getPdfFilename()}_RECEIPT.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const handleShare = async () => {
    const blob = await generatePdfBlob()
    if (blob) {
      const file = new File([blob], `DEECO_${getPdfFilename()}_RECEIPT.pdf`, { type: 'application/pdf' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `DEECO Receipt`,
            text: 'Here is the payment receipt from DE-ECO Education.'
          })
        } catch (err) {
          console.error('Share failed or was cancelled', err)
        }
      } else {
        alert('File sharing is not supported on this browser. Please use the Save PDF button.')
      }
    } else {
      alert('Failed to generate PDF. Please try again.')
    }
  }

  // --- PRINTABLE RECEIPT VIEW ---
  if (receiptRecord && receiptProfile) {
    const currencySym = CURRENCIES.find(c => c.code === receiptProfile.billing_currency)?.symbol || receiptProfile.billing_currency || ''
    const dateStr = new Date(receiptRecord.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const receiptNo = `#REC-${receiptRecord.id.split('-')[0].toUpperCase()}`
    
    // We compute the current outstanding manually. We know the totalDue formula is: totalBilled - totalPaid.
    // The fetchData gets us manual_outstanding and total_paid, plus we can recalculate from classes.
    // However, it's easier to just calculate it from the profiles stats if we have it.
    // We already have `studentStats` mapped over in the UI, but here we can just use the most recent data.
    // Wait, the settlement actually reduced the due. The easiest is to find the student in `profiles` and re-calc, 
    // or we can rely on the fact that `fetchData()` was called and updated `profiles` in the background, 
    // but React might not have updated `profiles` locally yet for this specific view if it's out of sync.
    // Let's just calculate from existing state (or refetched state). `receiptProfile` is the snapshot before fetch.
    // Actually, let's just grab the latest from the `profiles` array.
    const latestProfile = profiles.find(p => p.id === receiptProfile.id) || receiptProfile
    
    // To get the exact due, let's calculate the billed hours.
    const studentClasses = classes.filter(c => c.user_id === latestProfile.id)
    const totalMins = studentClasses.reduce((acc, c) => acc + (c.duration_minutes || 0), 0)
    const baseTotal = (totalMins / 60) * (latestProfile.hourly_rate || 0)
    const currentOutstanding = baseTotal + (latestProfile.manual_outstanding || 0) - (latestProfile.total_paid || 0)

    return (
      <div className="min-h-screen bg-slate-100 dark:bg-neutral-800 p-4 sm:p-8 flex flex-col items-center">
        <div className="w-full max-w-[210mm] flex flex-col sm:flex-row justify-between gap-4 print:hidden z-50 mb-6">
          <button 
            onClick={() => { setReceiptRecord(null); setReceiptProfile(null); }}
            className="flex items-center justify-center sm:justify-start gap-2 bg-white dark:bg-neutral-900 px-4 py-3 sm:py-2 rounded-lg shadow-md hover:bg-slate-50 dark:hover:bg-neutral-800 dark:hover:bg-slate-200/50 dark:bg-neutral-800/50 font-bold text-slate-700 dark:text-slate-300 transition-colors w-full sm:w-auto"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
              onClick={handleShare}
              className="flex items-center justify-center sm:justify-start gap-2 bg-blue-600 text-white dark:text-slate-900 px-6 py-3 sm:py-2 rounded-lg shadow-md hover:bg-blue-700 font-bold transition-colors w-full sm:w-auto"
            >
              <Share2 size={20} /> Share
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center sm:justify-start gap-2 bg-emerald-600 text-white dark:text-slate-900 px-6 py-3 sm:py-2 rounded-lg shadow-md hover:bg-emerald-700 font-bold transition-colors w-full sm:w-auto"
            >
              <Download size={20} /> Save PDF
            </button>
          </div>
        </div>

        <div className="w-full max-w-[100vw] overflow-x-auto print:overflow-visible pb-12">
          <div id="receipt-pdf-content" className="bg-white dark:bg-neutral-900 w-[210mm] min-w-[210mm] min-h-[297mm] shadow-2xl p-12 sm:p-16 text-slate-800 dark:text-slate-200 mx-auto print:shadow-none print:m-0 flex flex-col font-sans relative overflow-hidden">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] z-0 print:opacity-[0.1]">
              <img src="/logo.png" alt="" className="w-[80%] max-w-lg object-contain grayscale" />
            </div>

            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="flex justify-between items-start mb-12">
                <div className="flex flex-col gap-4">
                  <img src="/logo.png" alt="DEECO Logo" className="w-16 h-16 object-contain" />
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">DE-ECO Education</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                      6/1A Moira Street<br/>
                      Mangaldeep Building<br/>
                      Kolkata - 700017<br/>
                      +91 9903996663<br/>
                      www.deecobyrishika.com
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <h2 className="text-4xl font-light text-slate-400 uppercase tracking-widest mb-6">Receipt</h2>
                  <table className="ml-auto text-sm">
                    <tbody>
                      <tr>
                        <td className="pr-4 py-1 text-slate-500 dark:text-slate-400 font-medium text-right">Receipt No:</td>
                        <td className="font-semibold text-slate-900 dark:text-slate-50 text-right">{receiptNo}</td>
                      </tr>
                      <tr>
                        <td className="pr-4 py-1 text-slate-500 dark:text-slate-400 font-medium text-right">Date:</td>
                        <td className="font-semibold text-slate-900 dark:text-slate-50 text-right">{dateStr}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Received From */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Received From:</h3>
                <p className="font-bold text-lg text-slate-900 dark:text-slate-50">{latestProfile.first_name} {latestProfile.last_name}</p>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{latestProfile.email}</p>
              </div>

              {/* Amount Display Table */}
              <table className="w-full text-left mb-8 border-collapse">
                <thead>
                  <tr className="border-y-2 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 text-slate-900 dark:text-slate-50">
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">Description</th>
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50 text-slate-700 dark:text-slate-300">
                    <td className="py-4 font-medium">Payment Received</td>
                    <td className="py-4 text-right font-medium">{currencySym}{receiptRecord.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end mb-12">
                <div className="w-1/2">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50 text-sm">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Total Paid</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">{currencySym}{receiptRecord.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-4 mt-2 border-b-2 border-slate-900">
                    <span className="font-bold text-lg text-slate-900 dark:text-slate-50">Amount Received</span>
                    <span className="font-bold text-xl text-slate-900 dark:text-slate-50">{currencySym}{receiptRecord.amount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between py-4 mt-4 bg-slate-50 dark:bg-neutral-800/50 px-4 rounded-lg">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Updated Balance Due</span>
                    <span className={`font-bold text-lg ${currentOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {currencySym}{currentOutstanding.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-auto border-t border-slate-200 dark:border-neutral-800 dark:border-neutral-700 pt-8 pb-8 text-slate-500 dark:text-slate-400 text-xs">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Thank you for your payment!</p>
                    <p>This receipt is automatically generated. Please keep it for your records.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @page { size: auto; margin: 0mm; }
          @media print {
            body * { visibility: hidden; }
            .print\\:hidden { display: none !important; }
            .min-h-screen { background: white !important; }
            .bg-white dark:bg-neutral-900.w-\\[210mm\\] {
              visibility: visible !important;
              position: absolute;
              left: 0;
              top: 0;
            }
            .bg-white dark:bg-neutral-900.w-\\[210mm\\] * {
              visibility: visible !important;
            }
          }
        `}} />
      </div>
    )
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-10 overflow-x-hidden w-full max-w-full">
      
      {/* HEADER & TIME PERIOD CONTROL */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3.5 sm:gap-4 mb-6 sm:mb-8 shrink-0 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Student Billing</h1>
          <p className="text-slate-500 dark:text-slate-400 font-normal text-xs sm:text-sm mt-0.5 sm:mt-1">Auto-calculate and settle invoice amounts for enrolled students.</p>
        </div>

        <div className="flex items-center justify-between sm:justify-start bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-xs w-full sm:w-auto">
          <div className="flex items-center">
            <CalendarIcon size={16} className="text-slate-400 mr-2 shrink-0" />
            <select
              className="border-none bg-transparent focus:ring-0 font-semibold text-xs text-slate-700 dark:text-slate-200 cursor-pointer outline-none"
              value={period}
              onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
            >
              <option value="current_month" className="dark:bg-slate-900">Current Month</option>
              <option value="last_month" className="dark:bg-slate-900">Last Month</option>
              <option value="all_time" className="dark:bg-slate-900">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 mb-6 sm:mb-8 shrink-0">
        {/* Active Students Card */}
        <div className="bg-white dark:bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 sm:gap-4 shadow-xs">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shrink-0">
            <Users size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Active Students</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{summaryStats.activeStudents}</p>
          </div>
        </div>

        {/* Scheduled Hours Card */}
        <div className="bg-white dark:bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 sm:gap-4 shadow-xs">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 shrink-0">
            <TrendingUp size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Scheduled Hours</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{summaryStats.totalScheduledHours.toFixed(1)} <span className="text-xs sm:text-sm font-normal text-slate-500">hrs</span></p>
          </div>
        </div>

        {/* Total Outstanding Card */}
        <div className="bg-white dark:bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 sm:gap-4 shadow-xs sm:col-span-2 lg:col-span-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40 shrink-0">
            <DollarSign size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">Total Outstanding</p>
            <div className="space-y-0.5">
              {Object.keys(summaryStats.totalOutstandingDue).length === 0 ? (
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">₹ 0.00</p>
              ) : (
                Object.entries(summaryStats.totalOutstandingDue).map(([currency, amount]) => (
                  <p key={currency} className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline truncate">
                    <span className="text-slate-500 dark:text-slate-400 mr-1.5 text-xs font-medium">{currency}</span>
                    {getCurrencySymbol(currency)} {amount.toFixed(2)}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTROL PANEL: Search, Filter, Sort */}
      <div className="bg-white dark:bg-[#0f172a] rounded-t-2xl border border-b-0 border-slate-200 dark:border-slate-800 p-3 sm:p-4 flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between shrink-0 shadow-xs">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-white text-xs font-medium outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          {/* Active Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only"
                checked={showActiveOnly}
                onChange={() => setShowActiveOnly(!showActiveOnly)}
              />
              <div className={`block w-9 h-5 rounded-full transition-colors ${showActiveOnly ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
              <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full transition-transform ${showActiveOnly ? 'translate-x-4 bg-white dark:bg-slate-900' : 'bg-white'}`}></div>
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Active Only</span>
          </label>

          {/* Sort Dropdown */}
          <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-white transition-all">
            <ArrowUpDown size={13} className="text-slate-400 mr-1.5 shrink-0" />
            <select
              className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer p-0 pr-2 outline-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="name_asc" className="dark:bg-slate-900">Sort: A-Z</option>
              <option value="amount_desc" className="dark:bg-slate-900">Sort: Highest Due</option>
              <option value="hours_desc" className="dark:bg-slate-900">Sort: Most Hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATA DISPLAY: DESKTOP TABLE (hidden on mobile) & MOBILE CARDS (hidden on desktop) */}
      <div className="flex-1 flex flex-col min-h-[400px]">
        
        {/* DESKTOP TABLE VIEW (md: and up) */}
        <div className="hidden md:block overflow-auto flex-1 relative custom-scrollbar">
          <div className="bg-white dark:bg-[#0f172a] rounded-b-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Rates Applied</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Outstanding</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {processedProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 mb-4 text-slate-400">
                        <Search size={20} />
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">No students found</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  processedProfiles.map((profile) => {
                    const stats = profile.stats
                    const currencySymbol = getCurrencySymbol(profile.billing_currency || 'INR')
                    
                    const hasClasses = stats.classCount > 0
                    const isOfficiallyEnrolled = stats.isEnrolled

                    return (
                      <tr key={profile.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Name */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                              {profile.first_name?.[0] || '?'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-sm">
                                {profile.first_name} {profile.last_name}
                              </div>
                              <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{profile.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Rates Applied */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {stats.activeRates.length > 0 ? (
                              stats.activeRates.map((rate, i) => (
                                <span key={i} className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                                  {currencySymbol} {rate}/hr
                                </span>
                              ))
                            ) : (
                              <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                                {currencySymbol} {profile.hourly_rate || 0}/hr
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Activity Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!isOfficiallyEnrolled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                              Unenrolled
                            </span>
                          ) : hasClasses ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {stats.classCount} Classes
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              No Classes
                            </span>
                          )}
                        </td>

                        {/* Period Hours & Due */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-1 text-sm font-semibold ${(hasClasses && isOfficiallyEnrolled) ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                            <Clock size={14} className="text-slate-400" />
                            {stats.totalHours.toFixed(1)} <span className="text-xs text-slate-500 font-normal">hrs</span>
                          </div>
                          {hasClasses && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Period: <span className="font-semibold text-slate-700 dark:text-slate-300">{currencySymbol}{stats.periodAmountDue.toFixed(2)}</span>
                            </div>
                          )}
                        </td>

                        {/* Total Amount Due */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center font-bold text-sm ${stats.totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : stats.totalDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {currencySymbol} {stats.totalDue.toFixed(2)}
                            </span>
                            <button 
                              onClick={() => setBreakdownProfile(profile)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="View Calculation Breakdown"
                            >
                              <AlertCircle size={14} />
                            </button>
                          </div>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => handleViewHistory(profile)}
                              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs cursor-pointer"
                            >
                              History
                            </button>
                            <button 
                              onClick={() => setSettleProfile(profile)}
                              disabled={stats.totalDue <= 0}
                              className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Settle Due
                            </button>
                            <button 
                              onClick={() => setChargeProfile(profile)}
                              className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              Add Due
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE CARDS VIEW (below md: 100% responsive, no horizontal scrolling) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-[#0f172a] rounded-b-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {processedProfiles.length === 0 ? (
            <div className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 text-slate-400">
                <Search size={20} />
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-white">No students found</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            processedProfiles.map((profile) => {
              const stats = profile.stats
              const currencySymbol = getCurrencySymbol(profile.billing_currency || 'INR')
              const hasClasses = stats.classCount > 0
              const isOfficiallyEnrolled = stats.isEnrolled

              return (
                <div key={profile.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  {/* Top row: Avatar + Name/Email + Activity Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                        {profile.first_name?.[0] || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {profile.first_name} {profile.last_name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {profile.email}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {!isOfficiallyEnrolled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                          Unenrolled
                        </span>
                      ) : hasClasses ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {stats.classCount} Classes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          No Classes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle row: Rates Applied & Activity Stats */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 uppercase block mb-0.5">
                        Rate Applied
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {stats.activeRates.length > 0 ? (
                          stats.activeRates.map((rate, i) => (
                            <span key={i} className="font-bold text-slate-700 dark:text-slate-300">
                              {currencySymbol}{rate}/hr
                            </span>
                          ))
                        ) : (
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {currencySymbol}{profile.hourly_rate || 0}/hr
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 uppercase block mb-0.5">
                        Period Activity
                      </span>
                      <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{stats.totalHours.toFixed(1)} hrs</span>
                        {hasClasses && (
                          <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                            ({currencySymbol}{stats.periodAmountDue.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Outstanding Amount Row */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Total Outstanding
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-base font-extrabold ${stats.totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : stats.totalDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {currencySymbol} {stats.totalDue.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBreakdownProfile(profile)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                          title="View Calculation Breakdown"
                        >
                          <AlertCircle size={14} />
                        </button>
                      </div>
                    </div>

                    {stats.totalDue > 0 ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                        Due
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                        Settled
                      </span>
                    )}
                  </div>

                  {/* Actions Row: 3 touch-friendly buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleViewHistory(profile)}
                      className="py-2 px-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs transition text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                    >
                      <History size={13} />
                      <span>History</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleProfile(profile)}
                      disabled={stats.totalDue <= 0}
                      className="py-2 px-1.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition text-center cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1"
                    >
                      <Check size={13} />
                      <span>Settle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChargeProfile(profile)}
                      className="py-2 px-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs transition text-center cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                    >
                      <DollarSign size={13} />
                      <span>Add Due</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* SETTLE MODAL */}
      {settleProfile && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 p-6 animate-modal max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Settle Balance</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Record a payment from <span className="font-semibold text-slate-800 dark:text-slate-200">{settleProfile.first_name}</span>.
            </p>

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Amount Paid ({getCurrencySymbol(settleProfile.billing_currency)})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder={`e.g. ${settleProfile.stats.totalDue.toFixed(2)}`}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none text-slate-900 dark:text-white text-sm font-semibold transition-all"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettleProfile(null)
                    setSettleAmount('')
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="flex-1 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold py-2 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSettling ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DUE AMOUNT MODAL */}
      {chargeProfile && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 p-6 animate-modal max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Add Due Amount</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Manually add to the outstanding balance for <span className="font-semibold text-slate-800 dark:text-slate-200">{chargeProfile.first_name}</span>.
            </p>

            <form onSubmit={handleAddChargeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Amount to Add ({getCurrencySymbol(chargeProfile.billing_currency)})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g. 1500.00"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none text-slate-900 dark:text-white text-sm font-semibold transition-all"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setChargeProfile(null)
                    setChargeAmount('')
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCharging}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isCharging ? 'Adding...' : 'Add Amount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyProfile && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] animate-modal">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Billing History</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{historyProfile.first_name} {historyProfile.last_name}</p>
              </div>
              <button onClick={() => setHistoryProfile(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-3.5 sm:p-5 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-800 border-t-slate-800 rounded-full animate-spin"></div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No history found</p>
                  <p className="text-xs mt-1">Manual due additions and settlements will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.map(record => (
                    <div key={record.id} className={`p-3.5 rounded-xl border ${record.undone ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'}`}>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            record.type === 'SETTLEMENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}>
                            {record.type === 'CHARGE' ? 'DUE ADDED' : record.type}
                          </span>
                          {record.undone && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              UNDONE
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {new Date(record.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-2">
                        <div className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                          {record.description}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className={`font-bold text-sm ${record.type === 'SETTLEMENT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {getCurrencySymbol(historyProfile.billing_currency)} {record.amount.toFixed(2)}
                          </div>
                          {!record.undone && (
                            <div className="flex items-center gap-2">
                              {record.type === 'SETTLEMENT' && (
                                <button 
                                  onClick={() => {
                                    setHistoryProfile(null)
                                    setReceiptProfile(historyProfile)
                                    setReceiptRecord(record)
                                  }}
                                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Receipt size={13} /> Print Receipt
                                </button>
                              )}
                              <button 
                                onClick={() => handleUndo(record)}
                                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold transition-colors cursor-pointer"
                              >
                                Undo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BREAKDOWN MODAL */}
      {breakdownProfile && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-modal">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Calculation Breakdown</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Outstanding amount breakdown for {breakdownProfile.first_name} {breakdownProfile.last_name}
                </p>
              </div>
              <button onClick={() => setBreakdownProfile(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/30">
              {breakdownProfile.stats.classBreakdown.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No classes taken yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <h3 className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider mb-2">Class History</h3>
                  {breakdownProfile.stats.classBreakdown.map((c: any) => (
                    <div key={c.id} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 shadow-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">{c.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1">
                            <CalendarIcon size={11} /> {new Date(c.scheduled_datetime).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {(c.duration_minutes / 60).toFixed(1)} hrs
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            Rate: {getCurrencySymbol(breakdownProfile.billing_currency)}{c.rateApplied}/hr
                          </span>
                        </div>
                      </div>
                      <div className="font-bold text-rose-600 dark:text-rose-400 text-sm self-end sm:self-center">
                        +{getCurrencySymbol(breakdownProfile.billing_currency)}{c.cost.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
              <h3 className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider mb-3">Final Calculation Summary</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                  <span>Total Charges for Classes</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">+{getCurrencySymbol(breakdownProfile.billing_currency)}{breakdownProfile.stats.allTimeAmountDue.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                  <span>Total Manual Due Additions</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">+{getCurrencySymbol(breakdownProfile.billing_currency)}{(breakdownProfile.stats.manualOutstanding || 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <span>Total Paid (Settlements)</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">-{getCurrencySymbol(breakdownProfile.billing_currency)}{(breakdownProfile.stats.totalPaid || 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Outstanding Amount</span>
                  <span className={`font-bold text-lg ${breakdownProfile.stats.totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {getCurrencySymbol(breakdownProfile.billing_currency)}{breakdownProfile.stats.totalDue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
