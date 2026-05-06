import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Typography, Card, Space, Tag, Divider } from "antd";
import { COLORS } from "../theme";
export default function Settings() {
    const [installId, setInstallId] = useState("");
    useEffect(() => {
        fetch("/api/install-id")
            .then((r) => r.json())
            .then((d) => setInstallId(d.id))
            .catch(() => { });
    }, []);
    const agents = [
        { name: "Claude Code", installed: true, hasMemory: true },
        { name: "Cursor", installed: false, hasMemory: false },
        { name: "Trae", installed: false, hasMemory: false },
        { name: "OpenClaw", installed: false, hasMemory: false },
        { name: "LangGraph", installed: false, hasMemory: false },
    ];
    return (_jsxs("div", { children: [_jsx(Typography.Title, { level: 3, style: { margin: "0 0 24px 0", color: COLORS.text.primary, fontWeight: 600 }, children: "\u8BBE\u7F6E" }), _jsx(Card, { title: _jsx("span", { style: { color: COLORS.text.primary, fontSize: 14, fontWeight: 500 }, children: "\u7CFB\u7EDF\u4FE1\u606F" }), styles: { body: { padding: "20px 24px" } }, style: { marginBottom: 20, background: COLORS.bg.card }, children: _jsx(Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [
                        { label: "版本", value: "1.0.0" },
                        { label: "安装 ID", value: installId || "--" },
                        { label: "MCP 端口", value: "8710" },
                        { label: "Dashboard 端口", value: "8712" },
                        { label: "记忆后端", value: "mem0 (ChromaDB)" },
                        { label: "日志后端", value: "Markdown (memory/)" },
                    ].map((item) => (_jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 0",
                            borderBottom: `1px solid ${COLORS.border.default}`,
                        }, children: [_jsx("span", { style: { color: COLORS.text.secondary, fontSize: 13.5 }, children: item.label }), _jsx("span", { style: { color: COLORS.text.primary, fontSize: 13.5, fontWeight: 500 }, children: item.value })] }, item.label))) }) }), _jsx(Card, { title: _jsx("span", { style: { color: COLORS.text.primary, fontSize: 14, fontWeight: 500 }, children: "Agent \u68C0\u6D4B" }), styles: { body: { padding: "20px 24px" } }, style: { marginBottom: 20, background: COLORS.bg.card }, children: _jsxs(Space, { direction: "vertical", size: 8, style: { width: "100%" }, children: [agents.map((agent) => (_jsxs("div", { style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                borderRadius: 6,
                                background: COLORS.bg.elevated,
                                border: `1px solid ${COLORS.border.default}`,
                            }, children: [_jsx("span", { style: { color: COLORS.text.primary, fontSize: 13.5 }, children: agent.name }), _jsxs(Space, { size: 8, children: [_jsx(Tag, { style: {
                                                fontSize: 11,
                                                color: agent.installed ? COLORS.accent.green : COLORS.text.tertiary,
                                                background: agent.installed ? `${COLORS.accent.green}15` : "transparent",
                                                border: `1px solid ${agent.installed ? `${COLORS.accent.green}30` : COLORS.border.default}`,
                                            }, children: agent.installed ? "已安装" : "未检测到" }), agent.installed && (_jsx(Tag, { style: {
                                                fontSize: 11,
                                                color: agent.hasMemory ? COLORS.accent.green : COLORS.accent.orange,
                                                background: agent.hasMemory ? `${COLORS.accent.green}15` : `${COLORS.accent.orange}15`,
                                                border: `1px solid ${agent.hasMemory ? `${COLORS.accent.green}30` : `${COLORS.accent.orange}30`}`,
                                            }, children: agent.hasMemory ? "有记忆系统" : "无记忆" }))] })] }, agent.name))), _jsx(Divider, { style: { borderColor: COLORS.border.default, margin: "12px 0" } }), _jsx(Typography.Text, { style: { color: COLORS.text.tertiary, fontSize: 12 }, children: "Agent \u68C0\u6D4B\u529F\u80FD\u5373\u5C06\u4E0A\u7EBF\uFF0C\u5C06\u81EA\u52A8\u53D1\u73B0\u60A8\u673A\u5668\u4E0A\u5B89\u88C5\u7684 AI \u667A\u80FD\u4F53" })] }) })] }));
}
