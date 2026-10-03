"use client";
import { useEffect, useState } from "react";

const STAGE_LABEL: Record<string, string> = {
  proposal: "Proposal", seminar: "Seminar", sidang: "Sidang", lulus: "Lulus",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draf", submitted: "Diajukan", approved: "Disetujui", revision: "Revisi",
};

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

export default function ProdiPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [threshold, setThreshold] = useState(14);
  const [input, setInput] = useState("14");
  const [loading, setLoading] = useState(true);

  const load = async (t: number) => {
    setLoading(true);
    const res = await fetch(`/api/prodi/dashboard?threshold=${t}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setLoading(false);
  };

  useEffect(() => { load(threshold); }, []);

  const apply = () => {
    const t = Number(input);
    if (!isNaN(t) && t >= 0) {
      setThreshold(t);
      load(t);
    }
  };

  const lama = rows.filter((r) => r.lama);

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Prodi — Monitoring Bimbingan</h1>
        <button className="btn-secondary" onClick={logout}>Keluar</button>
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Threshold “lama tidak bimbingan” (hari):</label>
        <input className="input w-24" type="number" min={0} value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-secondary" onClick={apply}>Terapkan</button>
        <span className="text-sm text-slate-600">
          Total mahasiswa: {rows.length} · Lama tidak bimbingan (&gt; {threshold} hari):{" "}
          <span className="font-bold text-red-600">{lama.length}</span>
        </span>
      </div>

      {loading ? (
        <p>Memuat…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Mahasiswa</th>
                <th className="py-2 pr-3">NIM</th>
                <th className="py-2 pr-3">Dosen Pembimbing</th>
                <th className="py-2 pr-3">Judul</th>
                <th className="py-2 pr-3">Tahap</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Hari sejak aktivitas terakhir</th>
                <th className="py-2 pr-3">Aktivitas terakhir</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.skripsiId} className={`border-b ${r.lama ? "bg-red-50" : ""}`}>
                  <td className="py-2 pr-3 font-medium">{r.mahasiswa}</td>
                  <td className="py-2 pr-3">{r.nim ?? "-"}</td>
                  <td className="py-2 pr-3">{r.dosen}</td>
                  <td className="py-2 pr-3 max-w-xs truncate" title={r.judul}>{r.judul}</td>
                  <td className="py-2 pr-3">{STAGE_LABEL[r.stage]}</td>
                  <td className="py-2 pr-3">{STATUS_LABEL[r.stageStatus]}</td>
                  <td className="py-2 pr-3">
                    {r.daysSince == null ? "—" : r.daysSince}
                    {r.lama && <span className="badge bg-red-600 text-white ml-2">lama</span>}
                  </td>
                  <td className="py-2 pr-3 max-w-xs truncate" title={r.lastActivityNote ?? ""}>
                    {r.lastActivityNote ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
