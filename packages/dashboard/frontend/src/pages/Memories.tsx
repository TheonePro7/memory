import React, { useEffect, useState } from "react";
import { Input, Table, Tag, Typography, Space, Select, Button, Modal } from "antd";
import { SearchOutlined, FolderOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface Memory {
  id?: string;
  memory?: string;
  score?: number;
  source?: string;
  metadata?: Record<string, string>;
}

export default function Memories() {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | undefined>(undefined);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<string[]>([]);

  const search = (q: string, pid?: string) => {
    setLoading(true);
    setQuery(q);
    let url = `/api/memories?q=${encodeURIComponent(q)}&limit=50`;
    if (pid) url += `&project_id=${encodeURIComponent(pid)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setMemories(data.results || []);
        // 从结果中提取所有出现的 project_id
        const pids = new Set<string>();
        (data.results || []).forEach((m: Memory) => {
          const pid = m.metadata?.project_id;
          if (pid) pids.add(pid);
        });
        setProjects((prev) => [...new Set([...prev, ...pids])].sort());
      })
      .catch(() => setMemories([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    search("", projectFilter);
  }, []);

  const handleProjectChange = (value: string | null) => {
    const pid = value ?? undefined;
    setProjectFilter(pid);
    search(query, pid);
  };

  const [editModal, setEditModal] = useState<{ visible: boolean; memory: Memory | null }>({ visible: false, memory: null });
  const [editContent, setEditContent] = useState("");

  const handleDelete = (memory: Memory) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除这条记忆吗？\n"${(memory.memory || "").slice(0, 50)}..."`,
      onOk: async () => {
        await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
        search(query, projectFilter);
      },
    });
  };

  const columns: ColumnsType<Memory> = [
    {
      title: "内容",
      dataIndex: "memory",
      key: "memory",
      ellipsis: true,
      render: (t: string, r: Memory) => {
        const display = r.metadata?.llm_summary || t;
        return display;
      },
    },
    {
      title: "实体",
      key: "entities",
      width: 160,
      render: (_: unknown, r: Memory) => {
        const entities = r.metadata?.entities;
        if (!entities) return null;
        return entities.split(",").map((e, i) => (
          <Tag key={i} color="blue" style={{ marginBottom: 2 }}>{e.trim()}</Tag>
        ));
      },
    },
    {
      title: "项目",
      key: "project",
      width: 120,
      render: (_: unknown, r: Memory) => {
        const pid = r.metadata?.project_id;
        return pid ? <Tag icon={<FolderOutlined />}>{pid}</Tag> : null;
      },
    },
    {
      title: "时间",
      key: "created_at",
      width: 180,
      render: (_: unknown, r: Memory) => {
        const ts = r.metadata?.created_at;
        if (!ts) return <Tag color="default">--</Tag>;
        const d = new Date(ts);
        return d.toLocaleString("zh-CN", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        });
      },
    },
    {
      title: "相关性",
      dataIndex: "score",
      key: "score",
      width: 80,
      render: (s: number) => s?.toFixed(2),
    },
    {
      title: "操作",
      key: "actions",
      width: 100,
      render: (_: unknown, r: Memory) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => {
            setEditContent(r.memory || "");
            setEditModal({ visible: true, memory: r });
          }} />
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>记忆浏览</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索记忆内容..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={(v) => search(v, projectFilter)}
          style={{ width: 320 }}
          enterButton
        />
        <Select
          allowClear
          placeholder="筛选项目"
          style={{ width: 180 }}
          value={projectFilter}
          onChange={handleProjectChange}
          options={projects.map((p) => ({ value: p, label: p }))}
        />
      </Space>
      <Table
        dataSource={memories}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 20 }}
        rowKey={(r) => r.id || r.memory || Math.random().toString()}
      />
      <Modal
        title="编辑记忆"
        open={editModal.visible}
        onOk={async () => {
          if (!editModal.memory?.id) return;
          await fetch(`/api/memories/${editModal.memory.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: editContent }),
          });
          setEditModal({ visible: false, memory: null });
          search(query, projectFilter);
        }}
        onCancel={() => setEditModal({ visible: false, memory: null })}
      >
        <Input.TextArea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4} />
      </Modal>
    </div>
  );
}
