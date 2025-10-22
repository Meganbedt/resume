"use client";

export function ResumeCard({
  title,
  status,
  content,
  onEdit,
  onDelete,
}: {
  title: string;
  status: "verified" | "pending" | "private";
  content: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const statusConfig = {
    verified: { label: "已认证", color: "verified" },
    pending: { label: "待认证", color: "pending" },
    private: { label: "私密", color: "private" },
  };

  const s = statusConfig[status];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h4>
        <div className={`badge badge-${s.color}`}>
          <span className={`status-dot ${s.color}`}></span>
          {s.label}
        </div>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px 0", lineHeight: 1.6 }}>{content}</p>
      <div style={{ display: "flex", gap: 8 }}>
        {onEdit && (
          <button className="btn btn-secondary" onClick={onEdit} style={{ fontSize: 12, padding: "6px 16px" }}>
            编辑
          </button>
        )}
        {onDelete && (
          <button
            className="btn btn-secondary"
            onClick={onDelete}
            style={{ fontSize: 12, padding: "6px 16px", color: "var(--danger)" }}
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}


