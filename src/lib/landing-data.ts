// ============================================================
// OutreachHub 官网主页 — 全页文案数据层
// 所有文案、数据、案例均在此集中管理，组件层纯展示
// ============================================================

// ─── 01. NAVBAR ─────────────────────────────────────────────

export const navbarData = {
  brand: { name: 'OutreachHub', tagline: '智能海外拓客平台' },
  navItems: [
    {
      label: '产品功能',
      children: [
        { label: 'AI 智能拓客', href: '#solutions', desc: '海关数据+社媒+搜索引擎，9亿+联系人' },
        { label: '邮件营销自动化', href: '#solutions', desc: '多步序列、A/B测试、智能调度' },
        { label: '邮箱验证与清洗', href: '#features', desc: '98.5%准确率，实时批量验证' },
        { label: '全链路 CRM', href: '#solutions', desc: '线索→商机→订单，一站式管理' },
      ],
    },
    { label: '解决方案', href: '#solutions' },
    { label: '客户案例', href: '#cases' },
    { label: '定价方案', href: '#pricing' },
    { label: '知识库', href: '#knowledge' },
  ],
  cta: { login: '登录', trial: '免费试用' },
}

// ─── 02. HERO ───────────────────────────────────────────────

export const heroData = {
  badge: '全新升级 · AI 驱动的外贸获客引擎',
  h1: '让每一封开发信',
  h1Highlight: '都精准触达全球买家',
  description:
    'OutreachHub 整合 9 亿+全球企业联系人、60 亿+海关交易记录，通过 AI 智能匹配与自动化邮件营销，帮助中国外贸企业将获客成本降低 60%，询盘量提升 300%。',
  cta: {
    primary: '免费开始使用',
    secondary: '预约产品演示',
  },
  trustNote: '已有 2,800+ 外贸企业信赖选择 · 无需信用卡 · 14 天全功能试用',
  stats: [
    { value: '9亿+', label: '全球联系人', icon: 'users' },
    { value: '200+', label: '覆盖国家和地区', icon: 'globe' },
    { value: '42%', label: '平均邮件打开率', icon: 'mail' },
  ],
  mockDashboard: {
    sentToday: 1247,
    openRate: '42.8%',
    replyRate: '8.6%',
    newLeads: 326,
    chartData: [65, 72, 58, 80, 95, 88, 102, 110, 98, 125, 132, 140],
  },
}

// ─── 02b. HERO WORKFLOW ─────────────────────────────────────

export interface WorkflowNode {
  id: string
  label: string
  description: string
}

export const heroWorkflowData: WorkflowNode[] = [
  { id: 'prospect', label: 'Prospect', description: '60 亿+海关数据锁定目标买家' },
  { id: 'enrich', label: 'Enrich', description: 'AI 补全企业画像与决策人信息' },
  { id: 'verify', label: 'Verify', description: '98.5% 准确率实时验证邮箱' },
  { id: 'outreach', label: 'Outreach', description: 'AI 生成个性化开发信自动发送' },
  { id: 'reply', label: 'Reply', description: '智能跟进序列提升回复率' },
  { id: 'win', label: 'Win', description: 'CRM 全链路管理直至成交' },
]

// ─── 03. TRUST BAR (Logo 墙) ────────────────────────────────

export interface TrustLogo {
  name: string
  industry: string
  /** SVG path 或首字母缩写，用于无图片时的 fallback */
  abbr: string
}

