import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { List, Typography, Spin } from "antd";
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
        return _jsx(Spin, { size: "large" });
    return (_jsxs("div", { children: [_jsx(Typography.Title, { level: 3, children: "\u4F1A\u8BDD\u65F6\u95F4\u7EBF" }), _jsx(List, { dataSource: sessions, renderItem: (item) => (_jsx(List.Item, { children: _jsx(List.Item.Meta, { title: item.date, description: _jsx("div", { style: {
                                whiteSpace: "pre-wrap",
                                maxHeight: 200,
                                overflow: "hidden",
                                color: "inherit",
                            }, children: item.content.slice(0, 500) }) }) })) })] }));
}
