"use client";

import { useState } from "react";

export function ResumeDetail({ data, fileCid }: { data: any; fileCid?: string }) {
  const [showRaw, setShowRaw] = useState(false);

  const basic = data?.basic || {};
  const skills = Array.isArray(data?.skills) ? data.skills : [];
  const about = data?.about || "";

  const getIPFSUrl = (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`;
  const fileUrl = fileCid ? getIPFSUrl(fileCid) : undefined;

  console.log("[ResumeDetail] Rendering with fileCid:", fileCid, "fileUrl:", fileUrl);

  // 判断文件类型
  const getFileType = (url?: string): "image" | "video" | "pdf" | "unknown" => {
    if (!url) return "unknown";
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return "image";
    if (lower.match(/\.(mp4|webm|ogg|mov)$/)) return "video";
    if (lower.match(/\.pdf$/)) return "pdf";
    return "unknown";
  };

  const fileType = getFileType(fileUrl);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 基本信息卡片 */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>📋 基本信息</h3>
          <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowRaw(!showRaw)}>
            {showRaw ? "隐藏原始 JSON" : "查看原始 JSON"}
          </button>
        </div>

        {showRaw ? (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              margin: 0,
              fontSize: 12,
              background: "rgba(255,255,255,0.05)",
              padding: 12,
              borderRadius: 8,
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {basic.name && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>姓名</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{basic.name}</div>
              </div>
            )}
            {basic.title && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>职位</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{basic.title}</div>
              </div>
            )}
            {basic.location && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>地区</div>
                <div style={{ fontSize: 14 }}>{basic.location}</div>
              </div>
            )}
            {basic.email && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>邮箱</div>
                <div style={{ fontSize: 14 }}>{basic.email}</div>
              </div>
            )}
            {basic.phone && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>手机号</div>
                <div style={{ fontSize: 14 }}>{basic.phone}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 技能标签 */}
      {skills.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>💼 技能标签</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {skills.map((skill: string, idx: number) => (
              <span
                key={idx}
                style={{
                  padding: "6px 16px",
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "var(--primary)",
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 个人简介 */}
      {about && (
        <div className="card">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>✍️ 个人简介</h3>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--text)" }}>{about}</p>
        </div>
      )}

      {/* 附件展示 */}
      {fileUrl && (
        <div className="card">
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>📎 附件</h3>

          {fileType === "image" && (
            <div style={{ textAlign: "center" }}>
              <img
                src={fileUrl}
                alt="附件"
                style={{
                  maxWidth: "100%",
                  maxHeight: "500px",
                  borderRadius: 8,
                  border: "1px solid var(--surface-light)",
                }}
              />
            </div>
          )}

          {fileType === "video" && (
            <video
              controls
              style={{
                width: "100%",
                maxHeight: "500px",
                borderRadius: 8,
                border: "1px solid var(--surface-light)",
              }}
            >
              <source src={fileUrl} />
              您的浏览器不支持视频播放。
            </video>
          )}

          {fileType === "pdf" && (
            <div style={{ textAlign: "center" }}>
              <iframe
                src={fileUrl}
                style={{
                  width: "100%",
                  height: "600px",
                  border: "1px solid var(--surface-light)",
                  borderRadius: 8,
                }}
                title="PDF预览"
              />
              <div style={{ marginTop: 12 }}>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  在新窗口打开 PDF
                </a>
              </div>
            </div>
          )}

          {fileType === "unknown" && (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <p style={{ margin: "0 0 16px 0", color: "var(--text-muted)" }}>无法预览该文件类型</p>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                下载附件
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

