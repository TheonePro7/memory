import React, { useEffect, useState } from "react";
import { List, Typography, Spin } from "antd";

interface Session {
  date: string;
  content: string;
}

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

  if (loading) return <Spin size="large" />;

  return (
    <div>
      <Typography.Title level={3}>会话时间线</Typography.Title>
      <List
        dataSource={sessions}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={item.date}
              description={
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    maxHeight: 200,
                    overflow: "hidden",
                    color: "inherit",
                  }}
                >
                  {item.content.slice(0, 500)}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
