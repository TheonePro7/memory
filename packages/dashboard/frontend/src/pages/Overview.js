import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Row, Col, Typography, Table, Statistic } from "antd";
import { DatabaseOutlined, MessageOutlined, HistoryOutlined, } from "@ant-design/icons";
export default function Overview({ stats }) {
    const cardData = [
        { title: "记忆总数", value: stats.total_memories, icon: _jsx(DatabaseOutlined, {}), color: "#1677ff" },
        { title: "会话总数", value: stats.total_sessions, icon: _jsx(MessageOutlined, {}), color: "#52c41a" },
        { title: "近 7 天会话", value: stats.recent_sessions.length, icon: _jsx(HistoryOutlined, {}), color: "#fa8c16" },
    ];
    return (_jsxs("div", { children: [_jsx(Typography.Title, { level: 3, children: "\u603B\u89C8" }), _jsx(Row, { gutter: [16, 16], children: cardData.map((c) => (_jsx(Col, { span: 8, children: _jsx(Card, { style: { borderLeft: `4px solid ${c.color}` }, children: _jsx(Statistic, { title: c.title, value: c.value, prefix: c.icon }) }) }, c.title))) }), _jsx(Typography.Title, { level: 5, style: { marginTop: 32 }, children: "\u6700\u8FD1\u4F1A\u8BDD" }), _jsx(Table, { dataSource: stats.recent_sessions.map((d, i) => ({ key: i, date: d })), columns: [{ title: "日期", dataIndex: "date", key: "date" }], pagination: false })] }));
}
