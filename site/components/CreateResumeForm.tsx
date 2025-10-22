"use client";

import { useState } from "react";
import { pinFile, pinJSON } from "../lib/pinata";
import { hashJsonStable } from "../lib/hash";

export function CreateResumeForm({
  onSubmit,
  onSuccess,
}: {
  onSubmit: (payload: { hash: `0x${string}`; jsonCid?: string; fileCid?: string }) => Promise<{ txHash?: string; resumeId?: number } | void>;
  onSuccess?: (args: { resumeId?: number; name: string; title: string; jsonCid?: string; fileCid?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [about, setAbout] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const onUpload = async () => {
    setLoading(true);
    setMessage(undefined);
    try {
      // 在 pin JSON 之前先上传附件，拿到 fileCid
      let fileCid: string | undefined = undefined;
      if (file) {
        const filePin = await pinFile(file);
        fileCid = filePin.IpfsHash;
      }

      const resumeJson = {
        basic: { name, title, location, email, phone },
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        about,
        // 将附件 CID 写入 JSON，便于跨设备恢复
        fileCid,
        // 预留附件数组形式，未来可存多文件
        attachments: fileCid ? [{ cid: fileCid, name: file ? file.name : "attachment" }] : [],
      };

      const jsonPin = await pinJSON(`${name || "resume"}.json`, resumeJson);
      const jsonCid = jsonPin.IpfsHash;
      try {
        localStorage.setItem("resumechain_last_json_cid", jsonCid);
      } catch {}

      // 持久化 fileCid（便于按 ID 快速读取）
      if (fileCid) {
        try {
          localStorage.setItem("resumechain_last_file_cid", fileCid);
        } catch {}
      }
      const hash = hashJsonStable({ jsonCid, fileCid });
      const result = (await onSubmit({ hash, jsonCid, fileCid })) || {};
      const tx = (result as any).txHash ? ` 交易: ${(result as any).txHash}` : "";
      const id = (result as any).resumeId !== undefined ? ` 简历ID: ${(result as any).resumeId}` : "";
      setMessage(`✅ 已上传到 IPFS，并提交上链。${tx}${id}`);
      if (onSuccess) {
        try {
          const rid = (result as any).resumeId;
          if (rid !== undefined) {
            try {
              localStorage.setItem(`resumechain_cid_by_id_${rid}`, jsonCid);
              if (fileCid) localStorage.setItem(`resumechain_file_by_id_${rid}`, fileCid);
            } catch {}
          }
          onSuccess({ resumeId: rid, name, title, jsonCid, fileCid });
        } catch {}
      }
    } catch (e: any) {
      setMessage(`❌ ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>创建简历（更多字段 + 附件上传）</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div>
          <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>姓名</label>
          <input className="input" placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>职位</label>
          <input className="input" placeholder="职位" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>地区</label>
          <input className="input" placeholder="北京/上海/远程" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>邮箱</label>
          <input className="input" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>手机号</label>
          <input className="input" placeholder="手机号（可选）" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>技能标签（用逗号分隔）</label>
          <input className="input" placeholder="Solidity, React, AI" value={skills} onChange={(e) => setSkills(e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>个人简介</label>
          <textarea className="input textarea" placeholder="一句话介绍你自己..." value={about} onChange={(e) => setAbout(e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "block" }}>附件（PDF/作品集等，可选）</label>
          <input className="input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button className="btn btn-primary" onClick={onUpload} disabled={loading}>
          {loading ? "上传中..." : "上传并提交上链"}
        </button>
      </div>
      {message && <p style={{ marginTop: 12, fontSize: 14 }}>{message}</p>}
    </div>
  );
}


