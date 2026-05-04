import React, { useEffect, useState } from "react";
import { Input, Table, Tag, Typography, Space, Select } from "antd";
import { SearchOutlined, FolderOutlined } from "@ant-design/icons";
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

  const columns: ColumnsType<Memory> = [
    {
      title: "内容",
      dataIndex: "memory",
      key: "memory",
      render: (t: string) => t?.slice(0, 80),
    },
    {
      title: "项目",
      key: "project",
      width: 140,
      render: (_: unknown, r: Memory) => {
        const pid = r.metadata?.project_id;
        return pid ? <Tag icon={<FolderOutlined />}>{pid}</Tag> : null;
      },
    },
    {
      title: "来源",
      dataIndex: "source",
      key: "source",
      width: 100,
      render: (t: string) => <Tag>{t || "mem0"}</Tag>,
    },
    {
      title: "相关性",
      dataIndex: "score",
      key: "score",
      width: 100,
      render: (s: number) => s?.toFixed(2),
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
    </div>
  );
}
