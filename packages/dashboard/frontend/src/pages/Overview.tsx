import React from "react";
import { Card, Row, Col, Typography, Table } from "@douyinfe/semi-ui";
import { IconPlus, IconComment, IconHistory } from "@douyinfe/semi-icons";
import { Stats } from "../App";

interface Props { stats: Stats }

export default function Overview({ stats }: Props) {
  const cards = [
    { title: "记忆总数", value: stats.total_memories, icon: <IconPlus />, color: "#0077FA" },
    { title: "会话总数", value: stats.total_sessions, icon: <IconComment />, color: "#00A85D" },
    { title: "近 7 天会话", value: stats.recent_sessions.length, icon: <IconHistory />, color: "#FA7D00" },
  ];

  return (
    <div>
      <Typography.Title heading={3} style={{ marginBottom: 24 }}>总览</Typography.Title>
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col span={8} key={c.title}>
            <Card
              title={c.title}
              headerExtraContent={c.icon}
              style={{ borderLeft: `4px solid ${c.color}` }}
            >
              <Typography.Title heading={2}>{c.value}</Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>
      <Typography.Title heading={5} style={{ marginTop: 32, marginBottom: 16 }}>最近会话</Typography.Title>
      <Table
        dataSource={stats.recent_sessions.map((d, i) => ({ key: i, date: d }))}
        columns={[{ title: "日期", dataIndex: "date" }]}
        pagination={false}
      />
    </div>
  );
}
