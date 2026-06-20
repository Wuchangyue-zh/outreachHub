import { NextRequest } from 'next/server'
import { getRedis } from '@/lib/redis'
import { consumeApiKeyRateLimit, checkApiKeyRateLimit } from '@/lib/rate-limit'

jest.mock('@/lib/redis', () => ({ getRedis: jest.fn() }))

const mockedGetRedis = getRedis as jest.MockedFunction<typeof getRedis>

describe('P2-4 distributed API key rate limiting', () => {
  const originalDisable = process.env.DISABLE_RATE_LIMIT

  afterEach(() => {
    process.env.DISABLE_RATE_LIMIT = originalDisable
    jest.clearAllMocks()
  })

  test('uses the stable API key id and returns the consumed quota state', async () => {
    const evalMock = jest.fn().mockResolvedValue([1, 60])
    mockedGetRedis.mockReturnValue({ eval: evalMock } as never)

    const result = await consumeApiKeyRateLimit('key-123', 10)

    expect(result.response).toBeNull()
    expect(evalMock.mock.calls[0][2]).toBe('ratelimit:apikey:key-123')
    expect(result.headers['X-RateLimit-Remaining']).toBe('9')
  })

  test('different keys use independent Redis counters', async () => {
    const evalMock = jest.fn().mockResolvedValue([1, 60])
    mockedGetRedis.mockReturnValue({ eval: evalMock } as never)

    await consumeApiKeyRateLimit('key-a', 10)
    await consumeApiKeyRateLimit('key-b', 10)

    expect(evalMock.mock.calls.map(call => call[2])).toEqual([
      'ratelimit:apikey:key-a',
      'ratelimit:apikey:key-b',
    ])
  })

  test('returns 429 with standard headers after the limit', async () => {
    mockedGetRedis.mockReturnValue({ eval: jest.fn().mockResolvedValue([11, 42]) } as never)

    const result = await consumeApiKeyRateLimit('key-a', 10)

    expect(result.response?.status).toBe(429)
    expect(result.response?.headers.get('Retry-After')).toBe('42')
    expect(result.response?.headers.get('X-RateLimit-Limit')).toBe('10')
    expect(result.response?.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  test('fails closed without Redis instead of using process memory', async () => {
    mockedGetRedis.mockReturnValue(null)

    const result = await consumeApiKeyRateLimit('key-a', 10)

    expect(result.response?.status).toBe(503)
    await expect(result.response?.json()).resolves.toMatchObject({
      error: { code: 'RATE_LIMIT_UNAVAILABLE' },
    })
  })

  test('fails closed when Redis raises an error', async () => {
    mockedGetRedis.mockReturnValue({ eval: jest.fn().mockRejectedValue(new Error('offline')) } as never)
    const result = await consumeApiKeyRateLimit('key-a', 10)
    expect(result.response?.status).toBe(503)
  })

  test('compatibility wrapper also uses strict API key limiting', async () => {
    mockedGetRedis.mockReturnValue(null)
    const req = new NextRequest('http://localhost:3030/api/v1/contacts')
    const response = await checkApiKeyRateLimit(req, 'key-a', 10)
    expect(response?.status).toBe(503)
  })
})
