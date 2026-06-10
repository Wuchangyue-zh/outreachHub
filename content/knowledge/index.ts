export interface KnowledgeContent {
  slug: string
  title: string
  summary: string
  category: string
  readTime: string
  tags: string[]
  content: string // HTML content
  publishedAt: string
  author: string
}

const articles: KnowledgeContent[] = [
  {
    slug: 'cold-email-optimization-guide-2026',
    title: '2026 外贸开发信优化指南：从标题到成交的全流程策略',
    summary: '基于 10 万+ 封开发信数据，总结出提升打开率 300% 的实战方法论。涵盖标题公式、正文结构、跟进节奏、A/B 测试等核心技巧。',
    category: '开发信技巧',
    readTime: '12 分钟',
    tags: ['开发信', '邮件营销', '外贸技巧', '打开率'],
    publishedAt: '2026-05-15',
    author: 'OutreachHub 研究团队',
    content: `
<h2>为什么 90% 的开发信石沉大海？</h2>
<p>根据我们的数据分析，平均开发信打开率仅为 8.2%，回复率不足 1.5%。根本原因在于：大多数外贸从业者仍在使用"广撒网"模式，而非精准触达。</p>

<h2>第一步：精准定位目标客户</h2>
<p>在写开发信之前，你需要回答三个问题：</p>
<ul>
<li><strong>谁是你的理想客户？</strong> — 行业、规模、地理位置、采购周期</li>
<li><strong>他们面临什么痛点？</strong> — 供应链不稳定？价格敏感？质量要求高？</li>
<li><strong>你能提供什么独特价值？</strong> — 不是"我们质量好、价格优"，而是具体的数据和案例</li>
</ul>

<h2>第二步：标题公式（打开率提升 200%）</h2>
<p>标题决定了一封邮件 80% 的命运。以下是经过验证的高打开率标题公式：</p>
<ul>
<li><strong>数字 + 痛点</strong>：「3 个方法帮您降低 30% 采购成本」</li>
<li><strong>提问式</strong>：「您的供应商能保证 48 小时交期吗？」</li>
<li><strong>行业洞察</strong>：「2026 年 Q3 欧洲市场采购趋势分析」</li>
<li><strong>社交证明</strong>：「已为 200+ 家企业提供 XX 产品」</li>
</ul>

<h2>第三步：正文结构（AIDA 模型）</h2>
<p><strong>Attention（注意）</strong>：第一句话必须与收件人相关，而非自我介绍。</p>
<p><strong>Interest（兴趣）</strong>：展示你对他们行业的理解，提出一个具体问题或洞察。</p>
<p><strong>Desire（欲望）</strong>：用数据和案例说明你能带来的价值。</p>
<p><strong>Action（行动）</strong>：明确的下一步 — 回复邮件、预约通话、查看样品。</p>

<h2>第四步：跟进节奏</h2>
<p>80% 的成交发生在第 5-12 次跟进。建议节奏：</p>
<ul>
<li>第 1 天：首次开发信</li>
<li>第 3 天：补充行业资料或案例</li>
<li>第 7 天：换一个角度/价值主张</li>
<li>第 14 天：最后跟进，创造紧迫感</li>
</ul>

<h2>第五步：A/B 测试</h2>
<p>不要凭感觉做决策。对标题、正文、发送时间进行 A/B 测试，用数据驱动优化。OutreachHub 的 A/B 测试功能可以自动判定胜出变体。</p>

<h2>总结</h2>
<p>优秀的开发信 = 精准定位 + 吸引标题 + 价值导向正文 + 持续跟进 + 数据优化。将这五步融入你的 OutreachHub 工作流，开发信回复率将显著提升。</p>
    `,
  },
  {
    slug: 'customs-data-prospecting-guide',
    title: '海关数据获客实战：如何用 60 亿+ 贸易记录找到精准买家',
    summary: '详解海关数据在外贸拓客中的应用：HS 编码查询、买家画像分析、采购意向评分、竞争情报获取，以及如何将海关数据转化为销售线索。',
    category: '海关数据',
    readTime: '15 分钟',
    tags: ['海关数据', '外贸拓客', '买家分析', '竞争情报'],
    publishedAt: '2026-05-20',
    author: 'OutreachHub 研究团队',
    content: `
<h2>海关数据的价值</h2>
<p>全球每年产生超过 60 亿条海关贸易记录。这些数据记录了每一笔进出口交易的买家、卖家、商品、数量和金额。对于外贸企业来说，这是最精准的获客数据源之一。</p>

<h2>HS 编码：你的搜索钥匙</h2>
<p>HS 编码（Harmonized System Code）是国际贸易的标准商品分类编码。掌握 HS 编码的使用方法是海关数据获客的第一步。</p>
<ul>
<li><strong>6 位 HS 编码</strong>：国际通用，如 8471.30 表示便携式电脑</li>
<li><strong>8-10 位编码</strong>：各国细分，更精确</li>
<li><strong>搜索技巧</strong>：使用前 4-6 位扩大搜索范围，再用关键词缩小</li>
</ul>

<h2>买家画像分析</h2>
<p>一个真实的买家画像应该包含以下维度：</p>
<ul>
<li><strong>采购频率</strong>：每月/每季度/每年？</li>
<li><strong>采购金额</strong>：单次采购规模？</li>
<li><strong>供应商分布</strong>：是否依赖单一供应商？</li>
<li><strong>采购趋势</strong>：在增长还是萎缩？</li>
</ul>

<h2>采购意向评分</h2>
<p>OutreachHub 的 AI 采购意向评分基于四个维度：</p>
<ul>
<li><strong>频次 (30%)</strong>：近 12 个月采购次数</li>
<li><strong>趋势 (25%)</strong>：采购金额是否增长</li>
<li><strong>分散度 (25%)</strong>：供应商越分散，切换意愿越强</li>
<li><strong>最近性 (20%)</strong>：最近一次采购距今多久</li>
</ul>

<h2>竞争情报</h2>
<p>通过分析竞争对手的出口记录，你可以了解：</p>
<ul>
<li>竞争对手的主要客户是谁</li>
<li>客户的采购量和频率</li>
<li>是否存在供应缺口（如供应商产能不足）</li>
<li>客户是否有更换供应商的信号</li>
</ul>

<h2>从数据到行动</h2>
<p>海关数据本身只是信息，关键在于如何将其转化为销售行动：</p>
<ol>
<li>在 OutreachHub 中搜索目标 HS 编码和国家</li>
<li>按采购意向评分筛选高价值买家</li>
<li>一键导入为联系人，自动创建公司档案</li>
<li>创建针对性的开发信 Campaign</li>
<li>跟踪回复和转化</li>
</ol>
    `,
  },
  {
    slug: 'email-deliverability-optimization',
    title: '邮件送达率优化完全手册：从 60% 到 95% 的实战路径',
    summary: '系统讲解影响邮件送达率的技术因素（SPF/DKIM/DMARC）、内容优化、发送策略、域名预热，以及如何监控和修复送达率问题。',
    category: '邮件送达',
    readTime: '10 分钟',
    tags: ['送达率', 'SPF', 'DKIM', 'DMARC', '域名预热'],
    publishedAt: '2026-05-25',
    author: 'OutreachHub 研究团队',
    content: `
<h2>什么是邮件送达率？</h2>
<p>邮件送达率 = 到达收件箱的邮件数 / 发送总数。注意：送达 ≠ 进入垃圾箱。真正的送达率是指邮件进入收件箱（Inbox）的比例。</p>

<h2>三大技术认证</h2>
<h3>SPF（Sender Policy Framework）</h3>
<p>SPF 记录告诉收件服务器："哪些 IP 地址有权代表我的域名发信"。缺少 SPF 记录，你的邮件很可能被标记为垃圾邮件。</p>

<h3>DKIM（DomainKeys Identified Mail）</h3>
<p>DKIM 为每封邮件添加数字签名，证明邮件确实来自你的域名且未被篡改。OutreachHub 会自动为你的邮件添加 DKIM 签名。</p>

<h3>DMARC（Domain-based Message Authentication）</h3>
<p>DMARC 告诉收件服务器："当 SPF 或 DKIM 验证失败时，应该如何处理"。建议设置为 <code>p=quarantine</code> 或 <code>p=reject</code>。</p>

<h2>域名预热</h2>
<p>新域名或新 IP 不能立即大量发信。需要循序渐进：</p>
<ul>
<li><strong>第 1-7 天</strong>：每天 5-10 封，发给最活跃的联系人</li>
<li><strong>第 8-14 天</strong>：每天 15-30 封</li>
<li><strong>第 15-21 天</strong>：每天 30-50 封</li>
<li><strong>第 22 天起</strong>：逐步增加到目标量</li>
</ul>
<p>OutreachHub 的 Warm-up 功能可以自动执行这个过程。</p>

<h2>内容优化</h2>
<ul>
<li>避免垃圾邮件关键词（免费、赚钱、限时等）</li>
<li>保持文本与图片的合理比例</li>
<li>使用专业的发件人名称</li>
<li>每封邮件包含退订链接</li>
<li>避免过多链接和附件</li>
</ul>

<h2>发送策略</h2>
<ul>
<li><strong>发送时间</strong>：目标客户的工作时间（注意时区）</li>
<li><strong>发送频率</strong>：不要在短时间内大量发送</li>
<li><strong>发送窗口</strong>：OutreachHub 支持设置每日发送时间窗口</li>
<li><strong>多邮箱轮换</strong>：使用多个发件邮箱分散风险</li>
</ul>

<h2>监控与修复</h2>
<p>OutreachHub 的送达率监控面板可以帮助你：</p>
<ul>
<li>实时监控退信率、打开率、垃圾邮件投诉率</li>
<li>检测 SPF/DKIM/DMARC 配置状态</li>
<li>追踪域名健康度评分</li>
<li>自动暂停退信率过高的账户</li>
</ul>

<h2>常见问题</h2>
<p><strong>Q: 退信率超过 5% 怎么办？</strong><br/>A: 立即停止发送，清理邮件列表，检查是否使用了购买的邮箱列表。</p>
<p><strong>Q: 打开率突然下降？</strong><br/>A: 检查是否被标记为垃圾邮件，验证 DNS 记录是否正确，考虑是否需要重新预热。</p>
    `,
  },
]

export function getArticleBySlug(slug: string): KnowledgeContent | undefined {
  return articles.find((a) => a.slug === slug)
}

export function getAllArticleSlugs(): string[] {
  return articles.map((a) => a.slug)
}

export function getAllArticles(): KnowledgeContent[] {
  return articles
}
