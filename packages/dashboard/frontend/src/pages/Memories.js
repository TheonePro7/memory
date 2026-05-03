import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Input, Table, Tag, Typography, Space } from "antd";
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
    useEffect(() => {
        search("");
    }, []);
    const columns = [
        {
            title: "内容",
            dataIndex: "memory",
            key: "memory",
            render: (t) => t?.slice(0, 80),
        },
        {
            title: "来源",
            dataIndex: "source",
            key: "source",
            render: (t) => _jsx(Tag, { children: t || "mem0" }),
        },
        {
            title: "相关性",
            dataIndex: "score",
            key: "score",
            render: (s) => s?.toFixed(2),
        },
    ];
    return (_jsxs("div", { children: [_jsx(Typography.Title, { level: 3, children: "\u8BB0\u5FC6\u6D4F\u89C8" }), _jsx(Space, { style: { marginBottom: 16 }, children: _jsx(Input.Search, { placeholder: "\u641C\u7D22\u8BB0\u5FC6...", value: query, onChange: (e) => setQuery(e.target.value), onSearch: search, style: { width: 400 }, enterButton: true }) }), _jsx(Table, { dataSource: memories, columns: columns, loading: loading, pagination: { pageSize: 20 }, rowKey: (r) => r.id || r.memory || Math.random().toString() })] }));
}
