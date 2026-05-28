import { sendMail } from '../src/lib/email'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = value
    }
  })
}

interface StatusReport {
  timestamp: string
  gitStatus: string
  recentCommits: string
  codeReviewIteration: string
  pendingTasks: string[]
  completedWork: string[]
}

function generateReport(): StatusReport {
  const timestamp = new Date().toISOString()

  // Get git status
  let gitStatus = ''
  try {
    gitStatus = execSync('git status --short', { encoding: 'utf-8' })
  } catch (e) {
    gitStatus = 'Unable to get git status'
  }

  // Get recent commits
  let recentCommits = ''
  try {
    recentCommits = execSync('git log --oneline -5', { encoding: 'utf-8' })
  } catch (e) {
    recentCommits = 'Unable to get recent commits'
  }

  // Get code review iteration
  let codeReviewIteration = ''
  try {
    const codeReviewPath = path.join(process.cwd(), 'CODE_REVIEW.md')
    const content = fs.readFileSync(codeReviewPath, 'utf-8')
    const match = content.match(/# OutreachHub 代码评审报告 - 第(\d+)轮/)
    codeReviewIteration = match ? `第${match[1]}轮` : 'Unknown'
  } catch (e) {
    codeReviewIteration = 'Unable to read CODE_REVIEW.md'
  }

  // Get pending tasks from CODE_REVIEW.md
  const pendingTasks: string[] = []
  try {
    const codeReviewPath = path.join(process.cwd(), 'CODE_REVIEW.md')
    const content = fs.readFileSync(codeReviewPath, 'utf-8')
    const lines = content.split('\n')
    let inPendingSection = false

    for (const line of lines) {
      if (line.includes('剩余待办事项')) {
        inPendingSection = true
        continue
      }
      if (inPendingSection && line.startsWith('###')) {
        continue
      }
      if (inPendingSection && line.startsWith('- [ ]')) {
        pendingTasks.push(line.replace('- [ ]', '').trim())
      }
      if (inPendingSection && line.startsWith('---')) {
        break
      }
    }
  } catch (e) {
    pendingTasks.push('Unable to read pending tasks')
  }

  // Get completed work from recent commits
  const completedWork: string[] = []
  try {
    const commits = execSync('git log --oneline -10', { encoding: 'utf-8' })
    commits.split('\n').forEach(line => {
      if (line.trim()) {
        completedWork.push(line.trim())
      }
    })
  } catch (e) {
    completedWork.push('Unable to get completed work')
  }

  return {
    timestamp,
    gitStatus,
    recentCommits,
    codeReviewIteration,
    pendingTasks,
    completedWork,
  }
}

function formatReportHtml(report: StatusReport): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 20px; }
    .section { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .timestamp { color: #7f8c8d; font-size: 0.9em; }
    pre { background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 3px; overflow-x: auto; }
    ul { list-style-type: none; padding-left: 0; }
    li { padding: 5px 0; border-bottom: 1px solid #eee; }
    li:before { content: "•"; color: #3498db; font-weight: bold; display: inline-block; width: 1em; }
    .pending { color: #e74c3c; }
    .completed { color: #27ae60; }
  </style>
</head>
<body>
  <div class="container">
    <h1>OutreachHub 工作状态报告</h1>
    <p class="timestamp">报告时间: ${report.timestamp}</p>

    <h2>📊 代码评审状态</h2>
    <div class="section">
      <p><strong>当前迭代:</strong> ${report.codeReviewIteration}</p>
    </div>

    <h2>📝 Git 状态</h2>
    <div class="section">
      <pre>${report.gitStatus || '无未提交更改'}</pre>
    </div>

    <h2>🔄 最近提交</h2>
    <div class="section">
      <pre>${report.recentCommits}</pre>
    </div>

    <h2>⏳ 待办事项</h2>
    <div class="section">
      <ul>
        ${report.pendingTasks.map(task => `<li class="pending">${task}</li>`).join('\n        ')}
      </ul>
    </div>

    <h2>✅ 已完成工作</h2>
    <div class="section">
      <ul>
        ${report.completedWork.slice(0, 5).map(work => `<li class="completed">${work}</li>`).join('\n        ')}
      </ul>
    </div>

    <hr>
    <p style="color: #7f8c8d; font-size: 0.8em;">
      此报告由 OutreachHub 自动化系统生成 • 每30分钟发送一次
    </p>
  </div>
</body>
</html>
  `
}

function formatReportText(report: StatusReport): string {
  return `
OutreachHub 工作状态报告
========================

报告时间: ${report.timestamp}

代码评审状态
-----------
当前迭代: ${report.codeReviewIteration}

Git 状态
--------
${report.gitStatus || '无未提交更改'}

最近提交
--------
${report.recentCommits}

待办事项
--------
${report.pendingTasks.map(task => `- ${task}`).join('\n')}

已完成工作
----------
${report.completedWork.slice(0, 5).map(work => `- ${work}`).join('\n')}

---
此报告由 OutreachHub 自动化系统生成 • 每30分钟发送一次
  `
}

async function main() {
  try {
    console.log('Generating status report...')
    const report = generateReport()

    console.log('Sending email report...')
    const result = await sendMail({
      to: '734151319@qq.com',
      subject: `OutreachHub 工作状态报告 - ${report.codeReviewIteration}`,
      text: formatReportText(report),
      html: formatReportHtml(report),
    })

    console.log('Email sent successfully:', result)
  } catch (error) {
    console.error('Failed to send email report:', error)
  }
}

main()
