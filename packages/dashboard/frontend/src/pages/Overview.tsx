import React from "react";
import { Card, Row, Col, Typography, Table, Statistic } from "antd";
import {
  DatabaseOutlined,
  MessageOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { Stats } from "../App";

interface Props {
  stats: Stats;
}

export default function Overview({ stats }: Props) {
  const cardData = [
    { title: "记忆总数", value: stats.total_memories, icon: <DatabaseOutlined />, color: "#1677ff" },
    { title: "会话总数", value: stats.total_sessions, icon: <MessageOutlined />, color: "#52c41a" },
    { title: "近 7 天会话", value: stats.recent_sessions.length, icon: <HistoryOutlined />, color: "#fa8c16" },
  ];

  return (
    <div>
      <Typography.Title level={3}>总览</Typography.Title>
      <Row gutter={[16, 16]}>
        {cardData.map((c) => (
          <Col span={8} key={c.title}>
            <Card style={{ borderLeft: `4px solid ${c.color}` }}>
              <Statistic title={c.title} value={c.value} prefix={c.icon} />
            </Card>
          </Col>
        ))}
      </Row>
      <Typography.Title level={5} style={{ marginTop: 32 }}>
        最近会话
      </Typography.Title>
      <Table
        dataSource={stats.recent_sessions.map((d, i) => ({ key: i, date: d }))}
        columns={[{ title: "日期", dataIndex: "date", key: "date" }]}
        pagination={false}
      />
    </div>
  );
}
