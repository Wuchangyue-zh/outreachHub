'use client'

import { useState } from 'react'
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

// ─── Mock Data ──────────────────────────────────────────────

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
        body: `Dear James,

I hope this email finds you well. I am reaching out from OutreachHub because we noticed TechNordic's strong presence in the industrial automation sector across Scandinavia.

We specialize in high-precision bearings with ISO 9001 and IATF 16949 certification, and believe there is excellent synergy between our companies.

• Competitive factory-direct pricing
• 15-day standard lead time
• Full OEM/ODM customization

Would you be open to a brief call this week?

Best regards,
Alice Wang`,
        timestamp: '2026-05-27 09:15',
      },
      {
        id: 'm2',
        from: 'them',
        senderName: 'James Miller',
        senderEmail: 'james@technordic.se',
        subject: 'Re: Partnership Opportunity — Precision Bearings for Nordic Market',
        body: `Hi Alice,

Thank you for reaching out. We are actually in the process of qualifying new bearing suppliers for our Q3 production ramp-up.

Your products look interesting. Could you send us a quotation for 5,000 units of the 6205-2RS model? We would also need to see your test certificates and lead time for this volume.

Looking forward to your reply.

Best,
James Miller
CEO, TechNordic AB`,
        timestamp: '2026-05-28 14:32',
      },
    ],
    aiDraft: `Dear James,

Thank you for your interest and for considering us for your Q3 production needs. We are delighted to provide the following details:

**Quotation — 6205-2RS Precision Bearing (Qty: 5,000)**
• Unit Price: $2.85 FOB
• Lead Time: 12–15 business days
• Certification: ISO 9001, IATF 16949, RoHS compliant

I have attached our full test certificate package for your review. We can also arrange a sample shipment (50 units) for your quality validation before committing to the full order.

Please let me know if you need any adjustments to the specification or if you would like to schedule a video call to discuss further.

Best regards,
Alice Wang`,
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
        body: `Dear Sarah,

I am writing to introduce our range of industrial fasteners that could help Brighton Manufacturing reduce procurement costs by 20–30%.

We supply to over 150 manufacturers across Europe with guaranteed 10-day delivery from our Shenzhen warehouse.

Would you be interested in receiving our product catalog?

Best regards,
Mike Chen`,
        timestamp: '2026-05-26 11:00',
      },
      {
        id: 'm4',
        from: 'them',
        senderName: 'Sarah O\'Connor',
        senderEmail: 'sarah@brighton-mfg.co.uk',
        subject: 'Re: Cost Reduction Opportunity — Industrial Fasteners',
        body: `Hi,

Please remove me from your mailing list. We are not interested in sourcing fasteners from overseas at this time.

Regards,
Sarah O'Connor`,
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
        body: `Dear Hans,

I noticed Becker Automotive's recent expansion into electric vehicle components. Our ceramic hybrid bearings are specifically engineered for EV drivetrains and have been validated by three Tier-1 suppliers in Germany.

I would love to share our EV-specific product line with you.

Best regards,
Alice Wang`,
        timestamp: '2026-05-25 08:30',
      },
      {
        id: 'm6',
        from: 'them',
        senderName: 'Hans Becker',
        senderEmail: 'hans@becker-automotive.de',
        subject: 'Auto-Reply: Out of Office',
        body: `Thank you for your email. I am currently out of the office until June 10th with limited access to email.

For urgent matters, please contact my colleague Thomas Weber at thomas@becker-automotive.de.

I will respond to your message upon my return.

Best regards,
Hans Becker
Head of Procurement, Becker Automotive GmbH`,
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
        body: `Dear Maria,

I am reaching out because LatAm Industrial's growth in the mining equipment sector is impressive. We manufacture heavy-duty bearings rated for extreme conditions (IP69K, -40°C to +180°C operating range).

With our Mexico-friendly logistics partners, we can deliver DDP to your facility in Monterrey within 20 days.

Would you like to see our mining-grade product specifications?

Best regards,
Mike Chen`,
        timestamp: '2026-05-26 14:20',
      },
      {
        id: 'm8',
        from: 'them',
        senderName: 'Maria Gonzalez',
        senderEmail: 'maria@latam-industrial.mx',
        subject: 'Re: Reliable Supply Chain Partner for LatAm Market',
        body: `Hola Mike,

This sounds very interesting. We have been looking for alternatives to our current European supplier who has been having delivery issues.

Do you have distributors in Mexico, or do you ship directly? We need approximately 10,000 pcs/month of the 6308-ZZ model for our crusher line.

Also, what are your payment terms for new customers?

Saludos,
Maria Gonzalez
Procurement Director, LatAm Industrial SA de CV`,
        timestamp: '2026-05-28 11:15',
      },
    ],
    aiDraft: `Dear Maria,

Thank you for your prompt response and for considering us as a potential supply chain partner. I am happy to address your questions:

**Distribution & Shipping**
We ship directly from our factory to Mexico with DDP (Delivered Duty Paid) terms. Our logistics partner in Laredo handles customs clearance, so you receive the goods at your Monterrey facility with no import hassles.

**Quotation — 6308-ZZ Bearing (Qty: 10,000/month)**
• Unit Price: $4.20 DDP Monterrey
• Lead Time: 18–20 days from order confirmation
• Monthly Contract: We can lock pricing for 6 months with a minimum commitment of 8,000 pcs/month

**Payment Terms**
For new customers, we offer:
• 30% deposit upon order confirmation
• 70% upon delivery (Net 30 available after 3 successful orders)

I would be happy to arrange a video call to walk you through our quality documentation and discuss a trial order. Would next Tuesday or Wednesday work for you?

Best regards,
Mike Chen`,
  },
]

