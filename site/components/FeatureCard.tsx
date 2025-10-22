"use client";

export function FeatureCard({ title, desc, icon, onClick }: { title: string; desc: string; icon: string; onClick?: () => void }) {
  return (
    <div className="card" style={{ cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px 0" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>{desc}</p>
    </div>
  );
}


