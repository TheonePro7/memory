import React, { useEffect, useState } from "react";
import { Input, Table, Button, Tag, Typography, Space } from "@douyinfe/semi-ui";

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

  useEffect(() => { search(""); }, []);

  const columns = [
    { title: "内容", dataIndex: "memory", render: (t: string) => t?.slice(0, 80) },
    { title: "来源", dataIndex: "source", render: (t: string) => <Tag>{t || "mem0"}</Tag> },
    { title: "相关性", dataIndex: "score", render: (s: number) => s?.toFixed(2) },
  ];

  return (
    <div>
      <Typography.Title heading={3} style={{ marginBottom: 16 }}>记忆浏览</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Input placeholder="搜索记忆..." value={query} onChange={(v) => search(v)} style={{ width: 400 }} showClear />
        <Button onClick={() => search(query)} loading={loading}>搜索</Button>
      </Space>
      <Table dataSource={memories} columns={columns} loading={loading} pagination={{ pageSize: 20 }} />
    </div>
  );
}
