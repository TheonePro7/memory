import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { List, Typography, Spin } from "@douyinfe/semi-ui";
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
        return _jsx(Spin, {});
    return (_jsxs("div", { children: [_jsx(Typography.Title, { heading: 3, style: { marginBottom: 16 }, children: "\u4F1A\u8BDD\u65F6\u95F4\u7EBF" }), _jsx(List, { dataSource: sessions, renderItem: (item) => (_jsx(List.Item, { header: _jsx(Typography.Text, { strong: true, children: item.date }), main: _jsx("div", { style: { whiteSpace: "pre-wrap", maxHeight: 200, overflow: "hidden" }, children: item.content.slice(0, 500) }) })) })] }));
}
