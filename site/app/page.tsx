"use client";

import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { createFhevmInstance } from "../fhevm/internal/fhevm";
import { useResumeChain } from "../hooks/useResumeChain";
import { hashJsonStable } from "../lib/hash";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { FeatureCard } from "../components/FeatureCard";
import { CreateResumeForm } from "../components/CreateResumeForm";
import { ResumeCard } from "../components/ResumeCard";
import { ResumeDetail } from "../components/ResumeDetail";

type View = "home" | "myresume" | "create" | "endorse" | "browse";

function PublicResumes({
  listPublicResumes,
  getResume,
  decryptHandles,
  contractAddress,
  filters,
}: {
  listPublicResumes: () => Promise<any[]>;
  getResume: (id: number) => Promise<any>;
  decryptHandles: (addr: `0x${string}`, handles: string[]) => Promise<Record<string, any>>;
  contractAddress?: `0x${string}`;
  filters: { skill?: string; location?: string; years?: string };
}) {
  const [list, setList] = useState<any[]>([]);
  const [detail, setDetail] = useState<{ id: number; loading: boolean; allowed?: boolean; data?: any } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await listPublicResumes();
        const enriched = await Promise.all(
          raw.map(async (item: any) => {
            let jsonCid: string | undefined = undefined;
            try {
              jsonCid = localStorage.getItem(`resumechain_cid_by_id_${item.id}`) || undefined;
            } catch {}
            let json: any = undefined;
            if (jsonCid) {
              try {
                const { fetchJsonFromIPFS } = await import("../lib/pinata");
                json = await fetchJsonFromIPFS(jsonCid);
              } catch {}
            }
            const basic = json?.basic || {};
            const skills = Array.isArray(json?.skills) ? json.skills : [];
            return { ...item, basic, skills, jsonCid };
          })
        );
        if (alive) setList(enriched);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [listPublicResumes]);

  const normIncludes = (text: string | undefined, q: string | undefined) => {
    if (!q) return true;
    if (!text) return false;
    return text.toLowerCase().includes(q.toLowerCase());
  };

  const filtered = list.filter((p) => {
    const okSkill = filters.skill
      ? (p.skills || []).some((s: string) => normIncludes(s, filters.skill))
      : true;
    const okLoc = normIncludes(p.basic?.location, filters.location);
    // years 目前 JSON 可能未提供，留作扩展
    return okSkill && okLoc;
  });

  const onOpenDetail = async (p: any) => {
    if (!contractAddress) return;
    setDetail({ id: p.id, loading: true });
    try {
      const r = await getResume(p.id);
      const handle = r?.[5] as string;
      const res = await decryptHandles(contractAddress, [handle]);
      const value = res?.[Object.keys(res)[0]];
      const allowed = value === true || String(value) === "true" || value === 1n || value === 1;
      if (!allowed) {
        setDetail({ id: p.id, loading: false, allowed: false });
        return;
      }
      let data: any = undefined;
      if (p.jsonCid) {
        const { fetchJsonFromIPFS } = await import("../lib/pinata");
        data = await fetchJsonFromIPFS(p.jsonCid);
      }
      setDetail({ id: p.id, loading: false, allowed: true, data });
    } catch (e) {
      setDetail({ id: p.id, loading: false, allowed: false });
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {filtered.length === 0 && (
        <div className="card" style={{ padding: 16, color: "var(--text-muted)" }}>
          暂无公开简历
        </div>
      )}
      {filtered.map((p: any) => (
        <div key={p.id} className="card">
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              👤
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px 0" }}>{p.basic.name || `ID #${p.id}`}</h4>
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 8px 0" }}>{p.basic.title || "未填写职位"}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.skills.slice(0, 6).map((s: string, i: number) => (
                  <span
                    key={i}
                    style={{
                      padding: "4px 12px",
                      background: "rgba(59, 130, 246, 0.1)",
                      color: "var(--primary)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => onOpenDetail(p)}>
              查看详情
            </button>
          </div>
        </div>
      ))}

      {detail && (
        <div className="card" style={{ position: "fixed", left: 0, right: 0, top: 80, margin: "0 auto", maxWidth: 900, zIndex: 50 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>公开简历详情（ID: {detail.id}）</h3>
            <button className="btn btn-secondary" onClick={() => setDetail(null)}>关闭</button>
          </div>
          {detail.loading && <p style={{ margin: 0 }}>正在解密授权...</p>}
          {!detail.loading && detail.allowed === false && (
            <p style={{ margin: 0, color: "var(--danger)" }}>未被授权查看该简历详情</p>
          )}
          {!detail.loading && detail.allowed && detail.data && (
            <ResumeDetail data={detail.data} fileCid={detail.data.fileCid || detail.data.attachments?.[0]?.cid} />
          )}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [instance, setInstance] = useState<any>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const [provider, setProvider] = useState<ethers.Eip1193Provider | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [signer, setSigner] = useState<ethers.Signer | undefined>(undefined);
  const [account, setAccount] = useState<string | undefined>(undefined);
  const [readonlyProvider, setReadonlyProvider] = useState<ethers.ContractRunner | undefined>(undefined);

  // Form states
  const [resumeName, setResumeName] = useState("");
  const [resumeTitle, setResumeTitle] = useState("");
  const [sectionSchool, setSectionSchool] = useState("");
  const [sectionMajor, setSectionMajor] = useState("");
  const [endorseResumeId, setEndorseResumeId] = useState("");
  const [lastResumeId, setLastResumeId] = useState<string | undefined>(undefined);
  const [myList, setMyList] = useState<Array<{ id: number; createdAt: number; callerAccess: string }>>([]);
  const [decMap, setDecMap] = useState<Record<string, string>>({});
  const [detailMap, setDetailMap] = useState<Record<string, any>>({});
  // 搜索输入与已应用过滤
  const [qSkill, setQSkill] = useState("");
  const [qLoc, setQLoc] = useState("");
  const [qYears, setQYears] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{ skill?: string; location?: string; years?: string }>({});

  const connectWallet = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const eth = (window as any).ethereum as ethers.Eip1193Provider;
        await eth.request({ method: "eth_requestAccounts", params: [] });
        setProvider(eth);
        const idHex = await eth.request({ method: "eth_chainId", params: [] });
        setChainId(parseInt(idHex as string, 16));
        const web3 = new ethers.BrowserProvider(eth);
        setReadonlyProvider(web3);
        const s = await web3.getSigner();
        setSigner(s);
        const addr = await s.getAddress();
        setAccount(addr);
        try {
          localStorage.setItem("resumechain_connected", "1");
        } catch {}
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  // Silent reconnect on refresh if the user had previously connected
  useEffect(() => {
    const silentReconnect = async () => {
      try {
        if (typeof window === "undefined" || !(window as any).ethereum) return;
        const eth = (window as any).ethereum as ethers.Eip1193Provider;
        const wasConnected = (() => {
          try {
            return localStorage.getItem("resumechain_connected") === "1";
          } catch {
            return false;
          }
        })();

        if (!wasConnected) return;

        const accounts = (await eth.request({ method: "eth_accounts", params: [] })) as string[];
        if (!accounts || accounts.length === 0) return; // user revoked in wallet

        setProvider(eth);
        const idHex = await eth.request({ method: "eth_chainId", params: [] });
        setChainId(parseInt(idHex as string, 16));
        const web3 = new ethers.BrowserProvider(eth);
        setReadonlyProvider(web3);
        // Do not prompt: bind signer to the first known account directly
        const s = await web3.getSigner(accounts[0]);
        setSigner(s);
        setAccount(accounts[0]);
      } catch {
        // ignore
      }
    };
    silentReconnect();
    // 读取最近一次创建的简历信息，刷新后也能看到
    try {
      const savedId = localStorage.getItem("resumechain_last_id");
      const savedName = localStorage.getItem("resumechain_last_name") || "";
      const savedTitle = localStorage.getItem("resumechain_last_title") || "";
      if (savedId) {
        setResumeName(savedName);
        setResumeTitle(savedTitle);
        setLastResumeId(savedId);
        setView("myresume");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!provider || !chainId) return;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus("idle");
    setError(undefined);
    setInstance(undefined);

    createFhevmInstance({
      provider: provider,
      signal: ac.signal,
      onStatusChange: (s) => setStatus(s),
    })
      .then((i) => setInstance(i))
      .catch((e) => setError(String(e?.message ?? e)));

    return () => {
      ac.abort();
    };
  }, [provider, chainId]);

  const resume = useResumeChain({ instance, chainId, signer, readonlyProvider });

  useEffect(() => {
    const run = async () => {
      try {
        if (!account || !resume.address) return;
        const list = await resume.listMyResumes(account as `0x${string}`);
        const items = list.map((r) => ({ id: r.id, createdAt: r.createdAt, callerAccess: r.callerAccess }));
        // 以最新的一个作为“当前简历ID”，避免显示旧缓存
        const latest = items.length > 0 ? items[items.length - 1] : undefined;
        setMyList(items);
        setLastResumeId(latest ? String(latest.id) : undefined);
      } catch {}
    };
    run();
  }, [account, resume.address, resume.listMyResumes]);

  // 当合约地址改变时，清理旧的本地缓存，避免显示过期的简历ID
  useEffect(() => {
    try {
      const key = "resumechain_contract";
      const prev = localStorage.getItem(key);
      if (resume.address && prev && prev.toLowerCase() !== (resume.address as string).toLowerCase()) {
        localStorage.removeItem("resumechain_last_id");
        localStorage.removeItem("resumechain_last_name");
        localStorage.removeItem("resumechain_last_title");
      }
      if (resume.address) localStorage.setItem(key, resume.address);
    } catch {}
  }, [resume.address]);

  const onCreate = async () => {
    if (!resumeName || !resumeTitle) return;
    const resumeJson = { basic: { name: resumeName, title: resumeTitle } };
    const h = hashJsonStable(resumeJson);
    await resume.createResume(h, true);
    setView("myresume");
  };

  const onUpsertSection = async () => {
    if (!resume.resumeId || !sectionSchool || !sectionMajor) return;
    const section = { edu: { school: sectionSchool, major: sectionMajor } };
    const sh = hashJsonStable(section);
    await resume.upsertSection(resume.resumeId, sh);
  };

  const onEndorse = async () => {
    if (!endorseResumeId || !endorseSectionHash) return;
    await resume.endorseSection(Number(endorseResumeId), endorseSectionHash as `0x${string}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <Navbar account={account} chainId={chainId} activeView={view} onConnect={connectWallet} onViewChange={setView} />

      {view === "home" && (
        <>
          <Hero onGetStarted={() => setView("create")} />
          <div style={{ padding: "64px 32px", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              <FeatureCard
                icon="📝"
                title="创建简历"
                desc="模块化简历，链上存储哈希，防篡改可验证"
                onClick={() => setView("create")}
              />
              <FeatureCard
                icon="🔍"
                title="浏览人才库"
                desc="搜索公开简历，按技能/地区/经验筛选"
                onClick={() => setView("browse")}
              />
              <FeatureCard
                icon="✅"
                title="验证签名"
                desc="为他人背书，链上认证完成记录"
                onClick={() => setView("endorse")}
              />
            </div>

            <div style={{ marginTop: 64 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>平台特性</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                <div className="card">
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>🔐 加密存储</h4>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
                    简历内容使用 FHEVM 加密，仅授权地址可查看
                  </p>
                </div>
                <div className="card">
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>🛡️ 防篡改</h4>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
                    哈希上链，任何修改均可追溯验证
                  </p>
                </div>
                <div className="card">
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>👥 可信背书</h4>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
                    雇主/机构链上签名认证，公开透明
                  </p>
                </div>
                <div className="card">
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>🔑 数据主权</h4>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
                    完全控制数据访问权限，可导出/隐藏/授权
                  </p>
                </div>
              </div>
            </div>

            {status !== "idle" && (
              <div style={{ marginTop: 32, padding: 16, background: "var(--surface)", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 14 }}>
                  <strong>FHEVM 状态：</strong> {status}
                </p>
                {error && <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--danger)" }}>{error}</p>}
                {instance && <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--success)" }}>✅ FHEVM instance ready</p>}
              </div>
            )}
          </div>
        </>
      )}

      {view === "create" && (
        <div style={{ padding: "64px 32px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button className="btn btn-secondary" onClick={() => setView("home")}>
              ← 返回
            </button>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>创建简历</h2>
          </div>

          <CreateResumeForm
            onSubmit={async ({ hash }) => {
              try {
                const res = await resume.createResume(hash, true);
                return res;
              } catch (e: any) {
                alert(e?.message ?? e);
              }
            }}
            onSuccess={({ resumeId, name, title, jsonCid }) => {
              if (resumeId !== undefined) {
                try {
                  localStorage.setItem("resumechain_last_id", String(resumeId));
                  localStorage.setItem("resumechain_last_name", name || "");
                  localStorage.setItem("resumechain_last_title", title || "");
                  if (jsonCid) localStorage.setItem(`resumechain_cid_by_id_${resumeId}`, jsonCid);
                } catch {}
                if (name) setResumeName(name);
                if (title) setResumeTitle(title);
                setLastResumeId(String(resumeId));
                setView("myresume");
              }
            }}
          />

          <div className="card">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>最小链上示例（旧）</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>姓名</label>
                <input className="input" placeholder="请输入姓名" value={resumeName} onChange={(e) => setResumeName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>职位</label>
                <input className="input" placeholder="请输入职位" value={resumeTitle} onChange={(e) => setResumeTitle(e.target.value)} />
              </div>
              <button className="btn btn-secondary" onClick={onCreate} disabled={!account || !instance}>
                {!account ? "请先连接钱包" : !instance ? "正在加载 FHEVM..." : "仅链上创建（演示）"}
              </button>
            </div>
            {resume.message && (
              <div style={{ marginTop: 16 }}>
                <p style={{ margin: 0, fontSize: 14, color: "var(--success)" }}>{resume.message}</p>
                {resume.resumeId && (
                  <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
                    <strong>简历ID：</strong> {resume.resumeId}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {view === "myresume" && (
        <div style={{ padding: "64px 32px", maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button className="btn btn-secondary" onClick={() => setView("home")}>
              ← 返回
            </button>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>我的简历</h2>
          </div>

          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                }}
              >
                👤
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px 0" }}>{resumeName || "未设置姓名"}</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 8px 0" }}>
                  {resumeTitle || "未设置职位"}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontFamily: "monospace" }}>
                  {account || "未连接"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      const id = lastResumeId ? Number(lastResumeId) : undefined;
                      let jsonCid: string | undefined = undefined;
                      if (id) {
                        try { jsonCid = localStorage.getItem(`resumechain_cid_by_id_${id}`) || undefined; } catch {}
                      }
                      if (!jsonCid) {
                        try { jsonCid = localStorage.getItem("resumechain_last_json_cid") || undefined; } catch {}
                      }

                      let data: any = undefined;
                      if (jsonCid) {
                        const { fetchJsonFromIPFS } = await import("../lib/pinata");
                        data = await fetchJsonFromIPFS(jsonCid);
                      } else {
                        // 回退：仅导出当前基本信息
                        data = { basic: { name: resumeName || "", title: resumeTitle || "" }, note: "fallback export: no JSON CID found" };
                      }
                      // 附件兜底写入
                      try {
                        let fileCid = id ? localStorage.getItem(`resumechain_file_by_id_${id}`) || undefined : undefined;
                        if (!fileCid) fileCid = localStorage.getItem("resumechain_last_file_cid") || undefined;
                        if (fileCid) {
                          if (!data.fileCid) data.fileCid = fileCid;
                          if (!Array.isArray(data.attachments) || data.attachments.length === 0) {
                            data.attachments = [{ cid: fileCid, name: "attachment" }];
                          }
                        }
                      } catch {}

                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${resumeName || "Resume"}${id ? `_${id}` : ""}.json`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (e: any) {
                      alert(e?.message ?? e);
                    }
                  }}
                >
                  导出简历
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    try {
                      const id = lastResumeId ? Number(lastResumeId) : undefined;
                      let jsonCid: string | undefined = undefined;
                      if (id) {
                        try { jsonCid = localStorage.getItem(`resumechain_cid_by_id_${id}`) || undefined; } catch {}
                      }
                      if (!jsonCid) {
                        try { jsonCid = localStorage.getItem("resumechain_last_json_cid") || undefined; } catch {}
                      }
                      if (!jsonCid) {
                        alert("未找到 JSON CID，无法分享。");
                        return;
                      }
                      const link = `https://gateway.pinata.cloud/ipfs/${jsonCid}`;
                      await navigator.clipboard.writeText(link);
                      alert("已复制分享链接到剪贴板！\n" + link);
                    } catch (e: any) {
                      alert(e?.message ?? e);
                    }
                  }}
                >
                  分享链接
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>简历模块</h3>
            <div style={{ display: "grid", gap: 16 }}>
              <ResumeCard
                title="基本信息"
                status="verified"
                content={`姓名：${resumeName || "未设置"} | 职位：${resumeTitle || "未设置"}${lastResumeId ? ` | 简历ID：${lastResumeId}` : ""}`}
              />
              {myList.length > 0 && (
                <div className="card">
                  <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>我的所有简历</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {myList.map((r) => (
                      <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 14 }}>ID: {r.id} · 创建时间: {new Date(r.createdAt * 1000).toLocaleString()}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-secondary"
                            onClick={async () => {
                              const res: any = await resume.decryptHandles(resume.address as `0x${string}`, [r.callerAccess]);
                              const raw = r.callerAccess;
                              const candidates: string[] = [];
                              try {
                                candidates.push(ethers.toBeHex(ethers.toBigInt(raw), 32));
                              } catch {}
                              candidates.push(raw);
                              // 尝试多种键匹配：标准化/原值/大小写无关/按数值等价
                              let clear: any = undefined;
                              for (const key of candidates) {
                                if (res && Object.prototype.hasOwnProperty.call(res, key)) {
                                  clear = res[key];
                                  break;
                                }
                              }
                              if (clear === undefined && res && typeof res === "object") {
                                const kv = Object.entries(res).find(([k]) => {
                                  try {
                                    return ethers.toBigInt(k) === ethers.toBigInt(raw);
                                  } catch {
                                    return false;
                                  }
                                });
                                if (kv) clear = kv[1];
                              }
                              // 兼容数组返回形态：[{handle,value}] 或 [value]
                              if (clear === undefined && Array.isArray(res)) {
                                const byObj = res.find((it: any) => typeof it === "object" && (it.handle === raw || (() => { try { return ethers.toBigInt(it.handle) === ethers.toBigInt(raw); } catch { return false; } })()));
                                if (byObj) clear = byObj.value ?? byObj.decrypted ?? byObj[raw];
                                else if (res.length === 1 && typeof res[0] !== "object") clear = res[0];
                              }
                              const out = String(clear);
                              setDecMap((m) => ({ ...m, [String(r.id)]: out }));
                              alert(`解密访问标记（ebool）: ${out}`);
                            }}
                          >
                            解密查看
                          </button>
                          <button
                            className="btn btn-primary"
                            disabled={!decMap[String(r.id)] || decMap[String(r.id)] !== "true"}
                            onClick={async () => {
                              try {
                                // 1) 优先用按 ID 持久化的 CID
                                let jsonCid: string | undefined = undefined;
                                try { jsonCid = localStorage.getItem(`resumechain_cid_by_id_${r.id}`) || undefined; } catch {}
                                // 2) 兜底：最后一次的 CID
                                if (!jsonCid) { try { jsonCid = localStorage.getItem("resumechain_last_json_cid") || undefined; } catch {} }
                                if (!jsonCid) {
                                  alert("未找到可读取的 JSON CID，请重新创建一次简历。");
                                  return;
                                }
                                const { fetchJsonFromIPFS } = await import("../lib/pinata");
                                const data = await fetchJsonFromIPFS(jsonCid);
                                // 如果 JSON 里包含 fileCid 或 attachments[0]，一起存储
                                let fileCidFromJson: string | undefined = undefined;
                                try {
                                  fileCidFromJson = (data as any)?.fileCid || (Array.isArray((data as any)?.attachments) ? (data as any).attachments[0]?.cid : undefined);
                                } catch {}
                                setDetailMap((m) => ({ ...m, [String(r.id)]: { ...data, _fileCid: fileCidFromJson } }));
                              } catch (e: any) {
                                alert(e?.message ?? e);
                              }
                            }}
                          >
                            查看详情
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resume.sectionHash && (
                <ResumeCard
                  title="教育经历"
                  status="pending"
                  content={`学校：${sectionSchool} | 专业：${sectionMajor}`}
                />
              )}
              {Object.keys(detailMap).length > 0 && (
                <>
                  {Object.entries(detailMap).map(([id, data]) => {
                    let fileCid: string | undefined = undefined;
                    // 1) 优先从 JSON 数据里取 _fileCid
                    if ((data as any)?._fileCid) {
                      fileCid = (data as any)._fileCid;
                    }
                    // 2) 再从 localStorage 按 ID 读
                    if (!fileCid) {
                      try {
                        fileCid = localStorage.getItem(`resumechain_file_by_id_${id}`) || undefined;
                      } catch {}
                    }
                    // 3) 兜底：最后一次上传的
                    if (!fileCid) {
                      try {
                        fileCid = localStorage.getItem("resumechain_last_file_cid") || undefined;
                      } catch {}
                    }
                    console.log(`[ResumeDetail] ID=${id}, fileCid=${fileCid}`);
                    return (
                      <div key={id}>
                        <ResumeDetail data={data} fileCid={fileCid} />
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>新增模块</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>学校</label>
                <input
                  className="input"
                  placeholder="请输入学校名称"
                  value={sectionSchool}
                  onChange={(e) => setSectionSchool(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>专业</label>
                <input
                  className="input"
                  placeholder="请输入专业"
                  value={sectionMajor}
                  onChange={(e) => setSectionMajor(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={onUpsertSection}
                disabled={!resume.resumeId || !sectionSchool || !sectionMajor}
              >
                {!resume.resumeId ? "请先创建简历" : "添加模块"}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "endorse" && (
        <div style={{ padding: "64px 32px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button className="btn btn-secondary" onClick={() => setView("home")}>
              ← 返回
            </button>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>背书认证</h2>
          </div>

              <div className="card">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>输入简历信息</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>简历ID</label>
                <input
                  className="input"
                  placeholder="请输入简历ID"
                  value={endorseResumeId}
                  onChange={(e) => setEndorseResumeId(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await resume.endorseResume(Number(endorseResumeId));
                }}
                disabled={!account || !instance || !endorseResumeId}
              >
                {!account ? "请先连接钱包" : !instance ? "正在加载 FHEVM..." : "签名认证"}
              </button>
            </div>
          </div>

          {resume.message && (
            <div style={{ marginTop: 16, padding: 16, background: "var(--surface)", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--success)" }}>✅ {resume.message}</p>
            </div>
          )}
        </div>
      )}

      {view === "browse" && (
        <div style={{ padding: "64px 32px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button className="btn btn-secondary" onClick={() => setView("home")}>
              ← 返回
            </button>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>浏览人才库</h2>
          </div>

            <div className="card" style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>搜索条件</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>技能关键字</label>
                  <input id="search-skill" className="input" placeholder="例如：Solidity, React, AI" value={qSkill} onChange={(e) => setQSkill(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>地区</label>
                  <input id="search-loc" className="input" placeholder="例如：北京, 上海, 远程" value={qLoc} onChange={(e) => setQLoc(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>经验年限</label>
                  <input id="search-years" className="input" placeholder="例如：3-5年" type="number" value={qYears} onChange={(e) => setQYears(e.target.value)} />
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => {
                setAppliedFilters({
                  skill: qSkill.trim() || undefined,
                  location: qLoc.trim() || undefined,
                  years: qYears.trim() || undefined,
                });
                setView("browse");
              }}
            >
              搜索
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>公开简历</h3>
            <PublicResumes
              listPublicResumes={resume.listPublicResumes}
              getResume={resume.getResume}
              decryptHandles={resume.decryptHandles}
              contractAddress={resume.address as any}
              filters={appliedFilters}
            />
          </div>

          <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
            <p style={{ margin: 0 }}>💡 提示：更多简历正在加载中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
