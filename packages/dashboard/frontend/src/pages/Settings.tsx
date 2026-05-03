import React from "react";
import { Typography, Card, Descriptions } from "antd";

export default function Settings() {
  return (
    <div>
      <Typography.Title level={3}>设置</Typography.Title>
      <Card title="系统信息">
        <Descriptions column={1}>
          <Descriptions.Item label="版本">0.1.0</Descriptions.Item>
          <Descriptions.Item label="MCP 端口">8710</Descriptions.Item>
          <Descriptions.Item label="Dashboard 端口">8712</Descriptions.Item>
          <Descriptions.Item label="记忆后端">mem0 (Chroma)</Descriptions.Item>
          <Descriptions.Item label="日志后端">Markdown (memory/)</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
