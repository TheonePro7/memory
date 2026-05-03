import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Row, Col, Typography, Table } from "@douyinfe/semi-ui";
import { IconPlus, IconComment, IconHistory } from "@douyinfe/semi-icons";
export default function Overview({ stats }) {
    const cards = [
        { title: "记忆总数", value: stats.total_memories, icon: _jsx(IconPlus, {}), color: "#0077FA" },
        { title: "会话总数", value: stats.total_sessions, icon: _jsx(IconComment, {}), color: "#00A85D" },
        { title: "近 7 天会话", value: stats.recent_sessions.length, icon: _jsx(IconHistory, {}), color: "#FA7D00" },
    ];
    return (_jsxs("div", { children: [_jsx(Typography.Title, { heading: 3, style: { marginBottom: 24 }, children: "\u603B\u89C8" }), _jsx(Row, { gutter: [16, 16], children: cards.map((c) => (_jsx(Col, { span: 8, children: _jsx(Card, { title: c.title, headerExtraContent: c.icon, style: { borderLeft: `4px solid ${c.color}` }, children: _jsx(Typography.Title, { heading: 2, children: c.value }) }) }, c.title))) }), _jsx(Typography.Title, { heading: 5, style: { marginTop: 32, marginBottom: 16 }, children: "\u6700\u8FD1\u4F1A\u8BDD" }), _jsx(Table, { dataSource: stats.recent_sessions.map((d, i) => ({ key: i, date: d })), columns: [{ title: "日期", dataIndex: "date" }], pagination: false })] }));
}
