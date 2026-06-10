'use client'

import Link from 'next/link'
import { useI18n } from '@/hooks/use-i18n'

export default function PrivacyPage() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">OutreachHub</Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-12 prose prose-gray">
        <h1>{t('privacy.title')}</h1>
        <p className="text-sm text-gray-500">{t('privacy.lastUpdated')}</p>

        <p>
          OutreachHub（以下简称"我们"或"本平台"）非常重视您的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储、共享和保护您的个人信息。请您在使用我们的服务前仔细阅读本政策。
        </p>

        <h2>一、信息收集</h2>
        <p>我们可能收集以下类型的信息：</p>

        <h3>1.1 您主动提供的信息</h3>
        <ul>
          <li><strong>账户信息</strong>：注册时提供的姓名、邮箱地址、公司名称、密码（加密存储）。</li>
          <li><strong>支付信息</strong>：付费订阅时的支付方式信息（由第三方支付平台处理，我们不存储完整的银行卡信息）。</li>
          <li><strong>业务数据</strong>：您通过平台导入或创建的联系人、公司、邮件模板、营销活动等数据。</li>
          <li><strong>沟通信息</strong>：您向客服发送的消息、反馈和咨询内容。</li>
        </ul>

        <h3>1.2 自动收集的信息</h3>
        <ul>
          <li><strong>日志信息</strong>：访问时间、IP 地址、浏览器类型、操作系统、访问页面等。</li>
          <li><strong>设备信息</strong>：设备型号、操作系统版本、唯一设备标识符。</li>
          <li><strong>使用数据</strong>：功能使用频率、操作行为、偏好设置等，用于改善产品体验。</li>
        </ul>

        <h3>1.3 第三方来源信息</h3>
        <ul>
          <li>海关数据、企业公开信息等第三方数据源提供的企业联系人信息。</li>
          <li>您通过 API 或集成服务同步的第三方平台数据。</li>
        </ul>

        <h2>二、信息使用</h2>
        <p>我们收集的信息将用于以下目的：</p>
        <ul>
          <li><strong>提供服务</strong>：维护和改进平台功能，为您和您的团队提供核心业务功能。</li>
          <li><strong>身份验证</strong>：验证用户身份，保障账户安全，支持双因素认证（2FA）。</li>
          <li><strong>个性化体验</strong>：根据使用习惯优化界面布局、功能推荐和内容展示。</li>
          <li><strong>分析与改进</strong>：分析使用数据以改进产品质量、性能和用户体验。</li>
          <li><strong>客户支持</strong>：回应您的咨询和反馈，提供技术支持。</li>
          <li><strong>安全防护</strong>：检测和防范欺诈、滥用和其他可能危害平台安全的行为。</li>
          <li><strong>合规义务</strong>：遵守法律法规要求，配合监管和司法程序。</li>
        </ul>

        <h2>三、信息共享</h2>
        <p>我们不会出售您的个人信息。在以下情况下，我们可能会共享您的信息：</p>
        <ul>
          <li><strong>服务提供商</strong>：与为我们提供基础设施、支付处理、邮件发送等服务的第三方合作伙伴共享必要信息（如云服务商、SMTP 服务提供商）。</li>
          <li><strong>法律要求</strong>：根据法律法规、法律程序或政府主管部门的强制性要求。</li>
          <li><strong>权利保护</strong>：为保护 OutreachHub、我们的用户或公众的权利、财产或安全。</li>
          <li><strong>企业交易</strong>：在合并、收购或资产出售的情况下，您的信息可能作为交易的一部分被转移。</li>
          <li><strong>您的同意</strong>：在获得您明确同意的其他情况下。</li>
        </ul>
        <p>
          多租户数据严格隔离：您的业务数据（联系人、营销活动、邮件记录等）仅在您的租户范围内可见，其他租户无法访问。
        </p>

        <h2>四、数据安全</h2>
        <p>我们采用多层次的安全措施保护您的个人信息：</p>
        <ul>
          <li><strong>传输加密</strong>：所有数据传输使用 TLS 1.3 加密协议。</li>
          <li><strong>存储加密</strong>：敏感数据使用 AES-256 加密存储。</li>
          <li><strong>访问控制</strong>：实施 RBAC 角色权限管理，最小权限原则。</li>
          <li><strong>安全认证</strong>：支持双因素认证（2FA），增强账户安全。</li>
          <li><strong>审计日志</strong>：记录关键操作，便于安全审计和事件追溯。</li>
          <li><strong>定期审计</strong>：通过 SOC 2 Type II 和 ISO 27001 认证，定期进行第三方安全审计。</li>
          <li><strong>应急响应</strong>：建立安全事件响应机制，及时处置安全事件并通知受影响用户。</li>
        </ul>
        <p>
          尽管我们采取了上述安全措施，但请理解互联网传输不可能完全安全。我们将尽最大努力保护您的个人信息，但无法保证其绝对安全。
        </p>

        <h2>五、Cookie 使用</h2>
        <p>我们使用 Cookie 和类似技术来：</p>
        <ul>
          <li><strong>必要性 Cookie</strong>：维持用户登录状态、保障平台安全（如 auth-token）。</li>
          <li><strong>功能性 Cookie</strong>：记住您的偏好设置（如语言、主题等）。</li>
          <li><strong>分析性 Cookie</strong>：收集匿名使用数据，帮助我们了解用户如何使用平台并改进服务。</li>
        </ul>
        <p>
          您可以通过浏览器设置管理或拒绝 Cookie。但请注意，禁用必要性 Cookie 可能影响平台的正常使用。
        </p>

        <h2>六、数据保留</h2>
        <p>
          我们在为您提供服务期间及此后合理期限内保留您的个人信息。具体保留期限取决于信息类型、法律要求和业务需要。当信息不再需要时，我们将安全地删除或匿名化处理。
        </p>
        <ul>
          <li><strong>账户信息</strong>：账户存续期间及终止后 30 天。</li>
          <li><strong>业务数据</strong>：您可通过平台自行删除；账户终止后 90 天内清除。</li>
          <li><strong>日志数据</strong>：保留 12 个月后自动清除。</li>
          <li><strong>审计日志</strong>：保留 24 个月，用于安全审计和合规要求。</li>
        </ul>

        <h2>七、用户权利</h2>
        <p>您对您的个人信息享有以下权利：</p>
        <ul>
          <li><strong>访问权</strong>：您有权了解我们持有的您的个人信息。</li>
          <li><strong>更正权</strong>：您有权要求更正不准确或不完整的个人信息。</li>
          <li><strong>删除权</strong>：您有权要求删除您的个人信息（在法律允许的范围内）。</li>
          <li><strong>导出权</strong>：您有权以结构化、通用的格式导出您的业务数据。</li>
          <li><strong>撤回同意</strong>：在基于同意处理信息的情况下，您有权随时撤回同意。</li>
          <li><strong>限制处理</strong>：在特定情况下，您有权要求限制对您信息的处理。</li>
        </ul>
        <p>
          如需行使上述权利，请通过本政策末尾的联系方式与我们联系。我们将在 15 个工作日内响应您的请求。
        </p>

        <h2>八、未成年人保护</h2>
        <p>
          本平台不面向 16 周岁以下的未成年人提供服务。如果我们发现已收集了未成年人的个人信息，我们将尽快删除相关数据。
        </p>

        <h2>九、跨境数据传输</h2>
        <p>
          您的信息可能会被传输至您所在国家/地区以外的服务器进行存储和处理。我们将确保此类传输符合适用的数据保护法律，并采取适当的保护措施。
        </p>

        <h2>十、隐私政策更新</h2>
        <p>
          我们可能会不时更新本隐私政策。更新后的政策将在平台上公布，并注明最新修订日期。重大变更时，我们将通过平台通知或电子邮件的方式告知您。
        </p>

        <h2>十一、联系方式</h2>
        <p>如您对本隐私政策有任何疑问、意见或建议，请通过以下方式联系我们：</p>
        <ul>
          <li><strong>邮箱</strong>：privacy@outreachhub.com</li>
          <li><strong>电话</strong>：400-888-6688</li>
          <li><strong>地址</strong>：深圳市南山区科技园南区 W1-B 栋 5F</li>
          <li><strong>数据保护负责人</strong>：dpo@outreachhub.com</li>
        </ul>

        <hr />
        <p className="text-sm text-gray-500">
          <Link href="/" className="text-primary hover:underline">{t('privacy.backToHome')}</Link>
          {' | '}
          <Link href="/terms" className="text-primary hover:underline">{t('privacy.termsLink')}</Link>
        </p>
      </main>
    </div>
  )
}
