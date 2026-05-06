import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Input, Table, Tag, Typography, Space, Select, Button, Modal, Divider, Tooltip } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from "@ant-design/icons";
import { COLORS } from "../theme";
export default function Memories() {
    const [query, setQuery] = useState("");
    const [projectFilter, setProjectFilter] = useState(undefined);
    const [agentFilter, setAgentFilter] = useState(undefined);
    const [agentOptions, setAgentOptions] = useState([]);
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [quota, setQuota] = useState({ used: 0, total: 100, remaining: 100, bonus: 0 });
    const [installId, setInstallId] = useState("");
    const search = (q, pid, agent) => {
        setLoading(true);
        setQuery(q);
        let url = `/api/memories?q=${encodeURIComponent(q)}&limit=50`;
        if (pid)
            url += `&project_id=${encodeURIComponent(pid)}`;
        if (agent)
            url += `&agent=${encodeURIComponent(agent)}`;
        fetch(url)
            .then((r) => r.json())
            .then((data) => {
            setMemories(data.results || []);
            const pids = new Set();
            (data.results || []).forEach((m) => {
                const pid = m.metadata?.project_id;
                if (pid)
                    pids.add(pid);
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
        fetch("/api/install-id").then(r => r.json()).then(d => setInstallId(d.id)).catch(() => { });
        fetch("/api/agents/scan").then(r => r.json()).then(data => {
            const agents = [...(data.builtin || []), ...(data.custom || [])]
                .filter((a) => a.installed)
                .map((a) => a.name);
            setAgentOptions(agents);
        }).catch(() => { });
    }, []);
    const handleProjectChange = (value) => {
        const pid = value ?? undefined;
        setProjectFilter(pid);
        search(query, pid, agentFilter);
    };
    const handleAgentChange = (value) => {
        const agent = value ?? undefined;
        setAgentFilter(agent);
        search(query, projectFilter, agent);
    };
    const [editModal, setEditModal] = useState({ visible: false, memory: null });
    const [editContent, setEditContent] = useState("");
    const handleDelete = (memory) => {
        Modal.confirm({
            title: "确认删除",
            content: `确定要删除这条记忆吗？\n"${(memory.memory || "").slice(0, 50)}..."`,
            style: { background: COLORS.bg.card },
            onOk: async () => {
                if (!(await checkQuota()))
                    return;
                const res = await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
                if (res.status === 403 || res.status === 404)
                    return;
                setQuota(await fetch("/api/quota").then(r => r.json()));
                search(query, projectFilter, agentFilter);
            },
        });
    };
    const checkQuota = async () => {
        const res = await fetch("/api/quota").then(r => r.json());
        if (res.remaining <= 0) {
            Modal.info({
                title: "本月免费编辑次数已用完",
                content: (_jsxs("div", { children: [_jsx("p", { children: "\u9080\u8BF7\u670B\u53CB\u5B89\u88C5\uFF0C\u6BCF\u6210\u529F\u4E00\u4F4D +50 \u6B21\uFF1A" }), _jsx(Input, { value: installId, readOnly: true, style: { marginBottom: 16 } }), _jsx(Divider, {}), _jsx("p", { children: "\u6216\u5347\u7EA7 Pro \u83B7\u5F97\u65E0\u9650\u7F16\u8F91 (\u5373\u5C06\u4E0A\u7EBF)" })] })),
            });
            return false;
        }
        return true;
    };
    const columns = [
        {
            title: "内容",
            dataIndex: "memory",
            key: "memory",
            ellipsis: true,
            render: (t, r) => {
                const display = r.metadata?.llm_summary || t;
                return (_jsx(Tooltip, { title: t, children: _jsx("span", { style: { color: COLORS.text.primary, fontSize: 13.5 }, children: display }) }));
            },
        },
        {
            title: "实体",
            key: "entities",
            width: 160,
            render: (_, r) => {
                const entities = r.metadata?.entities;
                if (!entities)
                    return null;
                return entities.split(",").map((e, i) => (_jsx(Tag, { color: "blue", style: { marginBottom: 2, fontSize: 12 }, children: e.trim() }, i)));
            },
        },
        {
            title: "项目",
            key: "project",
            width: 110,
            render: (_, r) => {
                const pid = r.metadata?.project_id;
                return pid ? _jsx(Tag, { icon: _jsx(FolderOutlined, {}), style: { fontSize: 12 }, children: pid }) : null;
            },
        },
        {
            title: "Agent",
            key: "agent",
            width: 100,
            render: (_, r) => {
                const agent = r.metadata?.agent;
                return agent ? _jsx(Tag, { style: { fontSize: 11, color: COLORS.text.secondary, background: COLORS.bg.elevated }, children: agent }) : _jsx("span", { style: { color: COLORS.text.tertiary, fontSize: 12 }, children: "--" });
            },
        },
        {
            title: "时间",
            key: "created_at",
            width: 170,
            render: (_, r) => {
                const ts = r.metadata?.created_at;
                if (!ts)
                    return _jsx("span", { style: { color: COLORS.text.tertiary }, children: "--" });
                const d = new Date(ts);
                return (_jsx("span", { style: { color: COLORS.text.secondary, fontSize: 13 }, children: d.toLocaleString("zh-CN", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                    }) }));
            },
        },
        {
            title: "相关性",
            dataIndex: "score",
            key: "score",
            width: 70,
            render: (s) => (_jsx("span", { style: { color: COLORS.text.tertiary, fontSize: 12 }, children: s ? s.toFixed(2) : "--" })),
        },
        {
            title: "",
            key: "actions",
            width: 80,
            render: (_, r) => (_jsxs(Space, { size: 4, children: [_jsx(Tooltip, { title: "\u7F16\u8F91", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(EditOutlined, { style: { fontSize: 14 } }), onClick: () => {
                                setEditContent(r.memory || "");
                                setEditModal({ visible: true, memory: r });
                            }, style: { color: COLORS.text.secondary } }) }), _jsx(Tooltip, { title: "\u5220\u9664", children: _jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, { style: { fontSize: 14 } }), onClick: () => handleDelete(r) }) })] })),
        },
    ];
    return (_jsxs("div", { children: [_jsx(Typography.Title, { level: 3, style: { margin: "0 0 20px 0", color: COLORS.text.primary, fontWeight: 600 }, children: "\u8BB0\u5FC6" }), _jsxs("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                    gap: 12,
                }, children: [_jsxs(Space, { size: 12, children: [_jsx(Input.Search, { placeholder: "\u641C\u7D22\u8BB0\u5FC6\u5185\u5BB9...", value: query, onChange: (e) => setQuery(e.target.value), onSearch: (v) => search(v, projectFilter), style: { width: 300 }, prefix: _jsx(SearchOutlined, { style: { color: COLORS.text.tertiary } }) }), _jsx(Select, { allowClear: true, placeholder: "\u7B5B\u9009\u9879\u76EE", style: { width: 150 }, value: projectFilter, onChange: handleProjectChange, options: projects.map((p) => ({ value: p, label: p })) }), _jsx(Select, { allowClear: true, placeholder: "\u7B5B\u9009 Agent", style: { width: 150 }, value: agentFilter, onChange: handleAgentChange, options: agentOptions.map((a) => ({ value: a, label: a })) })] }), _jsxs(Tag, { style: {
                            fontSize: 12,
                            padding: "4px 12px",
                            borderRadius: 20,
                            border: `1px solid ${quota.remaining > 10 ? COLORS.accent.blue : COLORS.accent.orange}`,
                            background: "transparent",
                            color: quota.remaining > 10 ? COLORS.accent.blue : COLORS.accent.orange,
                        }, children: ["\u7F16\u8F91 ", quota.used, "/", quota.total, " ", quota.bonus > 0 ? `+${quota.bonus}` : ""] })] }), _jsx(Table, { dataSource: memories, columns: columns, loading: loading, pagination: { pageSize: 20, size: "small" }, rowKey: (r) => r.id || r.memory || Math.random().toString(), size: "middle" }), _jsx(Modal, { title: _jsx("span", { style: { color: COLORS.text.primary }, children: "\u7F16\u8F91\u8BB0\u5FC6" }), open: editModal.visible, onOk: async () => {
                    if (!editModal.memory?.id)
                        return;
                    if (!(await checkQuota()))
                        return;
                    const res = await fetch(`/api/memories/${editModal.memory.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ content: editContent }),
                    });
                    if (res.status === 403 || res.status === 404)
                        return;
                    setQuota(await fetch("/api/quota").then(r => r.json()));
                    setEditModal({ visible: false, memory: null });
                    search(query, projectFilter, agentFilter);
                }, onCancel: () => setEditModal({ visible: false, memory: null }), okText: "\u4FDD\u5B58", cancelText: "\u53D6\u6D88", style: { background: COLORS.bg.card }, children: _jsx(Input.TextArea, { value: editContent, onChange: e => setEditContent(e.target.value), rows: 4, style: { marginTop: 12 } }) })] }));
}
