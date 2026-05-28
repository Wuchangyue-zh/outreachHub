export type Locale = 'zh' | 'en'

export interface Translations {
  [key: string]: string | Translations
}

const translations: Record<Locale, Translations> = {
  zh: {
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      edit: '编辑',
      create: '创建',
      search: '搜索',
      export: '导出',
      import: '导入',
      loading: '加载中...',
      noData: '暂无数据',
      confirm: '确认',
      back: '返回',
      next: '下一步',
      submit: '提交',
      close: '关闭',
    },
    nav: {
      dashboard: '仪表盘',
      contacts: '客户管理',
      companies: '公司库',
      campaigns: '邮件营销',
      templates: '邮件模板',
      settings: '邮箱设置',
      emailQueue: '队列监控',
      prospecting: '智能拓客',
    },
    auth: {
      login: '登录',
      register: '注册',
      logout: '退出登录',
      email: '邮箱地址',
      password: '密码',
      name: '姓名',
      company: '公司名称',
      loginSuccess: '登录成功',
      registerSuccess: '注册成功',
      welcomeBack: '欢迎回来',
      createAccount: '创建账户',
    },
    dashboard: {
      title: '仪表盘',
      subtitle: '数据总览',
      totalContacts: '总客户数',
      totalCompanies: '公司库',
      emailsSent: '已发送邮件',
      openRate: '邮件打开率',
      replyRate: '回复率',
      campaigns: '营销活动',
    },
    contacts: {
      title: '客户管理',
      subtitle: '管理您的海外客户联系人信息',
      addContact: '添加客户',
      importContacts: '导入',
      exportContacts: '导出',
      searchPlaceholder: '搜索联系人...',
      tableHeaders: {
        info: '客户信息',
        company: '公司',
        email: '邮箱',
        location: '国家/城市',
        tags: '标签',
        status: '状态',
        actions: '操作',
      },
    },
    campaigns: {
      title: '邮件营销',
      subtitle: '创建和管理邮件营销活动',
      createCampaign: '创建活动',
      listView: '列表',
      statsView: '统计',
      abTestView: 'A/B测试',
      status: {
        draft: '草稿',
        running: '进行中',
        completed: '已完成',
        paused: '已暂停',
      },
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      export: 'Export',
      import: 'Import',
      loading: 'Loading...',
      noData: 'No data',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      close: 'Close',
    },
    nav: {
      dashboard: 'Dashboard',
      contacts: 'Contacts',
      companies: 'Companies',
      campaigns: 'Campaigns',
      templates: 'Templates',
      settings: 'Settings',
      emailQueue: 'Email Queue',
      prospecting: 'Prospecting',
    },
    auth: {
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      name: 'Name',
      company: 'Company',
      loginSuccess: 'Login successful',
      registerSuccess: 'Registration successful',
      welcomeBack: 'Welcome back',
      createAccount: 'Create Account',
    },
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview',
      totalContacts: 'Total Contacts',
      totalCompanies: 'Companies',
      emailsSent: 'Emails Sent',
      openRate: 'Open Rate',
      replyRate: 'Reply Rate',
      campaigns: 'Campaigns',
    },
    contacts: {
      title: 'Contacts',
      subtitle: 'Manage your contacts',
      addContact: 'Add Contact',
      importContacts: 'Import',
      exportContacts: 'Export',
      searchPlaceholder: 'Search contacts...',
      tableHeaders: {
        info: 'Contact Info',
        company: 'Company',
        email: 'Email',
        location: 'Location',
        tags: 'Tags',
        status: 'Status',
        actions: 'Actions',
      },
    },
    campaigns: {
      title: 'Campaigns',
      subtitle: 'Create and manage email campaigns',
      createCampaign: 'Create Campaign',
      listView: 'List',
      statsView: 'Stats',
      abTestView: 'A/B Test',
      status: {
        draft: 'Draft',
        running: 'Running',
        completed: 'Completed',
        paused: 'Paused',
      },
    },
  },
}

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return path
    }
  }

  return typeof current === 'string' ? current : path
}

export function t(key: string, locale: Locale = 'zh'): string {
  return getNestedValue(translations[locale], key)
}

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'zh'
  return (localStorage.getItem('locale') as Locale) || 'zh'
}

export function setLocale(locale: Locale) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale)
  }
}
