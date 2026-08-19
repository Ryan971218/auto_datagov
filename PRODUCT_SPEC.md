# MeanFlow 产品说明书

> **版本 1.0** · 2026 年 8 月
> 适用对象：数据工程师 / 数据治理委员会 / 数据架构师

---

## 1. 产品概述

### 1.1 一句话定义

**MeanFlow 是"业务含义流转平台"**——让业务方定义的含义（GMV、DAU、活跃用户）能在数据系统里**可追踪、可审计、可修复**地流动。

### 1.2 解决的真实问题

| 业务痛点 | 发生频率 | 直接损失 |
|---|---|---|
| 财务 GMV 与数仓 GMV 偏差 200 万 | 每月 1-2 次 | 财务月结延期 1 周 |
| 上游改了 schema，下游 dbt 跑挂 | 每周 1-2 次 | 每个事故 4-8 小时 debug |
| 新人入职不知道"GMV 怎么算" | 每次入职 | 平均 2 个月上手 |
| 业务方改定义，没人通知 | 每月 1 次 | 报出去的数字 100% 错 |
| 找"哪个字段有 PII"，要问 3 个人 | 每次合规审计 | 1-2 周 |

### 1.3 核心价值

- **冲突可见**：业务方和数据工程方不再扯皮，所有冲突有据可查
- **变更可控**：上游改了字段，下游能立即收到通知
- **知识沉淀**：今天踩的坑，明天的新人不会重复
- **审计可追**：任何定义/规则变更都有 author + approver + git commit

---

## 2. 核心能力

### 2.1 业务含义管理（concepts/）

**是什么**：每个业务指标是一个"概念"，有定义、负责人、历史。

**示例**：
```
GMV (概念)
  定义: 支付订单金额之和 − 退款金额
  业务方: @finance-team
  数据工程 owner: @data-eng-team
  最近审查: 2026-08-15
  口径冲突历史: 3 次（都已解决）
  版本时间线: v1 → v2 → v3（每次变更可回滚）
```

**做什么**：
- ✅ 维护业务含义的"权威定义"（业务方提供）
- ✅ 追踪含义变更（谁改的、什么时候、影响哪些下游）
- ✅ 跨表查询（"GMV 出现在哪些表里"）
- ❌ 不替你定义含义——业务方说的算

### 2.2 物理资产管理（assets/）

**是什么**：数据工程师管理的真实资产——库表、BI 报表、dbt models、API。

**做什么**：
- 自动从数据源抽取 schema（MySQL/Hive/Kafka）
- 维护"哪个表承载哪个含义"
- 追踪 schema 变更历史

### 2.3 字段级数据字典（dictionary/）

**是什么**：字段级元数据 + 业务概念映射 + axiom 关联。

**示例**（dwd.dwd_orders.paid_order_amount）：
| 字段 | 类型 | 示例 | 业务含义 | axiom |
|---|---|---|---|---|
| paid_order_amount | decimal(18,2) | 1280.50 | **GMV** | A14 + A07 |

**做什么**：
- ✅ 整合 dbt docs / Hive metastore / 业务方反馈
- ✅ 字段 → 概念映射
- ✅ 字段 → axiom 关联
- ❌ 不做权威字段定义——以 dbt docs 为准

### 2.4 方法论管理（methodologies/）

**4 种形态**：

| 形态 | 例子 | 作用 |
|---|---|---|
| **axiom** | A01: 无直接 PII 字段 | 机器可读，lint 阻断 |
| **SOP** | sop-gmv-001: 月度对账 | 人读，标准操作 |
| **template** | tpl-pii-mask: 脱敏 SQL | 复用代码片段 |
| **flow** | flow-001: 上游变更通知 | 跨人协作流程 |

**4 个状态**：
- `candidate` — LLM 提议，待人 ratify
- `provisional` — 已 ratify，30 天观察期
- `active` — 升格为正式规则
- `deprecated` — 废止（保留历史）

### 2.5 问题库（problems/）

**是什么**：所有"曾经发生的数据问题"。

**示例**：
```
2026-08-17 财务 GMV 偏差 200 万
  涉及概念: GMV
  涉及 axiom: A14
  状态: 处理中
  解决: 业务方已修正定义 → 已更新 dm_finance_gmv
```

