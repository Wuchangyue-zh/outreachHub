'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Tag,
  DollarSign,
  RefreshCw,
  X,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  category: string | null
  price: number | null
  currency: string
  imageUrl: string | null
  websiteUrl: string | null
  features: string[]
  tags: string[]
  isActive: boolean
  createdAt: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    currency: 'USD',
    imageUrl: '',
    websiteUrl: '',
    features: '',
    tags: '',
  })

  // 加载产品列表
  const loadProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      if (data.success) {
        setProducts(data.data.products)
      }
    } catch (error) {
      toast.error('加载产品失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [searchQuery])

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      currency: 'USD',
      imageUrl: '',
      websiteUrl: '',
      features: '',
      tags: '',
    })
    setEditingProduct(null)
    setShowAddForm(false)
  }

  // 开始编辑
  const startEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      price: product.price?.toString() || '',
      currency: product.currency,
      imageUrl: product.imageUrl || '',
      websiteUrl: product.websiteUrl || '',
      features: product.features.join(', '),
      tags: product.tags.join(', '),
    })
    setShowAddForm(true)
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error('请输入产品名称')
      return
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category || null,
      price: formData.price ? parseFloat(formData.price) : null,
      currency: formData.currency,
      imageUrl: formData.imageUrl || null,
      websiteUrl: formData.websiteUrl || null,
      features: formData.features ? formData.features.split(',').map(f => f.trim()).filter(Boolean) : [],
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(editingProduct ? '产品已更新' : '产品已创建')
        resetForm()
        loadProducts()
      } else {
        toast.error(data.error || '操作失败')
      }
    } catch (error) {
      toast.error('操作失败')
    }
  }

  // 删除产品
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个产品吗？')) return

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('产品已删除')
        loadProducts()
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      toast.error('删除失败')
    }
  }

  // 格式化价格
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return '未设置'
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理您的产品和服务，用于邮件营销和拓客
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowAddForm(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            添加产品
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索产品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={loadProducts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 添加/编辑表单 */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingProduct ? '编辑产品' : '添加新产品'}</CardTitle>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">产品名称 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="输入产品名称"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">分类</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="如：SaaS、硬件、服务"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">价格</Label>
                    <div className="flex gap-2">
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                      />
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      >
                        <option value="USD">USD</option>
                        <option value="CNY">CNY</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">产品链接</Label>
                    <Input
                      id="websiteUrl"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">产品描述</Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="描述您的产品..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="features">产品特性（逗号分隔）</Label>
                    <Input
                      id="features"
                      value={formData.features}
                      onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                      placeholder="特性1, 特性2, 特性3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">标签（逗号分隔）</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="标签1, 标签2"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    取消
                  </Button>
                  <Button type="submit">
                    {editingProduct ? '保存修改' : '创建产品'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 产品列表 */}
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">加载中...</p>
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">暂无产品</p>
                <p className="text-xs text-gray-400">点击上方"添加产品"开始创建</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      {product.category && (
                        <Badge className="mt-1 bg-blue-100 text-blue-700">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    {product.price !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {formatPrice(product.price, product.currency)}
                        </span>
                      </div>
                    )}

                    {product.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="h-4 w-4 text-gray-400" />
                        {product.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {product.tags.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{product.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {product.websiteUrl && (
                      <a
                        href={product.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        访问产品页
                      </a>
                    )}
                  </div>

                  {product.features.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-gray-500 mb-2">产品特性</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {product.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-green-500">✓</span>
                            {feature}
                          </li>
                        ))}
                        {product.features.length > 3 && (
                          <li className="text-gray-400">
                            +{product.features.length - 3} 更多特性
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
