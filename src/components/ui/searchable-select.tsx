'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, X, Check, Loader2 } from 'lucide-react'

export interface SearchableOption {
  id: string
  label: string
  sublabel?: string
}

interface SearchableSelectProps {
  value: string
  onChange: (id: string, option?: SearchableOption) => void
  onClear: () => void
  onQuickCreate?: () => void
  fetchOptions: (query: string) => Promise<SearchableOption[]>
  placeholder?: string
  quickCreateLabel?: string
  disabled?: boolean
  initialLabel?: string
}

export function SearchableSelect({
  value,
  onChange,
  onClear,
  onQuickCreate,
  fetchOptions,
  placeholder = '搜索...',
  quickCreateLabel = '新建',
  disabled = false,
  initialLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<SearchableOption[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Fetch options on query change
  const doFetch = useCallback(
    async (q: string) => {
      setLoading(true)
      try {
        const results = await fetchOptions(q)
        setOptions(results)
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    },
    [fetchOptions]
  )

  useEffect(() => {
    if (!open) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doFetch(query), 250)
    return () => clearTimeout(debounceRef.current)
  }, [query, open, doFetch])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Resolve selected label from value
  useEffect(() => {
    if (!value) {
      setSelectedLabel('')
      return
    }
    const found = options.find((o) => o.id === value)
    if (found) {
      setSelectedLabel(found.label)
    } else if (initialLabel && value) {
      setSelectedLabel(initialLabel)
    } else if (value && !open) {
      // Fetch the label for the current value
      fetchOptions('').then((results) => {
        const match = results.find((o) => o.id === value)
        if (match) setSelectedLabel(match.label)
      })
    }
  }, [value, options, open, fetchOptions, initialLabel])

  const handleSelect = (option: SearchableOption) => {
    onChange(option.id, option)
    setSelectedLabel(option.label)
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClear()
    setSelectedLabel('')
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        className={`flex h-9 items-center gap-1 rounded-md border border-input bg-transparent px-3 text-sm
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-400'}
          ${open ? 'ring-1 ring-ring' : ''}`}
        onClick={() => {
          if (!disabled) {
            setOpen(!open)
            setTimeout(() => inputRef.current?.focus(), 0)
          }
        }}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        {selectedLabel ? (
          <span className="flex-1 truncate text-sm">{selectedLabel}</span>
        ) : (
          <span className="flex-1 truncate text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg dark:bg-gray-800">
          {/* Search input */}
          <div className="border-b px-3 py-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-7 border-0 p-0 text-sm focus-visible:ring-0"
              autoFocus
            />
          </div>

          {/* Quick create button */}
          {onQuickCreate && (
            <div className="border-b px-2 py-1.5">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-primary hover:bg-primary/5"
                onClick={() => {
                  setOpen(false)
                  onQuickCreate()
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {quickCreateLabel}
              </button>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : options.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-gray-400">
                {query ? '无匹配结果' : '暂无数据'}
              </p>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    ${option.id === value ? 'bg-primary/5 text-primary' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  <Check
                    className={`h-3.5 w-3.5 flex-shrink-0 ${
                      option.id === value ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{option.label}</p>
                    {option.sublabel && (
                      <p className="truncate text-xs text-gray-400">
                        {option.sublabel}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
