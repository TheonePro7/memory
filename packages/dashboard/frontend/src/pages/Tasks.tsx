import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Typography, Tag, Select, Card, Row, Col, Modal, Space, Tooltip,
  Button, Input, message, Spin,
} from "antd";
import {
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  InboxOutlined, EyeOutlined, DeleteOutlined, PlusOutlined,
  EditOutlined, LinkOutlined, BugOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { COLORS } from "../theme";
import { apiFetch } from "../api";
import { getCache, setCache, invalidateCache } from "../cache";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  source: string;
  tags: string[];
  events?: { type: string; content: string; created_at: string }[];
  artifacts?: { kind: string; reference: string }[];
  created_at: string;
  updated_at?: string;
}

interface TaskColumnProps {
  status: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  tasks: Task[];
  onStatusChange: (t: Task) => void;
  onView: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onAddBlockerNote?: (t: Task) => void;
  loading?: boolean;
}

const statusMeta: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  todo: { label: "待办", color: COLORS.text.tertiary, icon: <InboxOutlined /> },
  in_progress: { label: "进行中", color: COLORS.accent.blue, icon: <ClockCircleOutlined /> },
  blocked: { label: "阻塞", color: COLORS.accent.red, icon: <ExclamationCircleOutlined /> },
  done: { label: "已完成", color: COLORS.accent.green, icon: <CheckCircleOutlined /> },
};

const statusCycle: Record<string, string> = { todo: "in_progress", in_progress: "done", done: "todo", blocked: "todo" };

const priorityMeta: Record<string, { label: string; color: string }> = {
  high: { label: "高", color: COLORS.accent.red },
  medium: { label: "中", color: COLORS.accent.orange },
  low: { label: "低", color: COLORS.text.tertiary },
};

