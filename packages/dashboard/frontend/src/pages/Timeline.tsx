import React, { useEffect, useState } from "react";
import { List, Typography, Spin } from "@douyinfe/semi-ui";

interface Session { date: string; content: string; }

export default function Timeline() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions?days=30")
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;

  return (
    <div>
      <Typography.Title heading={3} style={{ marginBottom: 16 }}>会话时间线</Typography.Title>
      <List
        dataSource={sessions}
        renderItem={(item) => (
          <List.Item
            header={<Typography.Text strong>{item.date}</Typography.Text>}
            main={<div style={{ whiteSpace: "pre-wrap", maxHeight: 200, overflow: "hidden" }}>{item.content.slice(0, 500)}</div>}
          />
        )}
      />
    </div>
  );
}
