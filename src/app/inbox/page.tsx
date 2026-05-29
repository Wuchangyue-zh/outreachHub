'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Mail, Search, Send, Edit3, Bot, Clock, ArrowLeft,
  ToggleLeft, ToggleRight, Sparkles, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────

type Intent = 'interested' | 'opt-out' | 'ooo'

interface EmailMessage {
  id: string
  from: 'us' | 'them'
  senderName: string
  senderEmail: string
  subject: string
  body: string
  timestamp: string
}

interface Thread {
  id: string
  contactName: string
  contactEmail: string
  company: string
  country: string
  intent: Intent
  lastSnippet: string
  lastTime: string
  unread: boolean
  messages: EmailMessage[]
  aiDraft: string
}

// ─── Mock Data (fallback when no real threads) ──────────────

const MOCK_THREADS: Thread[] = [
  {
    id: 't1',
    contactName: 'James Miller',
    contactEmail: 'james@technordic.se',
    company: 'TechNordic AB',
    country: '🇸🇪 瑞典',
    intent: 'interested',
    lastSnippet: 'Could you send us a quotation for 5,000 units?',
    lastTime: '2 小时前',
    unread: true,
    messages: [
      {
        id: 'm1',
        from: 'us',
        senderName: 'Alice Wang',
        senderEmail: 'alice@outreach-hub.com',
        subject: 'Partnership Opportunity — Precision Bearings for Nordic Market',
        body: `Dear James,\n\nI hope this email finds you well. I am reaching out from OutreachHub because we noticed TechNordic's strong presence in the industrial automation sector across Scandinavia.\n\nWe specialize in high-precision bearings with ISO 9001 and IATF 16949 certification, and believe there is excellent synergy between our companies.\n\n• Competitive factory-direct pricing\n• 15-day standard lead time\n• Full OEM/ODM customization\n\nWould you be open to a brief call this week?\n\nBest regards,\nAlice Wang`,
        timestamp: '2026-05-27 09:15',
      },
      {
        id: 'm2',
        from: 'them',
        senderName: 'James Miller',
        senderEmail: 'james@technordic.se',
        subject: 'Re: Partnership Opportunity — Precision Bearings for Nordic Market',
        body: `Hi Alice,\n\nThank you for reaching out. We are actually in the process of qualifying new bearing suppliers for our Q3 production ramp-up.\n\nYour products look interesting. Could you send us a quotation for 5,000 units of the 6205-2RS model? We would also need to see your test certificates and lead time for this volume.\n\nLooking forward to your reply.\n\nBest,\nJames Miller\nCEO, TechNordic AB`,
        timestamp: '2026-05-28 14:32',
      },
    ],
    aiDraft: `Dear James,\n\nThank you for your interest and for considering us for your Q3 production needs. We are delighted to provide the following details:\n\n**Quotation — 6205-2RS Precision Bearing (Qty: 5,000)**\n• Unit Price: $2.85 FOB\n• Lead Time: 12–15 business days\n• Certification: ISO 9001, IATF 16949, RoHS compliant\n\nI have attached our full test certificate package for your review.\n\nBest regards,\nAlice Wang`,
  },
  {
    id: 't2',
    contactName: 'Sarah O\'Connor',
    contactEmail: 'sarah@brighton-mfg.co.uk',
    company: 'Brighton Manufacturing Ltd',
    country: '🇬🇧 英国',
    intent: 'opt-out',
    lastSnippet: 'Please remove me from your mailing list.',
    lastTime: '5 小时前',
    unread: false,
    messages: [
      {
        id: 'm3',
        from: 'us',
        senderName: 'Mike Chen',
        senderEmail: 'mike@outreach-hub.com',
        subject: 'Cost Reduction Opportunity — Industrial Fasteners',
        body: `Dear Sarah,\n\nI am writing to introduce our range of industrial fasteners that could help Brighton Manufacturing reduce procurement costs by 20–30%.\n\nBest regards,\nMike Chen`,
        timestamp: '2026-05-26 11:00',
      },
      {
        id: 'm4',
        from: 'them',
        senderName: 'Sarah O\'Connor',
        senderEmail: 'sarah@brighton-mfg.co.uk',
        subject: 'Re: Cost Reduction Opportunity — Industrial Fasteners',
        body: `Hi,\n\nPlease remove me from your mailing list. We are not interested in sourcing fasteners from overseas at this time.\n\nRegards,\nSarah O'Connor`,
        timestamp: '2026-05-28 09:45',
      },
    ],
    aiDraft: '',
  },
  {
    id: 't3',
    contactName: 'Hans Becker',
    contactEmail: 'hans@becker-automotive.de',
    company: 'Becker Automotive GmbH',
    country: '🇩🇪 德国',
    intent: 'ooo',
    lastSnippet: 'I am currently out of the office until June 10th.',
    lastTime: '1 天前',
    unread: false,
    messages: [
      {
        id: 'm5',
        from: 'us',
        senderName: 'Alice Wang',
        senderEmail: 'alice@outreach-hub.com',
        subject: 'OEM Bearing Solutions for German Automotive Sector',
        body: `Dear Hans,\n\nI noticed Becker Automotive's recent expansion into electric vehicle components.\n\nBest regards,\nAlice Wang`,
        timestamp: '2026-05-25 08:30',
      },
      {
        id: 'm6',
        from: 'them',
        senderName: 'Hans Becker',
        senderEmail: 'hans@becker-automotive.de',
        subject: 'Auto-Reply: Out of Office',
        body: `Thank you for your email. I am currently out of the office until June 10th with limited access to email.`,
        timestamp: '2026-05-27 16:00',
      },
    ],
    aiDraft: '',
  },
  {
    id: 't4',
    contactName: 'Maria Gonzalez',
    contactEmail: 'maria@latam-industrial.mx',
    company: 'LatAm Industrial SA de CV',
    country: '🇲🇽 墨西哥',
    intent: 'interested',
    lastSnippet: 'Do you have distributors in Mexico? We need 10,000 pcs/month.',
    lastTime: '3 小时前',
    unread: true,
    messages: [
      {
        id: 'm7',
        from: 'us',
        senderName: 'Mike Chen',
        senderEmail: 'mike@outreach-hub.com',
        subject: 'Reliable Supply Chain Partner for LatAm Market',
        body: `Dear Maria,\n\nI am reaching out because LatAm Industrial's growth in the mining equipment sector is impressive.\n\nBest regards,\nMike Chen`,
        timestamp: '2026-05-26 14:20',
      },
      {
        id: 'm8',
        from: 'them',
        senderName: 'Maria Gonzalez',
        senderEmail: 'maria@latam-industrial.mx',
        subject: 'Re: Reliable Supply Chain Partner for LatAm Market',
        body: `Hola Mike,\n\nThis sounds very interesting. We have been looking for alternatives to our current European supplier.\n\nDo you have distributors in Mexico, or do you ship directly? We need approximately 10,000 pcs/month of the 6308-ZZ model.\n\nSaludos,\nMaria Gonzalez`,
        timestamp: '2026-05-28 11:15',
      },
    ],
    aiDraft: `Dear Maria,\n\nThank you for your prompt response. We ship directly from our factory to Mexico with DDP terms.\n\n**Quotation — 6308-ZZ Bearing (Qty: 10,000/month)**\n• Unit Price: $4.20 DDP Monterrey\n• Lead Time: 18–20 days\n\nBest regards,\nMike Chen`,
  },
]