/* ── 任务卡片组件 ── */
function TaskCard({
  task, onStatusChange, onView, onEdit, onDelete, onAddBlockerNote,
}: {
  task: Task;
  onStatusChange: (t: Task) => void;
  onView: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  onAddBlockerNote?: (t: Task) => void;
}) {
  const beadsRef = useMemo(() => {
    const arts = Array.isArray(task.artifacts) ? task.artifacts : [];
    const tags = Array.isArray(task.tags) ? task.tags : [];
    const art = arts.find((a) => a.kind === "beads_issue");
    if (art) return art.reference;
    const tag = tags.find((t) => t.startsWith("beads-"));
    if (tag) return tag.replace("beads-", "");
    return null;
  }, [task]);

  return (
    <Card
      size="small"
      style={{
        background: COLORS.bg.card,
        border: `1px solid ${COLORS.border.default}`,
        borderRadius: 8,
        marginBottom: 8,
        cursor: "default",
      }}
      styles={{ body: { padding: "12px 14px" } }}
    >
      {/* 标题 — 可点击查看详情 */}
      <div
        onClick={() => onView(task)}
        style={{
          fontSize: 13.5, fontWeight: 500, color: COLORS.text.primary,
          marginBottom: 8, cursor: "pointer", lineHeight: 1.4,
        }}
      >
        {task.title}
      </div>

      {/* 标签行 */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ marginBottom: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
          {task.tags.slice(0, 4).map((t, i) => (
            <Tag key={i} style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>{t}</Tag>
          ))}
        </div>
      )}

      {/* 来源徽标 */}
      <div style={{ marginBottom: 8, display: "flex", gap: 6 }}>
        {beadsRef && (
          <Tag
            icon={<LinkOutlined />}
            style={{
              fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0,
              background: `${COLORS.accent.purple}20`,
              color: COLORS.accent.purple,
              border: `1px solid ${COLORS.accent.purple}40`,
            }}
          >
            beads #{beadsRef}
          </Tag>
        )}
        {task.source === "agent-memory" && !beadsRef && (
          <Tag style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>手动</Tag>
        )}
      </div>

      {/* 底部栏：优先级 + 操作按钮 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Tag color={priorityMeta[task.priority]?.color} style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>
          {priorityMeta[task.priority]?.label || task.priority}
        </Tag>
        <Space size={2}>
          {task.status === "blocked" && onAddBlockerNote && (
            <Tooltip title="添加阻塞原因">
              <Button
                type="text" size="small"
                icon={<BugOutlined style={{ fontSize: 12 }} />}
                onClick={(e) => { e.stopPropagation(); onAddBlockerNote(task); }}
                style={{ color: COLORS.accent.red }}
              />
            </Tooltip>
          )}
          {task.status !== "done" && (
            <Tooltip title={`切换为 ${statusCycle[task.status] ? statusMeta[statusCycle[task.status]]?.label : "待办"}`}>
              <Button
                type="text" size="small"
                icon={<ArrowRightOutlined style={{ fontSize: 12 }} />}
                onClick={(e) => { e.stopPropagation(); onStatusChange(task); }}
                style={{ color: COLORS.text.tertiary }}
              />
            </Tooltip>
          )}
          <Tooltip title="编辑">
            <Button
              type="text" size="small"
              icon={<EditOutlined style={{ fontSize: 12 }} />}
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              style={{ color: COLORS.text.tertiary }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text" size="small" danger
              icon={<DeleteOutlined style={{ fontSize: 12 }} />}
              onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            />
          </Tooltip>
        </Space>
      </div>
    </Card>
  );
}

/* ── 看板列组件 ── */
function TaskColumn({
  status, label, icon, color, tasks, onStatusChange, onView, onEdit, onDelete, onAddBlockerNote, loading,
}: TaskColumnProps) {
  return (
    <div style={{
      flex: 1, minWidth: 260, maxWidth: 400,
      background: COLORS.bg.card, borderRadius: 10,
      border: `1px solid ${COLORS.border.default}`,
      display: "flex", flexDirection: "column",
    }}>
      {/* 列头 */}
      <div style={{
        padding: "14px 16px", borderBottom: `1px solid ${COLORS.border.default}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <Space size={8}>
          <span style={{ color, fontSize: 14 }}>{icon}</span>
          <Typography.Text style={{ color: COLORS.text.primary, fontSize: 13.5, fontWeight: 500 }}>
            {label}
          </Typography.Text>
        </Space>
        <span style={{
          background: `${color}20`, color, fontSize: 12, fontWeight: 600,
          padding: "0 8px", borderRadius: 10, lineHeight: "20px",
        }}>
          {tasks.length}
        </span>
      </div>
      {/* 卡片列表 */}
      <div style={{ padding: 12, overflowY: "auto", flex: 1, minHeight: 120 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin size="small" />
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: COLORS.text.tertiary, fontSize: 12 }}>
            暂无任务
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onStatusChange={onStatusChange}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddBlockerNote={status === "blocked" ? onAddBlockerNote : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // 新建任务 Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  // 编辑任务 Modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);

  // 阻塞备注 Modal
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [blockerTask, setBlockerTask] = useState<Task | null>(null);
  const [blockerNote, setBlockerNote] = useState("");
  const [blockerSaving, setBlockerSaving] = useState(false);

  const fetchTasks = useCallback((status?: string, priority?: string, skipCache = false) => {
    setLoading(true);
    let url = "/api/tasks";
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    const qs = params.toString();
    if (qs) url += "?" + qs;

    if (!skipCache) {
      const cached = getCache<{ tasks: Task[] }>(url);
      if (cached) {
        setTasks(cached.tasks || []);
        setLoading(false);
        return;
      }
    }

    apiFetch<{ tasks: Task[] }>(url)
      .then((data) => {
        setTasks(data.tasks || []);
        setCache(url, data);
      })
      .catch(() => { setTasks([]); message.error("任务列表加载失败"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTasks(statusFilter, priorityFilter); }, []);

  const refetch = (skipCache = false) => fetchTasks(statusFilter, priorityFilter, skipCache);

  const fetchTaskDetail = (id: string) => {
    setDetailLoading(true);
    const url = `/api/tasks/${id}`;
    const cached = getCache<Task>(url);
    if (cached) {
      setTaskDetail(cached);
      setDetailLoading(false);
      return;
    }
    apiFetch<Task>(url)
      .then((data) => {
        setTaskDetail(data);
        setCache(url, data);
      })
      .catch(() => { setTaskDetail(null); message.error("任务详情加载失败"); })
      .finally(() => setDetailLoading(false));
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) { message.warning("请输入任务标题"); return; }
    setCreating(true);
    try {
      await apiFetch<Task>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), priority: newPriority }),
      });
      message.success("任务已创建");
      setCreateOpen(false);
      setNewTitle("");
      setNewPriority("medium");
      invalidateCache("/api/tasks");
      refetch(true);
    } catch { message.error("创建失败"); }
    finally { setCreating(false); }
  };

  const cycleStatus = async (task: Task) => {
    const next = statusCycle[task.status] || "todo";
    try {
      await apiFetch(`/api/tasks/${task.id}/status?status=${next}`, { method: "POST" });
      message.success(`已移至「${statusMeta[next]?.label || next}」`);
      invalidateCache("/api/tasks");
      refetch(true);
    } catch { message.error("状态切换失败"); }
  };

  const handleDelete = (task: Task) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定删除任务「${task.title}」吗？`,
      styles: { body: { background: COLORS.bg.card } },
      onOk: async () => {
        try {
          await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" });
          message.success("任务已删除");
          invalidateCache("/api/tasks");
          refetch(true);
        } catch { message.error("删除失败"); }
      },
    });
  };

  const openEdit = (task: Task) => {
    setEditId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority || "medium");
    setEditTags((task.tags || []).join(", "));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { message.warning("标题不能为空"); return; }
    setSaving(true);
    try {
      await apiFetch<Task>(`/api/tasks/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          priority: editPriority,
          tags: editTags ? editTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        }),
      });
      message.success("任务已更新");
      setEditOpen(false);
      invalidateCache("/api/tasks");
      refetch(true);
    } catch { message.error("保存失败"); }
    finally { setSaving(false); }
  };

  const seedTasks = async () => {
    setSeeding(true);
    await apiFetch("/api/tasks/seed", { method: "POST" }).catch(() => message.error("初始化失败"));
    setSeeding(false);
    refetch(true);
  };

  const handleAddBlockerNote = async () => {
    if (!blockerNote.trim() || !blockerTask) { message.warning("请输入阻塞原因"); return; }
    setBlockerSaving(true);
    try {
      await apiFetch(`/api/tasks/${blockerTask.id}/events?event_type=blocker&content=${encodeURIComponent(blockerNote.trim())}`, { method: "POST" });
      message.success("阻塞原因已记录");
      setBlockerOpen(false);
      setBlockerNote("");
      setBlockerTask(null);
      invalidateCache("/api/tasks");
      refetch(true);
    } catch { message.error("添加失败"); }
    finally { setBlockerSaving(false); }
  };

  // 统计
  const safeTasks = useMemo(() => Array.isArray(tasks) ? tasks : [], [tasks]);
  const statusCounts = useMemo(() => ({
    todo: safeTasks.filter((t) => t.status === "todo").length,
    in_progress: safeTasks.filter((t) => t.status === "in_progress").length,
    blocked: safeTasks.filter((t) => t.status === "blocked").length,
    done: safeTasks.filter((t) => t.status === "done").length,
  }), [safeTasks]);

  const totalTasks = tasks.length;

  // 按状态分组
  const groupedTasks = useMemo(() => ({
    todo: safeTasks.filter((t) => t.status === "todo" && (!activeGroup || activeGroup === "todo")),
    in_progress: safeTasks.filter((t) => t.status === "in_progress" && (!activeGroup || activeGroup === "in_progress")),
    blocked: safeTasks.filter((t) => t.status === "blocked" && (!activeGroup || activeGroup === "blocked")),
  }), [safeTasks, activeGroup]);

  const doneTasks = useMemo(() => safeTasks.filter((t) => t.status === "done"), [safeTasks]);
  const [showDone, setShowDone] = useState(false);

  if (loading && tasks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: COLORS.text.tertiary, fontSize: 13 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      {/* ═══ 头部 ═══ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <Typography.Title level={3} style={{ margin: "0 0 4px 0", color: COLORS.text.primary, fontWeight: 600 }}>
            我的任务
          </Typography.Title>
          <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 13 }}>
            跟踪 Agent 记忆系统的工作进度
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreateOpen(true)}>
            新建任务
          </Button>
        </Space>
      </div>

      {/* ═══ 统计卡片 ═══ */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        {(["todo", "in_progress", "blocked", "done"] as const).map((status) => {
          const meta = statusMeta[status];
          const count = statusCounts[status];
          const isActive = activeGroup === status;
          return (
            <Col xs={12} sm={6} key={status}>
              <Card
                hoverable
                size="small"
                onClick={() => setActiveGroup(isActive ? null : status)}
                style={{
                  background: COLORS.bg.card,
                  border: `1px solid ${isActive ? meta.color : COLORS.border.default}`,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                styles={{ body: { padding: "14px 16px" } }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Space size={8}>
                    <span style={{ color: meta.color, fontSize: 16 }}>{meta.icon}</span>
                    <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13 }}>
                      {meta.label}
                    </Typography.Text>
                  </Space>
                  <span style={{ fontSize: 22, fontWeight: 600, color: COLORS.text.primary, letterSpacing: "-0.5px" }}>
                    {count}
                  </span>
                </div>
                {/* 进度条 */}
                <div style={{
                  marginTop: 8, height: 3, borderRadius: 2,
                  background: COLORS.bg.elevated, overflow: "hidden",
                }}>
                  {totalTasks > 0 && (
                    <div style={{
                      width: `${(count / totalTasks) * 100}%`, height: "100%",
                      background: meta.color, borderRadius: 2, transition: "width 0.3s",
                    }} />
                  )}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* ═══ 筛选器 ═══ */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Select
          allowClear
          placeholder="筛选状态"
          style={{ width: 140 }}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v ?? undefined); fetchTasks(v ?? undefined, priorityFilter, true); }}
          options={Object.entries(statusMeta).map(([v, m]) => ({ value: v, label: m.label }))}
        />
        <Select
          allowClear
          placeholder="筛选优先级"
          style={{ width: 140 }}
          value={priorityFilter}
          onChange={(v) => { setPriorityFilter(v ?? undefined); fetchTasks(statusFilter, v ?? undefined, true); }}
          options={Object.entries(priorityMeta).map(([v, m]) => ({ value: v, label: m.label }))}
        />
        {activeGroup && (
          <Button size="small" onClick={() => setActiveGroup(null)} style={{ color: COLORS.text.tertiary }}>
            清除分组筛选
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Button size="small" onClick={seedTasks} loading={seeding} style={{ color: COLORS.text.secondary }}>
          初始化示例任务
        </Button>
      </div>

      {/* ═══ 空状态 ═══ */}
      {totalTasks === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: COLORS.bg.card, borderRadius: 10,
          border: `1px solid ${COLORS.border.default}`,
        }}>
          <InboxOutlined style={{ fontSize: 48, color: COLORS.text.tertiary, marginBottom: 16 }} />
          <Typography.Title level={4} style={{ color: COLORS.text.primary, marginBottom: 8 }}>
            还没有任务
          </Typography.Title>
          <Typography.Paragraph style={{ color: COLORS.text.tertiary, fontSize: 13, maxWidth: 400, margin: "0 auto 20px" }}>
            任务可以来自 beads issue（自动同步）或手动创建。
            点击下方按钮初始化示例任务，看看看板视图的效果。
          </Typography.Paragraph>
          <Space>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              创建第一个任务
            </Button>
            <Button size="large" onClick={seedTasks} loading={seeding}>
              初始化示例任务
            </Button>
          </Space>
        </div>
      ) : (
        <>
          {/* ═══ 看板三列 ═══ */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, overflowX: "auto" }}>
            {(["todo", "in_progress", "blocked"] as const).map((status) => {
              const meta = statusMeta[status];
              return (
                <TaskColumn
                  key={status}
                  status={status}
                  label={meta.label}
                  icon={meta.icon}
                  color={meta.color}
                  tasks={groupedTasks[status]}
                  loading={loading}
                  onStatusChange={cycleStatus}
                  onView={(t) => { setSelectedTask(t); fetchTaskDetail(t.id); }}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onAddBlockerNote={(t) => { setBlockerTask(t); setBlockerNote(""); setBlockerOpen(true); }}
                />
              );
            })}
          </div>

          {/* ═══ 已完成（折叠） ═══ */}
          {doneTasks.length > 0 && (
            <Card
              size="small"
              style={{
                background: COLORS.bg.card,
                border: `1px solid ${COLORS.border.default}`,
                borderRadius: 8,
              }}
              styles={{ body: { padding: 0 } }}
            >
              <div
                onClick={() => setShowDone(!showDone)}
                style={{
                  padding: "12px 16px", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <Space size={8}>
                  <span style={{ color: COLORS.accent.green, fontSize: 14 }}>{statusMeta.done.icon}</span>
                  <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13 }}>
                    已完成
                  </Typography.Text>
                </Space>
                <Space size={12}>
                  <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>{doneTasks.length} 项</span>
                  <span style={{ color: COLORS.accent.blue, fontSize: 11 }}>
                    {showDone ? "收起" : "展开"}
                  </span>
                </Space>
              </div>
              {showDone && (
                <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {doneTasks.map((t) => (
                    <div key={t.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderRadius: 6,
                      background: COLORS.bg.elevated, border: `1px solid ${COLORS.border.default}`,
                    }}>
                      <div
                        onClick={() => { setSelectedTask(t); fetchTaskDetail(t.id); }}
                        style={{ cursor: "pointer", color: COLORS.text.primary, fontSize: 13 }}
                      >
                        {t.title}
                      </div>
                      <Space size={4}>
                        <Tag style={{ fontSize: 10, lineHeight: "16px", margin: 0 }}>
                          {priorityMeta[t.priority]?.label || t.priority}
                        </Tag>
                        <Button type="text" size="small" icon={<EyeOutlined style={{ fontSize: 12 }} />}
                          onClick={() => { setSelectedTask(t); fetchTaskDetail(t.id); }}
                          style={{ color: COLORS.text.tertiary }}
                        />
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ═══ 新建任务 Modal ═══ */}
      <Modal
        title={<span style={{ color: COLORS.text.primary }}>新建任务</span>}
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); setNewTitle(""); setNewPriority("medium"); }}
        okText="创建"
        cancelText="取消"
        okButtonProps={{ loading: creating }}
        styles={{ body: { background: COLORS.bg.card } }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div>
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>标题</Typography.Text>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="输入任务标题" onPressEnter={handleCreate} />
          </div>
          <div>
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>优先级</Typography.Text>
            <Select value={newPriority} onChange={setNewPriority} style={{ width: "100%" }}
              options={Object.entries(priorityMeta).map(([v, m]) => ({ value: v, label: m.label }))}
            />
          </div>
        </Space>
      </Modal>

      {/* ═══ 编辑任务 Modal ═══ */}
      <Modal
        title={<span style={{ color: COLORS.text.primary }}>编辑任务</span>}
        open={editOpen}
        onOk={handleSaveEdit}
        onCancel={() => setEditOpen(false)}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ loading: saving }}
        styles={{ body: { background: COLORS.bg.card } }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div>
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>标题</Typography.Text>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div>
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>优先级</Typography.Text>
            <Select value={editPriority} onChange={setEditPriority} style={{ width: "100%" }}
              options={Object.entries(priorityMeta).map(([v, m]) => ({ value: v, label: m.label }))}
            />
          </div>
          <div>
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>标签（逗号分隔）</Typography.Text>
            <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="标签1, 标签2, 标签3" />
          </div>
        </Space>
      </Modal>

      {/* ═══ 详情弹窗 ═══ */}
      <Modal
        title={<span style={{ color: COLORS.text.primary }}>{selectedTask?.title}</span>}
        open={!!selectedTask}
        onCancel={() => { setSelectedTask(null); setTaskDetail(null); }}
        footer={null}
        width={600}
        styles={{ body: { background: COLORS.bg.card } }}
      >
        {detailLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: COLORS.text.secondary }}>加载中...</div>
        ) : taskDetail && (
          <div>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div>
                <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>状态：</span>
                <Tag color={statusMeta[taskDetail.status]?.color} style={{ fontSize: 12 }}>
                  {statusMeta[taskDetail.status]?.label || taskDetail.status}
                </Tag>
              </div>
              <div>
                <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>优先级：</span>
                <Tag color={priorityMeta[taskDetail.priority]?.color} style={{ fontSize: 12 }}>
                  {priorityMeta[taskDetail.priority]?.label || taskDetail.priority}
                </Tag>
              </div>
              <div>
                <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>来源：</span>
                <span style={{ color: COLORS.text.secondary, fontSize: 13 }}>
                  {taskDetail.source === "beads" ? "beads" : "agent-memory"}
                </span>
              </div>
              {taskDetail.tags && taskDetail.tags.length > 0 && (
                <div>
                  <Typography.Text style={{ fontSize: 13, color: COLORS.text.secondary, fontWeight: 500, display: "block", marginBottom: 8 }}>标签</Typography.Text>
                  <Space size={4} wrap>
                    {taskDetail.tags.map((t, i) => (<Tag key={i} style={{ fontSize: 12 }}>{t}</Tag>))}
                  </Space>
                </div>
              )}
              {taskDetail.events && taskDetail.events.length > 0 && (
                <div>
                  <Typography.Text style={{ fontSize: 13, color: COLORS.text.secondary, fontWeight: 500, display: "block", marginBottom: 8 }}>事件流</Typography.Text>
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    {taskDetail.events.map((e, i) => (
                      <div key={i} style={{ padding: "10px 12px", borderRadius: 6, background: COLORS.bg.elevated, border: `1px solid ${COLORS.border.default}` }}>
                        <Space size={8}>
                          <Tag style={{ fontSize: 11, margin: 0 }}>{e.type}</Tag>
                          <span style={{ color: COLORS.text.secondary, fontSize: 13 }}>{e.content}</span>
                        </Space>
                        <div style={{ fontSize: 11, color: COLORS.text.tertiary, marginTop: 4 }}>{e.created_at?.slice(0, 16)}</div>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
              {taskDetail.artifacts && taskDetail.artifacts.length > 0 && (
                <div>
                  <Typography.Text style={{ fontSize: 13, color: COLORS.text.secondary, fontWeight: 500, display: "block", marginBottom: 8 }}>产出物</Typography.Text>
                  <Space size={6} wrap>
                    {taskDetail.artifacts.map((a, i) => (
                      <Tag key={i} color="green" style={{ fontSize: 12 }}>{a.kind}: {a.reference}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>

      {/* ═══ 阻塞原因 Modal ═══ */}
      <Modal
        title={<span style={{ color: COLORS.text.primary }}>添加阻塞原因</span>}
        open={blockerOpen}
        onOk={handleAddBlockerNote}
        onCancel={() => { setBlockerOpen(false); setBlockerNote(""); setBlockerTask(null); }}
        okText="提交"
        cancelText="取消"
        okButtonProps={{ loading: blockerSaving }}
        styles={{ body: { background: COLORS.bg.card } }}
      >
        <div>
          <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 8 }}>
            描述该任务被什么阻塞了：
          </Typography.Text>
          <Input.TextArea
            value={blockerNote}
            onChange={(e) => setBlockerNote(e.target.value)}
            placeholder="依赖 XXX 合并后才能继续"
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
