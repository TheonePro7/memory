import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Typography, Card, Descriptions } from "@douyinfe/semi-ui";
export default function Settings() {
    return (_jsxs("div", { children: [_jsx(Typography.Title, { heading: 3, style: { marginBottom: 16 }, children: "\u8BBE\u7F6E" }), _jsx(Card, { title: "\u7CFB\u7EDF\u4FE1\u606F", children: _jsx(Descriptions, { data: [
                        { key: "版本", value: "0.1.0" },
                        { key: "MCP 端口", value: "8710" },
                        { key: "Dashboard 端口", value: "8712" },
                        { key: "记忆后端", value: "mem0 (Chroma)" },
                        { key: "日志后端", value: "Markdown (memory/)" },
                    ] }) })] }));
}