export const trustBarData = {
  title: '这些出海企业都在使用 OutreachHub',
  logos: [
    { name: '华鼎电子科技', industry: '电子元器件', abbr: '华鼎' },
    { name: '恒远机械集团', industry: '机械设备', abbr: '恒远' },
    { name: '锦程纺织', industry: '服装纺织', abbr: '锦程' },
    { name: '中联重科海外', industry: '工程机械', abbr: '中联' },
    { name: '博威合金', industry: '金属材料', abbr: '博威' },
    { name: '瑞丰光电', industry: 'LED照明', abbr: '瑞丰' },
    { name: '大洋电机', industry: '电机制造', abbr: '大洋' },
    { name: '天成控股', industry: '汽车零部件', abbr: '天成' },
    { name: '格林美股份', industry: '新能源材料', abbr: '格林美' },
    { name: '海兴电力', industry: '电力设备', abbr: '海兴' },
    { name: '巨星科技', industry: '五金工具', abbr: '巨星' },
    { name: '正泰电器海外', industry: '电气设备', abbr: '正泰' },
    { name: '卧龙电驱', industry: '电机驱动', abbr: '卧龙' },
    { name: '万向集团', industry: '汽车零部件', abbr: '万向' },
    { name: '舜宇光学', industry: '光学元件', abbr: '舜宇' },
  ] satisfies TrustLogo[],
}

// ─── 04. PAIN POINTS ────────────────────────────────────────

export interface PainPoint {
  icon: string
  title: string
  description: string
  consequence: string
  solution: string
}

export const painPointsData = {
  title: '外贸获客，你是否正面临这些挑战？',
  subtitle: '80% 的外贸企业都在经历以下困境，而 OutreacHub 正是为此而生',
  points: [
    {
      icon: 'flame',
      title: 'B2B 平台烧钱无底洞',
      description: '在阿里国际站、环球资源等平台年投入数十万，询盘质量却逐年下滑',
      consequence: '平均获客成本突破 ¥500/条，转化率不足 2%',
      solution: 'OutreachHub 直接触达终端买家，获客成本低至 ¥15/条',
    },
    {
      icon: 'search',
      title: '海关数据查了也白查',
      description: '花钱买了海关数据平台，导出的联系人早已被同行打爆，邮箱失效率超 40%',
      consequence: '花 3 小时筛选，有效邮箱不足 20 条',
      solution: 'AI 实时验证 + 多源数据交叉匹配，有效率提升至 98.5%',
    },
    {
      icon: 'mail-x',
      title: '开发信石沉大海',
      description: '手动群发 1000 封开发信，回复率不到 0.8%，还被标记为垃圾邮件',
      consequence: '域名信誉崩塌，后续邮件全部进垃圾箱',
      solution: 'AI 个性化生成 + 智能发送调度，回复率提升至 5-8%',
    },
    {
      icon: 'database',
      title: '客户线索一团乱麻',
      description: '客户信息散落在 Excel、邮箱、微信、名片盒，跟进状态全靠记忆',
      consequence: '30% 的商机因跟进不及时而流失',
      solution: '全链路 CRM 统一管理，自动化提醒不漏任何商机',
    },
  ] satisfies PainPoint[],
}

// ─── 05. SOLUTIONS ──────────────────────────────────────────

export interface SolutionTab {
  id: string
  label: string
  icon: string
  title: string
  description: string
  features: { title: string; desc: string }[]
  stat: { value: string; label: string }
  cta: string
}

