import React, { useEffect, useState } from "react";
import { Card, Row, Col, Typography, Space, Skeleton, Tag, Empty, Divider, Button } from "antd";
import {
  DatabaseOutlined,
  MessageOutlined,
  ApiOutlined,
  HistoryOutlined,
  CheckSquareOutlined,
  PlusOutlined,
  SearchOutlined,
  RobotOutlined,
  RightOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { apiFetch } from "../api";
import { COLORS } from "../theme";

/* ── 类型定义 ──────────────────────── */

interface AgentItem {
  name: string;
  display_name: string;
  category: string;
  installed: boolean;
  memory_status: string;
}

interface SessionItem {
  date: string;
  path: string;
  session_count: number;
  tags: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  agent: string;
  created_at: string;
}

interface AgentsData {
  builtin?: AgentItem[];
  custom?: AgentItem[];
  detected?: AgentItem[];
}

/* ── 工具 ──────────────────────────── */

const navigateTo = (hash: string) => { location.hash = hash; };

/* ── 独立数据加载 hook ─────────────── */

function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (url === null) { setLoading(false); return; }
    let cancel = false;
    setLoading(true);
    setError(null);
    apiFetch<T>(url)
      .then((d) => { if (!cancel) setData(d); })
      .catch((e) => { if (!cancel) setError(e.message || "加载失败"); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [url]);

  return { data, loading, error };
}

/* ── 子模块 ────────────────────────── */

function ActiveAgents({ agents }: { agents: AgentsData | null }) {
  const all = [
    ...(agents?.builtin || []),
    ...(agents?.custom || []),
    ...(agents?.detected || []),
  ].filter((a) => a.installed);

  if (all.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<span style={{ color: COLORS.text.tertiary, fontSize: 13 }}>暂无已安装的 Agent</span>}
      />
    );
  }

  return (
    <Row gutter={[12, 12]}>
      {all.slice(0, 8).map((a) => (
        <Col xs={12} sm={8} md={6} key={a.name}>
          <Card
            size="small"
            hoverable
            onClick={() => navigateTo(`agents`)}
            styles={{ body: { padding: "12px 14px" } }}
            style={{ background: COLORS.bg.card, borderColor: COLORS.border.default }}
          >
            <Space size={8}>
              <RobotOutlined style={{ color: COLORS.accent.blue, fontSize: 16 }} />
              <div style={{ minWidth: 0 }}>
                <Typography.Text
                  style={{ color: COLORS.text.primary, fontSize: 13, display: "block", fontWeight: 500 }}
                  ellipsis
                >
                  {a.display_name || a.name}
                </Typography.Text>
                <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 11 }}>
                  {a.category || "agent"}
                </Typography.Text>
              </div>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function RecentSessions({ sessions }: { sessions: SessionItem[] | null }) {
  if (!sessions || sessions.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<span style={{ color: COLORS.text.tertiary, fontSize: 13 }}>暂无会话记录</span>}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {sessions.slice(0, 5).map((s) => (
        <div
          key={s.date}
          onClick={() => navigateTo(`timeline`)}
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            background: COLORS.bg.card,
            border: `1px solid ${COLORS.border.default}`,
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.border.hover; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border.default; }}
        >
          <Space size={8}>
            <ClockCircleOutlined style={{ color: COLORS.text.tertiary, fontSize: 12 }} />
            <Typography.Text style={{ color: COLORS.text.primary, fontSize: 13, fontWeight: 500 }}>
              {s.date}
            </Typography.Text>
            {s.tags && (
              <Tag style={{ fontSize: 10, lineHeight: "16px", padding: "0 5px", margin: 0 }}>
                {s.tags}
              </Tag>
            )}
            <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 11 }}>
              {s.session_count} 条记录
            </Typography.Text>
          </Space>
        </div>
      ))}
    </div>
  );
}