const INTENT_CONFIG: Record<Intent, { label: string; dot: string; bg: string; text: string }> = {
  interested: { label: 'Interested', dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  'opt-out':  { label: 'Opt-Out',    dot: 'bg-red-500',   bg: 'bg-red-50',   text: 'text-red-700' },
  ooo:        { label: 'OOO',         dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
}

// ─── Generate AI Draft ──────────────────────────────────────

async function generateAiDraft(thread: Thread): Promise<string> {
  try {
    const lastMessage = thread.messages[thread.messages.length - 1]
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Write a professional email reply to this customer inquiry. The context:\n\nContact: ${thread.contactName} (${thread.contactEmail})\nCompany: ${thread.company}\nTheir message:\n${lastMessage.body}\n\nWrite a concise, professional response addressing their questions.`,
      }),
    })
    const json = await res.json()
    if (json.success && json.data) return json.data
  } catch (e) {
    console.error('AI draft generation failed:', e)
  }
  return thread.aiDraft || 'AI draft generation failed. Please write manually.'
}

// ─── Send Reply ─────────────────────────────────────────────

async function sendReply(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const res = await fetch('/api/email-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text: body }),
    })
    const json = await res.json()
    return json.success === true
  } catch (e) {
    console.error('Reply send failed:', e)
    return false
  }
}

// ─── Page ───────────────────────────────────────────────────

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>(MOCK_THREADS)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [editingDraft, setEditingDraft] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)

  // Fetch real threads from API
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await fetch('/api/inbox/threads')
        const json = await res.json()
        if (json.success && json.data.length > 0) {
          // Use real data, but ensure AI draft for interested threads
          const enriched = json.data.map((t: Thread) => ({
            ...t,
            aiDraft: t.intent === 'interested' ? t.aiDraft || '' : t.aiDraft,
          }))
          setThreads(enriched)
          setSelectedId(enriched[0].id)
        }
        // If no real threads, keep mock data as fallback
      } catch (e) {
        console.error('Failed to fetch inbox threads:', e)
        // Keep mock data
      } finally {
        setLoading(false)
      }
    }
    fetchThreads()
  }, [])

  const selected = threads.find((t) => t.id === selectedId)

  const handleGenerateDraft = async () => {
    if (!selected) return
    setGeneratingDraft(true)
    const draft = await generateAiDraft(selected)
    setDraftText(draft)
    setEditingDraft(true)
    setGeneratingDraft(false)
  }

  const handleSend = async () => {
    if (!selected) return
    setSending(true)
    const body = editingDraft ? draftText : selected.aiDraft
    try {
      const success = await sendReply(
        selected.contactEmail,
        `Re: ${selected.messages[selected.messages.length - 1]?.subject || 'Follow-up'}`,
        body,
      )
      if (success) {
        setSent(true)
        setTimeout(() => setSent(false), 3000)
      }
    } finally {
      setSending(false)
    }
  }

  const handleSelectThread = (id: string) => {
    setSelectedId(id)
    setEditingDraft(false)
    setSent(false)
    setDraftText('')
  }

  const unreadCount = threads.filter((t) => t.unread).length

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <p className="text-gray-500">加载中...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

        {/* ─── Left: Thread List ─── */}
        <div className="flex w-80 shrink-0 flex-col border-r border-gray-100">
          {/* Header */}
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-bold text-gray-900">Inbox</h2>
            <p className="text-xs text-gray-500">
              {unreadCount} unread conversations
            </p>
          </div>

          {/* Search */}
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search threads..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Mail className="mb-4 h-12 w-12 text-gray-300" />
                <p className="text-sm font-medium">暂无对话</p>
                <p className="text-xs">收到客户回复后将显示在这里</p>
              </div>
            ) : (
              threads.map((thread) => {
                const cfg = INTENT_CONFIG[thread.intent]
                const isActive = thread.id === selectedId
                return (
                  <button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    className={cn(
                      'flex w-full flex-col gap-2 border-b border-gray-50 px-5 py-4 text-left transition-colors',
                      isActive ? 'bg-blue-50/60' : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-semibold text-gray-900', thread.unread && 'font-bold')}>
                          {thread.contactName}
                        </span>
                        {thread.unread && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400">{thread.lastTime}</span>
                    </div>

                    <p className="text-xs text-gray-500">{thread.company} · {thread.country}</p>

                    <p className="truncate text-xs text-gray-500">{thread.lastSnippet}</p>

                    {/* Intent badge */}
                    <span
                      className={cn(
                        'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        cfg.bg, cfg.text,
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                      {cfg.label}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ─── Center: Email Detail & Timeline ─── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {selected.contactName.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">{selected.contactName}</h3>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      INTENT_CONFIG[selected.intent].bg, INTENT_CONFIG[selected.intent].text,
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', INTENT_CONFIG[selected.intent].dot)} />
                      {INTENT_CONFIG[selected.intent].label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {selected.contactEmail} · {selected.company} · {selected.country}
                  </p>
                </div>
              </div>

              {/* Messages timeline */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                  {selected.messages.map((msg) => {
                    const isUs = msg.from === 'us'
                    return (
                      <div key={msg.id} className={cn('flex gap-3', isUs && 'flex-row-reverse')}>
                        {/* Avatar */}
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            isUs ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700',
                          )}
                        >
                          {msg.senderName.split(' ').map((n) => n[0]).join('')}
                        </div>

                        {/* Bubble */}
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl border px-5 py-4',
                            isUs
                              ? 'border-blue-100 bg-blue-50'
                              : 'border-gray-100 bg-white shadow-sm',
                          )}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900">{msg.senderName}</span>
                            <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-600 mb-2">{msg.subject}</p>
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                            {msg.body}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-400">
              <p>选择一封对话开始</p>
            </div>
          )}
        </div>

        {/* ─── Right: AI Responder Panel ─── */}
        <div className="flex w-80 shrink-0 flex-col border-l border-gray-100 bg-gray-50/50">
          {/* Panel header */}
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">AI Agent Responder</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Module A: Auto-monitoring toggle */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">AI 自动监控与回复</p>
                  <p className="mt-0.5 text-xs text-gray-500">开启后 AI 将自动分类并回复意向邮件</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className="transition-colors"
                >
                  {aiEnabled ? (
                    <ToggleRight className="h-8 w-8 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-gray-300" />
                  )}
                </button>
              </div>
              {aiEnabled && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-blue-700">Active — monitoring {threads.length} threads</span>
                </div>
              )}
            </div>

            {/* Module B: AI Draft */}
            {selected && selected.intent === 'interested' && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <p className="text-sm font-semibold text-gray-900">AI Draft Preview</p>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  Based on the contact&apos;s request, AI has drafted a follow-up response:
                </p>

                {sent ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <p className="text-sm font-semibold text-green-700">Reply sent successfully!</p>
                  </div>
                ) : editingDraft ? (
                  <div className="space-y-3">
                    <Textarea
                      rows={12}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      className="text-sm font-mono leading-relaxed"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={handleSend}
                        disabled={sending}
                      >
                        {sending ? (
                          <>
                            <Clock className="h-3.5 w-3.5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            Send Reply
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingDraft(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (selected.aiDraft ? (
                  <>
                    <div className="mb-4 max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {selected.aiDraft}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={handleSend}
                        disabled={sending}
                      >
                        {sending ? (
                          <>
                            <Clock className="h-3.5 w-3.5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            Send Reply
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          setDraftText(selected.aiDraft)
                          setEditingDraft(true)
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={handleGenerateDraft}
                    disabled={generatingDraft}
                  >
                    {generatingDraft ? (
                      <>
                        <Clock className="h-3.5 w-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate AI Draft
                      </>
                    )}
                  </Button>
                ))}
              </div>
            )}

            {selected && selected.intent === 'opt-out' && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">🔴 Contact Opted Out</p>
                <p className="mt-1 text-xs text-red-600">
                  This contact has requested to be removed from your mailing list. AI will not send further emails.
                </p>
              </div>
            )}

            {selected && selected.intent === 'ooo' && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-700">🟡 Out of Office</p>
                <p className="mt-1 text-xs text-amber-600">
                  This contact is currently unavailable. AI will follow up after their return date.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Auto-follow-up will be scheduled</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
