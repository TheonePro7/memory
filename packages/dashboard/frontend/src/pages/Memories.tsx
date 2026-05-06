import React, { useEffect, useState } from "react";
import { Input, Table, Tag, Typography, Space, Select, Button, Modal, Divider, Tooltip } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined, FolderOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { COLORS } from "../theme";

interface Memory {
  id?: string;
  memory?: string;
  score?: number;
  source?: string;
  metadata?: Record<string, string>;
}

export default function Memories() {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | undefined>(undefined);
  const [agentFilter, setAgentFilter] = useState<string | undefined>(undefined);
  const [agentOptions, setAgentOptions] = useState<string[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<string[]>([]);
  const [quota, setQuota] = useState({ used: 0, total: 100, remaining: 100, bonus: 0 });
  const [installId, setInstallId] = useState("");

  const search = (q: string, pid?: string, agent?: string) => {
    setLoading(true);
    setQuery(q);
    let url = `/api/memories?q=${encodeURIComponent(q)}&limit=50`;
    if (pid) url += `&project_id=${encodeURIComponent(pid)}`;
    if (agent) url += `&agent=${encodeURIComponent(agent)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setMemories(data.results || []);
        const pids = new Set<string>();
        (data.results || []).forEach((m: Memory) => {
          const pid = m.metadata?.project_id;
          if (pid) pids.add(pid);
        });
        setProjects((prev) => [...new Set([...prev, ...pids])].sort());
      })
      .catch(() => setMemories([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    search("", projectFilter, agentFilter);
  }, []);

  useEffect(() => {
    fetch("/api/quota").then(r => r.json()).then(setQuota);
    fetch("/api/install-id").then(r => r.json()).then(d => setInstallId(d.id)).catch(() => {});
    fetch("/api/agents/scan").then(r => r.json()).then(data => {
      const agents = [...(data.builtin || []), ...(data.custom || [])]
        .filter((a: any) => a.installed)
        .map((a: any) => a.name);
      setAgentOptions(agents);
    }).catch(() => {});
  }, []);

  const handleProjectChange = (value: string | null) => {
    const pid = value ?? undefined;
    setProjectFilter(pid);
    search(query, pid, agentFilter);
  };

  const handleAgentChange = (value: string | null) => {
    const agent = value ?? undefined;
    setAgentFilter(agent);
    search(query, projectFilter, agent);
  };

  const [editModal, setEditModal] = useState<{ visible: boolean; memory: Memory | null }>({ visible: false, memory: null });
  const [editContent, setEditContent] = useState("");

  const handleDelete = (memory: Memory) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除这条记忆吗？\n"${(memory.memory || "").slice(0, 50)}..."`,
      style: { background: COLORS.bg.card },
      onOk: async () => {
        if (!(await checkQuota())) return;
        const res = await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
        if (res.status === 403 || res.status === 404) return;
        setQuota(await fetch("/api/quota").then(r => r.json()));
        search(query, projectFilter, agentFilter);
      },
    });
  };

  const checkQuota = async (): Promise<boolean> => {
    const res = await fetch("/api/quota").then(r => r.json());
    if (res.remaining <= 0) {
      Modal.info({
        title: "本月免费编辑次数已用完",
        content: (
          <div>
            <p>邀请朋友安装，每成功一位 +50 次：</p>
            <Input value={installId} readOnly style={{ marginBottom: 16 }} />
            <Divider />
            <p>或升级 Pro 获得无限编辑 (即将上线)</p>
          </div>
        ),
      });
      return false;
    }
    return true;
  };

  const columns: ColumnsType<Memory> = [
    {
      title: "内容",
      dataIndex: "memory",
      key: "memory",
      ellipsis: true,
      render: (t: string, r: Memory) => {
        const display = r.metadata?.llm_summary || t;
        return (
          <Tooltip title={t}>
            <span style={{ color: COLORS.text.primary, fontSize: 13.5 }}>{display}</span>
          </Tooltip>
        );
      },
    },
    {
      title: "实体",
      key: "entities",
      width: 160,
      render: (_: unknown, r: Memory) => {
        const entities = r.metadata?.entities;
        if (!entities) return null;
        return entities.split(",").map((e, i) => (
          <Tag key={i} color="blue" style={{ marginBottom: 2, fontSize: 12 }}>{e.trim()}</Tag>
        ));
      },
    },
    {
      title: "项目",
      key: "project",
      width: 110,
      render: (_: unknown, r: Memory) => {
        const pid = r.metadata?.project_id;
        return pid ? <Tag icon={<FolderOutlined />} style={{ fontSize: 12 }}>{pid}</Tag> : null;
      },
    },
    {
      title: "Agent",
      key: "agent",
      width: 100,
      render: (_: unknown, r: Memory) => {
        const agent = r.metadata?.agent;
        return agent ? <Tag style={{ fontSize: 11, color: COLORS.text.secondary, background: COLORS.bg.elevated }}>{agent}</Tag> : <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>--</span>;
      },
    },
    {
      title: "时间",
      key: "created_at",
      width: 170,
      render: (_: unknown, r: Memory) => {
        const ts = r.metadata?.created_at;
        if (!ts) return <span style={{ color: COLORS.text.tertiary }}>--</span>;
        const d = new Date(ts);
        return (
          <span style={{ color: COLORS.text.secondary, fontSize: 13 }}>
            {d.toLocaleString("zh-CN", {
              year: "numeric", month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        );
      },
    },
    {
      title: "相关性",
      dataIndex: "score",
      key: "score",
      width: 70,
      render: (s: number) => (
        <span style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
          {s ? s.toFixed(2) : "--"}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_: unknown, r: Memory) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ fontSize: 14 }} />}
              onClick={() => {
                setEditContent(r.memory || "");
                setEditModal({ visible: true, memory: r });
              }}
              style={{ color: COLORS.text.secondary }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined style={{ fontSize: 14 }} />}
              onClick={() => handleDelete(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <Typography.Title
        level={3}
        style={{ margin: "0 0 20px 0", color: COLORS.text.primary, fontWeight: 600 }}
      >
        记忆
      </Typography.Title>

      {/* 工具栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <Space size={12}>
          <Input.Search
            placeholder="搜索记忆内容..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onSearch={(v) => search(v, projectFilter)}
            style={{ width: 300 }}
            prefix={<SearchOutlined style={{ color: COLORS.text.tertiary }} />}
          />
          <Select
            allowClear
            placeholder="筛选项目"
            style={{ width: 150 }}
            value={projectFilter}
            onChange={handleProjectChange}
            options={projects.map((p) => ({ value: p, label: p }))}
          />
          <Select
            allowClear
            placeholder="筛选 Agent"
            style={{ width: 150 }}
            value={agentFilter}
            onChange={handleAgentChange}
            options={agentOptions.map((a) => ({ value: a, label: a }))}
          />
        </Space>
        <Tag
          style={{
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: 20,
            border: `1px solid ${quota.remaining > 10 ? COLORS.accent.blue : COLORS.accent.orange}`,
            background: "transparent",
            color: quota.remaining > 10 ? COLORS.accent.blue : COLORS.accent.orange,
          }}
        >
          编辑 {quota.used}/{quota.total} {quota.bonus > 0 ? `+${quota.bonus}` : ""}
        </Tag>
      </div>

      {/* 记忆表格 */}
      <Table
        dataSource={memories}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 20, size: "small" }}
        rowKey={(r) => r.id || r.memory || Math.random().toString()}
        size="middle"
      />

      {/* 编辑弹窗 */}
      <Modal
        title={<span style={{ color: COLORS.text.primary }}>编辑记忆</span>}
        open={editModal.visible}
        onOk={async () => {
          if (!editModal.memory?.id) return;
          if (!(await checkQuota())) return;
          const res = await fetch(`/api/memories/${editModal.memory.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: editContent }),
          });
          if (res.status === 403 || res.status === 404) return;
          setQuota(await fetch("/api/quota").then(r => r.json()));
          setEditModal({ visible: false, memory: null });
          search(query, projectFilter, agentFilter);
        }}
        onCancel={() => setEditModal({ visible: false, memory: null })}
        okText="保存"
        cancelText="取消"
        style={{ background: COLORS.bg.card }}
      >
        <Input.TextArea
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          rows={4}
          style={{ marginTop: 12 }}
        />
      </Modal>
    </div>
  );
}
