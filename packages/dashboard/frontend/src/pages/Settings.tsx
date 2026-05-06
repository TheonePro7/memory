import React, { useEffect, useState } from "react";
import { Typography, Card, Space, Tag, Divider } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { COLORS } from "../theme";

interface AgentStatus {
  name: string;
  installed: boolean;
  hasMemory: boolean;
  version?: string;
}

export default function Settings() {
  const [installId, setInstallId] = useState("");

  useEffect(() => {
    fetch("/api/install-id")
      .then((r) => r.json())
      .then((d) => setInstallId(d.id))
      .catch(() => {});
  }, []);

  const agents: AgentStatus[] = [
    { name: "Claude Code", installed: true, hasMemory: true },
    { name: "Cursor", installed: false, hasMemory: false },
    { name: "Trae", installed: false, hasMemory: false },
    { name: "OpenClaw", installed: false, hasMemory: false },
    { name: "LangGraph", installed: false, hasMemory: false },
  ];

  return (
    <div>
      <Typography.Title
        level={3}
        style={{ margin: "0 0 24px 0", color: COLORS.text.primary, fontWeight: 600 }}
      >
        设置
      </Typography.Title>

      {/* 系统信息 */}
      <Card
        title={
          <span style={{ color: COLORS.text.primary, fontSize: 14, fontWeight: 500 }}>系统信息</span>
        }
        styles={{ body: { padding: "20px 24px" } }}
        style={{ marginBottom: 20, background: COLORS.bg.card }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {[
            { label: "版本", value: "1.0.0" },
            { label: "安装 ID", value: installId || "--" },
            { label: "MCP 端口", value: "8710" },
            { label: "Dashboard 端口", value: "8712" },
            { label: "记忆后端", value: "mem0 (ChromaDB)" },
            { label: "日志后端", value: "Markdown (memory/)" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${COLORS.border.default}`,
              }}
            >
              <span style={{ color: COLORS.text.secondary, fontSize: 13.5 }}>{item.label}</span>
              <span style={{ color: COLORS.text.primary, fontSize: 13.5, fontWeight: 500 }}>
                {item.value}
              </span>
            </div>
          ))}
        </Space>
      </Card>

      {/* Agent 检测状态（预留） */}
      <Card
        title={
          <span style={{ color: COLORS.text.primary, fontSize: 14, fontWeight: 500 }}>Agent 检测</span>
        }
        styles={{ body: { padding: "20px 24px" } }}
        style={{ marginBottom: 20, background: COLORS.bg.card }}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {agents.map((agent) => (
            <div
              key={agent.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: 6,
                background: COLORS.bg.elevated,
                border: `1px solid ${COLORS.border.default}`,
              }}
            >
              <span style={{ color: COLORS.text.primary, fontSize: 13.5 }}>{agent.name}</span>
              <Space size={8}>
                <Tag
                  style={{
                    fontSize: 11,
                    color: agent.installed ? COLORS.accent.green : COLORS.text.tertiary,
                    background: agent.installed ? `${COLORS.accent.green}15` : "transparent",
                    border: `1px solid ${agent.installed ? `${COLORS.accent.green}30` : COLORS.border.default}`,
                  }}
                >
                  {agent.installed ? "已安装" : "未检测到"}
                </Tag>
                {agent.installed && (
                  <Tag
                    style={{
                      fontSize: 11,
                      color: agent.hasMemory ? COLORS.accent.green : COLORS.accent.orange,
                      background: agent.hasMemory ? `${COLORS.accent.green}15` : `${COLORS.accent.orange}15`,
                      border: `1px solid ${agent.hasMemory ? `${COLORS.accent.green}30` : `${COLORS.accent.orange}30`}`,
                    }}
                  >
                    {agent.hasMemory ? "有记忆系统" : "无记忆"}
                  </Tag>
                )}
              </Space>
            </div>
          ))}
          <Divider style={{ borderColor: COLORS.border.default, margin: "12px 0" }} />
          <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
            Agent 检测功能即将上线，将自动发现您机器上安装的 AI 智能体
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}
