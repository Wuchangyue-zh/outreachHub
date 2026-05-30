# OutreachHub 生产运维手册

> 部署架构见 [`deployment.md`](deployment.md)，代码规则见 [`CLAUDE.md`](../CLAUDE.md)。

## 1. 数据库备份

### Neon (推荐)

Neon 自动备份（Pro 计划含 PITR）。手动备份：

```bash
# 导出完整数据库
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# 恢复
psql $DATABASE_URL < backup-20260530.sql
```

### Supabase

Supabase 每日自动备份（Pro 计划）。手动：

```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" > backup.sql
```

### 通用 cron 备份脚本

```bash
#!/bin/bash
# scripts/backup-db.sh — 每日 3:00 执行
BACKUP_DIR="/backups/outreachhub"
mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/db-$(date +%Y%m%d%H%M).sql.gz"
# 保留 30 天
find $BACKUP_DIR -name "db-*.sql.gz" -mtime +30 -delete
```

## 2. Redis 运维

### Upstash (推荐)

- 控制台：https://console.upstash.com
- 自动持久化（AOF）
- 监控：`GET /api/email-queue` 查看队列积压

### 自建 Redis

```bash
# 持久化配置（redis.conf）
appendonly yes
appendfsync everysec

# 内存限制
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## 3. 告警建议

### 关键指标

| 指标 | 阈值 | 动作 |
|------|------|------|
| 队列 failed 任务 | > 50 | 检查 SMTP 配置 |
| Email Worker 健康检查 | 连续 3 次失败 | 重启 Worker |
| 数据库连接数 | > 80% pool | 升级连接池 |
| 邮件 bounce rate | > 5% | 检查发信域名信誉 |
| 日发信量 | 接近套餐限额 | 通知用户 |

### Webhook 告警（Slack / 飞书）

```bash
# 队列积压告警（cron 每 5 分钟）
FAILED=$(curl -s http://localhost:3030/api/email-queue | jq '.data.failed')
if [ "$FAILED" -gt 50 ]; then
  curl -X POST "$SLACK_WEBHOOK" -d "{\"text\":\"⚠️ 邮件队列有 ${FAILED} 个失败任务\"}"
fi
```

## 4. 结构化日志

项目使用 `src/lib/logger.ts` 输出 JSON 格式日志：

```json
{"timestamp":"2026-05-30T12:00:00.000Z","level":"info","message":"Campaign launched","campaignId":"clxyz","count":100}
```

生产环境日志采集推荐：
- **Vercel**: 自动采集，可在 Dashboard 查看
- **自建**: Filebeat → Elasticsearch → Kibana
- **SaaS**: Datadog / Betterstack / Axiom

## 5. 水平扩展

```
Web: Vercel 自动扩展
Worker: docker compose up --scale worker=3  （共享同一 Redis 队列）
Redis: Upstash 自动扩展 / 自建 Redis Cluster
DB: Neon Autoscaling / Supabase Pro
```

多 Worker 实例共享同一 BullMQ 队列，自动负载均衡。无需额外配置。
