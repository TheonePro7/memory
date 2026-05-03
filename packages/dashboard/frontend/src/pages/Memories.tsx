import React, { useEffect, useState } from "react";
import { Input, Table, Tag, Typography, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface Memory {
  id?: string;
  memory?: string;
  score?: number;
  source?: string;
}

export default function Memories() {
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  const search = (q: string) => {
    setLoading(true);
    setQuery(q);
    fetch(`/api/memories?q=${encodeURIComponent(q)}&limit=50`)
      .then((r) => r.json())
      .then((data) => setMemories(data.results || []))
      .catch(() => setMemories([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    search("");
  }, []);

  const columns: ColumnsType<Memory> = [
    {
      title: "内容",
      dataIndex: "memory",
      key: "memory",
      render: (t: string) => t?.slice(0, 80),
    },
    {
      title: "来源",
      dataIndex: "source",
      key: "source",
      render: (t: string) => <Tag>{t || "mem0"}</Tag>,
    },
    {
      title: "相关性",
      dataIndex: "score",
      key: "score",
      render: (s: number) => s?.toFixed(2),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>记忆浏览</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索记忆..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={search}
          style={{ width: 400 }}
          enterButton
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
