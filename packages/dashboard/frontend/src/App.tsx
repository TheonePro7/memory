import React, { useEffect, useState } from "react";
import { ConfigProvider, Layout, Typography, Space } from "antd";
import {
  BarChartOutlined,
  DatabaseOutlined,
  ApiOutlined,
  HistoryOutlined,
  CheckSquareOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { themeConfig, COLORS } from "./theme";
import Overview from "./pages/Overview";
import Memories from "./pages/Memories";
import Agents from "./pages/Agents";
import Timeline from "./pages/Timeline";
import Tasks from "./pages/Tasks";
import SettingsPage from "./pages/Settings";

const { Header, Content } = Layout;

export interface Stats {
  total_memories: number;
  total_sessions: number;
  recent_sessions: string[];
}

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { key: "overview", icon: <BarChartOutlined />, label: "总览" },
  { key: "memories", icon: <DatabaseOutlined />, label: "记忆" },
  { key: "agents", icon: <ApiOutlined />, label: "Agent" },
  { key: "timeline", icon: <HistoryOutlined />, label: "时间线" },
  { key: "tasks", icon: <CheckSquareOutlined />, label: "任务" },
  { key: "settings", icon: <SettingOutlined />, label: "设置" },
];

function App() {
  const [stats, setStats] = useState<Stats>({
    total_memories: 0,
    total_sessions: 0,
    recent_sessions: [],
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const hashPage = location.hash.replace("#", "") || "overview";
  const [page, setPage] = useState(hashPage);

  useEffect(() => {
    setStatsLoading(true);
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const navigate = (key: string) => {
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

  const pages: Record<string, React.ReactNode> = {
    overview: <Overview stats={stats} loading={statsLoading} />,
    memories: <Memories />,
    agents: <Agents />,
    timeline: <Timeline />,
    tasks: <Tasks />,
    settings: <SettingsPage />,
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout style={{ minHeight: "100vh", background: COLORS.bg.page }}>
        {/* 顶部导航 */}
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: COLORS.bg.page,
          }}
        >
          {/* Logo + 品牌 */}
          <Space size={12}>
            <div
              style={{
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
              }}
            >
              A
            </div>
            <Typography.Text
              strong
              style={{
                fontSize: 15,
                color: COLORS.text.primary,
                letterSpacing: "-0.3px",
              }}
            >
              Agent Memory
            </Typography.Text>
          </Space>

          {/* 导航菜单 */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {navItems.map((item) => {
              const active = page === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  style={{
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
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = COLORS.bg.elevated;
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* 右侧占位 */}
          <div style={{ width: 120 }} />
        </Header>

        {/* 页面内容 */}
        <Content
          style={{
            padding: "28px 32px",
            maxWidth: 1200,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {pages[page] || <Overview stats={stats} />}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
