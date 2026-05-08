import React, { useEffect, useState } from "react";
import { Typography, Card, Space, Tag, Divider, Spin, Alert } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { COLORS } from "../theme";

interface AgentInfo {
  name: string;
  display_name: string;
  installed: boolean;
  memory_status: string;
  category: string;
  version?: string;
}

export default function Settings() {
  const [installId, setInstallId] = useState("");
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/install-id")
      .then((r) => r.json())
      .then((d) => setInstallId(d.id))
      .catch(() => {});
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        const all = [...(data.builtin || []), ...(data.custom || [])];
        setAgents(all);
      })
      .catch((e) => setError("Agent 状态加载失败"))
      .finally(() => setLoading(false));
  }, []);

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

      {/* Agent 检测状态 */}
      <Card
        title={
          <span style={{ color: COLORS.text.primary, fontSize: 14, fontWeight: 500 }}>Agent 检测</span>
        }
        styles={{ body: { padding: "20px 24px" } }}
        style={{ marginBottom: 20, background: COLORS.bg.card }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 20 }}><Spin /></div>
        ) : error ? (
          <Alert type="warning" message={error} showIcon style={{ background: `${COLORS.accent.orange}10`, border: `1px solid ${COLORS.accent.orange}30` }} />
        ) : agents.length === 0 ? (
          <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 13 }}>未检测到 Agent</Typography.Text>
        ) : (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {agents.map((agent) => {
              const hasMemory = agent.memory_status === "has_memory";
              return (
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
                  <div>
                    <span style={{ color: COLORS.text.primary, fontSize: 13.5 }}>{agent.display_name || agent.name}</span>
                    {agent.category && (
                      <Tag style={{ fontSize: 10, marginLeft: 6, color: COLORS.text.tertiary, background: COLORS.bg.elevated, border: "none" }}>
                        {agent.category}
                      </Tag>
                    )}
                  </div>
                  <Space size={8}>
                    <Tag style={{
                      fontSize: 11,
                      color: agent.installed ? COLORS.accent.green : COLORS.text.tertiary,
                      background: agent.installed ? `${COLORS.accent.green}15` : "transparent",
                      border: `1px solid ${agent.installed ? `${COLORS.accent.green}30` : COLORS.border.default}`,
                    }}>
                      {agent.installed ? "已安装" : "未检测到"}
                    </Tag>
                    {agent.installed && (
                      <Tag style={{
                        fontSize: 11,
                        color: hasMemory ? COLORS.accent.green : COLORS.accent.orange,
                        background: hasMemory ? `${COLORS.accent.green}15` : `${COLORS.accent.orange}15`,
                        border: `1px solid ${hasMemory ? `${COLORS.accent.green}30` : `${COLORS.accent.orange}30`}`,
                      }}>
                        {hasMemory ? "有记忆" : "无记忆"}
                      </Tag>
                    )}
                  </Space>
                </div>
              );
            })}
          </Space>
        )}
      </Card>
    </div>
  );
}
