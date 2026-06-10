'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { EmailNode } from './EmailNode'
import { WaitNode } from './WaitNode'
import { ConditionNode } from './ConditionNode'
import { useCampaignWizardStore, type SequenceStep } from '@/store/campaign-wizard-store'
import { createStepId, type ConditionType } from '@/lib/sequence-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Mail, Clock, GitBranch } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

type ConditionTypeLocal = ConditionType

interface ExtendedSequenceStep extends SequenceStep {
  id: string
  type: 'email' | 'wait' | 'condition'
  conditionType?: ConditionTypeLocal
  lookbackHours?: number
  branches?: { true: string; false: string }
}

const nodeTypes = {
  email: EmailNode,
  wait: WaitNode,
  condition: ConditionNode,
}

/**
 * 将序列步骤转换为 ReactFlow 节点和边
 */
function stepsToFlow(steps: ExtendedSequenceStep[], t: (key: string) => string) {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const Y_GAP = 160
  const X_GAP = 200

  // 计算节点位置：线性排列，condition 分支左右分叉
  const positions = new Map<string, { x: number; y: number }>()
  let currentY = 0

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    let x = 0
    const y = currentY

    if (step.type === 'condition' && i > 0) {
      x = 0 // condition 居中
    }

    positions.set(step.id, { x, y })

    if (step.type === 'condition') {
      currentY += Y_GAP * 1.5 // condition 节点多留空间
    } else {
      currentY += Y_GAP
    }
  }

  // 第二遍：为 condition 分支的 true/false 目标调整位置
  for (const step of steps) {
    if (step.type === 'condition' && step.branches) {
      const condPos = positions.get(step.id)
      if (!condPos) continue

      const trueTarget = steps.find((s) => s.id === step.branches!.true)
      const falseTarget = steps.find((s) => s.id === step.branches!.false)

      if (trueTarget) {
        const pos = positions.get(trueTarget.id)
        if (pos) positions.set(trueTarget.id, { ...pos, x: condPos.x - X_GAP })
      }
      if (falseTarget) {
        const pos = positions.get(falseTarget.id)
        if (pos) positions.set(falseTarget.id, { ...pos, x: condPos.x + X_GAP })
      }
    }
  }

  // 生成节点
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const pos = positions.get(step.id) || { x: 0, y: i * Y_GAP }

    let nodeType = step.type
    let nodeData: Record<string, unknown>

    if (step.type === 'email') {
      nodeData = {
        subject: step.subject,
        content: step.content,
        stepIndex: i,
      }
    } else if (step.type === 'wait') {
      nodeData = {
        delayHours: step.delayHours || 24,
      }
    } else {
      // condition
      nodeData = {
        conditionType: step.conditionType || 'opened',
        lookbackHours: step.lookbackHours || 72,
      }
    }

    nodes.push({
      id: step.id,
      type: nodeType,
      position: pos,
      data: nodeData,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    })
  }

  // 生成边
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    if (step.type === 'condition' && step.branches) {
      // condition → true 分支
      if (step.branches.true) {
        edges.push({
          id: `${step.id}-true-${step.branches.true}`,
          source: step.id,
          target: step.branches.true,
          sourceHandle: 'true',
          label: t('sequenceBuilder.condition.yes'),
          animated: true,
          style: { stroke: '#22c55e' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
        })
      }
      // condition → false 分支
      if (step.branches.false) {
        edges.push({
          id: `${step.id}-false-${step.branches.false}`,
          source: step.id,
          target: step.branches.false,
          sourceHandle: 'false',
          label: t('sequenceBuilder.condition.no'),
          animated: true,
          style: { stroke: '#f87171' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f87171' },
        })
      }
    } else if (i < steps.length - 1) {
      // 线性连接到下一步
      edges.push({
        id: `${step.id}-${steps[i + 1].id}`,
        source: step.id,
        target: steps[i + 1].id,
        animated: false,
        style: { stroke: '#94a3b8' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      })
    }
  }

  return { nodes, edges }
}

/**
 * 可视化序列编辑器
 * O1b: 基于 @xyflow/react
 * O1c: 支持 Email / Wait / Condition 节点
 */
export function SequenceBuilder() {
  const { sequence, addSequenceStep, removeSequenceStep, updateSequenceStep } =
    useCampaignWizardStore()
  const { t } = useI18n()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    subject: '',
    content: '',
    delayHours: 24,
    conditionType: 'opened' as ConditionType,
    lookbackHours: 72,
  })

  // 将 store 的 sequence 转换为扩展格式
  const extendedSteps: ExtendedSequenceStep[] = useMemo(
    () =>
      sequence.map((step, idx) => ({
        ...step,
        id: step.id || `step-${idx + 1}`,
        type: step.type || 'email',
        conditionType: step.conditionType,
        lookbackHours: step.lookbackHours,
        branches: step.branches,
      })),
    [sequence]
  )

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => stepsToFlow(extendedSteps, t),
    [extendedSteps]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    const { nodes: nextNodes, edges: nextEdges } = stepsToFlow(extendedSteps, t)
    setNodes(nextNodes)
    setEdges(nextEdges)
  }, [extendedSteps, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: false, style: { stroke: '#94a3b8' } }, eds))
    },
    [setEdges]
  )

  const handleAddEmail = () => {
    addSequenceStep()
  }

  const handleAddWait = () => {
    useCampaignWizardStore.setState((s) => ({
      sequence: [
        ...s.sequence,
        {
          id: createStepId(s.sequence),
          type: 'wait',
          subject: '',
          content: '',
          delayHours: 24,
        },
      ],
    }))
  }

  const handleAddCondition = () => {
    useCampaignWizardStore.setState((s) => {
      const condId = createStepId(s.sequence)
      const trueId = createStepId([...s.sequence, { id: condId, subject: '', content: '', delayHours: 0 }])
      const falseId = createStepId([
        ...s.sequence,
        { id: condId, subject: '', content: '', delayHours: 0 },
        { id: trueId, subject: '', content: '', delayHours: 0 },
      ])
      return {
        sequence: [
          ...s.sequence,
          {
            id: condId,
            type: 'condition',
            subject: '',
            content: '',
            delayHours: 0,
            conditionType: 'opened',
            lookbackHours: 72,
            branches: { true: trueId, false: falseId },
          },
          {
            id: trueId,
            type: 'email',
            subject: '',
            content: '',
            delayHours: 0,
          },
          {
            id: falseId,
            type: 'email',
            subject: '',
            content: '',
            delayHours: 0,
          },
        ],
      }
    })
  }

  const handleDelete = useCallback(
    (nodeId: string) => {
      const stepIdx = extendedSteps.findIndex((s) => s.id === nodeId)
      if (stepIdx >= 0) {
        removeSequenceStep(stepIdx)
      }
    },
    [extendedSteps, removeSequenceStep]
  )

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const stepIdx = extendedSteps.findIndex((s) => s.id === node.id)
      if (stepIdx < 0) return

      const step = extendedSteps[stepIdx]
      setEditingStepId(node.id)
      setEditForm({
        subject: step.subject || '',
        content: step.content || '',
        delayHours: step.delayHours || 24,
        conditionType: step.conditionType || 'opened',
        lookbackHours: step.lookbackHours || 72,
      })
      setEditDialogOpen(true)
    },
    [extendedSteps]
  )

  const handleSaveEdit = () => {
    if (!editingStepId) return
    const stepIdx = extendedSteps.findIndex((s) => s.id === editingStepId)
    if (stepIdx < 0) return

    const step = extendedSteps[stepIdx]

    if (step.type === 'email') {
      updateSequenceStep(stepIdx, {
        subject: editForm.subject,
        content: editForm.content,
      })
    } else if (step.type === 'wait') {
      updateSequenceStep(stepIdx, {
        delayHours: editForm.delayHours,
      } as any)
    } else {
      // condition
      useCampaignWizardStore.setState((s) => ({
        sequence: s.sequence.map((st, i) =>
          i === stepIdx
            ? {
                ...st,
                conditionType: editForm.conditionType,
                lookbackHours: editForm.lookbackHours,
              }
            : st
        ),
      }))
    }

    setEditDialogOpen(false)
    setEditingStepId(null)
  }

  // 为 nodes 注入回调
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onDelete: handleDelete,
        },
      })),
    [nodes, handleDelete]
  )

  const editingStep = editingStepId ? extendedSteps.find((s) => s.id === editingStepId) : null

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleAddEmail} className="gap-1">
          <Mail className="h-3 w-3" />
          {t('sequenceBuilder.emailStep')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleAddWait} className="gap-1">
          <Clock className="h-3 w-3" />
          {t('sequenceBuilder.waitNode')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleAddCondition} className="gap-1">
          <GitBranch className="h-3 w-3" />
          {t('sequenceBuilder.conditionBranch')}
        </Button>
      </div>

      {/* ReactFlow 画布 */}
      <div className="h-[500px] rounded-xl border border-gray-200 bg-gray-50">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.5}
          maxZoom={2}
          defaultEdgeOptions={{
            animated: false,
            style: { stroke: '#94a3b8' },
          }}
        >
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              switch (node.type) {
                case 'email':
                  return '#dbeafe'
                case 'wait':
                  return '#fef3c7'
                case 'condition':
                  return '#f3e8ff'
                default:
                  return '#f1f5f9'
              }
            }}
          />
        </ReactFlow>
      </div>

      {/* 提示 */}
      <p className="text-xs text-gray-400">
        {t('sequenceBuilder.hint')}
      </p>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStep?.type === 'email'
                ? t('sequenceBuilder.editEmailStep')
                : editingStep?.type === 'wait'
                ? t('sequenceBuilder.editWaitNode')
                : t('sequenceBuilder.editConditionBranch')}
            </DialogTitle>
          </DialogHeader>

          {editingStep?.type === 'email' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('sequenceBuilder.emailSubject')}</Label>
                <Input
                  value={editForm.subject}
                  onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder={t('sequenceBuilder.emailSubjectPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('sequenceBuilder.emailContent')}</Label>
                <Textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                  rows={6}
                  placeholder={t('sequenceBuilder.emailContentPlaceholder')}
                />
              </div>
            </div>
          )}

          {editingStep?.type === 'wait' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('sequenceBuilder.waitHours')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.delayHours}
                  onChange={(e) => setEditForm((f) => ({ ...f, delayHours: parseInt(e.target.value) || 1 }))}
                />
                <p className="text-xs text-gray-400">
                  {editForm.delayHours >= 24
                    ? t('sequenceBuilder.waitDaysHours', { days: Math.floor(editForm.delayHours / 24), hours: editForm.delayHours % 24 })
                    : t('sequenceBuilder.waitHoursOnly', { hours: editForm.delayHours })}
                </p>
              </div>
            </div>
          )}

          {editingStep?.type === 'condition' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('sequenceBuilder.conditionType')}</Label>
                <Select
                  value={editForm.conditionType}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, conditionType: v as ConditionType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opened">{t('sequenceBuilder.condition.opened')}</SelectItem>
                    <SelectItem value="clicked">{t('sequenceBuilder.condition.clicked')}</SelectItem>
                    <SelectItem value="replied">{t('sequenceBuilder.condition.replied')}</SelectItem>
                    <SelectItem value="not_opened">{t('sequenceBuilder.condition.notOpened')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('sequenceBuilder.lookbackWindow')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.lookbackHours}
                  onChange={(e) => setEditForm((f) => ({ ...f, lookbackHours: parseInt(e.target.value) || 72 }))}
                />
                <p className="text-xs text-gray-400">
                  {t('sequenceBuilder.lookbackHint', { hours: editForm.lookbackHours })}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('sequenceBuilder.cancel')}
            </Button>
            <Button onClick={handleSaveEdit}>{t('sequenceBuilder.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
