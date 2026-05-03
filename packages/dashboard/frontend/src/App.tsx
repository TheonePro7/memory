import React, { useEffect, useState } from "react";
import { Layout, Menu, Typography, theme } from "antd";
import {
  HomeOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import Overview from "./pages/Overview";
import Memories from "./pages/Memories";
import Timeline from "./pages/Timeline";
import Settings from "./pages/Settings";

const { Sider, Content } = Layout;

export interface Stats {
  total_memories: number;
  total_sessions: number;
  recent_sessions: string[];
}

const menuItems = [
  { key: "overview", icon: <HomeOutlined />, label: "总览" },
  { key: "memories", icon: <DatabaseOutlined />, label: "记忆浏览" },
  { key: "timeline", icon: <ClockCircleOutlined />, label: "时间线" },
  { key: "settings", icon: <SettingOutlined />, label: "设置" },
];

function App() {
  const [page, setPage] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total_memories: 0,
    total_sessions: 0,
    recent_sessions: [],
  });
  const { token } = theme.useToken();

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const pages: Record<string, React.ReactNode> = {
    overview: <Overview stats={stats} />,
    memories: <Memories />,
    timeline: <Timeline />,
    settings: <Settings />,
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: token.colorBgContainer }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Typography.Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
            {collapsed ? "AM" : "Agent Memory"}
          </Typography.Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[page]}
          items={menuItems}
          onClick={({ key }) => setPage(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Content style={{ padding: 24, overflow: "auto", background: token.colorBgLayout }}>
        {pages[page] || <Overview stats={stats} />}
      </Content>
    </Layout>
  );
}

export default App;