export const solutionsData = {
  title: '一站式出海拓客解决方案',
  subtitle: '从客户发现到成交转化，OutreachHub 覆盖外贸获客全链路',
  tabs: [
    {
      id: 'prospecting',
      label: '海关数据获客',
      icon: 'database',
      title: '60 亿+海关交易记录，AI 锁定高意向买家',
      description:
        '整合全球主流海关数据源，覆盖 200+ 国家和地区的进出口交易记录。AI 引擎自动分析采购周期、供应商变化、采购频次，精准识别正在寻找新供应商的高意向买家。',
      features: [
        { title: '全球海关数据覆盖', desc: '美国、印度、拉美、东南亚等主要市场进出口数据实时更新' },
        { title: 'AI 采购意向评分', desc: '基于采购频率、金额变化、供应商切换等维度自动打分' },
        { title: '决策人联系方式', desc: '自动匹配采购经理、供应链总监等关键决策人邮箱和电话' },
        { title: '竞争情报分析', desc: '监控目标客户的供应商结构，发现替代机会' },
      ],
      stat: { value: '60亿+', label: '海关交易记录' },
      cta: '免费体验海关数据获客',
    },
    {
      id: 'email',
      label: 'AI 邮件营销',
      icon: 'mail',
      title: 'AI 生成个性化开发信，送达率 95%+',
      description:
        '基于大语言模型的邮件生成引擎，自动分析目标客户的行业背景、采购历史、公司动态，生成高度个性化的开发信内容。配合智能发送调度和域名预热，确保每封邮件精准送达收件箱。',
      features: [
        { title: 'AI 个性化内容生成', desc: '根据客户画像自动生成千人千面的邮件内容，告别模板群发' },
        { title: '智能发送调度', desc: '根据时区、行业习惯自动选择最佳发送时间' },
        { title: '域名预热与信誉管理', desc: '自动预热新域名，监控 IP/域名信誉评分' },
        { title: 'A/B 测试引擎', desc: '自动测试标题、正文、CTA，数据驱动优化' },
      ],
      stat: { value: '95%+', label: '邮件送达率' },
      cta: '免费体验 AI 邮件营销',
    },
    {
      id: 'automation',
      label: '自动化序列',
      icon: 'workflow',
      title: '多步触达自动化，让商机不再流失',
      description:
        '构建完整的邮件触达序列，从首次接触到持续跟进全自动执行。支持条件分支、时间延迟、行为触发等复杂逻辑，确保每条线索都能得到及时、恰当的跟进。',
      features: [
        { title: '可视化序列编辑器', desc: '拖拽式设计多步邮件序列，支持条件分支和并行路径' },
        { title: '行为触发机制', desc: '根据邮件打开、链接点击、回复等行为自动调整跟进策略' },
        { title: '智能间隔调度', desc: 'AI 自动计算最佳跟进间隔，避免过度打扰' },
        { title: '批量任务管理', desc: '同时运行数百个营销序列，统一监控和管理' },
      ],
      stat: { value: '300%', label: '线索转化率提升' },
      cta: '免费体验自动化序列',
    },
    {
      id: 'crm',
      label: '全链路 CRM',
      icon: 'users',
      title: '从第一条线索到最终成交，一站式管理',
      description:
        '专为外贸场景设计的 CRM 系统，支持多语言客户档案、采购历史追踪、邮件沟通记录自动归档。可视化销售漏斗让每一笔商机的状态一目了然。',
      features: [
        { title: '智能客户画像', desc: '自动整合海关数据、社媒信息、邮件互动，构建 360° 客户视图' },
        { title: '可视化销售漏斗', desc: '线索→商机→报价→成交，每阶段转化率实时可查' },
        { title: '自动化任务提醒', desc: '跟进提醒、报价到期、客户生日，不错过任何关键节点' },
        { title: '团队协作与权限', desc: '多角色权限管理，客户公海/私海灵活分配' },
      ],
      stat: { value: '45%', label: '成交周期缩短' },
      cta: '免费体验全链路 CRM',
    },
  ] satisfies SolutionTab[],
}

// ─── 06. FEATURES ───────────────────────────────────────────

export interface Feature {
  icon: string
  title: string
  description: string
  href: string
}