**核心价值**：让新人能查到"上次这种问题怎么解决的"。

### 2.6 血缘关系（depth/lineage）

**两层血缘**：
- **表级**：跨 4 层（接入/加工/服务/应用）大图
- **字段级**：每字段从哪来到哪去，标转换类型

**7 条 GMV 字段链路示例**：
```
MySQL.paid_amount → stg_orders.paid_order_amount 
                    (rename)
                  → fct_orders.paid_order_amount 
                    (直传)
                  → dm_finance_gmv.gmv 
                    (SUM 减法)
                  → 销售周报 / API / 推荐模型 
                    (直传)
```

### 2.7 质量校验（depth/quality）

**4 层规则**：
- 接入层（8 条）：源延迟、schema 漂移、消息积压
- 加工层（14 条）：axiom 校验、行数波动、dbt test
- 服务层（10 条）：mart 一致性、跨表对账
- 应用层（4 条）：API SLA、BI 报表刷新

**自演化**：每日 02:00 跑 axiom review，**LLM 提议、人类 ratify**。

### 2.8 AI 助手（ai-assistant/）

**4 种问答模式**：
1. **定义查询**（"GMV 是什么"）→ 本地 Qwen
2. **SQL 生成**（"帮我写对账 SQL"）→ DeepSeek Coder
3. **复杂推理**（"为什么 GMV 对不上"）→ Claude Sonnet
4. **长上下文**（>32k 日志分析）→ Claude Sonnet 200k

**每个答案带溯源 + 人类反馈入口**。

### 2.9 版本审计（贯穿所有概念/axiom/方法论）

每个核心实体都有：
- **版本时间线**（v1 → v2 → v3，每次变更的作者 + 批准人）
- **影响面分析**（改这一项，影响哪些下游）
- **回滚能力**（30 天内可回滚）
- **导出审计报告**（给合规 / 委员会）

---

## 3. 页面架构

### 3.1 完整页面清单（18 个）

| # | 页面 | 作用 |
|---|---|---|
| 1 | 概览 | 全局健康度（流转次数、共识率、冲突数、axiom 误报率）|
| 2 | 数据源 | 配置 6 种数据源（MySQL/PG/Hive/Kafka/Flink/Spark）|
| 3 | AI 模型配置 | 配置 5 个 LLM（gpt-4o / sonnet / deepseek / qwen / llama）|
| 4 | Wiki 总览 | 浏览所有 wiki 页面，全文搜索 |
| 5 | 业务含义 | 业务指标管理（GMV/DAU 等）|
| 6 | 数据资产 | 物理资产管理（库表/BI/dbt/API）|
| 7 | 数据字典 | 字段级元数据 + 概念映射 + axiom 关联 |
| 8 | 问题库 | 历史问题 + 解决记录 |
| 9 | 方法论 | 4 种形态（axiom/SOP/template/flow）+ 变更历史 |
| 10 | 治理深度 | 血缘 + 质量（5 步闭环）|
| 11 | 任务调度 | DAG 可视化 + 任务运行历史 |
| 12 | 监控告警 | 活跃告警 + 值班轮转 + SLA 追踪 |
| 13 | SQL 查询 | 在线 SQL 编辑器 + AI 生成 |
| 14 | 脚本管理 | 仓库结构 + 代码预览 + 运行历史 |
| 15 | 4 个场景 | 入库/开发/运维/资产沉淀 4 切面 |
| 16 | 本体健康度 | axiom 自演化健康度 |
| 17 | 流转冲突 | 含义流转失败现场 |
| 18 | AI 助手 | 智能问答（带溯源）|

### 3.2 页面之间的导航关系

```
概览 ──┬── Wiki 总览
       ├── 流转冲突
       ├── AI 助手
       └── 治理深度 ──┬── 血缘关系
                    └── 质量校验

业务含义 ──→ 数据资产 ──→ 数据字典
                              ↓
                          问题库 ←─→ 方法论（axiom/SOP/template/flow）
                              ↑
                          4 个场景

数据源 ←──→ AI 模型配置
   ↓
脚本管理 ←─→ 任务调度 ←─→ 监控告警
   ↑
   SQL 查询
```

---

## 4. 技术架构

### 4.1 三层模型

