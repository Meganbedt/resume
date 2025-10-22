"use client";

export function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "80px 32px",
        background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
      }}
    >
      <h1
        style={{
          fontSize: 56,
          fontWeight: 700,
          margin: "0 0 16px 0",
          background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        你的职业身份，从此上链
      </h1>
      <p style={{ fontSize: 18, color: "var(--text-muted)", margin: "0 0 32px 0" }}>
        去中心化职业档案 · 加密存储 · 可信背书 · 数据主权
      </p>
      <button className="btn btn-primary" onClick={onGetStarted} style={{ fontSize: 16, padding: "12px 32px" }}>
        开始使用
      </button>
    </div>
  );
}


