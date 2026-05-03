# Claude Code 记忆组合：基于本地环境的执行计划

> 2026-05-04 · 已检查 f:\AI\memory 本地环境

---

## 一、本地环境现状

```
Claude Code:   v2.1.126           ✅ 已安装，最新版
Node.js:       v22.17.1           ✅
npm:           11.9.0             ✅
Python:        3.13.2             ✅
beads (bd):    v1.0.3             ✅ 已全局安装（npm）
beads init:    未初始化            ❌ 未在当前项目跑 bd init
claude-mem:    未安装              ❌
mem0:          未安装              ❌
Go:            未安装              ❌
Bun:           未安装              ❌
插件:                             空
MCP 配置:                          不存在
平台:         Windows 10          🟡
```

---

## 二、关键约束

### beads：唯一已经就绪的头部项目

beads `v1.0.3` 已通过 `npm install -g @beads/bd` 安装成功，直接可用。Windows 兼容。

### claude-mem：Windows 上有已知问题

claude-mem 需要 Bun 运行时（本地未安装），且 Issue #2131 报告了 Windows 上 Hook 失败的问题：
> "All hooks fail — missing 'shell': 'bash' in hooks.json"

Windows 上需要额外配置 shell 路径。而且 worker 服务依赖端口 37777，防火墙可能拦截。

### mem0：需 Python pip 安装

Python 3.13.2 已就绪，`pip install mem0ai + mem0-mcp-server` 即可。但需要注册 API key（有免费层）。

---

## 三、三步执行计划

### Step 1：初始化 beads（5 分钟）

beads 是当前唯一已经装好的头部项目。先把它跑起来。

```bash
cd f:\AI\memory
bd init                    # 初始化 beads 数据库（创建 .beads/ 目录）
bd create "项目调研完成" -p 0   # 创建第一个任务
bd create "产品设计文档" -p 0    # 创建第二个任务
bd dep add bd-xxxx bd-yyyy  # 建立依赖关系
bd ready                   # 查看待办队列
```

beads 的 Compaction 机制会自动摘要已关闭的任务，释放上下文窗口。这是"不堆窗口，建索引"的直接体现。

### Step 2：安装 claude-mem（15 分钟）

claude-mem 是 71.4k ⭐ 的 Claude Code 专属记忆方案。Windows 需要额外处理。

```bash
# 安装 Bun 运行时（claude-mem 依赖）
# https://bun.sh 下载安装

# 安装 claude-mem
npx claude-mem install

# Windows 修复：编辑 hooks.json 确保 shell 路径正确
# 参考 github.com/thedotmack/claude-mem/issues/2131
```

安装后 claude-mem 会自动：
- 通过 5 个 lifecycle Hook 捕获每次工具调用
- 用 AI 压缩后存入 SQLite + Chroma
- 下次会话自动注入相关上下文

注意：claude-mem 的 production-guide 提到每天增长约 120 条 observation、0.8 MB SQLite、4 MB Chroma。三个月后大约是 72 MB + 360 MB，SSD 无压力。

### Step 3：安装 mem0（10 分钟）

mem0 负责跨会话用户画像——记住你的编码偏好。

```bash
pip3 install mem0ai mem0-mcp-server

# 注册 API key（免费层 10K memories + 1K retrievals/月）
# 访问 app.mem0.ai → 获取 API key

# 配置 MCP
export MEM0_API_KEY=m0-your-key-here
```

在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "mem0": {
      "command": "path\\to\\mem0-mcp-server.exe",
      "args": [],
      "env": {
        "MEM0_API_KEY": "${MEM0_API_KEY}",
        "MEM0_DEFAULT_USER_ID": "default"
      }
    }
  }
}
```

然后验证 MCP 连接：在 Claude Code 中 `/mcp` 应看到 mem0 的 tools。

之后可以直接说"记住我用 2 空格缩进"或"记住这个项目用 PostgreSQL"——mem0 会自动存入并在相关会话中检索。

---

## 四、分层职责矩阵

```
                    claude-mem          mem0              beads
                    (71.4k ⭐)         (54.7k ⭐)        (23k ⭐)
                    ──────────         ─────────         ────────
管什么               会话级记忆          跨会话用户画像      版本化任务追踪
存储                  SQLite+Chroma     向量数据库          Dolt（版本化 SQL）
触发方式              Hook 自动捕获      MCP 工具调用       CLI 命令
Windows              有已知问题 ✅      无需处理 ✅        已安装 ✅
当前状态              ❌ 未安装           ❌ 未安装           ✅ v1.0.3
```

**不需要装的东西**：
- **Go** — beads 通过 npm 安装，不需要 Go 编译器
- **其他 MCP 服务** — claude-mem 和 mem0 覆盖了会话和画像两个核心维度
- **total-recall / auto-memory** — claude-mem 的自动捕获能力更强（向量检索 vs 纯关键词）

---

## 五、时间线与收益

| 时间 | 动作 | 收益 |
|---|---|---|
| **今天 5 分钟** | `bd init` + 创建 3 个任务 | 版本化任务图就位，任意历史状态可回溯 |
| **今天 15 分钟** | 装 claude-mem + Bun | 每次会话不再失忆，过去决策自动注入 |
| **今天 10 分钟** | 装 mem0 + MCP 配置 | 编码偏好跨会话记忆，减少重复交代 |
| **一周后** | 评估 claude-mem 的 observation 增长 | 按 production-guide 的指标做健康检查 |
| **产品发布时** | `npx @agent-memory/init` 一键预装三件套 | 用户 5 分钟拥有完整记忆栈 |

**安装总用时：约 30 分钟。**
**每日 token 节省：claude-mem 约 10 倍 + mem0 约 90%。**
