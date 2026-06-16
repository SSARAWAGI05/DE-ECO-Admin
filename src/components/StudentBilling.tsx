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
  const [period, setPeriod] = useState<FilterPeriod>('current_month')
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
      .select('user_id, custom_hourly_rate, courses(title)')

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
      const match = enrollments.find(e => e.courses?.title === c.title)
      return match && match.custom_hourly_rate != null ? match.custom_hourly_rate : (defaultRate || 0)
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
    allTimeClasses.forEach(c => {
      allTimeAmountDue += (c.duration_minutes / 60) * getClassRate(c)
    })
    
    const allTimeDue = allTimeAmountDue + (manualOutstanding || 0) - (totalPaid || 0)

    return {
      classCount: studentClasses.length,
      totalHours: periodHours,
      periodAmountDue: periodAmountDue,
      totalDue: allTimeDue, // Overall remaining balance
      isEnrolled: isActiveProfile
    }
  }

  // Pre-calculate all stats for filtering and sorting
  const profilesWithStats = useMemo(() => {
    return profiles.map(p => ({
      ...p,
      stats: getUserStats(p.id, p.hourly_rate, p.is_active, p.total_paid, p.manual_outstanding)
    }))
  }, [profiles, filteredClasses, classes])

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
            className="flex items-center justify-center sm:justify-start gap-2 bg-white dark:bg-neutral-900 dark:bg-white px-4 py-3 sm:py-2 rounded-lg shadow-md hover:bg-slate-50 dark:hover:bg-neutral-800 dark:hover:bg-slate-200/50 dark:bg-neutral-800/50 font-bold text-slate-700 dark:text-slate-300 transition-colors w-full sm:w-auto"
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
          <div id="receipt-pdf-content" className="bg-white dark:bg-neutral-900 dark:bg-white w-[210mm] min-w-[210mm] min-h-[297mm] shadow-2xl p-12 sm:p-16 text-slate-800 dark:text-slate-200 mx-auto print:shadow-none print:m-0 flex flex-col font-sans relative overflow-hidden">
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
            .bg-white dark:bg-neutral-900 dark:bg-white.w-\\[210mm\\] {
              visibility: visible !important;
              position: absolute;
              left: 0;
              top: 0;
            }
            .bg-white dark:bg-neutral-900 dark:bg-white.w-\\[210mm\\] * {
              visibility: visible !important;
            }
          }
        `}} />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full ">
      
      {/* HEADER & TIME PERIOD CONTROL */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 shrink-0 pb-4 border-b border-slate-200 dark:border-neutral-800 dark:border-neutral-700">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight mb-1">Student Billing</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Auto-calculate and settle invoice amounts for enrolled students.</p>
        </div>

        <div className="flex items-center bg-white dark:bg-neutral-900 dark:bg-white border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 rounded-lg p-1 focus-within:ring-2 focus-within:ring-slate-900 transition-shadow">
          <CalendarIcon size={18} className="text-slate-400 ml-3 mr-2" />
          <select
            className="p-2.5 border-none bg-transparent focus:ring-0 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
            value={period}
            onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
          >
            <option value="current_month">Current Month</option>
            <option value="last_month">Last Month</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 shrink-0">
        <div className="bg-white dark:bg-neutral-900 dark:bg-white p-6 rounded-xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 flex items-center gap-4">
          <div className="bg-slate-50 dark:bg-neutral-800/50 p-3.5 rounded-lg text-slate-700 dark:text-slate-300">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Active Students</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{summaryStats.activeStudents}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 dark:bg-white p-6 rounded-xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 flex items-center gap-4">
          <div className="bg-slate-50 dark:bg-neutral-800/50 p-3.5 rounded-lg text-slate-700 dark:text-slate-300">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Scheduled Hours</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{summaryStats.totalScheduledHours.toFixed(1)} hrs</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 dark:bg-white p-6 rounded-xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 flex items-start gap-4">
          <div className="bg-slate-50 dark:bg-neutral-800/50 p-3.5 rounded-lg text-slate-700 dark:text-slate-300 shrink-0">
            <DollarSign size={24} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Outstanding</p>
            <div className="space-y-1 mt-1">
              {Object.keys(summaryStats.totalOutstandingDue).length === 0 ? (
                <p className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">₹ 0.00</p>
              ) : (
                Object.entries(summaryStats.totalOutstandingDue).map(([currency, amount]) => (
                  <p key={currency} className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                    <span className="text-slate-400 mr-2 text-sm font-semibold">{currency}</span>
                    {getCurrencySymbol(currency)} {amount.toFixed(2)}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTROL PANEL: Search, Filter, Sort */}
      <div className="bg-white dark:bg-neutral-900 dark:bg-white p-5 rounded-t-xl border border-b-0 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-slate-900 text-sm font-medium outline-none transition-shadow text-slate-900 dark:text-slate-50 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Active Only Toggle */}
          <label className={`flex items-center gap-2 cursor-pointer text-sm font-semibold transition-colors px-4 py-3 rounded-lg border ${showActiveOnly ? 'bg-slate-900 dark:bg-white border-slate-900 text-white dark:text-slate-900' : 'bg-slate-50 dark:bg-neutral-800/50 border-slate-300 dark:border-neutral-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50'}`}>
            <Filter size={16} className={showActiveOnly ? "text-white dark:text-slate-900" : "text-slate-400"} />
            <span className="hidden sm:inline">Active Only</span>
            <input 
              type="checkbox" 
              className="w-4 h-4 text-slate-900 dark:text-slate-50 rounded border-slate-300 dark:border-neutral-700 focus:ring-slate-900 cursor-pointer hidden"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
          </label>

          {/* Sort Dropdown */}
          <div className="flex items-center bg-white dark:bg-neutral-900 dark:bg-white border border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-slate-900 transition-shadow">
            <ArrowUpDown size={16} className="text-slate-400 mr-2" />
            <select
              className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer p-0 pr-6 outline-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="name_asc">Sort: A-Z</option>
              <option value="amount_desc">Sort: Highest Due</option>
              <option value="hours_desc">Sort: Most Hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="bg-white dark:bg-neutral-900 rounded-b-xl border border-slate-200 dark:border-neutral-800 overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-left border-collapse block md:table">
            <thead className="hidden md:table-header-group bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-200 dark:border-neutral-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider bg-slate-50 dark:bg-neutral-800/50">Student</th>
                <th className="p-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider bg-slate-50 dark:bg-neutral-800/50">Base Rate</th>
                <th className="p-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider bg-slate-50 dark:bg-neutral-800/50">Activity</th>
                <th className="p-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider bg-slate-50 dark:bg-neutral-800/50">Period</th>
                <th className="p-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider bg-slate-50 dark:bg-neutral-800/50">Outstanding</th>
                <th className="p-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider bg-slate-50 dark:bg-neutral-800/50 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 block md:table-row-group">
              {processedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 dark:bg-neutral-800/50 mb-4 border border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50">
                      <Search className="text-slate-400 w-8 h-8" />
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-50">No students found</p>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                processedProfiles.map((profile) => {
                  const stats = profile.stats
                  const currencySymbol = getCurrencySymbol(profile.billing_currency || 'INR')
                  
                  // A student is only "Billing Active" if they have > 0 classes AND they are officially enrolled.
                  const hasClasses = stats.classCount > 0
                  const isOfficiallyEnrolled = stats.isEnrolled

                  return (
                    <tr key={profile.id} className="block md:table-row hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors border-b border-slate-100 dark:border-neutral-800 md:border-none p-4 md:p-0">
                      {/* Name */}
                      <td className="block md:table-cell p-0 md:p-4 mb-2 md:mb-0 whitespace-normal md:whitespace-nowrap flex justify-between items-start md:items-center">
                        <span className="md:hidden font-bold text-xs text-slate-500 dark:text-slate-400 uppercase">Student</span>
                        <div className="text-right md:text-left">
                          <div className="font-bold text-slate-900 dark:text-slate-50">
                            {profile.first_name} {profile.last_name}
                          </div>
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{profile.email}</div>
                        </div>
                      </td>

                      {/* Base Rate (Read-Only) */}
                      <td className="block md:table-cell p-0 md:p-4 mb-2 md:mb-0 whitespace-normal md:whitespace-nowrap flex justify-between items-center">
                        <span className="md:hidden font-bold text-xs text-slate-500 dark:text-slate-400 uppercase">Base Rate</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 dark:border-neutral-700">
                          {currencySymbol} {profile.hourly_rate || 0}
                        </span>
                      </td>

                      {/* Activity Status */}
                      <td className="block md:table-cell p-0 md:p-4 mb-2 md:mb-0 whitespace-normal md:whitespace-nowrap flex justify-between items-center">
                        <span className="md:hidden font-bold text-xs text-slate-500 dark:text-slate-400 uppercase">Activity</span>
                        {!isOfficiallyEnrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-500/20 shadow-sm">
                            Unenrolled
                          </span>
                        ) : hasClasses ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            {stats.classCount} Classes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-neutral-800/50 text-slate-500 dark:text-slate-400 font-bold text-xs border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 shadow-sm">
                            No Classes
                          </span>
                        )}
                      </td>

                      {/* Period Hours & Due */}
                      <td className="block md:table-cell p-0 md:p-4 mb-2 md:mb-0 whitespace-normal md:whitespace-nowrap flex justify-between items-start">
                        <span className="md:hidden font-bold text-xs text-slate-500 dark:text-slate-400 uppercase mt-1">Period</span>
                        <div className="text-right md:text-left">
                        <div className={`inline-flex items-center gap-1.5 font-bold ${(hasClasses && isOfficiallyEnrolled) ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                          <Clock size={16} className={(hasClasses && isOfficiallyEnrolled) ? "text-slate-600 dark:text-slate-400" : "text-slate-300"} />
                          {stats.totalHours.toFixed(1)} <span className="text-sm font-medium text-slate-500 dark:text-slate-400">hrs</span>
                        </div>
                          {hasClasses && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                              Due: <span className="text-slate-700 dark:text-slate-300">{currencySymbol}{stats.periodAmountDue.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Amount Due */}
                      <td className="block md:table-cell p-0 md:p-4 mb-3 md:mb-0 whitespace-normal md:whitespace-nowrap flex justify-between items-center">
                        <span className="md:hidden font-bold text-xs text-slate-500 dark:text-slate-400 uppercase">Outstanding</span>
                        <span className={`inline-flex items-center font-bold text-lg ${stats.totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : stats.totalDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {currencySymbol} {stats.totalDue.toFixed(2)}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="block md:table-cell p-0 md:p-4 whitespace-normal md:whitespace-nowrap text-right pt-3 md:pt-4 border-t border-slate-100 dark:border-neutral-800 md:border-none">
                        <div className="flex justify-end gap-2">
                           <button 
                             onClick={() => handleViewHistory(profile)}
                             title="View History"
                             className="bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors flex items-center justify-center"
                           >
                             <History size={16} />
                           </button>
                           <button 
                             onClick={() => setSettleProfile(profile)}
                             disabled={stats.totalDue <= 0}
                             className="bg-slate-900 dark:bg-white border border-slate-800 dark:border-neutral-700 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             Settle Due
                           </button>
                           <button 
                             onClick={() => setChargeProfile(profile)}
                             className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                           >
                             Add Due Amount
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

      {/* SETTLE MODAL */}
      {settleProfile && (
        <div className="fixed inset-0 bg-slate-900 dark:bg-white/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 dark:bg-white rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">Settle Balance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
              Record a payment from <span className="font-bold text-slate-800 dark:text-slate-200">{settleProfile.first_name}</span>.
            </p>

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Amount Paid ({getCurrencySymbol(settleProfile.billing_currency)})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder={`e.g. ${settleProfile.stats.totalDue.toFixed(2)}`}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full border border-slate-300 dark:border-neutral-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 dark:text-slate-50 font-medium"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettleProfile(null)
                    setSettleAmount('')
                  }}
                  className="flex-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="flex-1 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold py-3 rounded-lg transition-colors disabled:opacity-70"
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
        <div className="fixed inset-0 bg-slate-900 dark:bg-white/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 dark:bg-white rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">Add Due Amount</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
              Manually add to the outstanding balance for <span className="font-bold text-slate-800 dark:text-slate-200">{chargeProfile.first_name}</span>.
            </p>

            <form onSubmit={handleAddChargeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Amount to Add ({getCurrencySymbol(chargeProfile.billing_currency)})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g. 1500.00"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full border border-slate-300 dark:border-neutral-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 dark:text-slate-50 font-medium"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setChargeProfile(null)
                    setChargeAmount('')
                  }}
                  className="flex-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCharging}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white dark:text-slate-900 font-bold py-3 rounded-lg transition-colors disabled:opacity-70"
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
        <div className="fixed inset-0 bg-slate-900 dark:bg-white/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 dark:bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Billing History</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">{historyProfile.first_name} {historyProfile.last_name}</p>
              </div>
              <button onClick={() => setHistoryProfile(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 dark:hover:bg-slate-200 dark:bg-neutral-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 border-t-slate-800 rounded-full animate-spin"></div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <p className="font-medium text-lg text-slate-700 dark:text-slate-300">No history found</p>
                  <p className="text-sm mt-1">Manual due additions and settlements will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyData.map(record => (
                    <div key={record.id} className={`p-4 rounded-xl border ${record.undone ? 'bg-slate-50 dark:bg-neutral-800/50 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 opacity-60' : 'bg-white dark:bg-neutral-900 dark:bg-white border-slate-200 dark:border-neutral-800 dark:border-neutral-700 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            record.type === 'SETTLEMENT' ? 'bg-emerald-100 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:text-rose-400'
                          }`}>
                            {record.type === 'CHARGE' ? 'DUE ADDED' : record.type}
                          </span>
                          {record.undone && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 dark:text-slate-400">
                              UNDONE
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {new Date(record.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                          {record.description}
                        </div>
                        <div className="text-right">
                          <div className={`font-black text-lg ${record.type === 'SETTLEMENT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {getCurrencySymbol(historyProfile.billing_currency)} {record.amount.toFixed(2)}
                          </div>
                          {!record.undone && (
                            <div className="flex items-center gap-3 mt-1 justify-end">
                              {record.type === 'SETTLEMENT' && (
                                <button 
                                  onClick={() => {
                                    setHistoryProfile(null) // close modal
                                    setReceiptProfile(historyProfile)
                                    setReceiptRecord(record)
                                  }}
                                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 font-bold flex items-center gap-1 transition-colors"
                                >
                                  <Receipt size={14} /> Print Receipt
                                </button>
                              )}
                              <button 
                                onClick={() => handleUndo(record)}
                                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 font-bold underline decoration-rose-300 underline-offset-2 transition-colors"
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
    </div>
  )
}