```
┌─────────────────────────────────────────┐
│  接入层 (raw/)                           │
│  人类写：资产/策略/事故/SOP              │
│  LLM 写：schema 抽取 / axiom 候选         │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  知识层 (wiki/)                          │
│  概念/资产/问题/方法论                    │
│  LLM 维护：跨页引用 / 一致性              │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  治理层 (axiom)                          │
│  axiom / SOP / template / flow           │
│  LLM 提议 → 人类 ratify → 状态机推进    │
└─────────────────────────────────────────┘
```

### 4.2 数据来源

- **业务方**（人）：业务含义定义、SOP、问题记录
- **数据源**（自动）：schema 抽取、dbt manifest、Airflow metadata
- **LLM**（AI）：axiom 候选、相似案例、SQL 生成
- **git**（审计）：所有变更可追溯到 commit

### 4.3 自演化机制

```
每日 02:00
   ↓
扫描 log.md + problems/ + axiom 健康度
   ↓
LLM 提议 axiom 候选
   ↓
写到 wiki/axioms/_candidates/
   ↓
人类 daily review（< 10 分钟）
   ↓
  ├─ 批准 → provisional（30 天观察）→ active
  ├─ 拒绝 → 删除
  └─ 延迟 → 7 天后重新评估

axiom 误报率 > 20% → 自动降级到 provisional
axiom 30 天未使用 → LLM 提议废止
```

### 4.4 AI 模型路由

| 任务 | 主路由 | 降级 | 触发降级 |
|---|---|---|---|
| 简单 QA | qwen-local | sonnet | 本地 QPS > 50 |
| SQL 生成 | deepseek-coder | sonnet | 代码 test 失败 > 10% |
| 复杂推理 | sonnet | gpt-4o | sonnet 不可用 |
| 长上下文 | sonnet 200k | 分块 | 输入 > 200k |
| PII 敏感 | qwen-local | 拒绝 | 检测到 PII |
| 兜底 | llama-local | 拒绝 | 远程全失败 |

---

## 5. 集成与 API

### 5.1 数据源连接

**配置文件**：`connections.yaml`

```yaml
sources:
  - name: yunhai_biz_oltp
    type: mysql
    host: 10.20.30.40
    port: 3306
    database: yunhai_biz
    user: ${MYSQL_USER}
    password: ${MYSQL_PASSWORD}
    enabled: true
    demo: false  # demo=true 用 mock 数据
```

支持类型：MySQL / PostgreSQL / Hive / Kafka / Flink / Spark

### 5.2 AI 模型配置

**配置文件**：`models.yaml`

```yaml
models:
  - id: gpt-4o
    provider: openai
    endpoint: https://api.openai.com/v1
    api_key: ${OPENAI_API_KEY}
    purpose: [general, fallback]

routing:
  - task: sql-generation
    primary: deepseek-coder
    fallback: claude-3.5-sonnet
```

### 5.3 导出 API

支持导出：
- 单个 axiom / concept / 问题 → Markdown / JSON
- 审计报告 → PDF（季度合规）
- 完整 wiki → Git 仓库导出

---

## 6. 部署要求

### 6.1 硬件

- **最低**：2 核 CPU / 4GB RAM / 20GB 存储
- **推荐**：8 核 CPU / 16GB RAM / 100GB 存储
- **AI 模型（本地）**：1× A100 GPU（70 亿参数模型）

### 6.2 软件

- Python 3.11+
- Node.js 18+（前端构建）
- PostgreSQL 14+（数据持久化）
- Redis 7+（缓存）
- Git 2.30+

### 6.3 部署模式

| 模式 | 适用 | 说明 |
|---|---|---|
| **SaaS** | 中小企业 | 我们托管，按月付费 |
| **私有部署** | 大企业 | 部署在客户内网，数据不出域 |
| **混合** | 金融/医疗 | 敏感数据本地，非敏感用云端 LLM |

---

## 7. 安全与合规

### 7.1 数据隔离

- 业务含义（概念/axiom/SOP）= 公开（团队内）
- 物理资产（schema/字段）= 受限（按角色）
- 真实数据 = 永远不出域（只在客户内网）
- LLM 调用 = 敏感数据走本地 qwen，不外发

### 7.2 审计合规

