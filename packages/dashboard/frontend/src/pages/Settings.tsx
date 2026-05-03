import React from "react";
import { Typography, Card, Descriptions } from "@douyinfe/semi-ui";

export default function Settings() {
  return (
    <div>
      <Typography.Title heading={3} style={{ marginBottom: 16 }}>设置</Typography.Title>
      <Card title="系统信息">
        <Descriptions
          data={[
            { key: "版本", value: "0.1.0" },
            { key: "MCP 端口", value: "8710" },
            { key: "Dashboard 端口", value: "8712" },
            { key: "记忆后端", value: "mem0 (Chroma)" },
            { key: "日志后端", value: "Markdown (memory/)" },
          ]}
        />
      </Card>
    </div>
  );
}