export const featuresData = {
  title: '核心功能，全面赋能外贸获客',
  subtitle: '每一个功能都经过 2,800+ 外贸企业实战验证',
  features: [
    {
      icon: 'brain',
      title: 'AI 智能拓客',
      description: '海关数据 + 社媒数据 + 搜索引擎，9 大拓客渠道全覆盖，AI 自动筛选高意向买家',
      href: '#solutions',
    },
    {
      icon: 'shield-check',
      title: '邮箱验证与清洗',
      description: '98.5% 验证准确率，实时批量验证，自动剔除无效、一次性、角色邮箱',
      href: '#features',
    },
    {
      icon: 'languages',
      title: '多语言邮件生成',
      description: '支持英语、西班牙语、阿拉伯语等 12 种语言，AI 自动适配目标市场语言习惯',
      href: '#features',
    },
    {
      icon: 'split',
      title: 'A/B 测试与优化',
      description: '标题、正文、CTA、发送时间全维度测试，数据驱动持续优化邮件效果',
      href: '#features',
    },
    {
      icon: 'eye',
      title: '邮件追踪分析',
      description: '打开、点击、回复、退订实时追踪，完整还原客户互动路径',
      href: '#features',
    },
    {
      icon: 'heart-pulse',
      title: '邮箱健康保护',
      description: '域名信誉监控、发送频率控制、自动退信处理，保护您的发送能力',
      href: '#features',
    },
    {
      icon: 'repeat',
      title: '多邮箱轮换发送',
      description: '支持绑定多个发件邮箱，智能轮换分发，单日发送量提升 5 倍',
      href: '#features',
    },
    {
      icon: 'bar-chart-3',
      title: '数据看板与报表',
      description: '全链路数据可视化，团队绩效、邮件效果、客户转化一目了然',
      href: '#features',
    },
  ] satisfies Feature[],
}

// ─── 07. HOW IT WORKS ───────────────────────────────────────

export const howItWorksData = {
  title: '3 步开启海外获客',
  subtitle: '从注册到收到第一封回复，最快只需 15 分钟',
  steps: [
    {
      number: '01',
      title: '定义目标客户',
      description: '输入目标行业、职位、地区等条件，或直接导入海关数据中的采购商名录。AI 引擎自动扩展匹配范围，不遗漏任何潜在买家。',
      detail: '支持按 HS 编码、公司规模、采购频率等 20+ 维度精准筛选',
    },
    {
      number: '02',
      title: 'AI 匹配与验证',
      description: '系统自动搜索并匹配目标企业的关键决策人，推测邮箱格式并实时验证有效性。98.5% 的验证准确率确保您的邮件不会发往无效地址。',
      detail: '整合 RocketReach、Apollo 等 7 大数据源，交叉验证提升准确率',
    },
    {
      number: '03',
      title: '启动自动化营销',
      description: '选择邮件模板或让 AI 生成个性化内容，设置发送时间和跟进序列。系统自动执行多步触达，您只需关注回复的高意向客户。',
      detail: '支持多步序列、条件分支、A/B 测试，全自动化运营',
    },
  ],
}

// ─── 08. CASE STUDIES ───────────────────────────────────────

export interface CaseStudy {
  id: string
  industry: string
  industryTag: string
  company: string
  companyDesc: string
  challenge: string
  solution: string
  results: { value: string; label: string }[]
  quote: string
  author: string
  authorTitle: string
}

