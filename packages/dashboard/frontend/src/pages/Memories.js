import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Input, Table, Button, Tag, Typography, Space } from "@douyinfe/semi-ui";
export default function Memories() {
    const [query, setQuery] = useState("");
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(false);
    const search = (q) => {
        setLoading(true);
        setQuery(q);
        fetch(`/api/memories?q=${encodeURIComponent(q)}&limit=50`)
            .then((r) => r.json())
            .then((data) => setMemories(data.results || []))
            .catch(() => setMemories([]))
            .finally(() => setLoading(false));
    };
    useEffect(() => { search(""); }, []);
    const columns = [
        { title: "内容", dataIndex: "memory", render: (t) => t?.slice(0, 80) },
        { title: "来源", dataIndex: "source", render: (t) => _jsx(Tag, { children: t || "mem0" }) },
        { title: "相关性", dataIndex: "score", render: (s) => s?.toFixed(2) },
    ];
    return (_jsxs("div", { children: [_jsx(Typography.Title, { heading: 3, style: { marginBottom: 16 }, children: "\u8BB0\u5FC6\u6D4F\u89C8" }), _jsxs(Space, { style: { marginBottom: 16 }, children: [_jsx(Input, { placeholder: "\u641C\u7D22\u8BB0\u5FC6...", value: query, onChange: (v) => search(v), style: { width: 400 }, showClear: true }), _jsx(Button, { onClick: () => search(query), loading: loading, children: "\u641C\u7D22" })] }), _jsx(Table, { dataSource: memories, columns: columns, loading: loading, pagination: { pageSize: 20 } })] }));
}
