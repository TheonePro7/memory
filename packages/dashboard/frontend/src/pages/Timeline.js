import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Typography, Spin } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { COLORS } from "../theme";
export default function Timeline() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch("/api/sessions?days=30")
            .then((r) => r.json())
            .then((data) => setSessions(data.sessions || []))
            .catch(() => setSessions([]))
            .finally(() => setLoading(false));
    }, []);
    if (loading)
        return _jsx(Spin, { size: "large", style: { display: "block", margin: "80px auto" } });
    return (_jsxs("div", { children: [_jsx(Typography.Title, { level: 3, style: { margin: "0 0 24px 0", color: COLORS.text.primary, fontWeight: 600 }, children: "\u65F6\u95F4\u7EBF" }), sessions.length === 0 ? (_jsx(Typography.Text, { style: { color: COLORS.text.tertiary, fontSize: 14 }, children: "\u6682\u65E0\u4F1A\u8BDD\u8BB0\u5F55" })) : (_jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: sessions.map((item, i) => (_jsxs("div", { style: {
                        display: "flex",
                        gap: 16,
                        padding: "16px 20px",
                        borderRadius: 8,
                        background: COLORS.bg.card,
                        border: `1px solid ${COLORS.border.default}`,
                    }, children: [_jsxs("div", { style: {
                                minWidth: 140,
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 6,
                                color: COLORS.text.secondary,
                                fontSize: 13,
                            }, children: [_jsx(ClockCircleOutlined, { style: { marginTop: 2, fontSize: 12, color: COLORS.text.tertiary } }), _jsx("span", { children: item.date })] }), _jsx("div", { style: {
                                color: COLORS.text.secondary,
                                fontSize: 13.5,
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                                maxHeight: 200,
                                overflow: "hidden",
                                flex: 1,
                            }, children: item.content.slice(0, 500) })] }, i))) }))] }));
}
