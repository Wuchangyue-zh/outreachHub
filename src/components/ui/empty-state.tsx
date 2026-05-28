'use client'

import { cn } from '@/lib/utils'
import {
  Users, Building2, Mail, FileText, Send, Search,
  Inbox, BarChart3, Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: any
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const defaultIcons: Record<string, any> = {
  contacts: Users,
  companies: Building2,
  campaigns: Send,
  templates: FileText,
  emails: Mail,
  prospecting: Search,
  dashboard: BarChart3,
  settings: Settings,
  inbox: Inbox,
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const IconComponent = icon || defaultIcons[title.toLowerCase()] || Inbox

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <IconComponent className="h-12 w-12 text-gray-300" />
      </div>
      <h3 className="text-lg font-medium text-gray-700">{title}</h3>
      <p className="mt-1 text-sm text-gray-400 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-4 gap-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}