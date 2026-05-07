import React, { useEffect, useState } from "react";
import { Typography, Table, Tag, Select, Card, Row, Col, Modal, Space, Tooltip, Button } from "antd";
import {
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  InboxOutlined, EyeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { COLORS } from "../theme";

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
}

const statusMeta: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  todo: { label: "待办", color: COLORS.text.tertiary, icon: <InboxOutlined /> },
  in_progress: { label: "进行中", color: COLORS.accent.blue, icon: <ClockCircleOutlined /> },
  blocked: { label: "阻塞", color: COLORS.accent.red, icon: <ExclamationCircleOutlined /> },
  done: { label: "已完成", color: COLORS.accent.green, icon: <CheckCircleOutlined /> },
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchTasks = (status?: string) => {
    setLoading(true);
    let url = "/api/tasks";
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const qs = params.toString();
    if (qs) url += "?" + qs;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(statusFilter); }, []);

  const fetchTaskDetail = (id: string) => {
    setDetailLoading(true);
    fetch(`/api/tasks/${id}`)
      .then((r) => r.json())
      .then((data) => setTaskDetail(data.error ? null : data))
      .catch(() => setTaskDetail(null))
      .finally(() => setDetailLoading(false));
  };

  const statusCounts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    blocked: tasks.filter((t) => t.status === "blocked").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const columns: ColumnsType<Task> = [
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      render: (t: string, r: Task) => (
        <a
          onClick={() => { setSelectedTask(r); fetchTaskDetail(r.id); }}
          style={{ color: COLORS.text.primary, fontSize: 13.5 }}
        >
          {t}
        </a>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s: string) => {
        const meta = statusMeta[s];
        if (!meta) return <Tag>{s}</Tag>;
        return (
          <Tag
            style={{
              background: `${meta.color}15`,
              color: meta.color,
              border: `1px solid ${meta.color}30`,
              borderRadius: 4,
              fontSize: 12,
              padding: "2px 8px",
            }}
          >
            <Space size={4}>
              {meta.icon}
              {meta.label}
            </Space>
          </Tag>
        );
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
      width: 110,
      render: (t: string) => (
        <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
          {t?.slice(0, 10)}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: unknown, r: Task) => (
        <Tooltip title="查看详情">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined style={{ fontSize: 14 }} />}
            onClick={() => { setSelectedTask(r); fetchTaskDetail(r.id); }}
            style={{ color: COLORS.text.secondary }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title
        level={3}
        style={{ margin: "0 0 20px 0", color: COLORS.text.primary, fontWeight: 600 }}
      >
        任务
      </Typography.Title>

      {/* 状态统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => {
          const meta = statusMeta[status];
          if (!meta) return null;
          return (
            <Col span={6} key={status}>
              <Card
                styles={{ body: { padding: "16px 20px" } }}
                style={{
                  background: COLORS.bg.card,
                  borderLeft: `3px solid ${meta.color}`,
                }}
              >
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Typography.Text
                    style={{
                      fontSize: 12,
                      color: COLORS.text.secondary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {meta.label}
                  </Typography.Text>
                  <Space size={8} align="center">
                    <span style={{ fontSize: 13, color: meta.color }}>{meta.icon}</span>
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 600,
                        color: COLORS.text.primary,
                        letterSpacing: "-1px",
                        lineHeight: 1,
                      }}
                    >
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
      <div style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="筛选状态"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v ?? undefined); fetchTasks(v ?? undefined); }}
          options={Object.entries(statusMeta).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
        />
      </div>

      {/* 任务表格 */}
      <Table
        dataSource={tasks}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 20, size: "small" }}
        rowKey="id"
        size="middle"
      />

      {/* 详情弹窗 */}
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
                <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>来源：</span>
                <span style={{ color: COLORS.text.secondary, fontSize: 13 }}>
                  {taskDetail.source === "beads" ? "beads" : "agent-memory"}
                </span>
              </div>

              {taskDetail.tags && taskDetail.tags.length > 0 && (
                <div>
                  <Typography.Text
                    style={{
                      fontSize: 13,
                      color: COLORS.text.secondary,
                      fontWeight: 500,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
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
                  <Typography.Text
                    style={{
                      fontSize: 13,
                      color: COLORS.text.secondary,
                      fontWeight: 500,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    事件流
                  </Typography.Text>
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    {taskDetail.events.map((e, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 6,
                          background: COLORS.bg.elevated,
                          border: `1px solid ${COLORS.border.default}`,
                        }}
                      >
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
                  <Typography.Text
                    style={{
                      fontSize: 13,
                      color: COLORS.text.secondary,
                      fontWeight: 500,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
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
