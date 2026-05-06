import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Row, Col, Typography, Space } from "antd";
import { DatabaseOutlined, MessageOutlined, HistoryOutlined } from "@ant-design/icons";
import { COLORS } from "../theme";
const statCards = [
    { title: "记忆总数", value: (s) => s.total_memories, icon: _jsx(DatabaseOutlined, {}), color: COLORS.accent.blue },
    { title: "会话总数", value: (s) => s.total_sessions, icon: _jsx(MessageOutlined, {}), color: COLORS.accent.green },
    { title: "近 7 天会话", value: (s) => s.recent_sessions.length, icon: _jsx(HistoryOutlined, {}), color: COLORS.accent.orange },
];
export default function Overview({ stats }) {
    return (_jsxs("div", { children: [_jsx(Typography.Title, { level: 3, style: { margin: "0 0 24px 0", color: COLORS.text.primary, fontWeight: 600 }, children: "\u603B\u89C8" }), _jsx(Row, { gutter: [16, 16], style: { marginBottom: 32 }, children: statCards.map((c) => {
                    const val = c.value(stats);
                    return (_jsx(Col, { span: 8, children: _jsx(Card, { styles: { body: { padding: "20px 24px" } }, style: {
                                borderLeft: `3px solid ${c.color}`,
                                background: COLORS.bg.card,
                            }, children: _jsxs(Space, { direction: "vertical", size: 4, style: { width: "100%" }, children: [_jsx(Typography.Text, { style: {
                                            fontSize: 13,
                                            color: COLORS.text.secondary,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                            fontWeight: 500,
                                        }, children: c.title }), _jsxs(Space, { size: 10, align: "center", children: [_jsx("span", { style: { fontSize: 13, color: c.color }, children: c.icon }), _jsx("span", { style: {
                                                    fontSize: 30,
                                                    fontWeight: 600,
                                                    color: COLORS.text.primary,
                                                    letterSpacing: "-1px",
                                                    lineHeight: 1,
                                                }, children: val })] })] }) }) }, c.title));
                }) }), _jsx(Typography.Title, { level: 5, style: { margin: "0 0 12px 0", color: COLORS.text.secondary, fontWeight: 500 }, children: "\u6700\u8FD1\u4F1A\u8BDD" }), stats.recent_sessions.length === 0 ? (_jsx(Typography.Text, { style: { color: COLORS.text.tertiary, fontSize: 14 }, children: "\u6682\u65E0\u4F1A\u8BDD\u8BB0\u5F55" })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: stats.recent_sessions.map((d, i) => (_jsx("div", { style: {
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: COLORS.bg.card,
                        border: `1px solid ${COLORS.border.default}`,
                        color: COLORS.text.secondary,
                        fontSize: 13.5,
                    }, children: d }, i))) }))] }));
}
