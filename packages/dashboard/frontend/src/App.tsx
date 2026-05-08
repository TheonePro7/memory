import React, { useEffect, useState, lazy, Suspense } from "react";
import { ConfigProvider, Layout, Typography, Space, Button, Spin, Tooltip } from "antd";
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

export interface Stats {
  total_memories: number;
  total_sessions: number;
  recent_sessions: string[];
}

const { Header, Content } = Layout;

/* 错误边界 — 每个懒加载页面独立包裹 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; name?: string },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "60px 40px", textAlign: "center", color: COLORS.text.secondary, background: COLORS.bg.page, minHeight: 300 }}>
          <Typography.Title level={4} style={{ color: COLORS.text.primary }}>
            {this.props.name || "页面"}渲染异常
          </Typography.Title>
          <Typography.Paragraph style={{ color: COLORS.text.tertiary, fontSize: 13, marginBottom: 16 }}>
            {this.state.error?.message}
          </Typography.Paragraph>
          <Space>
            <Button onClick={() => { this.setState({ hasError: false, error: null }); location.hash = "overview"; }}>
              返回工作台
            </Button>
            <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
              重新加载
            </Button>
          </Space>
        </div>
      );
    }
    return this.props.children;
  }
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
  const hashPage = location.hash.replace("#", "") || "memories";
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
    const onHashChange = () => {
      const p = location.hash.replace("#", "") || "memories";
      setPage(p);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (key: string) => {
    setPage(key);
    location.hash = key;
  };

  const pages: Record<string, React.ReactNode> = {
    overview: <Overview />,
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
          {/* Logo + 品牌 — 点击回到首页 */}
          <Space size={12} style={{ cursor: "pointer" }} onClick={() => navigate("overview")}>
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
                    position: "relative",
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
                  {active && (
                    <div style={{
                      position: "absolute",
                      bottom: 0,
                      left: "30%",
                      right: "30%",
                      height: 2,
                      borderRadius: 1,
                      background: COLORS.accent.blue,
                    }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* 右侧操作 */}
          <Space size={8} style={{ width: 140, justifyContent: "flex-end" }}>
            <Tooltip title={online ? `后端已连接` : "后端离线"}>
              <span
                onClick={() => window.location.reload()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, color: COLORS.text.tertiary,
                  cursor: "pointer", userSelect: "none",
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: online ? COLORS.accent.green : COLORS.accent.red,
                  display: "inline-block",
                }} />
                {online ? "已连接" : "离线"}
              </span>
            </Tooltip>
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
          key={page}
          className="page-enter"
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
          {/* 每个懒加载页面独立 ErrorBoundary + Suspense */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {page === "overview" ? <Overview /> : (
              <Suspense fallback={<div style={{ padding: 80, textAlign: "center" }}><Spin /></div>}>
                {page === "memories" && <ErrorBoundary name="记忆"><Memories /></ErrorBoundary>}
                {page === "agents" && <ErrorBoundary name="Agent"><Agents /></ErrorBoundary>}
                {page === "timeline" && <ErrorBoundary name="时间线"><Timeline /></ErrorBoundary>}
                {page === "tasks" && <ErrorBoundary name="任务"><Tasks /></ErrorBoundary>}
                {page === "settings" && <ErrorBoundary name="设置"><SettingsPage /></ErrorBoundary>}
              </Suspense>
            )}
          </div>
        </Content>

        {/* 底部信息 */}
        <div
          style={{
            textAlign: "center",
            padding: "16px 16px 24px",
            color: COLORS.text.tertiary,
            fontSize: 11,
            borderTop: `1px solid ${COLORS.border.default}`,
          }}
        >
          Agent Memory Dashboard v0.6
        </div>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