export const caseStudiesData = {
  title: '他们用 OutreachHub 实现了获客突破',
  subtitle: '来自 3 个行业的真实增长故事',
  cases: [
    {
      id: 'electronics',
      industry: '电子元器件',
      industryTag: '电子行业',
      company: '深圳联创微电子有限公司',
      companyDesc: '专注连接器和线束组件的出口型企业，年出口额约 8,000 万元，主要市场为欧洲和东南亚',
      challenge:
        '长期依赖阿里巴巴国际站获取询盘，年投入超过 30 万元，但近两年询盘质量持续下滑——60% 的询盘来自贸易商而非终端买家，且同行价格战导致利润率从 25% 压缩至 12%。团队尝试手动搜索海关数据，但每天只能筛选出 20-30 条有效联系方式，效率极低。',
      solution:
        '使用 OutreachHub 的海关数据获客功能，锁定欧洲汽车电子和工业控制领域的终端制造商。通过 AI 采购意向评分，优先触达近 6 个月内有采购记录且供应商分散的企业。配合 AI 生成的多语言开发信（英语+德语），在 3 个月内完成了从数据筛选到自动化营销的全流程搭建。',
      results: [
        { value: '2,100+', label: '3个月获取精准买家邮箱' },
        { value: '340%', label: '询盘量增长' },
        { value: '¥18/条', label: '单条获客成本（降低 96%）' },
        { value: '5.8%', label: '邮件平均回复率' },
      ],
      quote:
        '以前在阿里国际站一年烧 30 多万，询盘质量越来越差。用 OutreachHub 3 个月，我们直接拿到了 2000 多个欧洲终端买家的联系方式，其中 40 多个已经进入报价阶段。最关键的是，这些客户都是终端制造商，利润率比贸易商高 15 个点。',
      author: '张明远',
      authorTitle: '深圳联创微电子 海外销售总监',
    },
    {
      id: 'machinery',
      industry: '机械设备',
      industryTag: '机械行业',
      company: '宁波海天精工股份有限公司',
      companyDesc: '注塑机和数控机床出口企业，产品出口 80+ 国家，年出口额约 2.5 亿元',
      challenge:
        '机械设备的海外销售周期长（平均 6-12 个月），传统的展会获客模式受疫情影响严重萎缩。团队拥有大量历史海关数据，但缺乏有效的分析工具，无法从中识别出真正有采购意向的目标客户。销售团队 80% 的时间花在无效跟进上，成交率不足 1.5%。',
      solution:
        '利用 OutreachHub 的 AI 采购意向分析，从海关数据中筛选出近 12 个月内采购过同类设备、且采购金额在 50 万美元以上的企业。通过竞争情报模块，识别出正在更换供应商的目标客户。建立 7 步自动化邮件序列，结合设备参数对比、客户案例、售后服务等内容，持续培育高意向线索。',
      results: [
        { value: '45%', label: '成交周期缩短' },
        { value: '12 个', label: '新增海外代理商' },
        { value: '¥3,200万', label: '新增订单额（6个月）' },
        { value: '4.2x', label: '销售人效提升' },
      ],
      quote:
        'OutreachHub 的海关数据分析能力让我们第一次真正看清了全球采购商的画像。以前销售团队像无头苍蝇一样到处找客户，现在系统直接告诉我们谁在买、买多少、什么时候该跟进。6 个月时间，我们新增了 12 个海外代理商，订单额超过 3200 万。',
      author: '李建华',
      authorTitle: '宁波海天精工 国际事业部总经理',
    },
    {
      id: 'textile',
      industry: '服装纺织',
      industryTag: '纺织行业',
      company: '绍兴金凤凰纺织品有限公司',
      companyDesc: '面料和家纺产品出口企业，主攻中东和非洲市场，年出口额约 5,000 万元',
      challenge:
        '中东和非洲市场的买家高度分散，传统 B2B 平台覆盖有限。团队只能通过展会和中间商获取客户，信息不对称严重——同一款面料，不同客户的报价差异高达 30%。更棘手的是，这些市场的买家普遍使用阿拉伯语和法语，团队语言能力不足，开发信的回复率长期低于 0.8%。',
      solution:
        '使用 OutreachHub 的多语言邮件生成功能，AI 自动生成阿拉伯语和法语的个性化开发信，内容精准匹配客户的采购历史和行业需求。通过自动化序列功能，对沉默客户进行 5 步持续触达。配合邮箱健康管理系统，逐步将域名信誉评分从 65 分提升至 92 分。',
      results: [
        { value: '5.2%', label: '邮件回复率（从0.8%提升）' },
        { value: '180+', label: '新增活跃客户（6个月）' },
        { value: '65%', label: '获客成本降低' },
        { value: '92分', label: '域名信誉评分' },
      ],
      quote:
        '我们做中东和非洲市场，最大的痛点就是语言。OutreachHub 的 AI 阿拉伯语邮件写得比我们请的翻译还地道，客户根本看不出是机器生成的。6 个月时间，我们的活跃客户数翻了一倍多，而且获客成本比以前通过中间商低了 65%。',
      author: '王秀芳',
      authorTitle: '绍兴金凤凰纺织 外贸部经理',
    },
  ] satisfies CaseStudy[],
}

// ─── 09. STATS ──────────────────────────────────────────────