const INTENT_CONFIG: Record<Intent, { label: string; dot: string; bg: string; text: string }> = {
  interested: { label: 'Interested', dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  'opt-out':  { label: 'Opt-Out',    dot: 'bg-red-500',   bg: 'bg-red-50',   text: 'text-red-700' },
  ooo:        { label: 'OOO',         dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
}

// ─── Page ───────────────────────────────────────────────────

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string>(MOCK_THREADS[0].id)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [editingDraft, setEditingDraft] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const selected = MOCK_THREADS.find((t) => t.id === selectedId)!

  const handleSend = () => {
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    }, 1500)
  }

  const startEdit = () => {
    setDraftText(selected.aiDraft)
    setEditingDraft(true)
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
              {MOCK_THREADS.filter((t) => t.unread).length} unread conversations
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
            {MOCK_THREADS.map((thread) => {
              const cfg = INTENT_CONFIG[thread.intent]
              const isActive = thread.id === selectedId
              return (
                <button
                  key={thread.id}
                  onClick={() => {
                    setSelectedId(thread.id)
                    setEditingDraft(false)
                    setSent(false)
                  }}
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
            })}
          </div>
        </div>

        {/* ─── Center: Email Detail & Timeline ─── */}
        <div className="flex flex-1 flex-col overflow-hidden">
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
                  <span className="text-xs text-blue-700">Active — monitoring {MOCK_THREADS.length} threads</span>
                </div>
              )}
            </div>

            {/* Module B: AI Draft */}
            {selected.intent === 'interested' && selected.aiDraft ? (
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
                ) : (
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
                        onClick={startEdit}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : selected.intent === 'opt-out' ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">🔴 Contact Opted Out</p>
                <p className="mt-1 text-xs text-red-600">
                  This contact has requested to be removed from your mailing list. AI will not send further emails.
                </p>
              </div>
            ) : selected.intent === 'ooo' ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-700">🟡 Out of Office</p>
                <p className="mt-1 text-xs text-amber-600">
                  This contact is currently unavailable. AI will follow up after their return date.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Auto-follow-up scheduled: June 11, 2026</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
