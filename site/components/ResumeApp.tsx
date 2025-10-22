"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { createFhevmInstance } from "../fhevm/internal/fhevm";
import { useResumeChain } from "../hooks/useResumeChain";
import { hashJsonStable } from "../lib/hash";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { FeatureCard } from "./FeatureCard";
import { CreateResumeForm } from "./CreateResumeForm";
import { ResumeCard } from "./ResumeCard";

type View = "home" | "myresume" | "create" | "endorse" | "browse";

export function ResumeApp({ initialView = "home" }: { initialView?: View }) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);
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
  const [endorseSectionHash, setEndorseSectionHash] = useState("");

  const pushRoute = (v: View) => {
    setView(v);
    const path = v === "home" ? "/" : v === "myresume" ? "/me" : `/${v}`;
    try {
      router.push(path);
    } catch {}
  };

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

  const onCreate = async () => {
    if (!resumeName || !resumeTitle) return;
    const resumeJson = { basic: { name: resumeName, title: resumeTitle } };
    const h = hashJsonStable(resumeJson);
    const res = await resume.createResume(h, true);
    if (res?.resumeId !== undefined) {
      try {
        localStorage.setItem("resumechain_last_id", String(res.resumeId));
        localStorage.setItem("resumechain_last_name", resumeName);
        localStorage.setItem("resumechain_last_title", resumeTitle);
      } catch {}
    }
    pushRoute("myresume");
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
      <Navbar
        account={account}
        chainId={chainId}
        activeView={view}
        onConnect={connectWallet}
        onViewChange={pushRoute}
      />

      {view === "home" && (
        <>
          <Hero onGetStarted={() => pushRoute("create")} />
          <div style={{ padding: "64px 32px", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              <FeatureCard
                icon="📝"
                title="创建简历"
                desc="模块化简历，链上存储哈希，防篡改可验证"
                onClick={() => pushRoute("create")}
              />
              <FeatureCard
                icon="🔍"
                title="浏览人才库"
                desc="搜索公开简历，按技能/地区/经验筛选"
                onClick={() => pushRoute("browse")}
              />
              <FeatureCard
                icon="✅"
                title="验证签名"
                desc="为他人背书，链上认证完成记录"
                onClick={() => pushRoute("endorse")}
              />
            </div>

            {status !== "idle" && (
              <div style={{ marginTop: 32, padding: 16, background: "var(--surface)", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 14 }}>
                  <strong>FHEVM 状态：</strong> {status}
                </p>
                {error && <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--danger)" }}>{error}</p>}
                {instance && (
                  <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--success)" }}>✅ FHEVM instance ready</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {view === "create" && (
        <div style={{ padding: "64px 32px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button className="btn btn-secondary" onClick={() => pushRoute("home")}>
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
            onSuccess={({ resumeId, name, title }) => {
              if (name) setResumeName(name);
              if (title) setResumeTitle(title);
              if (resumeId !== undefined) {
                try {
                  localStorage.setItem("resumechain_last_id", String(resumeId));
                  localStorage.setItem("resumechain_last_name", name || "");
                  localStorage.setItem("resumechain_last_title", title || "");
                } catch {}
                pushRoute("myresume");
              }
            }}
          />

          <div className="card">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>最小链上示例（旧）</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>姓名</label>
                <input
                  className="input"
                  placeholder="请输入姓名"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>职位</label>
                <input
                  className="input"
                  placeholder="请输入职位"
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary" onClick={onCreate} disabled={!account || !instance}>
                {!account ? "请先连接钱包" : !instance ? "正在加载 FHEVM..." : "仅链上创建（演示）"}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "myresume" && (
        <div style={{ padding: "64px 32px", maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button className="btn btn-secondary" onClick={() => pushRoute("home")}>
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
                <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 8px 0" }}>{
                  resumeTitle || "未设置职位"
                }</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontFamily: "monospace" }}>
                  {account || "未连接"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-primary">导出简历</button>
                <button className="btn btn-secondary">分享链接</button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>简历模块</h3>
            <div style={{ display: "grid", gap: 16 }}>
              <ResumeCard title="基本信息" status="verified" content={`姓名：${resumeName || "未设置"} | 职位：${resumeTitle || "未设置"}`} />
              {resume.sectionHash && (
                <ResumeCard title="教育经历" status="pending" content={`学校：${sectionSchool} | 专业：${sectionMajor}`} />
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
              <button className="btn btn-primary" onClick={onUpsertSection} disabled={!resume.resumeId || !sectionSchool || !sectionMajor}>
                {!resume.resumeId ? "请先创建简历" : "添加模块"}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "endorse" && (
        <div style={{ padding: "64px 32px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <button className="btn btn-secondary" onClick={() => pushRoute("home")}>
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
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>模块哈希</label>
                <input
                  className="input"
                  placeholder="请输入模块哈希（0x...）"
                  value={endorseSectionHash}
                  onChange={(e) => setEndorseSectionHash(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={onEndorse} disabled={!account || !instance || !endorseResumeId || !endorseSectionHash}>
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
            <button className="btn btn-secondary" onClick={() => pushRoute("home")}>
              ← 返回
            </button>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>浏览人才库</h2>
          </div>

          <div className="card" style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>搜索条件</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>技能关键字</label>
                <input className="input" placeholder="例如：Solidity, React, AI" />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>地区</label>
                <input className="input" placeholder="例如：北京, 上海, 远程" />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>经验年限</label>
                <input className="input" placeholder="例如：3-5年" type="number" />
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }}>
              搜索
            </button>
          </div>

          <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
            <p style={{ margin: 0 }}>💡 提示：更多简历正在加载中...</p>
          </div>
        </div>
      )}
    </div>
  );
}



