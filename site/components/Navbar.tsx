"use client";

type View = "home" | "create" | "myresume" | "endorse" | "browse";

export function Navbar({
  account,
  chainId,
  activeView,
  onConnect,
  onViewChange,
}: {
  account?: string;
  chainId?: number;
  activeView: View;
  onConnect: () => void;
  onViewChange: (view: View) => void;
}) {
  const shortAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "";
  const chainName = chainId === 11155111 ? "Sepolia" : chainId === 31337 ? "Localhost" : `Chain ${chainId}`;

  return (
    <nav
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--surface-light)",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
        <h1
          style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--primary)", cursor: "pointer" }}
          onClick={() => onViewChange("home")}
        >
          ResumeChain
        </h1>
        <div style={{ display: "flex", gap: 24 }}>
          {(["home", "create", "myresume", "endorse", "browse"] as View[]).map((tab) => (
            <button
              key={tab}
              onClick={() => onViewChange(tab)}
              style={{
                background: "transparent",
                border: "none",
                color: activeView === tab ? "var(--primary)" : "var(--text-muted)",
                fontWeight: activeView === tab ? 600 : 400,
                cursor: "pointer",
                fontSize: 14,
                padding: "8px 0",
                borderBottom: activeView === tab ? "2px solid var(--primary)" : "2px solid transparent",
                transition: "all 0.2s",
              }}
            >
              {tab === "home" && "首页"}
              {tab === "create" && "创建"}
              {tab === "myresume" && "我的简历"}
              {tab === "endorse" && "背书"}
              {tab === "browse" && "浏览"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {account ? (
          <>
            <div
              style={{
                background: "var(--surface-light)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              {chainName}
            </div>
            <div
              style={{
                background: "var(--surface-light)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {shortAddress}
            </div>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onConnect}>
            连接钱包
          </button>
        )}
      </div>
    </nav>
  );
}

