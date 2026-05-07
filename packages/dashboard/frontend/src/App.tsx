import React, { useEffect, useState, lazy, Suspense } from "react";
import { apiFetch } from "./api";
import { getCache, setCache } from "./cache";
import { ConfigProvider, Layout, Typography, Space, Button, Spin, message, Alert, Tooltip } from "antd";
import {
  BarChartOutlined,
  DatabaseOutlined,
  ApiOutlined,
  HistoryOutlined,
  CheckSquareOutlined,
  SettingOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { themeConfig, COLORS } from "./theme";
import Overview from "./pages/Overview";
const Memories = lazy(() => import("./pages/Memories"));
const Agents = lazy(() => import("./pages/Agents"));
const Timeline = lazy(() => import("./pages/Timeline"));
const Tasks = lazy(() => import("./pages/Tasks"));
const SettingsPage = lazy(() => import("./pages/Settings"));

const { Header, Content } = Layout;

/* 简易错误边界 — 捕获子组件渲染崩溃，防止全局白屏 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center", color: COLORS.text.secondary }}>
          <Typography.Title level={4} style={{ color: COLORS.text.primary }}>
            页面渲染异常
          </Typography.Title>
          <Typography.Paragraph style={{ color: COLORS.text.tertiary, fontSize: 13 }}>
            {this.state.error?.message}
          </Typography.Paragraph>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            重新加载
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [online, setOnline] = useState(navigator.onLine);
  const [stats, setStats] = useState<Stats>({
    total_memories: 0,
    total_sessions: 0,
    recent_sessions: [],
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const hashPage = location.hash.replace("#", "") || "overview";
  const [page, setPage] = useState(hashPage);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    setStatsLoading(true);
    const cached = getCache<Stats>("/api/stats");
    if (cached) {
      setStats(cached);
      setStatsLoading(false);
      return;
    }
    apiFetch<Stats>("/api/stats")
      .then((data) => {
        setStats(data);
        setCache("/api/stats", data);
      })
      .catch(() => message.error("统计数据加载失败"))
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
            overflowX: "auto",
            gap: 12,
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
          <nav style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {navItems.map((item) => {
              const active = page === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
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

          {/* 右侧操作 */}
          <Space size={8} style={{ width: 120, justifyContent: "flex-end" }}>
            <Tooltip title="刷新当前页面">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined style={{ fontSize: 14 }} />}
                onClick={() => window.location.reload()}
                style={{ color: COLORS.text.secondary }}
              />
            </Tooltip>
          </Space>
        </Header>

        {/* 页面内容 */}
        <Content
          style={{
            padding: "28px 16px",
            maxWidth: 1200,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {!online && (
            <Alert
              message="网络连接已断开"
              description="Dashboard 无法连接到后端服务，部分功能不可用。请检查后端是否启动。"
              type="error"
              showIcon
              closable
              style={{ marginBottom: 16 }}
            />
          )}
          <ErrorBoundary>
            <Suspense fallback={<div style={{ padding: 80, textAlign: "center" }}><Spin /></div>}>
              {pages[page] || <Overview stats={stats} />}
            </Suspense>
          </ErrorBoundary>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