function TasksByAgent({ tasks }: { tasks: TaskItem[] | null }) {
  if (!tasks || tasks.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<span style={{ color: COLORS.text.tertiary, fontSize: 13 }}>暂无待办任务</span>}
      />
    );
  }

  const grouped: Record<string, TaskItem[]> = {};
  for (const t of tasks) {
    const agent = t.agent || "未分配";
    if (!grouped[agent]) grouped[agent] = [];
    grouped[agent].push(t);
  }

  const statusColor: Record<string, string> = {
    todo: COLORS.accent.orange,
    in_progress: COLORS.accent.blue,
    done: COLORS.accent.green,
    blocked: COLORS.accent.red,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Object.entries(grouped).slice(0, 5).map(([agent, agentTasks]) => (
        <div key={agent} style={{ background: COLORS.bg.card, borderRadius: 8, border: `1px solid ${COLORS.border.default}`, padding: "10px 14px" }}>
          <Space size={6} style={{ marginBottom: 8 }}>
            <RobotOutlined style={{ color: COLORS.accent.purple, fontSize: 13 }} />
            <Typography.Text style={{ color: COLORS.text.primary, fontSize: 13, fontWeight: 500 }}>
              {agent}
            </Typography.Text>
            <Tag style={{ fontSize: 11, lineHeight: "18px", padding: "0 6px", margin: 0 }}>{agentTasks.length}</Tag>
          </Space>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {agentTasks.slice(0, 4).map((t) => (
              <div
                key={t.id}
                onClick={() => navigateTo(`tasks`)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.bg.elevated; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <Space size={6} style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: statusColor[t.status] || COLORS.text.tertiary,
                      flexShrink: 0,
                    }}
                  />
                  <Typography.Text style={{ color: COLORS.text.primary, fontSize: 12.5 }} ellipsis>
                    {t.title}
                  </Typography.Text>
                </Space>
                <Tag
                  style={{
                    fontSize: 10,
                    lineHeight: "16px",
                    padding: "0 5px",
                    margin: 0,
                    flexShrink: 0,
                    color: statusColor[t.status] || COLORS.text.tertiary,
                    borderColor: statusColor[t.status] || COLORS.border.default,
                  }}
                  bordered
                >
                  {t.status === "in_progress" ? "进行中" : t.status}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface QuickNavCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  hash: string;
}

function QuickNavCard({ icon, title, subtitle, color, hash }: QuickNavCardProps) {
  return (
    <Card
      hoverable
      size="small"
      onClick={() => navigateTo(hash)}
      styles={{ body: { padding: "16px 18px" } }}
      style={{ background: COLORS.bg.card, borderColor: COLORS.border.default, height: "100%" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Space size={12}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `${color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color,
            }}
          >
            {icon}
          </div>
          <div>
            <Typography.Text style={{ color: COLORS.text.primary, fontSize: 14, fontWeight: 500, display: "block" }}>
              {title}
            </Typography.Text>
            <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
              {subtitle}
            </Typography.Text>
          </div>
        </Space>
        <RightOutlined style={{ color: COLORS.text.tertiary, fontSize: 12 }} />
      </div>
    </Card>
  );
}

function QuickActions() {
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} sm={8}>
        <Button
          block
          icon={<PlusOutlined />}
          onClick={() => navigateTo("tasks")}
          style={{
            height: 40,
            background: COLORS.bg.card,
            borderColor: COLORS.border.default,
            color: COLORS.text.primary,
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            borderRadius: 8,
          }}
        >
          创建任务
        </Button>
      </Col>
      <Col xs={24} sm={8}>
        <Button
          block
          icon={<SearchOutlined />}
          onClick={() => navigateTo("memories")}
          style={{
            height: 40,
            background: COLORS.bg.card,
            borderColor: COLORS.border.default,
            color: COLORS.text.primary,
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            borderRadius: 8,
          }}
        >
          搜索记忆
        </Button>
      </Col>
      <Col xs={24} sm={8}>
        <Button
          block
          icon={<CheckSquareOutlined />}
          onClick={() => navigateTo("tasks")}
          style={{
            height: 40,
            background: COLORS.bg.card,
            borderColor: COLORS.border.default,
            color: COLORS.text.primary,
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            borderRadius: 8,
          }}
        >
          查看活跃任务
        </Button>
      </Col>
    </Row>
  );
}

/* ── 模块包装（含加载/错误状态） ──── */

interface SectionProps {
  title: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}

function SectionCard({ title, loading, error, children }: SectionProps) {
  return (
    <Card
      title={
        <Typography.Text style={{ color: COLORS.text.primary, fontSize: 14, fontWeight: 600 }}>
          {title}
        </Typography.Text>
      }
      styles={{ header: { borderBottom: `1px solid ${COLORS.border.default}`, paddingBottom: 12 }, body: { padding: "16px 20px" } }}
      style={{ background: COLORS.bg.card, borderColor: COLORS.border.default, borderRadius: 8, marginBottom: 20 }}
    >
      {loading ? (
        <div style={{ padding: "8px 0" }}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      ) : error ? (
        <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 13 }}>
          加载失败：{error}
        </Typography.Text>
      ) : (
        children
      )}
    </Card>
  );
}

/* ── 主组件 ────────────────────────── */

export default function Overview() {
  const { data: agentsData, loading: agentsLoading, error: agentsError } = useFetch<AgentsData>("/api/agents/scan");
  const { data: sessionsData, loading: sessionsLoading, error: sessionsError } = useFetch<{ sessions: SessionItem[] }>("/api/sessions?days=7");
  const { data: tasksData, loading: tasksLoading, error: tasksError } = useFetch<{ tasks: TaskItem[] }>("/api/tasks?status=todo&status=in_progress");

  const allInstalled = [
    ...(agentsData?.builtin || []),
    ...(agentsData?.custom || []),
    ...(agentsData?.detected || []),
  ].filter((a) => a.installed);

  return (
    <div>
      {/* 页面标题 */}
      <Typography.Title level={3} style={{ margin: "0 0 4px 0", color: COLORS.text.primary, fontWeight: 600 }}>
        工作台
      </Typography.Title>
      <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 13, display: "block", marginBottom: 24 }}>
        跟踪 Agent 记忆系统的工作进度
      </Typography.Text>

      {/* 快速操作入口 */}
      <SectionCard title="快速操作" loading={false} error={null}>
        <QuickActions />
      </SectionCard>

      {/* 活跃 Agent */}
      <SectionCard title="活跃 Agent" loading={agentsLoading} error={agentsError}>
        <ActiveAgents agents={agentsData} />
      </SectionCard>

      {/* 最近会话 */}
      <SectionCard title="最近会话" loading={sessionsLoading} error={sessionsError}>
        <RecentSessions sessions={sessionsData?.sessions ?? null} />
      </SectionCard>

      {/* 待办/进行中任务（按 Agent 分组） */}
      <SectionCard title="待办任务" loading={tasksLoading} error={tasksError}>
        <TasksByAgent tasks={tasksData?.tasks ?? null} />
      </SectionCard>

      {/* 快捷导航 */}
      <SectionCard title="快捷导航" loading={false} error={null}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <QuickNavCard
              icon={<DatabaseOutlined />}
              title="记忆"
              subtitle="浏览和搜索所有记忆"
              color={COLORS.accent.blue}
              hash="memories"
            />
          </Col>
          <Col xs={24} sm={12}>
            <QuickNavCard
              icon={<ApiOutlined />}
              title="Agent"
              subtitle="管理已安装的 Agent"
              color={COLORS.accent.purple}
              hash="agents"
            />
          </Col>
          <Col xs={24} sm={12}>
            <QuickNavCard
              icon={<HistoryOutlined />}
              title="时间线"
              subtitle="查看会话历史记录"
              color={COLORS.accent.green}
              hash="timeline"
            />
          </Col>
          <Col xs={24} sm={12}>
            <QuickNavCard
              icon={<CheckSquareOutlined />}
              title="任务"
              subtitle="跟踪工作进度"
              color={COLORS.accent.orange}
              hash="tasks"
            />
          </Col>
        </Row>
      </SectionCard>

      {/* 底部统计 */}
      <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
        <Space size={24} split={<Divider type="vertical" style={{ borderColor: COLORS.border.default }} />}>
          <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
            Agent {allInstalled ? `${allInstalled.length} 个` : "—"}
          </Typography.Text>
          <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
            会话 {sessionsData?.sessions?.length ?? "—"}
          </Typography.Text>
          <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
            任务 {tasksData?.tasks?.length ?? "—"}
          </Typography.Text>
        </Space>
      </div>
    </div>
  );
}
