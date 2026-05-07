import React, { useEffect, useState, useRef, useMemo } from "react";
import { apiFetch } from "../api";
import { getCache, setCache } from "../cache";
import { Input, Table, Tag, Typography, Space, Select, Button, Modal, Divider, Tooltip, message } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined, FolderOutlined, PlusOutlined, DownloadOutlined, UploadOutlined } from "@ant-design/icons";
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
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [quota, setQuota] = useState({ used: 0, total: 100, remaining: 100, bonus: 0 });
  const [installId, setInstallId] = useState("");

  const search = (q: string, pid?: string, agent?: string) => {
    setLoading(true);
    setQuery(q);
    let url = `/api/memories?q=${encodeURIComponent(q)}&limit=50`;
    if (pid) url += `&project_id=${encodeURIComponent(pid)}`;
    if (agent) url += `&agent=${encodeURIComponent(agent)}`;

    const cached = getCache<{ results: Memory[]; total: number }>(url);
    if (cached) {
      setMemories(cached.results);
      setTotalResults(cached.total);
      setLoading(false);
      return;
    }

    apiFetch<{ results: Memory[]; total: number }>(url)
      .then((data) => {
        const results = data.results || [];
        setMemories(results);
        setTotalResults(data.total || results.length);
        setCache(url, data);
        const pids = new Set<string>();
        results.forEach((m: Memory) => {
          const pid = m.metadata?.project_id;
          if (pid) pids.add(pid);
        });
        setProjects((prev) => [...new Set([...prev, ...pids])].sort());
      })
      .catch(() => { setMemories([]); message.error("记忆搜索失败"); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    search("", projectFilter, agentFilter);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    fetch("/api/quota").then(r => r.json()).then(setQuota);
    fetch("/api/install-id").then(r => r.json()).then(d => setInstallId(d.id)).catch(() => {});
    fetch("/api/agents").then(r => r.json()).then(data => {
      const agents = (data.agents || []).map((a: any) => a.name);
      setAgentOptions(agents);
    }).catch(() => message.error("Agent 列表加载失败"));
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
  const [saving, setSaving] = useState(false);

  const handleDelete = (memory: Memory) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除这条记忆吗？\n"${(memory.memory || "").slice(0, 50)}..."`,
      style: { background: COLORS.bg.card },
      styles: { body: { background: COLORS.bg.card } },
      onOk: async () => {
        if (!(await checkQuota())) return;
        try {
          const res = await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
          if (res.status === 403) { message.error("无权限删除"); return; }
          if (res.status === 404) { message.error("记忆不存在或已被删除"); return; }
          if (!res.ok) return;
        } catch {
          message.error("网络错误，删除失败");
          return;
        }
        setQuota(await fetch("/api/quota").then(r => r.json()).catch(() => ({ used: 0, total: 100, remaining: 100, bonus: 0 })));
        message.success("记忆已删除");
        search(query, projectFilter, agentFilter);
      },
    });
  };

  const checkQuota = async (): Promise<boolean> => {
    const res = await fetch("/api/quota").then(r => r.json());
    if (res.remaining <= 0) {
      Modal.info({
        title: "本月免费编辑次数已用完",
        width: 440,
        content: (
          <div>
            <p style={{ marginBottom: 12, fontWeight: 500, color: COLORS.text.primary }}>
              🔥 邀请朋友安装，每成功一位 +50 次
            </p>
            <Input value={installId} readOnly style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: COLORS.text.tertiary, marginBottom: 16 }}>
              已获得加成: +{res.bonus} 次
            </p>
            <Divider />
            <p style={{ fontWeight: 500, color: COLORS.text.primary, marginBottom: 8 }}>
              或升级 Pro 获得无限编辑
            </p>
            <ul style={{ fontSize: 13, color: COLORS.text.secondary, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>无限编辑和删除</li>
              <li>批量清理和管理</li>
              <li>优先级标记</li>
            </ul>
            <p style={{ fontSize: 20, fontWeight: 700, color: COLORS.accent.blue, margin: "12px 0", textAlign: "center" }}>
              $15 / 月
            </p>
          </div>
        ),
      });
      return false;
    }
    return true;
  };

  const columns: ColumnsType<Memory> = useMemo(() => [
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
  ], []);

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
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <Space size={12} wrap>
          <Input.Search
            placeholder="搜索记忆内容..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                search(e.target.value, projectFilter, agentFilter);
              }, 300);
            }}
            onSearch={(v) => search(v, projectFilter, agentFilter)}
            style={{ width: "min(300px, 100%)", maxWidth: 300 }}
            prefix={<SearchOutlined style={{ color: COLORS.text.tertiary }} />}
          />
          <span style={{ fontSize: 13, color: COLORS.text.tertiary, whiteSpace: "nowrap" }}>
            共 {totalResults} 条
          </span>
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
        <Space size={8}>
          <Tooltip title="导出记忆">
            <Button
              icon={<DownloadOutlined />}
              onClick={async () => {
                const res = await fetch("/api/memories/export").then(r => r.json());
                const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `agent-memories-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              size="small"
              style={{ color: COLORS.text.secondary }}
            />
          </Tooltip>
          <Tooltip title="导入记忆">
            <Button
              icon={<UploadOutlined />}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".json";
                input.onchange = async (e: any) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  try {
                    const data = JSON.parse(text);
                    if (!data.memories) { message.error("无效的导入文件格式"); return; }
                    const res = await fetch("/api/memories/import", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    });
                    const result = await res.json();
                    Modal.success({
                      title: "导入完成",
                      content: `成功导入 ${result.imported} 条，失败 ${result.errors} 条`,
                    });
                    search(query, projectFilter, agentFilter);
                  } catch {
                    message.error("无效的 JSON 文件");
                  }
                };
                input.click();
              }}
              size="small"
              style={{ color: COLORS.text.secondary }}
            />
          </Tooltip>
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
        </Space>
      </div>

      {/* 记忆表格 */}
      <div style={{ overflowX: "auto" }}>
      <Table
        dataSource={memories}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 20, size: "small" }}
        rowKey={(r) => r.id || r.memory || `mem-${Math.random()}`}
        locale={{
          emptyText: memories.length === 0 && !loading ? (
            <div style={{ padding: "32px 0", color: COLORS.text.tertiary }}>
              <p style={{ fontSize: 15, marginBottom: 8 }}>你的 Agent 还没有记住任何信息</p>
              <p style={{ fontSize: 13 }}>使用 Agent 工作时，关键信息会自动记录到这里</p>
            </div>
          ) : undefined,
        }}
        size="middle"
      />
      </div>

      {/* 编辑弹窗 */}
      <Modal
        title={<span style={{ color: COLORS.text.primary }}>编辑记忆</span>}
        open={editModal.visible}
        onOk={async () => {
          if (!editModal.memory?.id) return;
          if (!(await checkQuota())) return;
          setSaving(true);
          try {
            const res = await fetch(`/api/memories/${editModal.memory.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: editContent }),
            });
            if (res.status === 403) { message.error("无权限编辑"); setSaving(false); return; }
            if (res.status === 404) { message.error("记忆不存在或已被删除"); setSaving(false); return; }
            if (!res.ok) { setSaving(false); return; }
          } catch {
            message.error("网络错误，编辑失败");
            setSaving(false);
            return;
          }
          setQuota(await fetch("/api/quota").then(r => r.json()).catch(() => ({ used: 0, total: 100, remaining: 100, bonus: 0 })));
          setEditModal({ visible: false, memory: null });
          message.success("记忆已更新");
          search(query, projectFilter, agentFilter);
          setSaving(false);
        }}
        onCancel={() => { setEditModal({ visible: false, memory: null }); setSaving(false); }}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ loading: saving }}
        styles={{ body: { background: COLORS.bg.card } }}
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
