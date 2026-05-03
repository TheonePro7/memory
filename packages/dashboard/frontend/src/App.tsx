import React, { useEffect, useState } from "react";
import { Layout, Nav, Avatar, Typography } from "@douyinfe/semi-ui";
import { IconHome, IconHistogram, IconBox, IconSetting } from "@douyinfe/semi-icons";
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

function App() {
  const [page, setPage] = useState("overview");
  const [stats, setStats] = useState<Stats>({
    total_memories: 0,
    total_sessions: 0,
    recent_sessions: [],
  });

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
    <Layout style={{ height: "100vh" }}>
      <Sider>
        <Nav
          defaultSelectedKeys={["overview"]}
          items={[
            { itemKey: "overview", text: "总览", icon: <IconHome /> },
            { itemKey: "memories", text: "记忆浏览", icon: <IconBox /> },
            { itemKey: "timeline", text: "时间线", icon: <IconHistogram /> },
            { itemKey: "settings", text: "设置", icon: <IconSetting /> },
          ]}
          onSelect={(e) => setPage(e.itemKey as string)}
          header={{
            logo: <Avatar size="small" style={{ backgroundColor: "#0077FA" }}>M</Avatar>,
            text: <Typography.Title heading={6}>Agent Memory</Typography.Title>,
          }}
          footer={{ collapseButton: true }}
        />
      </Sider>
      <Content style={{ padding: "24px", overflow: "auto" }}>
        {pages[page] || <Overview stats={stats} />}
      </Content>
    </Layout>
  );
}

export default App;
