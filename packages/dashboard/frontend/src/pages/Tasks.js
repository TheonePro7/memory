import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Typography, Table, Tag, Select, Card, Row, Col, Modal, Space, Tooltip, Button } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, InboxOutlined, EyeOutlined, } from "@ant-design/icons";
import { COLORS } from "../theme";
const statusMeta = {
    todo: { label: "待办", color: COLORS.text.tertiary, icon: _jsx(InboxOutlined, {}) },
    in_progress: { label: "进行中", color: COLORS.accent.blue, icon: _jsx(ClockCircleOutlined, {}) },
    blocked: { label: "阻塞", color: COLORS.accent.red, icon: _jsx(ExclamationCircleOutlined, {}) },
    done: { label: "已完成", color: COLORS.accent.green, icon: _jsx(CheckCircleOutlined, {}) },
};
export default function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState(undefined);
    const [selectedTask, setSelectedTask] = useState(null);
    const fetchTasks = (status) => {
        setLoading(true);
        let url = "/api/tasks";
        const params = new URLSearchParams();
        if (status)
            params.set("status", status);
        const qs = params.toString();
        if (qs)
            url += "?" + qs;
        fetch(url)
            .then((r) => r.json())
            .then((data) => setTasks(data.tasks || []))
            .catch(() => setTasks([]))
            .finally(() => setLoading(false));
    };
    useEffect(() => { fetchTasks(statusFilter); }, []);
    const statusCounts = {
        todo: tasks.filter((t) => t.status === "todo").length,
        in_progress: tasks.filter((t) => t.status === "in_progress").length,
        blocked: tasks.filter((t) => t.status === "blocked").length,
        done: tasks.filter((t) => t.status === "done").length,
    };
    const columns = [
        {
            title: "标题",
            dataIndex: "title",
            key: "title",
            render: (t, r) => (_jsx("a", { onClick: () => setSelectedTask(r), style: { color: COLORS.text.primary, fontSize: 13.5 }, children: t })),
        },
        {
            title: "状态",
            dataIndex: "status",
            key: "status",
            width: 110,
            render: (s) => {
                const meta = statusMeta[s];
                if (!meta)
                    return _jsx(Tag, { children: s });
                return (_jsx(Tag, { style: {
                        background: `${meta.color}15`,
                        color: meta.color,
                        border: `1px solid ${meta.color}30`,
                        borderRadius: 4,
                        fontSize: 12,
                        padding: "2px 8px",
                    }, children: _jsxs(Space, { size: 4, children: [meta.icon, meta.label] }) }));
            },
        },
        {
            title: "来源",
            dataIndex: "source",
            key: "source",
            width: 70,
            render: (s) => (_jsx(Tag, { style: { fontSize: 11, color: COLORS.text.tertiary, background: COLORS.bg.elevated }, children: s === "beads" ? "B" : "M" })),
        },
        {
            title: "标签",
            key: "tags",
            dataIndex: "tags",
            width: 150,
            render: (tags) => tags?.map((t, i) => (_jsx(Tag, { style: { fontSize: 11, marginBottom: 2 }, children: t }, i))),
        },
        {
            title: "更新时间",
            dataIndex: "updated_at",
            key: "updated_at",
            width: 110,
            render: (t) => (_jsx("span", { style: { color: COLORS.text.tertiary, fontSize: 12 }, children: t?.slice(0, 10) })),
        },
        {
            title: "",
            key: "actions",
            width: 50,
            render: (_, r) => (_jsx(Tooltip, { title: "\u67E5\u770B\u8BE6\u60C5", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(EyeOutlined, { style: { fontSize: 14 } }), onClick: () => setSelectedTask(r), style: { color: COLORS.text.secondary } }) })),
        },
    ];
    return (_jsxs("div", { children: [_jsx(Typography.Title, { level: 3, style: { margin: "0 0 20px 0", color: COLORS.text.primary, fontWeight: 600 }, children: "\u4EFB\u52A1" }), _jsx(Row, { gutter: 16, style: { marginBottom: 20 }, children: Object.entries(statusCounts).map(([status, count]) => {
                    const meta = statusMeta[status];
                    if (!meta)
                        return null;
                    return (_jsx(Col, { span: 6, children: _jsx(Card, { styles: { body: { padding: "16px 20px" } }, style: {
                                background: COLORS.bg.card,
                                borderLeft: `3px solid ${meta.color}`,
                            }, children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsx(Typography.Text, { style: {
                                            fontSize: 12,
                                            color: COLORS.text.secondary,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                        }, children: meta.label }), _jsxs(Space, { size: 8, align: "center", children: [_jsx("span", { style: { fontSize: 13, color: meta.color }, children: meta.icon }), _jsx("span", { style: {
                                                    fontSize: 26,
                                                    fontWeight: 600,
                                                    color: COLORS.text.primary,
                                                    letterSpacing: "-1px",
                                                    lineHeight: 1,
                                                }, children: count })] })] }) }) }, status));
                }) }), _jsx("div", { style: { marginBottom: 16 }, children: _jsx(Select, { allowClear: true, placeholder: "\u7B5B\u9009\u72B6\u6001", style: { width: 160 }, value: statusFilter, onChange: (v) => { setStatusFilter(v ?? undefined); fetchTasks(v ?? undefined); }, options: Object.entries(statusMeta).map(([value, meta]) => ({
                        value,
                        label: meta.label,
                    })) }) }), _jsx(Table, { dataSource: tasks, columns: columns, loading: loading, pagination: { pageSize: 20, size: "small" }, rowKey: "id", size: "middle" }), _jsx(Modal, { title: _jsx("span", { style: { color: COLORS.text.primary }, children: selectedTask?.title }), open: !!selectedTask, onCancel: () => setSelectedTask(null), footer: null, width: 600, style: { background: COLORS.bg.card }, children: selectedTask && (_jsx("div", { children: _jsxs(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [_jsxs("div", { children: [_jsx("span", { style: { color: COLORS.text.tertiary, fontSize: 12 }, children: "\u72B6\u6001\uFF1A" }), _jsx("span", { style: { color: COLORS.text.secondary, fontSize: 13 }, children: statusMeta[selectedTask.status]?.label || selectedTask.status })] }), _jsxs("div", { children: [_jsx("span", { style: { color: COLORS.text.tertiary, fontSize: 12 }, children: "\u6765\u6E90\uFF1A" }), _jsx("span", { style: { color: COLORS.text.secondary, fontSize: 13 }, children: selectedTask.source === "beads" ? "beads" : "agent-memory" })] }), selectedTask.events && selectedTask.events.length > 0 && (_jsxs("div", { children: [_jsx(Typography.Text, { style: {
                                            fontSize: 13,
                                            color: COLORS.text.secondary,
                                            fontWeight: 500,
                                            display: "block",
                                            marginBottom: 8,
                                        }, children: "\u4E8B\u4EF6\u6D41" }), _jsx(Space, { direction: "vertical", size: 6, style: { width: "100%" }, children: selectedTask.events.map((e, i) => (_jsxs("div", { style: {
                                                padding: "10px 12px",
                                                borderRadius: 6,
                                                background: COLORS.bg.elevated,
                                                border: `1px solid ${COLORS.border.default}`,
                                            }, children: [_jsxs(Space, { size: 8, children: [_jsx(Tag, { style: { fontSize: 11, margin: 0 }, children: e.type }), _jsx("span", { style: { color: COLORS.text.secondary, fontSize: 13 }, children: e.content })] }), _jsx("div", { style: { fontSize: 11, color: COLORS.text.tertiary, marginTop: 4 }, children: e.created_at?.slice(0, 16) })] }, i))) })] })), selectedTask.artifacts && selectedTask.artifacts.length > 0 && (_jsxs("div", { children: [_jsx(Typography.Text, { style: {
                                            fontSize: 13,
                                            color: COLORS.text.secondary,
                                            fontWeight: 500,
                                            display: "block",
                                            marginBottom: 8,
                                        }, children: "\u4EA7\u51FA\u7269" }), _jsx(Space, { size: 6, wrap: true, children: selectedTask.artifacts.map((a, i) => (_jsxs(Tag, { color: "green", style: { fontSize: 12 }, children: [a.kind, ": ", a.reference] }, i))) })] }))] }) })) })] }));
}
