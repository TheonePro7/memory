import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Typography, Card, Row, Col, Space, Tag, Button, Modal, Input, Select, Spin, message, } from "antd";
import { PlusOutlined, ReloadOutlined, CheckCircleOutlined, MinusCircleOutlined, QuestionCircleOutlined, } from "@ant-design/icons";
import { COLORS } from "../theme";
export default function Agents() {
    const [builtin, setBuiltin] = useState([]);
    const [custom, setCustom] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const [addModal, setAddModal] = useState(false);
    const [newAgent, setNewAgent] = useState({
        name: "", type: "other", mcp_config_dir: "", project_dir: "",
    });
    const scan = () => {
        setLoading(true);
        fetch("/api/agents/scan")
            .then((r) => r.json())
            .then((data) => {
            setBuiltin(data.builtin || []);
            setCustom(data.custom || []);
            const defaults = new Set();
            (data.builtin || []).forEach((a) => {
                if (a.installed)
                    defaults.add(a.name);
            });
            setSelected(defaults);
        })
            .catch(() => message.error("扫描失败"))
            .finally(() => setLoading(false));
    };
    useEffect(() => { scan(); }, []);
    const toggleAgent = (name) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name))
                next.delete(name);
            else
                next.add(name);
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
    const statusTag = (status) => {
        switch (status) {
            case "has_memory":
                return (_jsx(Tag, { icon: _jsx(CheckCircleOutlined, {}), style: {
                        background: `${COLORS.accent.green}15`,
                        color: COLORS.accent.green,
                        border: `1px solid ${COLORS.accent.green}30`,
                        fontSize: 12,
                    }, children: "\u6709\u8BB0\u5FC6" }));
            case "no_memory":
                return (_jsx(Tag, { icon: _jsx(MinusCircleOutlined, {}), style: {
                        background: `${COLORS.accent.orange}15`,
                        color: COLORS.accent.orange,
                        border: `1px solid ${COLORS.accent.orange}30`,
                        fontSize: 12,
                    }, children: "\u65E0\u8BB0\u5FC6" }));
            default:
                return (_jsx(Tag, { icon: _jsx(QuestionCircleOutlined, {}), style: {
                        background: `${COLORS.text.tertiary}15`,
                        color: COLORS.text.tertiary,
                        border: `1px solid ${COLORS.border.default}`,
                        fontSize: 12,
                    }, children: "\u4E0D\u786E\u5B9A" }));
        }
    };
    const stats = {
        total: builtin.length + custom.length,
        installed: builtin.filter((a) => a.installed).length + custom.length,
        hasMemory: [...builtin, ...custom].filter((a) => a.memory_status === "has_memory").length,
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24,
                }, children: [_jsx(Typography.Title, { level: 3, style: { margin: 0, color: COLORS.text.primary, fontWeight: 600 }, children: "Agent" }), _jsxs(Space, { children: [_jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: scan, loading: loading, children: "\u91CD\u65B0\u626B\u63CF" }), _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setAddModal(true), children: "\u6DFB\u52A0\u81EA\u5B9A\u4E49" })] })] }), _jsxs(Row, { gutter: 16, style: { marginBottom: 24 }, children: [_jsx(Col, { span: 8, children: _jsx(Card, { styles: { body: { padding: "16px 20px" } }, style: {
                                background: COLORS.bg.card,
                                borderLeft: `3px solid ${COLORS.accent.blue}`,
                            }, children: _jsxs(Space, { direction: "vertical", size: 4, children: [_jsx(Typography.Text, { style: {
                                            fontSize: 12,
                                            color: COLORS.text.secondary,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                        }, children: "\u5DF2\u68C0\u6D4B" }), _jsx("span", { style: {
                                            fontSize: 28,
                                            fontWeight: 600,
                                            color: COLORS.text.primary,
                                            letterSpacing: "-1px",
                                        }, children: stats.total })] }) }) }), _jsx(Col, { span: 8, children: _jsx(Card, { styles: { body: { padding: "16px 20px" } }, style: {
                                background: COLORS.bg.card,
                                borderLeft: `3px solid ${COLORS.accent.green}`,
                            }, children: _jsxs(Space, { direction: "vertical", size: 4, children: [_jsx(Typography.Text, { style: {
                                            fontSize: 12,
                                            color: COLORS.text.secondary,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                        }, children: "\u5DF2\u5B89\u88C5" }), _jsx("span", { style: {
                                            fontSize: 28,
                                            fontWeight: 600,
                                            color: COLORS.text.primary,
                                            letterSpacing: "-1px",
                                        }, children: stats.installed })] }) }) }), _jsx(Col, { span: 8, children: _jsx(Card, { styles: { body: { padding: "16px 20px" } }, style: {
                                background: COLORS.bg.card,
                                borderLeft: `3px solid ${COLORS.accent.purple}`,
                            }, children: _jsxs(Space, { direction: "vertical", size: 4, children: [_jsx(Typography.Text, { style: {
                                            fontSize: 12,
                                            color: COLORS.text.secondary,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                        }, children: "\u6709\u8BB0\u5FC6" }), _jsx("span", { style: {
                                            fontSize: 28,
                                            fontWeight: 600,
                                            color: COLORS.text.primary,
                                            letterSpacing: "-1px",
                                        }, children: stats.hasMemory })] }) }) })] }), _jsx(Typography.Title, { level: 5, style: { color: COLORS.text.secondary, marginBottom: 12, fontWeight: 500 }, children: "\u81EA\u52A8\u68C0\u6D4B" }), loading ? (_jsx(Spin, { style: { display: "block", margin: "40px auto" } })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }, children: builtin.map((agent) => {
                    const isSelected = selected.has(agent.name);
                    return (_jsxs("div", { onClick: () => agent.installed && toggleAgent(agent.name), style: {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 16px",
                            borderRadius: 6,
                            background: isSelected
                                ? `${COLORS.accent.blue}10`
                                : COLORS.bg.card,
                            border: `1px solid ${isSelected ? `${COLORS.accent.blue}30` : COLORS.border.default}`,
                            cursor: agent.installed ? "pointer" : "default",
                            opacity: agent.installed ? 1 : 0.45,
                            transition: "all 0.15s ease",
                        }, children: [_jsxs(Space, { children: [_jsx("div", { style: {
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            background: agent.installed
                                                ? COLORS.accent.green
                                                : COLORS.border.default,
                                        } }), _jsx("span", { style: { color: COLORS.text.primary, fontSize: 14 }, children: agent.display_name }), _jsx(Tag, { style: {
                                            fontSize: 11,
                                            color: COLORS.text.tertiary,
                                            background: COLORS.bg.elevated,
                                            border: "none",
                                        }, children: agent.category })] }), _jsxs(Space, { size: 8, children: [statusTag(agent.memory_status), agent.installed && !isSelected && (_jsx(Tag, { style: { fontSize: 11, color: COLORS.text.tertiary }, children: "\u5FFD\u7565" })), agent.installed && isSelected && (_jsx(Tag, { color: "blue", style: { fontSize: 11, borderRadius: 4 }, children: "\u5DF2\u9009" }))] })] }, agent.name));
                }) })), _jsx(Typography.Title, { level: 5, style: { color: COLORS.text.secondary, marginBottom: 12, fontWeight: 500 }, children: "\u81EA\u5B9A\u4E49 Agent" }), custom.length === 0 ? (_jsx(Typography.Text, { style: { color: COLORS.text.tertiary, fontSize: 13, display: "block", marginBottom: 24 }, children: "\u6682\u65E0\u81EA\u5B9A\u4E49 Agent\uFF0C\u70B9\u51FB\u53F3\u4E0A\u89D2\u300C\u6DFB\u52A0\u81EA\u5B9A\u4E49\u300D" })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }, children: custom.map((agent) => (_jsxs("div", { style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        borderRadius: 6,
                        background: COLORS.bg.card,
                        border: `1px solid ${COLORS.border.default}`,
                    }, children: [_jsxs(Space, { children: [_jsx("div", { style: {
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: COLORS.accent.green,
                                    } }), _jsx("span", { style: { color: COLORS.text.primary, fontSize: 14 }, children: agent.display_name })] }), _jsx(Space, { size: 8, children: statusTag(agent.memory_status) })] }, agent.custom_id))) })), selected.size > 0 && (_jsx("div", { style: {
                    position: "sticky",
                    bottom: 24,
                    display: "flex",
                    justifyContent: "center",
                }, children: _jsxs(Button, { type: "primary", size: "large", onClick: confirmManage, style: { minWidth: 300, height: 44, fontSize: 15 }, children: ["\u786E\u8BA4\u7BA1\u7406 ", selected.size, " \u4E2A Agent"] }) })), _jsx(Modal, { title: "\u6DFB\u52A0\u81EA\u5B9A\u4E49 Agent", open: addModal, onOk: addCustom, onCancel: () => setAddModal(false), okText: "\u6DFB\u52A0", cancelText: "\u53D6\u6D88", children: _jsxs(Space, { direction: "vertical", style: { width: "100%", marginTop: 12 }, size: 12, children: [_jsx(Input, { placeholder: "Agent \u540D\u79F0\uFF08\u5FC5\u586B\uFF09", value: newAgent.name, onChange: (e) => setNewAgent({ ...newAgent, name: e.target.value }) }), _jsx(Select, { placeholder: "\u7C7B\u578B", style: { width: "100%" }, value: newAgent.type, onChange: (v) => setNewAgent({ ...newAgent, type: v }), options: [
                                { value: "IDE", label: "IDE" },
                                { value: "terminal", label: "终端" },
                                { value: "framework", label: "框架" },
                                { value: "other", label: "其他" },
                            ] }), _jsx(Input, { placeholder: "MCP \u914D\u7F6E\u76EE\u5F55\uFF08\u53EF\u9009\uFF09", value: newAgent.mcp_config_dir, onChange: (e) => setNewAgent({ ...newAgent, mcp_config_dir: e.target.value }) }), _jsx(Input, { placeholder: "\u9879\u76EE\u76EE\u5F55\uFF08\u53EF\u9009\uFF09", value: newAgent.project_dir, onChange: (e) => setNewAgent({ ...newAgent, project_dir: e.target.value }) })] }) })] }));
}
