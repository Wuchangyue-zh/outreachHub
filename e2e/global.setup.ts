import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth', 'user.json')

setup('authenticate', async ({ request, context }) => {
  // Login via API
  const res = await request.post('http://localhost:3030/api/auth/login', {
    data: { email: 'admin@outreachhub.com', password: 'admin123' },
  })
  
  if (!res.ok()) {
    throw new Error(`Login API failed: ${res.status()}`)
  }
  
  // Extract cookies from response
  const cookies = res.headers()['set-cookie']
  if (cookies) {
    const cookieList = cookies.split(',').map((c: string) => c.trim())
    const pwCookies = cookieList.map((cookieStr: string) => {
      const parts = cookieStr.split(';')
      const [nameValue] = parts
      const [name, ...valueParts] = nameValue.split('=')
      return {
        name: name.trim(),
        value: valueParts.join('=').trim(),
        domain: 'localhost',
        path: '/',
      }
    }).filter((c: any) => c.name && c.value)
    
    await context.addCookies(pwCookies)
  }
  
  await context.storageState({ path: authFile })
})
