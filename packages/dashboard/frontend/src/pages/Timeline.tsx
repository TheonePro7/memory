import React, { useEffect, useState } from "react";
import { Typography, Spin, Space, Empty, Button, message } from "antd";
import { ClockCircleOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import { COLORS } from "../theme";
import { apiFetch } from "../api";
import { getCache, setCache } from "../cache";

interface Session {
  date: string;
  content: string;
}

export default function Timeline() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const loadSessions = () => {
    setLoading(true);
    setError(false);
    const cached = getCache<{ sessions: Session[] }>("/api/sessions?days=30");
    if (cached) {
      setSessions(cached.sessions || []);
      setLoading(false);
      return;
    }
    apiFetch<{ sessions: Session[] }>("/api/sessions?days=30")
      .then((data) => {
        setSessions(data.sessions || []);
        setCache("/api/sessions?days=30", data);
      })
      .catch(() => { setSessions([]); setError(true); message.error("时间线加载失败"); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSessions(); }, []);

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
        error ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Typography.Text style={{ color: COLORS.text.tertiary, display: "block", marginBottom: 16 }}>
              加载失败
            </Typography.Text>
            <Button onClick={loadSessions}>重新加载</Button>
          </div>
        ) : (
          <Empty
            description="暂无会话记录"
            style={{ color: COLORS.text.tertiary }}
          />
        )
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
                  maxHeight: expanded.has(i) ? "none" : 200,
                  overflow: expanded.has(i) ? "visible" : "hidden",
                  flex: 1,
                  cursor: "pointer",
                }}
                onClick={() => toggleExpand(i)}
              >
                {item.content.slice(0, expanded.has(i) ? undefined : 500)}
                <span style={{ fontSize: 11, color: COLORS.accent.blue, marginLeft: 8 }}>
                  {expanded.has(i) ? "收起" : "展开"}
                  {expanded.has(i) ? <UpOutlined style={{ fontSize: 10, marginLeft: 4 }} /> : <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