export const statsData = {
  title: '数据驱动，实力见证',
  stats: [
    { value: '9亿+', label: '全球联系人数据库', description: '覆盖 200+ 国家和地区的企业决策人' },
    { value: '60亿+', label: '海关交易记录', description: '全球主流市场进出口数据实时更新' },
    { value: '98.5%', label: '邮箱验证准确率', description: '7 大数据源交叉验证，确保有效触达' },
    { value: '2,800+', label: '信赖企业', description: '从初创团队到上市公司，覆盖 30+ 行业' },
  ],
}

// ─── 10. PRICING ────────────────────────────────────────────

export interface PricingPlan {
  id: string
  name: string
  price: string
  period: string
  yearlyPrice?: string
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
  badge?: string
}

export const pricingData = {
  title: '简单透明的定价方案',
  subtitle: '14 天全功能免费试用，无需信用卡，随时可取消',
  plans: [
    {
      id: 'free',
      name: '免费试用',
      price: '¥0',
      period: '/14天',
      description: '完整体验所有核心功能，验证产品价值',
      features: [
        '全功能 14 天试用',
        '100 封/天邮件发送',
        '1 个邮箱账户',
        '1,000 条联系人导入',
        '基础海关数据查询',
        '邮件追踪与分析',
        '在线客服支持',
      ],
      cta: '免费开始试用',
    },
    {
      id: 'pro',
      name: '专业版',
      price: '¥599',
      period: '/月',
      yearlyPrice: '¥479/月（年付8折）',
      description: '满足中小外贸团队的日常获客需求',
      features: [
        '2,000 封/天邮件发送',
        '5 个邮箱账户轮换',
        '50,000 条联系人容量',
        'AI 个性化邮件生成',
        '多步自动化序列',
        'A/B 测试引擎',
        '海关数据高级筛选',
        '全链路 CRM',
        '数据看板与报表',
        'API 接口访问',
        '优先客服支持',
      ],
      cta: '立即升级专业版',
      highlighted: true,
      badge: '最受欢迎',
    },
    {
      id: 'enterprise',
      name: '企业定制版',
      price: '联系我们',
      period: '',
      description: '为大型外贸团队和集团企业量身定制',
      features: [
        '无限邮件发送量',
        '无限邮箱账户',
        '无限联系人容量',
        '专属 IP 地址与域名预热',
        '高级 AI 模型定制',
        '海关数据深度分析',
        '多团队协作管理',
        'SSO 单点登录',
        '专属客户成功经理',
        'SLA 服务保障',
        '定制化培训与部署',
      ],
      cta: '预约企业演示',
    },
  ] satisfies PricingPlan[],
}

// ─── 11. FAQ ────────────────────────────────────────────────

export interface FAQItem {
  question: string
  answer: string
}

