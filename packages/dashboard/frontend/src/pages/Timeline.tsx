import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Typography, Spin, Empty, Button, Select, Input, message, Modal, Tag, Space, Card,
} from "antd";
import {
  ClockCircleOutlined, DownOutlined, UpOutlined,
  DeleteOutlined, SearchOutlined,
  FileTextOutlined, RobotOutlined, FolderOutlined,
} from "@ant-design/icons";
import { COLORS } from "../theme";
import { apiFetch } from "../api";
import { getCache, setCache, invalidateCache } from "../cache";

interface SessionBlock {
  title: string;
  content: string;
  agent: string;
  project: string;
  tags: string[];
}

interface Session {
  date: string;
  content: string;
  sessions?: SessionBlock[];
  session_count?: number;
  tags?: string[];
  sources?: string[];
  isSearch?: boolean;
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

const tagMeta: Record<string, { label: string; color: string }> = {
  task: { label: "任务", color: COLORS.accent.blue },
  decision: { label: "决策", color: COLORS.accent.purple },
  config: { label: "配置", color: COLORS.accent.orange },
  summary: { label: "总结", color: COLORS.accent.green },
};

/* 搜索关键词高亮 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <span key={i} style={{ background: `${COLORS.accent.blue}40`, color: COLORS.accent.blue, borderRadius: 2, padding: "0 2px" }}>{part}</span>
      : part
  );
}

/* 截取上下文片段 */
function getContext(content: string, query: string, maxLen = 200): string {
  if (!query.trim()) return content.slice(0, maxLen);
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, maxLen);
  const start = Math.max(0, idx - 60);
  const end = Math.min(content.length, idx + query.length + 100);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet += "...";
  return snippet;
}

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
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailContent, setDetailContent] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [sessionMemories, setSessionMemories] = useState<MemorySimple[]>([]);

  interface MemorySimple {
    id: string;
    memory: string;
    metadata?: Record<string, string>;
  }

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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

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

  const handleDelete = (date: string) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定删除 ${date} 的会话记录吗？此操作不可撤销。`,
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

  const handleDaysChange = (d: number) => {
    setDays(d);
    setSearchResults(null);
    loadSessions(d);
  };

  const handleViewDetail = async (date: string) => {
    setDetailDate(date);
    setDetailLoading(true);
    setSessionMemories([]);
    try {
      const [sessionData, memoriesData] = await Promise.all([
        apiFetch<{ content: string }>(`/api/sessions/${date}`),
        apiFetch<{ results: MemorySimple[] }>(`/api/memories/by-session/${date}`),
      ]);
      setDetailContent(sessionData.content || "");
      setSessionMemories(memoriesData.results || []);
    } catch { message.error("加载失败"); }
    finally { setDetailLoading(false); }
  };

  const displayItems: Session[] = useMemo(() => {
    if (searchResults !== null) {
      return searchResults.map((r) => ({
        date: r.date,
        content: r.matches?.join("\n") || "",
        isSearch: true,
      }));
    }
    return sessions;
  }, [sessions, searchResults]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "80px auto" }} />;

  return (
    <div>
      {/* ═══ 头部 ═══ */}
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={3} style={{ margin: "0 0 4px 0", color: COLORS.text.primary, fontWeight: 600 }}>
          时间线
        </Typography.Title>
        <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 13 }}>
          回顾 Agent 记忆系统的会话记录
        </Typography.Text>
      </div>

      {/* ═══ 搜索框 ═══ */}
      <Card
        size="small"
        style={{
          background: COLORS.bg.card, border: `1px solid ${COLORS.border.default}`,
          borderRadius: 10, marginBottom: 16,
        }}
        styles={{ body: { padding: "16px 20px" } }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Input
            size="large"
            prefix={<SearchOutlined style={{ color: COLORS.text.tertiary }} />}
            placeholder="搜索会话内容..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200,
              background: COLORS.bg.elevated, borderColor: searchQuery ? COLORS.accent.blue : COLORS.border.default,
            }}
            allowClear
            onClear={() => { setSearchResults(null); setSearchQuery(""); }}
          />
          <Select
            value={days}
            onChange={handleDaysChange}
            style={{ width: 140 }}
            options={dayOptions}
          />
          {searching && <Spin size="small" />}
        </div>
        {searchResults !== null && (
          <div style={{ marginTop: 8, color: COLORS.text.tertiary, fontSize: 12 }}>
            找到 {searchResults.length} 条匹配结果
            {searchResults.length > 0 && (
              <Button
                type="link" size="small"
                onClick={() => { setSearchResults(null); setSearchQuery(""); }}
                style={{ fontSize: 12, padding: "0 8px" }}
              >
                清除搜索
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ═══ 内容列表 ═══ */}
      {displayItems.length === 0 ? (
        error ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Typography.Text style={{ color: COLORS.text.tertiary, display: "block", marginBottom: 16 }}>
              加载失败
            </Typography.Text>
            <Button onClick={() => loadSessions(days)}>重新加载</Button>
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={searchResults !== null ? "未找到匹配的会话" : (
              <div>
                <Typography.Text style={{ color: COLORS.text.tertiary, display: "block", marginBottom: 8 }}>
                  还没有会话记录
                </Typography.Text>
                <Typography.Text style={{ color: COLORS.text.tertiary, fontSize: 12 }}>
                  当 Agent 结束会话时，记忆系统会自动生成摘要并保存到时间线。
                </Typography.Text>
              </div>
            )}
            style={{ color: COLORS.text.tertiary }}
          />
        )
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayItems.map((item, i) => {
            const tags = item.tags || [];
            const sources = item.sources || [];
            const sessionCount = item.session_count || 0;
            const displayContent = searchQuery
              ? getContext(item.content, searchQuery)
              : item.content.slice(0, expanded.has(i) ? undefined : 300);

            return (
              <div
                key={i}
                style={{
                  display: "flex", gap: 16, padding: "16px 20px",
                  borderRadius: 8, background: COLORS.bg.card,
                  border: `1px solid ${COLORS.border.default}`,
                  position: "relative",
                  transition: "opacity 0.2s",
                }}
              >
                {/* 时间戳 */}
                <div style={{
                  minWidth: 120, display: "flex", alignItems: "flex-start", gap: 6,
                  color: COLORS.text.secondary, fontSize: 13, flexShrink: 0,
                }}>
                  <ClockCircleOutlined style={{ marginTop: 2, fontSize: 12, color: COLORS.text.tertiary }} />
                  <span>{item.date}</span>
                </div>

                {/* 内容 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 元信息行 */}
                  <div style={{ marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {tags.map((tag) => {
                      const meta = tagMeta[tag];
                      return meta ? (
                        <Tag key={tag} style={{
                          fontSize: 10, lineHeight: "18px", padding: "0 6px", margin: 0,
                          background: `${meta.color}20`, color: meta.color,
                          border: `1px solid ${meta.color}30`,
                        }}>
                          {meta.label}
                        </Tag>
                      ) : null;
                    })}
                    {sources.map((src) => (
                      <Tag key={src} icon={<RobotOutlined />} style={{
                        fontSize: 10, lineHeight: "18px", padding: "0 6px", margin: 0,
                        background: `${COLORS.accent.purple}15`, color: COLORS.accent.purple,
                        border: `1px solid ${COLORS.accent.purple}25`,
                      }}>
                        {src}
                      </Tag>
                    ))}
                    {sessionCount > 0 && !searchQuery && (
                      <span style={{ fontSize: 11, color: COLORS.text.tertiary }}>
                        {sessionCount} 条记录
                      </span>
                    )}
                  </div>

                  {/* 内容正文 */}
                  <div
                    style={{
                      color: COLORS.text.secondary, fontSize: 13, lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      maxHeight: expanded.has(i) ? "none" : 160,
                      overflow: expanded.has(i) ? "visible" : "hidden",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleExpand(i)}
                  >
                    {searchQuery
                      ? highlightText(displayContent, searchQuery)
                      : displayContent}
                    <span style={{ fontSize: 11, color: COLORS.accent.blue, marginLeft: 8, userSelect: "none" }}>
                      {expanded.has(i) ? "收起" : "展开"}
                      {expanded.has(i)
                        ? <UpOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                        : <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />}
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "flex-start" }}>
                  <Button
                    type="text" size="small"
                    icon={<FileTextOutlined style={{ fontSize: 13 }} />}
                    onClick={() => handleViewDetail(item.date)}
                    style={{ color: COLORS.text.tertiary }}
                  />
                  <Button
                    type="text" size="small" danger
                    icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                    loading={deleting === item.date}
                    onClick={() => handleDelete(item.date)}
                    style={{ color: COLORS.text.tertiary }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ 详情 Modal ═══ */}
      <Modal
        title={<span style={{ color: COLORS.text.primary }}>{detailDate}</span>}
        open={!!detailDate}
        onCancel={() => { setDetailDate(null); setDetailContent(""); setSessionMemories([]); }}
        footer={null}
        width={700}
        styles={{ body: { background: COLORS.bg.card, maxHeight: 500, overflowY: "auto" } }}
      >
        {detailLoading ? (
          <div style={{ padding: 32, textAlign: "center" }}><Spin /></div>
        ) : (
          <>
            <pre style={{
              color: COLORS.text.secondary, fontSize: 13, lineHeight: 1.6,
              whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0,
            }}>
              {detailContent || "无内容"}
            </pre>

            {sessionMemories.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <Typography.Text style={{
                  fontSize: 13, color: COLORS.text.secondary, fontWeight: 500,
                  display: "block", marginBottom: 10,
                }}>
                  关联记忆 ({sessionMemories.length})
                </Typography.Text>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sessionMemories.map((m) => (
                    <div key={m.id} style={{
                      padding: "10px 12px", borderRadius: 6,
                      background: COLORS.bg.elevated, border: `1px solid ${COLORS.border.default}`,
                    }}>
                      {m.metadata?.agent && (
                        <Tag style={{ fontSize: 10, lineHeight: "16px", marginBottom: 6, padding: "0 4px" }}>
                          {m.metadata.agent}
                        </Tag>
                      )}
                      <div style={{ color: COLORS.text.secondary, fontSize: 12.5, lineHeight: 1.5 }}>
                        {m.memory?.slice(0, 200)}{(m.memory?.length || 0) > 200 ? "..." : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
