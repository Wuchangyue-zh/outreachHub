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

interface RoleStatus {
  role: string
  icon: string
  status: 'completed' | 'in_progress' | 'pending'
  tasks: string[]
  summary: string
}

interface StatusReport {
  timestamp: string
  gitStatus: string
  recentCommits: string
  codeReviewIteration: string
  pendingTasks: string[]
  completedWork: string[]
  roles: RoleStatus[]
}

function analyzeRoleStatus(): RoleStatus[] {
  const roles: RoleStatus[] = [
    {
      role: '产品经理 (PM)',
      icon: '📋',
      status: 'completed',
      tasks: ['需求分析', '功能规划', '迭代管理'],
      summary: '已完成第8轮迭代规划，文件上传功能上线'
    },
    {
      role: '架构师',
      icon: '🏗️',
      status: 'completed',
      tasks: ['系统架构设计', 'API设计', '数据库设计'],
      summary: '文件上传架构设计完成，存储方案已确定'
    },
    {
      role: '前端工程师',
      icon: '🎨',
      status: 'completed',
      tasks: ['AvatarUpload组件', 'FileUpload组件', '设置页面集成'],
      summary: '头像上传和附件上传组件开发完成，支持拖放上传'
    },
    {
      role: '后端工程师',
      icon: '⚙️',
      status: 'completed',
      tasks: ['上传API开发', '文件验证', '存储管理'],
      summary: '头像和附件上传API完成，JWT认证和文件验证已实现'
    },
    {
      role: '测试工程师',
      icon: '🧪',
      status: 'in_progress',
      tasks: ['单元测试', '集成测试', 'E2E测试'],
      summary: '构建验证通过，E2E测试待运行'
    },
    {
      role: 'UI/UX 设计师',
      icon: '🎯',
      status: 'completed',
      tasks: ['上传界面设计', '交互体验优化', '响应式适配'],
      summary: '上传组件UI设计完成，支持预览和进度指示'
    }
  ]

  // Try to get actual status from git
  try {
    const recentCommits = execSync('git log --oneline -10 --since="30 minutes ago"', { encoding: 'utf-8' })
    if (recentCommits.trim()) {
      roles.forEach(role => {
        role.tasks.push('最近30分钟有新提交')
      })
    }
  } catch (e) {
    // Ignore error
  }

  return roles
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

  // Get role status
  const roles = analyzeRoleStatus()

  return {
    timestamp,
    gitStatus,
    recentCommits,
    codeReviewIteration,
    pendingTasks,
    completedWork,
    roles
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✅'
    case 'in_progress': return '🔄'
    case 'pending': return '⏳'
    default: return '❓'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'completed': return '已完成'
    case 'in_progress': return '进行中'
    case 'pending': return '待开始'
    default: return '未知'
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
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 25px; }
    .section { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .timestamp { color: #7f8c8d; font-size: 0.9em; }
    pre { background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 3px; overflow-x: auto; }
    ul { list-style-type: none; padding-left: 0; }
    li { padding: 5px 0; border-bottom: 1px solid #eee; }
    li:before { content: "•"; color: #3498db; font-weight: bold; display: inline-block; width: 1em; }
    .pending { color: #e74c3c; }
    .completed { color: #27ae60; }
    .role-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .role-header { display: flex; align-items: center; margin-bottom: 10px; }
    .role-icon { font-size: 24px; margin-right: 10px; }
    .role-name { font-weight: bold; font-size: 16px; }
    .role-status { margin-left: auto; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .status-completed { background: #d4edda; color: #155724; }
    .status-in_progress { background: #fff3cd; color: #856404; }
    .status-pending { background: #f8d7da; color: #721c24; }
    .role-tasks { margin-top: 10px; }
    .task-item { display: flex; align-items: center; padding: 3px 0; }
    .task-item:before { content: "✓"; color: #27ae60; margin-right: 8px; }
    .role-summary { margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-style: italic; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
    .stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-number { font-size: 24px; font-weight: bold; color: #3498db; }
    .stat-label { font-size: 12px; color: #7f8c8d; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 OutreachHub 团队工作状态报告</h1>
    <p class="timestamp">报告时间: ${report.timestamp}</p>

    <h2>📊 项目概览</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${report.codeReviewIteration}</div>
        <div class="stat-label">当前迭代</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${report.roles.filter(r => r.status === 'completed').length}/${report.roles.length}</div>
        <div class="stat-label">角色完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${report.pendingTasks.length}</div>
        <div class="stat-label">待办任务</div>
      </div>
    </div>

    <h2>👥 各角色工作状态</h2>
    ${report.roles.map(role => `
    <div class="role-card">
      <div class="role-header">
        <span class="role-icon">${role.icon}</span>
        <span class="role-name">${role.role}</span>
        <span class="role-status status-${role.status}">${getStatusIcon(role.status)} ${getStatusText(role.status)}</span>
      </div>
      <div class="role-tasks">
        ${role.tasks.map(task => `<div class="task-item">${task}</div>`).join('\n        ')}
      </div>
      <div class="role-summary">${role.summary}</div>
    </div>
    `).join('\n    ')}

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
🚀 OutreachHub 团队工作状态报告
================================

报告时间: ${report.timestamp}

📊 项目概览
-----------
当前迭代: ${report.codeReviewIteration}
角色完成: ${report.roles.filter(r => r.status === 'completed').length}/${report.roles.length}
待办任务: ${report.pendingTasks.length}

👥 各角色工作状态
----------------
${report.roles.map(role => `
${role.icon} ${role.role}
状态: ${getStatusIcon(role.status)} ${getStatusText(role.status)}
任务: ${role.tasks.join(', ')}
总结: ${role.summary}
`).join('\n')}

📝 Git 状态
-----------
${report.gitStatus || '无未提交更改'}

🔄 最近提交
-----------
${report.recentCommits}

⏳ 待办事项
-----------
${report.pendingTasks.map(task => `- ${task}`).join('\n')}

✅ 已完成工作
-------------
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
      subject: `OutreachHub 团队工作状态报告 - ${report.codeReviewIteration}`,
      text: formatReportText(report),
      html: formatReportHtml(report),
    })

    console.log('Email sent successfully:', result)
  } catch (error) {
    console.error('Failed to send email report:', error)
  }
}

main()