export const faqData = {
  title: '常见问题',
  subtitle: '关于 OutreachHub，您可能想了解的',
  items: [
    {
      question: 'OutreachHub 的数据来源是否合规？',
      answer: '我们的数据来源完全合规。海关数据来自各国政府公开的进出口贸易记录；企业联系人数据整合自 RocketReach、Apollo 等国际主流商业数据平台，所有数据均经过合法授权。我们严格遵守 GDPR、CCPA 等国际数据隐私法规，确保数据获取和使用的合法性。',
    },
    {
      question: '邮件送达率如何保障？',
      answer: '我们通过多重机制保障送达率：① 域名预热系统自动为新域名建立信誉；② 智能发送调度控制每小时发送量，避免触发反垃圾邮件机制；③ 7 大数据源交叉验证邮箱有效性，无效邮箱不浪费发送额度；④ 实时监控 IP 和域名信誉评分，异常时自动切换发送通道。平均送达率稳定在 95% 以上。',
    },
    {
      question: '支持哪些语言的邮件生成？',
      answer: '目前支持中文、英语、西班牙语、法语、德语、葡萄牙语、阿拉伯语、日语、韩语、俄语、意大利语、荷兰语共 12 种语言。AI 会根据目标客户的所在地区和语言习惯自动选择最合适的语言，并生成符合当地商务礼仪的邮件内容。',
    },
    {
      question: '免费试用期间有什么限制？',
      answer: '14 天免费试用期间，您可以使用所有专业版功能，包括 AI 邮件生成、自动化序列、海关数据查询等。唯一的限制是发送量（100 封/天）和联系人容量（1,000 条）。试用结束后，您可以选择升级付费版或继续使用免费的基础功能。',
    },
    {
      question: '如何保障我的数据安全？',
      answer: '我们采用企业级安全架构：① 所有数据传输使用 TLS 1.3 加密；② 数据存储使用 AES-256 加密；③ 多租户数据严格隔离；④ 支持 RBAC 角色权限管理和双因素认证；⑤ 定期进行第三方安全审计。我们已通过 SOC 2 Type II 和 ISO 27001 认证。',
    },
    {
      question: '是否支持团队协作？',
      answer: '支持。专业版支持最多 5 个团队成员，企业版无限制。管理员可以设置不同角色的权限（管理员/经理/销售），支持客户公海/私海分配、跟进记录共享、团队绩效看板等功能。企业版还支持 SSO 单点登录和 LDAP 集成。',
    },
    {
      question: '如果已有客户数据，如何导入？',
      answer: '支持 CSV/Excel 批量导入，系统会自动去重、验证邮箱有效性、补充缺失的企业信息。同时支持通过 API 与您现有的 ERP、CRM 系统对接，实现数据双向同步。专业版提供标准 REST API，企业版可定制专属接口。',
    },
    {
      question: '退款政策是怎样的？',
      answer: '月付用户可在付款后 7 天内申请全额退款；年付用户可在 30 天内申请退款。退款将在 3-5 个工作日内原路返回。如果您在使用过程中遇到任何问题，我们的客户成功团队会优先帮助您解决，确保产品为您创造价值。',
    },
  ] satisfies FAQItem[],
}

// ─── 12. SECURITY ───────────────────────────────────────────

export interface SecurityFeature {
  icon: string
  title: string
  description: string
  details: string[]
}

export const securityData = {
  title: '企业级安全保障',
  subtitle: '您的数据安全是我们的第一优先级',
  features: [
    {
      icon: 'lock',
      title: '数据加密',
      description: '全方位加密保护您的业务数据',
      details: ['TLS 1.3 传输加密', 'AES-256 存储加密', '密钥定期轮换', '端到端数据保护'],
    },
    {
      icon: 'shield',
      title: '合规认证',
      description: '符合国际主流安全标准',
      details: ['SOC 2 Type II 认证', 'ISO 27001 认证', 'GDPR 合规', 'CCPA 合规'],
    },
    {
      icon: 'user-check',
      title: '访问控制',
      description: '精细化的权限管理体系',
      details: ['RBAC 角色权限', '双因素认证 (2FA)', 'SSO 单点登录', '操作审计日志'],
    },
    {
      icon: 'server',
      title: '基础设施',
      description: '高可用的企业级基础设施',
      details: ['多可用区部署', '99.9% SLA 保障', '自动备份与恢复', 'DDoS 防护'],
    },
  ] satisfies SecurityFeature[],
}

// ─── 13. KNOWLEDGE (知识库入口) ──────────────────────────────

export interface KnowledgeArticle {
  id: string
  title: string
  summary: string
  category: string
  readTime: string
  slug: string
  tags: string[]
}

