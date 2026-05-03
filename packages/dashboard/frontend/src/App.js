import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Layout, Menu, Typography, theme } from "antd";
import { HomeOutlined, DatabaseOutlined, ClockCircleOutlined, SettingOutlined, } from "@ant-design/icons";
import Overview from "./pages/Overview";
import Memories from "./pages/Memories";
import Timeline from "./pages/Timeline";
import Settings from "./pages/Settings";
const { Sider, Content } = Layout;
const menuItems = [
    { key: "overview", icon: _jsx(HomeOutlined, {}), label: "总览" },
    { key: "memories", icon: _jsx(DatabaseOutlined, {}), label: "记忆浏览" },
    { key: "timeline", icon: _jsx(ClockCircleOutlined, {}), label: "时间线" },
    { key: "settings", icon: _jsx(SettingOutlined, {}), label: "设置" },
];
function App() {
    const [page, setPage] = useState("overview");
    const [collapsed, setCollapsed] = useState(false);
    const [stats, setStats] = useState({
        total_memories: 0,
        total_sessions: 0,
        recent_sessions: [],
    });
    const { token } = theme.useToken();
    useEffect(() => {
        fetch("/api/stats")
            .then((r) => r.json())
            .then(setStats)
            .catch(() => { });
    }, []);
    const pages = {
        overview: _jsx(Overview, { stats: stats }),
        memories: _jsx(Memories, {}),
        timeline: _jsx(Timeline, {}),
        settings: _jsx(Settings, {}),
    };
    return (_jsxs(Layout, { style: { minHeight: "100vh" }, children: [_jsxs(Sider, { collapsible: true, collapsed: collapsed, onCollapse: setCollapsed, style: { background: token.colorBgContainer }, children: [_jsx("div", { style: {
                            height: 64,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                        }, children: _jsx(Typography.Title, { level: 4, style: { margin: 0, color: token.colorPrimary }, children: collapsed ? "AM" : "Agent Memory" }) }), _jsx(Menu, { mode: "inline", selectedKeys: [page], items: menuItems, onClick: ({ key }) => setPage(key), style: { borderRight: 0 } })] }), _jsx(Content, { style: { padding: 24, overflow: "auto", background: token.colorBgLayout }, children: pages[page] || _jsx(Overview, { stats: stats }) })] }));
}
export default App;
