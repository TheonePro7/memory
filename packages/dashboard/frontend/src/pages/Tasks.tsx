import React, { useEffect, useState } from "react";
import { Typography, Table, Tag, Select, Card, Row, Col, Statistic, Modal } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, InboxOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

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

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
        <a onClick={() => setSelectedTask(r)}>{t}</a>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          todo: "default",
          in_progress: "processing",
          blocked: "error",
          done: "success",
        };
        const labelMap: Record<string, string> = {
          todo: "待办",
          in_progress: "进行中",
          blocked: "阻塞",
          done: "已完成",
        };
        return <Tag color={colorMap[s] || "default"}>{labelMap[s] || s}</Tag>;
      },
    },
    {
      title: "来源",
      dataIndex: "source",
      key: "source",
      width: 80,
      render: (s: string) => <Tag>{s === "beads" ? "B" : "M"}</Tag>,
    },
    {
      title: "标签",
      key: "tags",
      dataIndex: "tags",
      width: 160,
      render: (tags: string[]) => tags?.map((t, i) => <Tag key={i}>{t}</Tag>),
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 160,
      render: (t: string) => t?.slice(0, 10),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>任务</Typography.Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="待办" value={statusCounts.todo} prefix={<InboxOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="进行中" value={statusCounts.in_progress} prefix={<ClockCircleOutlined />} valueStyle={{ color: "#1677ff" }} /></Card></Col>
        <Col span={6}><Card><Statistic title="阻塞" value={statusCounts.blocked} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: "#ff4d4f" }} /></Card></Col>
        <Col span={6}><Card><Statistic title="已完成" value={statusCounts.done} prefix={<CheckCircleOutlined />} valueStyle={{ color: "#52c41a" }} /></Card></Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="筛选状态"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v ?? undefined); fetchTasks(v ?? undefined); }}
          options={[
            { value: "todo", label: "待办" },
            { value: "in_progress", label: "进行中" },
            { value: "blocked", label: "阻塞" },
            { value: "done", label: "已完成" },
          ]}
        />
      </div>

      <Table
        dataSource={tasks}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 20 }}
        rowKey="id"
      />

      <Modal
        title={selectedTask?.title}
        open={!!selectedTask}
        onCancel={() => setSelectedTask(null)}
        footer={null}
        width={600}
      >
        {selectedTask && (
          <div>
            <p><strong>状态：</strong>{selectedTask.status}</p>
            <p><strong>来源：</strong>{selectedTask.source === "beads" ? "beads" : "agent-memory"}</p>
            {selectedTask.events && selectedTask.events.length > 0 && (
              <>
                <Typography.Title level={5}>事件流</Typography.Title>
                {selectedTask.events.map((e, i) => (
                  <Card key={i} size="small" style={{ marginBottom: 8 }}>
                    <Tag color="blue">{e.type}</Tag>
                    <span>{e.content}</span>
                    <div style={{ fontSize: 12, color: "#999" }}>{e.created_at?.slice(0, 16)}</div>
                  </Card>
                ))}
              </>
            )}
            {selectedTask.artifacts && selectedTask.artifacts.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 16 }}>产出物</Typography.Title>
                {selectedTask.artifacts.map((a, i) => (
                  <Tag key={i} color="green">{a.kind}: {a.reference}</Tag>
                ))}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