export const knowledgeData = {
  title: '外贸获客知识库',
  subtitle: '实战干货，助您从入门到精通',
  articles: [
    {
      id: 'cold-email-guide',
      title: '2026 年外贸开发信完整指南：从标题到回复率的 7 个关键优化点',
      summary:
        '基于 50 万封真实开发信数据，深度解析影响邮件打开率和回复率的核心因素。涵盖标题公式、正文结构、CTA 设计、发送时间等实战技巧，附带 10 个高转化模板。',
      category: '邮件营销',
      readTime: '12 分钟',
      slug: 'cold-email-optimization-guide-2026',
      tags: ['开发信', '邮件模板', '回复率优化'],
    },
    {
      id: 'customs-data-guide',
      title: '海关数据获客实操：如何从 60 亿条记录中精准锁定高意向买家',
      summary:
        '手把手教你使用海关数据进行精准获客。从 HS 编码筛选、采购商画像分析、到竞争情报挖掘，完整覆盖海关数据获客的全流程方法论。',
      category: '数据获客',
      readTime: '15 分钟',
      slug: 'customs-data-prospecting-guide',
      tags: ['海关数据', '精准获客', '采购商分析'],
    },
    {
      id: 'email-deliverability',
      title: '外贸邮件送达率提升实战：从 60% 到 95% 的完整优化路径',
      summary:
        '深入解析影响邮件送达率的技术因素（SPF/DKIM/DMARC）和内容因素（垃圾邮件评分、链接比例）。提供域名预热计划表和信誉监控清单，助您系统性提升送达率。',
      category: '邮件送达',
      readTime: '10 分钟',
      slug: 'email-deliverability-optimization',
      tags: ['送达率', '域名预热', 'IP 信誉'],
    },
  ] satisfies KnowledgeArticle[],
}

// ─── 14. CTA ────────────────────────────────────────────────

export const ctaData = {
  title: '立即开启智能获客之旅',
  subtitle: '免费试用 14 天，全功能体验，无需信用卡',
  features: [
    { icon: 'zap', text: '5 分钟完成注册' },
    { icon: 'gift', text: '14 天全功能免费' },
    { icon: 'credit-card', text: '无需绑定信用卡' },
  ],
  form: {
    placeholder: '输入您的工作邮箱',
    button: '免费开始使用',
    note: '注册即表示同意我们的《服务条款》和《隐私政策》',
  },
  trustBadges: [
    'SOC 2 认证',
    'ISO 27001',
    'GDPR 合规',
    '99.9% SLA',
  ],
}

// ─── FOOTER ─────────────────────────────────────────────────

export const footerData = {
  brand: { name: 'OutreachHub', description: 'AI 驱动的智能海外拓客与邮件营销平台，帮助中国外贸企业高效拓展全球市场。' },
  columns: [
    {
      title: '产品功能',
      links: [
        { label: 'AI 智能拓客', href: '#solutions' },
        { label: '邮件营销自动化', href: '#solutions' },
        { label: '邮箱验证与清洗', href: '#features' },
        { label: '自动化序列', href: '#solutions' },
        { label: '全链路 CRM', href: '#solutions' },
        { label: '数据看板', href: '#features' },
      ],
    },
    {
      title: '解决方案',
      links: [
        { label: '电子元器件行业', href: '#cases' },
        { label: '机械设备行业', href: '#cases' },
        { label: '服装纺织行业', href: '#cases' },
        { label: '外贸团队管理', href: '#solutions' },
        { label: '跨境电商获客', href: '#solutions' },
      ],
    },
    {
      title: '资源中心',
      links: [
        { label: '外贸知识库', href: '#knowledge' },
        { label: '开发信模板', href: '#knowledge' },
        { label: '海关数据教程', href: '#knowledge' },
        { label: 'API 文档', href: '#' },
        { label: '帮助中心', href: '#' },
      ],
    },
    {
      title: '关于我们',
      links: [
        { label: '公司介绍', href: '#' },
        { label: '加入我们', href: '#' },
        { label: '合作伙伴', href: '#' },
        { label: '联系我们', href: '#' },
        { label: '服务条款', href: '#' },
        { label: '隐私政策', href: '#' },
      ],
    },
  ],
  contact: {
    phone: '400-888-6688',
    email: 'support@outreachhub.com',
    address: '深圳市南山区科技园南区 W1-B 栋 5F',
  },
  social: [
    { name: '微信公众号', href: '#' },
    { name: 'LinkedIn', href: '#' },
    { name: 'Twitter', href: '#' },
  ],
  copyright: `© ${new Date().getFullYear()} OutreachHub. All rights reserved.`,
  icp: '粤ICP备XXXXXXXX号-1',
}
