import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Layout, Nav, Avatar, Typography } from "@douyinfe/semi-ui";
import { IconHome, IconHistogram, IconBox, IconSetting } from "@douyinfe/semi-icons";
import Overview from "./pages/Overview";
import Memories from "./pages/Memories";
import Timeline from "./pages/Timeline";
import Settings from "./pages/Settings";
const { Sider, Content } = Layout;
function App() {
    const [page, setPage] = useState("overview");
    const [stats, setStats] = useState({
        total_memories: 0,
        total_sessions: 0,
        recent_sessions: [],
    });
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
    return (_jsxs(Layout, { style: { height: "100vh" }, children: [_jsx(Sider, { children: _jsx(Nav, { defaultSelectedKeys: ["overview"], items: [
                        { itemKey: "overview", text: "总览", icon: _jsx(IconHome, {}) },
                        { itemKey: "memories", text: "记忆浏览", icon: _jsx(IconBox, {}) },
                        { itemKey: "timeline", text: "时间线", icon: _jsx(IconHistogram, {}) },
                        { itemKey: "settings", text: "设置", icon: _jsx(IconSetting, {}) },
                    ], onSelect: (e) => setPage(e.itemKey), header: {
                        logo: _jsx(Avatar, { size: "small", style: { backgroundColor: "#0077FA" }, children: "M" }),
                        text: _jsx(Typography.Title, { heading: 6, children: "Agent Memory" }),
                    }, footer: { collapseButton: true } }) }), _jsx(Content, { style: { padding: "24px", overflow: "auto" }, children: pages[page] || _jsx(Overview, { stats: stats }) })] }));
}
export default App;
