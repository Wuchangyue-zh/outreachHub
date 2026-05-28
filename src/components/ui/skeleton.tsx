'use client'

import { cn } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />
  )
}

// Table row skeleton
export function TableRowSkeleton({ cols = 7 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-60" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}

// Grid skeleton
export function GridSkeleton({ count = 6, cols = 'sm:grid-cols-2 lg:grid-cols-3' }: { count?: number; cols?: string }) {
  return (
    <div className={cn('grid gap-4', cols)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

// Table skeleton
export function TableSkeleton({ rows = 5, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-gray-100 bg-gray-50">
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3 text-left font-medium text-gray-500">
              <Skeleton className="h-4 w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  )
}

export { Skeleton }