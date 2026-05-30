---
title: "多 Agent 协作分析工作流"
date: 2026-05-30
tags:
  - Hermes Agent
  - 工具
  - AI
  - 工作流
description: 使用 Hermes Agent 的 Kanban 编排功能，实现 reasoner + coder 多模型协作分析工程代码的全流程。
---

# 多 Agent 协作分析工作流

## 背景

之前写了两篇工程分析——RoboWalker 步兵机器人和 IMU 九轴姿态解算——但过程有个问题：全是我用默认模型做的，没有发挥出配置好的多 profile 优势。

后来配了两个 profile：

| Profile | 模型 | 角色 |
|---------|------|------|
| reasoner | deepseek-v4-pro | 深度分析、需求、架构 |
| coder | deepseek-v4-flash | 编码实现、格式验证 |

于是想到用 Kanban 编排，让不同模型各司其职。

## 工作流设计

```
T1 [reasoner]  ↔  v4-pro ── 深度分析源码 ──── 写分析文档
      │ (自动依赖提升)
T2 [coder]     ↔  v4-flash ── 格式验证 ────── 报告完成
```

关键点：

1. **T1 分配给 reasoner**：用 v4-pro 做深度代码阅读和分析
2. **T2 分配给 coder**：用 v4-flash 做快速格式验证
3. **依赖链接**：T2 设置 `--parent T1_ID`，T1 完成后自动从 todo 升为 ready
4. **调度器**：网关内的 dispatcher 自动 pick up 任务，无需手动干预

## 实际操作

### 创建 Kanban 板

```bash
hermes kanban init
```

### 创建任务

```bash
# T1：reasoner 分析
T1=$(hermes kanban create \
  "深度分析 某工程" \
  --assignee reasoner \
  --body "分析内容..." \
  --workspace "dir:/path/to/project" \
  --max-runtime 15m --json | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# T2：coder 验证，依赖 T1
hermes kanban create \
  "验证分析文档" \
  --assignee coder \
  --parent "$T1" \
  --body "验证文件完整性" \
  --workspace "dir:/path/to/project" \
  --max-runtime 3m
```

### 触发调度

```bash
hermes kanban dispatch
```

### 监控进度

```bash
hermes kanban list
hermes kanban show <task_id>
```

## 实际效果对比

| 项目 | 分析用时 | 文档大小 | 分析深度 |
|------|---------|---------|---------|
| RoboWalker (flash 一次过) | ~1min | 35KB | 读了部分源码 |
| RoboWalker (v4-pro 走 Kanban) | ~11min | 39KB | 读了全部68个源文件 |
| IMU_9_DSX (v4-pro) | ~10.5min | 33KB | 全部15个源文件 + 文档 |

## 学到的经验

1. **pro 模型确实更慢但更深**：读源码更彻底，分析更系统
2. **flash 做验证恰到好处**：几十秒检查完，不会因为模型不够强而误判
3. **workspace 很重要**：给子 agent 指定绝对路径的工作目录，它才知道文件往哪写
4. **max-runtime 要合理**：代码量大的给 15m，小的 5m 足够
5. **这个流程可以复用**：已经保存为 skill `kanban-project-analysis`，一句话就能触发

## 总结

用 Kanban 做多 Agent 协作的关键不是技术复杂度，而是**合理分工**——让擅长深度思考的模型做分析，让速度快但不失准确的模型做验证。两者配合，效果比单一模型好得多。
