# SSO 单点登录配置指南（企业版）

> **适用版本**：ENTERPRISE 套餐
> **状态**：基础架构已就绪，需按下方步骤配置 IdP

## 概述

OutreachHub 支持通过 SAML 2.0 或 OIDC（OpenID Connect）协议与企业身份提供商（IdP）集成，实现单点登录。

## 支持的 IdP

| IdP | 协议 | 状态 |
|-----|------|------|
| Azure AD / Entra ID | OIDC / SAML | 支持 |
| Google Workspace | OIDC | 支持 |
| Okta | SAML / OIDC | 支持 |
| OneLogin | SAML | 支持 |
| 自建 IdP | SAML 2.0 | 需评估 |

## 配置步骤（OIDC -- 推荐）

### 1. 在 IdP 端创建应用

1. 登录您的 IdP 管理控制台
2. 创建新的企业应用 / OAuth 2.0 客户端
3. 设置重定向 URI：`https://your-domain.com/api/auth/sso/callback`
4. 记录以下信息：
   - Client ID
   - Client Secret
   - Issuer URL（如 `https://login.microsoftonline.com/{tenant-id}/v2.0`）

### 2. 在 OutreachHub 配置

1. 进入 **Settings -> 安全设置 -> SSO 配置**
2. 选择协议类型：OIDC
3. 填入 IdP 信息：
   - Issuer URL
   - Client ID
   - Client Secret
4. 点击「测试连接」验证配置
5. 启用 SSO

### 3. 用户映射

SSO 用户自动映射规则：
- Email 匹配：IdP 返回的 email 与 OutreachHub 用户 email 一致
- 首次登录：自动创建用户并关联到企业租户
- 角色映射：IdP 的 group/role 属性 -> OutreachHub 角色（可配置）

## 配置步骤（SAML 2.0）

### 1. 在 IdP 端配置

1. 创建 SAML 应用
2. 设置 ACS URL：`https://your-domain.com/api/auth/sso/saml/callback`
3. 设置 Entity ID：`https://your-domain.com`
4. 下载 IdP 元数据 XML 或手动记录：
   - SSO URL
   - Certificate（X.509）

### 2. 在 OutreachHub 配置

1. 进入 **Settings -> 安全设置 -> SSO 配置**
2. 选择协议类型：SAML
3. 上传 IdP 元数据 XML 或手动填写
4. 测试连接 -> 启用

## 环境变量

```env
# SSO（企业版可选）
SSO_ENABLED=false
SSO_PROVIDER=oidc  # oidc | saml
SSO_CLIENT_ID=
SSO_CLIENT_SECRET=
SSO_ISSUER_URL=
SSO_CERTIFICATE=
```

## 常见问题

### Q: SSO 启用后，密码登录还能用吗？
A: 可以。SSO 和密码登录并存，管理员可在安全设置中禁用密码登录（仅允许 SSO）。

### Q: 如何限制只有特定域名的用户可以 SSO 登录？
A: 在 Settings -> 安全设置中配置「允许的邮箱域名」，如 `company.com`。

### Q: SSO 用户的默认角色是什么？
A: 默认为 `USER`。管理员可在 SSO 配置中设置默认角色，或通过 IdP group 映射。

### Q: 支持 SCIM 用户同步吗？
A: 计划中。当前仅支持 JIT（Just-In-Time）用户创建。

## 技术实现

- 协议：OIDC（openid-client）/ SAML（passport-saml）
- 会话：复用现有 JWT cookie 机制
- 企业版验证：`Tenant.plan === 'ENTERPRISE'` 时才允许配置 SSO
- 安全：所有 SSO 通信强制 HTTPS；IdP 证书定期验证

## 联系支持

如需协助配置 SSO，请联系：support@outreachhub.com
