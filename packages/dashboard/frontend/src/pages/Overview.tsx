import React from "react";
import { Card, Row, Col, Typography, Space } from "antd";
import { DatabaseOutlined, MessageOutlined, HistoryOutlined } from "@ant-design/icons";
import { COLORS } from "../theme";
import type { Stats } from "../App";

interface Props { stats: Stats; loading?: boolean }

const statCards = [
  { title: "记忆总数", value: (s: Stats) => s.total_memories, icon: <DatabaseOutlined />, color: COLORS.accent.blue },
  { title: "会话总数", value: (s: Stats) => s.total_sessions, icon: <MessageOutlined />, color: COLORS.accent.green },
  { title: "近 7 天会话", value: (s: Stats) => s.recent_sessions.length, icon: <HistoryOutlined />, color: COLORS.accent.orange },
];

export default function Overview({ stats, loading }: Props) {
  if (loading) {
    return (
      <div>
        <Typography.Title
          level={3}
          style={{ margin: "0 0 24px 0", color: COLORS.text.primary, fontWeight: 600 }}
        >
          总览
        </Typography.Title>
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          {[1, 2, 3].map((i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Card loading style={{ background: COLORS.bg.card }} />
            </Col>
          ))}
        </Row>
        <Typography.Title
          level={5}
          style={{ margin: "0 0 12px 0", color: COLORS.text.secondary, fontWeight: 500 }}
        >
          最近会话
        </Typography.Title>
        <Card loading style={{ background: COLORS.bg.card }} />
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <Typography.Title
        level={3}
        style={{ margin: "0 0 24px 0", color: COLORS.text.primary, fontWeight: 600 }}
      >
        总览
      </Typography.Title>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {statCards.map((c) => {
          const val = c.value(stats);
          return (
            <Col xs={24} sm={12} lg={8} key={c.title}>
              <Card
                styles={{ body: { padding: "20px 24px" } }}
                style={{
                  borderLeft: `3px solid ${c.color}`,
                  background: COLORS.bg.card,
                }}
              >
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Typography.Text
                    style={{
                      fontSize: 13,
                      color: COLORS.text.secondary,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: 500,
                    }}
                  >
                    {c.title}
                  </Typography.Text>
                  <Space size={10} align="center">
                    <span style={{ fontSize: 13, color: c.color }}>{c.icon}</span>
                    <span
                      style={{
                        fontSize: 30,
                        fontWeight: 600,
                        color: COLORS.text.primary,
                        letterSpacing: "-1px",
                        lineHeight: 1,
                      }}
                    >
                      {val}
                    </span>
                  </Space>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* 最近会话 */}
      <Typography.Title
        level={5}
        style={{ margin: "0 0 12px 0", color: COLORS.text.secondary, fontWeight: 500 }}
      >
        最近会话
      </Typography.Title>
      {stats.recent_sessions.length === 0 ? (
        <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 14 }}>
          暂无会话记录
        </Typography.Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {stats.recent_sessions.map((d, i) => (
            <div
              key={i}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: COLORS.bg.card,
                border: `1px solid ${COLORS.border.default}`,
                color: COLORS.text.secondary,
                fontSize: 13.5,
              }}
            >
              {d}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
