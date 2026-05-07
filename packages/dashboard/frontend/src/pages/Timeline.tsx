import React, { useEffect, useState } from "react";
import { Typography, Spin, Space, Empty } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { COLORS } from "../theme";

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

  if (loading) return <Spin size="large" style={{ display: "block", margin: "80px auto" }} />;

  return (
    <div>
      <Typography.Title
        level={3}
        style={{ margin: "0 0 24px 0", color: COLORS.text.primary, fontWeight: 600 }}
      >
        时间线
      </Typography.Title>

      {sessions.length === 0 ? (
        <Empty
          description="暂无会话记录"
          style={{ color: COLORS.text.tertiary }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sessions.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16,
                padding: "16px 20px",
                borderRadius: 8,
                background: COLORS.bg.card,
                border: `1px solid ${COLORS.border.default}`,
              }}
            >
              {/* 时间戳 */}
              <div
                style={{
                  minWidth: 140,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  color: COLORS.text.secondary,
                  fontSize: 13,
                }}
              >
                <ClockCircleOutlined style={{ marginTop: 2, fontSize: 12, color: COLORS.text.tertiary }} />
                <span>{item.date}</span>
              </div>
              {/* 内容 */}
              <div
                style={{
                  color: COLORS.text.secondary,
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  maxHeight: 200,
                  overflow: "hidden",
                  flex: 1,
                }}
              >
                {item.content.slice(0, 500)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