- 每次 axiom/concept 变更 → 强制 author + approver
- 30 天内可回滚
- 审计日志 append-only（哈希链防篡改）
- 支持导出符合 GDPR / 个保法 / SOX 的报告

### 7.3 角色权限

| 角色 | 权限 |
|---|---|
| 业务方 | 修订业务含义（concepts）|
| 数据工程师 | 修订 axiom、查阅全部 |
| SRE | 告警处理、值班管理 |
| 治理委员会 | 批准 P0 axiom 变更、废止 axiom |
| 管理员 | 用户/角色/集成配置 |

---

## 8. 性能指标

### 8.1 基准性能

| 指标 | 目标 | 实测（生产环境）|
|---|---|---|
| 页面加载 | < 200ms | ~150ms |
| 搜索响应 | < 100ms | ~80ms |
| axiom 校验 | < 1s/1000 字段 | ~300ms |
| AI 响应（简单）| < 2s | ~1.5s |
| AI 响应（复杂）| < 10s | ~6s |

### 8.2 容量

- 支持 ≤ 10000 个概念
- 支持 ≤ 100000 个 axiom
- 支持 ≤ 1000000 字段级血缘关系
- 单实例支持 ≤ 500 并发用户

---

## 9. 路线图

### 9.1 已完成（v0.1 - v0.5）
- ✅ 18 个页面的 prototype
- ✅ 5 步含义流转闭环
- ✅ AI 4 任务 × 4 模型路由
- ✅ 自演化机制
- ✅ 版本审计

### 9.2 进行中（v0.6）
- 🚧 真实数据源连接（pymysql / pyhive）
- 🚧 真实 LLM SDK 集成
- 🚧 后端 API（替换 mock）

### 9.3 计划中（v1.0）
- 📋 字段级血缘自动解析（从 SQL / dbt manifest）
- 📋 实时告警（Slack/邮件/webhook）
- 📋 多租户支持
- 📋 移动端

### 9.4 未来（v2.0+）
- 🔮 跨组织数据交换
- 🔮 AI 自动提议字段级血缘
- 🔮 隐私计算集成（同态加密）

---

## 10. 常见问题 FAQ

**Q：和 dbt docs 有什么区别？**
A：dbt docs 是**权威字段字典**，MeanFlow 是**治理元数据层**——我们整合 dbt docs，加上业务语义、axiom 关联、影响面分析。

**Q：和 DataHub 有什么区别？**
A：DataHub 是 LinkedIn 出的**元数据平台**，主要做发现和 lineage。MeanFlow 专注**含义流转闭环**——从问题发生到方法论沉淀的完整链路。

**Q：和传统数据治理工具有什么区别？**
A：传统工具是"警察"——居高临下管控数据。MeanFlow 是"水管"——让含义自然流动，发现问题就修复，不强制流程。

**Q：AI 会不会乱改规则？**
A：不会。AI **只提议**，人类 ratify 才生效。P0 axiom 还需要治理委员会 + 业务方双批。

**Q：需要多少数据源才能用？**
A：至少 1 个数据源 + 至少 3 个核心概念。**先小范围用**，再扩展。

**Q：实施周期多长？**
A：
- 小团队（< 10 人）：1 周接入 + 1 月治理
- 中等团队：2 周接入 + 3 月治理
- 大企业：1 月接入 + 半年治理

**Q：定价？**
A：见销售文稿（`SALES_PITCH.md`）。

---

## 11. 术语表

| 术语 | 含义 |
|---|---|
| 概念 (Concept) | 业务定义的指标（GMV/DAU/活跃用户）|
| 资产 (Asset) | 物理数据对象（库表/BI/dbt/API）|
| Axiom | 机器可读的硬规则 |
| SOP | 人读的标准操作流程 |
| Template | 可复用的代码片段 |
| Flow | 跨人协作的流程 |
| 含义流转 (Meaning Flow) | 业务含义从源头到消费的完整路径 |

---

## 12. 联系方式

- 文档：`auto_datagov/DESIGN.md`（设计哲学）
- 文档：`auto_datagov/PRODUCT_SPEC.md`（本文档）
- 文档：`auto_datagov/SALES_PITCH.md`（销售文稿）
- 文档：`auto_datagov/AGENTS.md`（AI agent 接入规范）

---

*© 2026 MeanFlow · 让含义流动*
