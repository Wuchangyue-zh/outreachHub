import { useEffect, useState, useCallback, useRef } from 'react'

interface SSEEvent {
  type: string
  timestamp: number
  [key: string]: any
}

interface UseSSEOptions {
  enabled?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useSSE(url: string, options: UseSSEOptions = {}) {
  const {
    enabled = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
  } = options

  const [data, setData] = useState<SSEEvent | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!enabled) return

    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
      setError(null)
      reconnectAttemptsRef.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data) as SSEEvent
        setData(parsedData)
      } catch (e) {
        console.error('[useSSE] Failed to parse message:', e)
      }
    }

    eventSource.onerror = (e) => {
      setConnected(false)
      setError('Connection lost')

      eventSource.close()

      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++
          connect()
        }, reconnectInterval)
      } else {
        setError('Max reconnect attempts reached')
      }
    }
  }, [url, enabled, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setConnected(false)
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    data,
    connected,
    error,
    reconnect: connect,
    disconnect,
  }
}
