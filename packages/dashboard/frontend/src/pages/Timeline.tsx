import React, { useEffect, useState, useRef } from "react";
import { Typography, Spin, Space, Empty, Button, Select, Input, message, Modal } from "antd";
import {
  ClockCircleOutlined, DownOutlined, UpOutlined,
  DeleteOutlined, SearchOutlined,
} from "@ant-design/icons";
import { COLORS } from "../theme";
import { apiFetch } from "../api";
import { getCache, setCache, invalidateCache } from "../cache";

interface Session {
  date: string;
  content: string;
}

interface SearchResult {
  date: string;
  path?: string;
  matches?: string[];
}

const dayOptions = [
  { value: 7, label: "最近 7 天" },
  { value: 30, label: "最近 30 天" },
  { value: 90, label: "最近 90 天" },
];

export default function Timeline() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [days, setDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const loadSessions = (d: number) => {
    setLoading(true);
    setError(false);
    setSearchResults(null);
    const cached = getCache<{ sessions: Session[] }>(`/api/sessions?days=${d}`);
    if (cached) {
      setSessions(cached.sessions || []);
      setLoading(false);
      return;
    }
    apiFetch<{ sessions: Session[] }>(`/api/sessions?days=${d}`)
      .then((data) => {
        setSessions(data.sessions || []);
        setCache(`/api/sessions?days=${d}`, data);
      })
      .catch(() => { setSessions([]); setError(true); message.error("时间线加载失败"); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSessions(days); }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── 搜索 ──
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      apiFetch<{ results: SearchResult[] }>(`/api/sessions/search?q=${encodeURIComponent(q)}`)
        .then((data) => setSearchResults(data.results || []))
        .catch(() => message.error("搜索失败"))
        .finally(() => setSearching(false));
    }, 300);
  };

  // ── 删除 ──
  const handleDelete = (date: string) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定删除 ${date} 的会话记录吗？`,
      styles: { body: { background: COLORS.bg.card } },
      onOk: async () => {
        setDeleting(date);
        try {
          await apiFetch(`/api/sessions/${date}`, { method: "DELETE" });
          message.success("会话已删除");
          invalidateCache("/api/sessions");
          setSessions((prev) => prev.filter((s) => s.date !== date));
        } catch { message.error("删除失败"); }
        finally { setDeleting(null); }
      },
    });
  };

  // ── 日期变更 ──
  const handleDaysChange = (d: number) => {
    setDays(d);
    setSearchResults(null);
    loadSessions(d);
  };

  const displayItems = searchResults !== null
    ? searchResults.map((r) => ({ date: r.date, content: r.matches?.join("\n") || "", isSearch: true }))
    : sessions;

  if (loading) return <Spin size="large" style={{ display: "block", margin: "80px auto" }} />;

  return (
    <div>
      <Typography.Title level={3} style={{ margin: "0 0 24px 0", color: COLORS.text.primary, fontWeight: 600 }}>
        时间线
      </Typography.Title>

      {/* 工具栏 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <Select
          value={days}
          onChange={handleDaysChange}
          style={{ width: 140 }}
          options={dayOptions}
        />
        <Input
          prefix={<SearchOutlined style={{ color: COLORS.text.tertiary }} />}
          placeholder="搜索会话内容..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 260, background: COLORS.bg.elevated, borderColor: COLORS.border.default }}
          allowClear
          onClear={() => { setSearchResults(null); setSearchQuery(""); }}
        />
        {searching && <Spin size="small" />}
        {searchResults !== null && (
          <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
            找到 {searchResults.length} 条结果
          </Typography.Text>
        )}
      </div>

      {displayItems.length === 0 ? (
        error ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Typography.Text style={{ color: COLORS.text.tertiary, display: "block", marginBottom: 16 }}>
              加载失败
            </Typography.Text>
            <Button onClick={() => loadSessions(days)}>重新加载</Button>
          </div>
        ) : (
          <Empty description={searchResults !== null ? "未找到匹配的会话" : "暂无会话记录"} style={{ color: COLORS.text.tertiary }} />
        )
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayItems.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "16px 20px", borderRadius: 8, background: COLORS.bg.card, border: `1px solid ${COLORS.border.default}`, position: "relative" }}>
              {/* 时间戳 */}
              <div style={{ minWidth: 140, display: "flex", alignItems: "flex-start", gap: 6, color: COLORS.text.secondary, fontSize: 13 }}>
                <ClockCircleOutlined style={{ marginTop: 2, fontSize: 12, color: COLORS.text.tertiary }} />
                <span>{item.date}</span>
              </div>
              {/* 内容 */}
              <div
                style={{ color: COLORS.text.secondary, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: expanded.has(i) ? "none" : 200, overflow: expanded.has(i) ? "visible" : "hidden", flex: 1, cursor: "pointer" }}
                onClick={() => toggleExpand(i)}
              >
                {item.content.slice(0, expanded.has(i) ? undefined : 500)}
                <span style={{ fontSize: 11, color: COLORS.accent.blue, marginLeft: 8 }}>
                  {expanded.has(i) ? "收起" : "展开"}
                  {expanded.has(i) ? <UpOutlined style={{ fontSize: 10, marginLeft: 4 }} /> : <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />}
                </span>
              </div>
              {/* 删除按钮 */}
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                loading={deleting === item.date}
                onClick={() => handleDelete(item.date)}
                style={{ position: "absolute", top: 12, right: 12, color: COLORS.text.tertiary }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
