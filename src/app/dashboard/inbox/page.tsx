'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Inbox,
  Mail,
  Send,
  RefreshCw,
  Search,
  User,
  Building2,
  Globe,
  Clock,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Bot,
  ChevronLeft,
  MoreVertical,
} from 'lucide-react'

interface InboxThread {
  id: string
  contactName: string
  contactEmail: string
  company: string
  country: string
  intent: 'interested' | 'opt-out' | 'ooo'
  lastSnippet: string
  lastTime: string
  unread: boolean
  messages: Array<{
    id: string
    from: 'us' | 'them'
    senderName: string
    senderEmail: string
    subject: string
    body: string
    timestamp: string
  }>
  aiDraft: string
  emailLogIds: string[]
}

export default function InboxPage() {
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedThread, setSelectedThread] = useState<InboxThread | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterIntent, setFilterIntent] = useState<string>('all')
  const [accounts, setAccounts] = useState<Array<{ id: string; email: string }>>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')

  // 加载收件箱线程
  const loadThreads = async () => {
    try {
      const res = await fetch('/api/inbox/threads')
      const data = await res.json()
      if (data.success) {
        setThreads(data.data)
        // 如果有选中的线程，更新它
        if (selectedThread) {
          const updated = data.data.find((t: InboxThread) => t.id === selectedThread.id)
          if (updated) {
            setSelectedThread(updated)
          }
        }
      }
    } catch (error) {
      toast.error('加载收件箱失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载邮件账户
  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/email-accounts')
      const data = await res.json()
      if (data.success) {
        setAccounts(data.data)
        if (data.data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data.data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  }

  useEffect(() => {
    loadThreads()
    loadAccounts()
  }, [])

  // 过滤线程
  const filteredThreads = threads.filter((thread) => {
    const matchesSearch =
      searchQuery === '' ||
      thread.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.company.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesIntent =
      filterIntent === 'all' || thread.intent === filterIntent

    return matchesSearch && matchesIntent
  })

  // 发送回复
  const handleSendReply = async () => {
    if (!selectedThread || !replyContent.trim()) {
      toast.error('请输入回复内容')
      return
    }

    if (!selectedAccountId) {
      toast.error('请选择发件账户')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedThread.contactEmail,
          subject: `Re: ${selectedThread.messages[0]?.subject || '回复'}`,
          content: replyContent,
          emailAccountId: selectedAccountId,
          emailLogIds: selectedThread.emailLogIds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('回复已发送')
        setReplyContent('')
        // 重新加载线程
        loadThreads()
      } else {
        toast.error(data.error || '发送失败')
      }
    } catch (error) {
      toast.error('发送回复失败')
    } finally {
      setSending(false)
    }
  }

  // 获取意图图标
  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'interested':
        return <ThumbsUp className="h-4 w-4 text-green-500" />
      case 'opt-out':
        return <ThumbsDown className="h-4 w-4 text-red-500" />
      case 'ooo':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />
    }
  }

  // 获取意图标签
  const getIntentBadge = (intent: string) => {
    switch (intent) {
      case 'interested':
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            <ThumbsUp className="mr-1 h-3 w-3" />
            感兴趣
          </Badge>
        )
      case 'opt-out':
        return (
          <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">
            <ThumbsDown className="mr-1 h-3 w-3" />
            退订
          </Badge>
        )
      case 'ooo':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <AlertCircle className="mr-1 h-3 w-3" />
            外出
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <MessageSquare className="mr-1 h-3 w-3" />
            其他
          </Badge>
        )
    }
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)]">
        <div className="flex h-full gap-4">
          {/* 左侧 - 线程列表 */}
          <div className="w-full md:w-1/3 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="h-5 w-5" />
                    收件箱
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={loadThreads}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* 搜索栏 */}
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索联系人..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* 过滤器 */}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={filterIntent === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterIntent('all')}
                  >
                    全部
                  </Button>
                  <Button
                    variant={filterIntent === 'interested' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterIntent('interested')}
                    className={filterIntent === 'interested' ? 'bg-green-600' : ''}
                  >
                    <ThumbsUp className="mr-1 h-3 w-3" />
                    感兴趣
                  </Button>
                  <Button
                    variant={filterIntent === 'opt-out' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterIntent('opt-out')}
                    className={filterIntent === 'opt-out' ? 'bg-red-600' : ''}
                  >
                    <ThumbsDown className="mr-1 h-3 w-3" />
                    退订
                  </Button>
                  <Button
                    variant={filterIntent === 'ooo' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterIntent('ooo')}
                    className={filterIntent === 'ooo' ? 'bg-yellow-600' : ''}
                  >
                    <AlertCircle className="mr-1 h-3 w-3" />
                    外出
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {loading ? (
                    <div className="p-8 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">加载中...</p>
                    </div>
                  ) : filteredThreads.length === 0 ? (
                    <div className="p-8 text-center">
                      <Inbox className="h-12 w-12 mx-auto text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">暂无消息</p>
                      <p className="text-xs text-gray-400">当有人回复您的邮件时，会显示在这里</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredThreads.map((thread) => (
                        <div
                          key={thread.id}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedThread?.id === thread.id ? 'bg-blue-50' : ''
                          } ${thread.unread ? 'bg-blue-50/30' : ''}`}
                          onClick={() => setSelectedThread(thread)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              thread.intent === 'interested' ? 'bg-green-100' :
                              thread.intent === 'opt-out' ? 'bg-red-100' :
                              'bg-yellow-100'
                            }`}>
                              {getIntentIcon(thread.intent)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm font-medium truncate ${thread.unread ? 'font-semibold' : ''}`}>
                                  {thread.contactName}
                                </p>
                                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                  {thread.lastTime}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {thread.company && `${thread.company} · `}{thread.country}
                              </p>
                              <p className="text-sm text-gray-600 truncate mt-1">
                                {thread.lastSnippet}
                              </p>
                              <div className="mt-1">
                                {getIntentBadge(thread.intent)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 右侧 - 对话详情 */}
          <div className="hidden md:flex md:flex-col md:w-2/3">
            {selectedThread ? (
              <Card className="flex-1 flex flex-col">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden"
                        onClick={() => setSelectedThread(null)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div>
                        <CardTitle className="text-lg">{selectedThread.contactName}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500">{selectedThread.contactEmail}</span>
                          {selectedThread.company && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {selectedThread.company}
                              </span>
                            </>
                          )}
                          {selectedThread.country && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {selectedThread.country}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getIntentBadge(selectedThread.intent)}
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                      {selectedThread.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.from === 'us' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.from === 'us'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${
                                message.from === 'us' ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {message.senderName}
                              </span>
                              <span className={`text-xs ${
                                message.from === 'us' ? 'text-blue-200' : 'text-gray-400'
                              }`}>
                                {message.timestamp}
                              </span>
                            </div>
                            <div
                              className="text-sm whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ __html: message.body }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* 回复区域 */}
                <div className="p-4 border-t">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="reply-account" className="text-sm">发件账户:</Label>
                      <select
                        id="reply-account"
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">选择发件账户</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入回复内容..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendReply()
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendReply}
                        disabled={sending || !replyContent.trim() || !selectedAccountId}
                      >
                        {sending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-16 w-16 mx-auto text-gray-300" />
                  <p className="mt-4 text-lg font-medium text-gray-500">选择一个对话</p>
                  <p className="text-sm text-gray-400">从左侧列表中选择一个对话查看详情</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
