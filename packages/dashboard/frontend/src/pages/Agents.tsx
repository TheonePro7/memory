import React, { useEffect, useState } from "react";
import {
  Typography, Card, Row, Col, Space, Tag, Button, Modal,
  Input, Select, Spin, message,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, CheckCircleOutlined,
  MinusCircleOutlined, QuestionCircleOutlined,
} from "@ant-design/icons";
import { COLORS } from "../theme";

interface Agent {
  name: string;
  display_name: string;
  category: string;
  installed: boolean;
  managed: boolean;
  memory_status: string;
  config_path: string | null;
  version: string | null;
  custom_id?: string;
}

export default function Agents() {
  const [builtin, setBuiltin] = useState<Agent[]>([]);
  const [custom, setCustom] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addModal, setAddModal] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "", type: "other", mcp_config_dir: "", project_dir: "",
  });

  const scan = (refresh = false) => {
    setLoading(true);
    fetch(`/api/agents/scan${refresh ? '?refresh=true' : ''}`)
      .then((r) => r.json())
      .then((data) => {
        setBuiltin(data.builtin || []);
        setCustom(data.custom || []);
        const defaults = new Set<string>();
        (data.builtin || []).forEach((a: Agent) => {
          if (a.installed) defaults.add(a.name);
        });
        setSelected(defaults);
      })
      .catch(() => message.error("扫描失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { scan(); }, []);

  const toggleAgent = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const confirmManage = () => {
    fetch("/api/agents/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([...selected]),
    })
      .then(() => message.success(`已确认管理 ${selected.size} 个 Agent`))
      .catch(() => message.error("操作失败"));
  };

  const addCustom = () => {
    fetch("/api/agents/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAgent),
    })
      .then((r) => r.json())
      .then(() => {
        message.success("自定义 Agent 已添加");
        setAddModal(false);
        setNewAgent({ name: "", type: "other", mcp_config_dir: "", project_dir: "" });
        scan();
      })
      .catch(() => message.error("添加失败"));
  };

  const statusTag = (status: string) => {
    switch (status) {
      case "has_memory":
        return (
          <Tag
            icon={<CheckCircleOutlined />}
            style={{
              background: `${COLORS.accent.green}15`,
              color: COLORS.accent.green,
              border: `1px solid ${COLORS.accent.green}30`,
              fontSize: 12,
            }}
          >
            有记忆
          </Tag>
        );
      case "no_memory":
        return (
          <Tag
            icon={<MinusCircleOutlined />}
            style={{
              background: `${COLORS.accent.orange}15`,
              color: COLORS.accent.orange,
              border: `1px solid ${COLORS.accent.orange}30`,
              fontSize: 12,
            }}
          >
            无记忆
          </Tag>
        );
      default:
        return (
          <Tag
            icon={<QuestionCircleOutlined />}
            style={{
              background: `${COLORS.text.tertiary}15`,
              color: COLORS.text.tertiary,
              border: `1px solid ${COLORS.border.default}`,
              fontSize: 12,
            }}
          >
            不确定
          </Tag>
        );
    }
  };

  const stats = {
    total: builtin.length + custom.length,
    installed: builtin.filter((a) => a.installed).length + custom.length,
    hasMemory: [...builtin, ...custom].filter((a) => a.memory_status === "has_memory").length,
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Typography.Title
          level={3}
          style={{ margin: 0, color: COLORS.text.primary, fontWeight: 600 }}
        >
          Agent
        </Typography.Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => scan(true)} loading={loading}>
            重新扫描
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>
            添加自定义
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card
            styles={{ body: { padding: "16px 20px" } }}
            style={{
              background: COLORS.bg.card,
              borderLeft: `3px solid ${COLORS.accent.blue}`,
            }}
          >
            <Space direction="vertical" size={4}>
              <Typography.Text
                style={{
                  fontSize: 12,
                  color: COLORS.text.secondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                已检测
              </Typography.Text>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.text.primary,
                  letterSpacing: "-1px",
                }}
              >
                {stats.total}
              </span>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            styles={{ body: { padding: "16px 20px" } }}
            style={{
              background: COLORS.bg.card,
              borderLeft: `3px solid ${COLORS.accent.green}`,
            }}
          >
            <Space direction="vertical" size={4}>
              <Typography.Text
                style={{
                  fontSize: 12,
                  color: COLORS.text.secondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                已安装
              </Typography.Text>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.text.primary,
                  letterSpacing: "-1px",
                }}
              >
                {stats.installed}
              </span>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            styles={{ body: { padding: "16px 20px" } }}
            style={{
              background: COLORS.bg.card,
              borderLeft: `3px solid ${COLORS.accent.purple}`,
            }}
          >
            <Space direction="vertical" size={4}>
              <Typography.Text
                style={{
                  fontSize: 12,
                  color: COLORS.text.secondary,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                有记忆
              </Typography.Text>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.text.primary,
                  letterSpacing: "-1px",
                }}
              >
                {stats.hasMemory}
              </span>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 自动检测区域 */}
      <Typography.Title
        level={5}
        style={{ color: COLORS.text.secondary, marginBottom: 12, fontWeight: 500 }}
      >
        自动检测
      </Typography.Title>

      {loading ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
          {builtin.map((agent) => {
            const isSelected = selected.has(agent.name);
            return (
              <div
                key={agent.name}
                onClick={() => agent.installed && toggleAgent(agent.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderRadius: 6,
                  background: isSelected
                    ? `${COLORS.accent.blue}10`
                    : COLORS.bg.card,
                  border: `1px solid ${
                    isSelected ? `${COLORS.accent.blue}30` : COLORS.border.default
                  }`,
                  cursor: agent.installed ? "pointer" : "default",
                  opacity: agent.installed ? 1 : 0.45,
                  transition: "all 0.15s ease",
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: agent.installed
                        ? COLORS.accent.green
                        : COLORS.border.default,
                    }}
                  />
                  <span style={{ color: COLORS.text.primary, fontSize: 14 }}>
                    {agent.display_name}
                  </span>
                  <Tag
                    style={{
                      fontSize: 11,
                      color: COLORS.text.tertiary,
                      background: COLORS.bg.elevated,
                      border: "none",
                    }}
                  >
                    {agent.category}
                  </Tag>
                </Space>
                <Space size={8}>
                  {statusTag(agent.memory_status)}
                  {agent.installed && !isSelected && (
                    <Tag style={{ fontSize: 11, color: COLORS.text.tertiary }}>
                      忽略
                    </Tag>
                  )}
                  {agent.installed && isSelected && (
                    <Tag
                      color="blue"
                      style={{ fontSize: 11, borderRadius: 4 }}
                    >
                      已选
                    </Tag>
                  )}
                </Space>
              </div>
            );
          })}
        </div>
      )}

      {/* 自定义 Agent 区域 */}
      <Typography.Title
        level={5}
        style={{ color: COLORS.text.secondary, marginBottom: 12, fontWeight: 500 }}
      >
        自定义 Agent
      </Typography.Title>
      {custom.length === 0 ? (
        <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 13, display: "block", marginBottom: 24 }}>
          暂无自定义 Agent，点击右上角「添加自定义」
        </Typography.Text>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
          {custom.map((agent) => (
            <div
              key={agent.custom_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderRadius: 6,
                background: COLORS.bg.card,
                border: `1px solid ${COLORS.border.default}`,
              }}
            >
              <Space>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: COLORS.accent.green,
                  }}
                />
                <span style={{ color: COLORS.text.primary, fontSize: 14 }}>
                  {agent.display_name}
                </span>
              </Space>
              <Space size={8}>{statusTag(agent.memory_status)}</Space>
            </div>
          ))}
        </div>
      )}

      {/* 确认管理按钮 */}
      {selected.size > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 24,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Button
            type="primary"
            size="large"
            onClick={confirmManage}
            style={{ minWidth: 300, height: 44, fontSize: 15 }}
          >
            确认管理 {selected.size} 个 Agent
          </Button>
        </div>
      )}

      {/* 添加自定义 Agent 弹窗 */}
      <Modal
        title="添加自定义 Agent"
        open={addModal}
        onOk={addCustom}
        onCancel={() => setAddModal(false)}
        okText="添加"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: "100%", marginTop: 12 }} size={12}>
          <Input
            placeholder="Agent 名称（必填）"
            value={newAgent.name}
            onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
          />
          <Select
            placeholder="类型"
            style={{ width: "100%" }}
            value={newAgent.type}
            onChange={(v) => setNewAgent({ ...newAgent, type: v })}
            options={[
              { value: "IDE", label: "IDE" },
              { value: "terminal", label: "终端" },
              { value: "framework", label: "框架" },
              { value: "other", label: "其他" },
            ]}
          />
          <Input
            placeholder="MCP 配置目录（可选）"
            value={newAgent.mcp_config_dir}
            onChange={(e) =>
              setNewAgent({ ...newAgent, mcp_config_dir: e.target.value })
            }
          />
          <Input
            placeholder="项目目录（可选）"
            value={newAgent.project_dir}
            onChange={(e) =>
              setNewAgent({ ...newAgent, project_dir: e.target.value })
            }
          />
        </Space>
      </Modal>
    </div>
  );
}
