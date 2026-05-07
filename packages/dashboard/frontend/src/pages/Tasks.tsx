import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Typography, Table, Tag, Select, Card, Row, Col, Modal, Space, Tooltip,
  Button, Input, message,
} from "antd";
import {
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  InboxOutlined, EyeOutlined, DeleteOutlined, PlusOutlined,
  EditOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
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

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  // 删除状态
  const [deleting, setDeleting] = useState<string | null>(null);

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

  // ── 新建任务 ──
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

  // ── 切换状态 ──
  const cycleStatus = async (task: Task) => {
    const next = statusCycle[task.status] || "todo";
    try {
      await apiFetch(`/api/tasks/${task.id}/status?status=${next}`, { method: "POST" });
      message.success(`状态已切换为 ${statusMeta[next]?.label || next}`);
      invalidateCache("/api/tasks");
      refetch(true);
    } catch { message.error("状态切换失败"); }
  };

  // ── 删除任务 ──
  const handleDelete = (task: Task) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定删除任务「${task.title}」吗？`,
      styles: { body: { background: COLORS.bg.card } },
      onOk: async () => {
        setDeleting(task.id);
        try {
          await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" });
          message.success("任务已删除");
          invalidateCache("/api/tasks");
          refetch(true);
        } catch { message.error("删除失败"); }
        finally { setDeleting(null); }
      },
    });
  };

  // ── 编辑任务 ──
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

  // ── 统计 ──
  const statusCounts = useMemo(() => ({
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
    done: tasks.filter((t) => t.status === "done").length,
  }), [tasks]);

  // ── 列定义 ──
  const columns: ColumnsType<Task> = useMemo(() => [
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      width: 220,
      ellipsis: true,
      render: (t: string, r: Task) => (
        <a
          onClick={() => { setSelectedTask(r); fetchTaskDetail(r.id); }}
          style={{ color: COLORS.text.primary, fontSize: 13.5, cursor: "pointer" }}
        >
          {t}
        </a>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string, r: Task) => {
        const meta = statusMeta[s];
        if (!meta) return <Tag>{s}</Tag>;
        return (
          <Select
            value={s}
            size="small"
            style={{ width: 100 }}
            bordered={false}
            dropdownMatchSelectWidth={false}
            onChange={() => cycleStatus(r)}
            options={Object.entries(statusMeta).map(([v, m]) => ({ value: v, label: m.label }))}
          />
        );
      },
    },
    {
      title: "优先级",
      key: "priority",
      width: 80,
      render: (_: unknown, r: Task) => {
        const meta = priorityMeta[r.priority];
        if (!meta) return <Tag>{r.priority}</Tag>;
        return <Tag color={meta.color} style={{ fontSize: 12 }}>{meta.label}</Tag>;
      },
    },
    {
      title: "来源",
      dataIndex: "source",
      key: "source",
      width: 70,
      render: (s: string) => (
        <Tag style={{ fontSize: 11, color: COLORS.text.tertiary, background: COLORS.bg.elevated }}>
          {s === "beads" ? "B" : "M"}
        </Tag>
      ),
    },
    {
      title: "标签",
      key: "tags",
      dataIndex: "tags",
      width: 150,
      render: (tags: string[]) => tags?.map((t, i) => (
        <Tag key={i} style={{ fontSize: 11, marginBottom: 2 }}>{t}</Tag>
      )),
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 100,
      render: (t: string) => (
        <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
          {t?.slice(0, 10)}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_: unknown, r: Task) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button
              type="text" size="small"
              icon={<EyeOutlined style={{ fontSize: 14 }} />}
              onClick={() => { setSelectedTask(r); fetchTaskDetail(r.id); }}
              style={{ color: COLORS.text.secondary }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text" size="small"
              icon={<EditOutlined style={{ fontSize: 14 }} />}
              onClick={() => openEdit(r)}
              style={{ color: COLORS.text.secondary }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text" size="small" danger
              icon={<DeleteOutlined style={{ fontSize: 14 }} />}
              loading={deleting === r.id}
              onClick={() => handleDelete(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ], [deleting]);

  return (
    <div>
      {/* 头部 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Typography.Title level={3} style={{ margin: 0, color: COLORS.text.primary, fontWeight: 600 }}>
          任务
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建任务
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => {
          const meta = statusMeta[status];
          if (!meta) return null;
          return (
            <Col xs={12} sm={6} key={status}>
              <Card
                styles={{ body: { padding: "16px 20px" } }}
                style={{ background: COLORS.bg.card, borderLeft: `3px solid ${meta.color}` }}
              >
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Typography.Text style={{ fontSize: 12, color: COLORS.text.secondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {meta.label}
                  </Typography.Text>
                  <Space size={8} align="center">
                    <span style={{ fontSize: 13, color: meta.color }}>{meta.icon}</span>
                    <span style={{ fontSize: 26, fontWeight: 600, color: COLORS.text.primary, letterSpacing: "-1px", lineHeight: 1 }}>
                      {count}
                    </span>
                  </Space>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* 筛选器 */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
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
      </div>

      {/* 表格 */}
      <div style={{ overflowX: "auto" }}>
        <Table
          dataSource={tasks}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 20, size: "small" }}
          scroll={{ x: 850 }}
          locale={{
            emptyText: (
              <div style={{ padding: "24px 0", color: COLORS.text.tertiary }}>
                <p style={{ marginBottom: 12 }}>暂无任务数据</p>
                <Space>
                  <Button size="small" type="primary" onClick={() => setCreateOpen(true)}>创建第一个任务</Button>
                  <Button size="small" onClick={seedTasks} loading={seeding}>初始化示例任务</Button>
                </Space>
              </div>
            ),
          }}
          rowKey="id"
          size="middle"
        />
      </div>

      {/* ── 新建任务 Modal ── */}
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
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>
              标题
            </Typography.Text>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="输入任务标题"
              onPressEnter={handleCreate}
            />
          </div>
          <div>
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>
              优先级
            </Typography.Text>
            <Select
              value={newPriority}
              onChange={setNewPriority}
              style={{ width: "100%" }}
              options={Object.entries(priorityMeta).map(([v, m]) => ({ value: v, label: m.label }))}
            />
          </div>
        </Space>
      </Modal>

      {/* ── 编辑任务 Modal ── */}
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
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>
              标题
            </Typography.Text>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div>
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>
              优先级
            </Typography.Text>
            <Select
              value={editPriority}
              onChange={setEditPriority}
              style={{ width: "100%" }}
              options={Object.entries(priorityMeta).map(([v, m]) => ({ value: v, label: m.label }))}
            />
          </div>
          <div>
            <Typography.Text style={{ color: COLORS.text.secondary, fontSize: 13, display: "block", marginBottom: 6 }}>
              标签（逗号分隔）
            </Typography.Text>
            <Input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="标签1, 标签2, 标签3"
            />
          </div>
        </Space>
      </Modal>

      {/* ── 详情弹窗 ── */}
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
                <span style={{ color: COLORS.text.secondary, fontSize: 13 }}>
                  {statusMeta[taskDetail.status]?.label || taskDetail.status}
                </span>
              </div>
              <div>
                <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>优先级：</span>
                <span style={{ color: COLORS.text.secondary, fontSize: 13 }}>
                  {priorityMeta[taskDetail.priority]?.label || taskDetail.priority}
                </span>
              </div>
              <div>
                <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>来源：</span>
                <span style={{ color: COLORS.text.secondary, fontSize: 13 }}>
                  {taskDetail.source === "beads" ? "beads" : "agent-memory"}
                </span>
              </div>

              {taskDetail.tags && taskDetail.tags.length > 0 && (
                <div>
                  <Typography.Text style={{ fontSize: 13, color: COLORS.text.secondary, fontWeight: 500, display: "block", marginBottom: 8 }}>
                    标签
                  </Typography.Text>
                  <Space size={4} wrap>
                    {taskDetail.tags.map((t, i) => (
                      <Tag key={i} style={{ fontSize: 12 }}>{t}</Tag>
                    ))}
                  </Space>
                </div>
              )}

              {taskDetail.events && taskDetail.events.length > 0 && (
                <div>
                  <Typography.Text style={{ fontSize: 13, color: COLORS.text.secondary, fontWeight: 500, display: "block", marginBottom: 8 }}>
                    事件流
                  </Typography.Text>
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    {taskDetail.events.map((e, i) => (
                      <div key={i} style={{ padding: "10px 12px", borderRadius: 6, background: COLORS.bg.elevated, border: `1px solid ${COLORS.border.default}` }}>
                        <Space size={8}>
                          <Tag style={{ fontSize: 11, margin: 0 }}>{e.type}</Tag>
                          <span style={{ color: COLORS.text.secondary, fontSize: 13 }}>{e.content}</span>
                        </Space>
                        <div style={{ fontSize: 11, color: COLORS.text.tertiary, marginTop: 4 }}>
                          {e.created_at?.slice(0, 16)}
                        </div>
                      </div>
                    ))}
                  </Space>
                </div>
              )}

              {taskDetail.artifacts && taskDetail.artifacts.length > 0 && (
                <div>
                  <Typography.Text style={{ fontSize: 13, color: COLORS.text.secondary, fontWeight: 500, display: "block", marginBottom: 8 }}>
                    产出物
                  </Typography.Text>
                  <Space size={6} wrap>
                    {taskDetail.artifacts.map((a, i) => (
                      <Tag key={i} color="green" style={{ fontSize: 12 }}>
                        {a.kind}: {a.reference}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}
