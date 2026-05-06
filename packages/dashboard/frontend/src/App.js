import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { ConfigProvider, Layout, Typography, Space } from "antd";
import { BarChartOutlined, DatabaseOutlined, ApiOutlined, HistoryOutlined, CheckSquareOutlined, SettingOutlined, } from "@ant-design/icons";
import { themeConfig, COLORS } from "./theme";
import Overview from "./pages/Overview";
import Memories from "./pages/Memories";
import Agents from "./pages/Agents";
import Timeline from "./pages/Timeline";
import Tasks from "./pages/Tasks";
import SettingsPage from "./pages/Settings";
const { Header, Content } = Layout;
const navItems = [
    { key: "overview", icon: _jsx(BarChartOutlined, {}), label: "总览" },
    { key: "memories", icon: _jsx(DatabaseOutlined, {}), label: "记忆" },
    { key: "agents", icon: _jsx(ApiOutlined, {}), label: "Agent" },
    { key: "timeline", icon: _jsx(HistoryOutlined, {}), label: "时间线" },
    { key: "tasks", icon: _jsx(CheckSquareOutlined, {}), label: "任务" },
    { key: "settings", icon: _jsx(SettingOutlined, {}), label: "设置" },
];
function App() {
    const [stats, setStats] = useState({
        total_memories: 0,
        total_sessions: 0,
        recent_sessions: [],
    });
    const hashPage = location.hash.replace("#", "") || "overview";
    const [page, setPage] = useState(hashPage);
    useEffect(() => {
        fetch("/api/stats")
            .then((r) => r.json())
            .then(setStats)
            .catch(() => { });
    }, []);
    const navigate = (key) => {
        setPage(key);
        location.hash = key;
    };
    useEffect(() => {
        const onHashChange = () => {
            const p = location.hash.replace("#", "") || "overview";
            setPage(p);
        };
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);
    const pages = {
        overview: _jsx(Overview, { stats: stats }),
        memories: _jsx(Memories, {}),
        agents: _jsx(Agents, {}),
        timeline: _jsx(Timeline, {}),
        tasks: _jsx(Tasks, {}),
        settings: _jsx(SettingsPage, {}),
    };
    return (_jsx(ConfigProvider, { theme: themeConfig, children: _jsxs(Layout, { style: { minHeight: "100vh", background: COLORS.bg.page }, children: [_jsxs(Header, { style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 32px",
                        position: "sticky",
                        top: 0,
                        zIndex: 100,
                        background: COLORS.bg.page,
                    }, children: [_jsxs(Space, { size: 12, children: [_jsx("div", { style: {
                                        width: 28,
                                        height: 28,
                                        borderRadius: 6,
                                        background: `linear-gradient(135deg, ${COLORS.accent.blue}, ${COLORS.accent.purple})`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: "#fff",
                                    }, children: "A" }), _jsx(Typography.Text, { strong: true, style: {
                                        fontSize: 15,
                                        color: COLORS.text.primary,
                                        letterSpacing: "-0.3px",
                                    }, children: "Agent Memory" })] }), _jsx("nav", { style: { display: "flex", alignItems: "center", gap: 4 }, children: navItems.map((item) => {
                                const active = page === item.key;
                                return (_jsxs("button", { onClick: () => navigate(item.key), style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        padding: "6px 12px",
                                        border: "none",
                                        borderRadius: 6,
                                        background: active ? COLORS.bg.elevated : "transparent",
                                        color: active ? COLORS.text.primary : COLORS.text.secondary,
                                        fontSize: 13.5,
                                        fontWeight: active ? 500 : 400,
                                        cursor: "pointer",
                                        transition: "all 0.15s ease",
                                        fontFamily: "inherit",
                                    }, onMouseEnter: (e) => {
                                        if (!active)
                                            e.currentTarget.style.background = COLORS.bg.elevated;
                                    }, onMouseLeave: (e) => {
                                        if (!active)
                                            e.currentTarget.style.background = "transparent";
                                    }, children: [item.icon, item.label] }, item.key));
                            }) }), _jsx("div", { style: { width: 120 } })] }), _jsx(Content, { style: {
                        padding: "28px 32px",
                        maxWidth: 1200,
                        margin: "0 auto",
                        width: "100%",
                    }, children: pages[page] || _jsx(Overview, { stats: stats }) })] }) }));
}
export default App;
