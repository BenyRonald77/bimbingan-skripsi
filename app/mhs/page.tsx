"use client";
import { useEffect, useState } from "react";

const BABS = [1, 2, 3, 4, 5];
const BAB_LABEL: Record<number, string> = {
  1: "Bab 1 — Pendahuluan",
  2: "Bab 2 — Tinjauan Pustaka",
  3: "Bab 3 — Metodologi",
  4: "Bab 4 — Hasil",
  5: "Bab 5 — Penutup",
};
const STAGE_LABEL: Record<string, string> = {
  proposal: "Proposal", seminar: "Seminar", sidang: "Sidang", lulus: "Lulus",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draf", submitted: "Diajukan", approved: "Disetujui", revision: "Revisi",
};

type Skripsi = {
  id: number; judul: string; stage: string; stageStatus: string;
  dosen?: { name: string } | null;
};

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

export default function MhsPage() {
  const [skripsi, setSkripsi] = useState<Skripsi | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [judul, setJudul] = useState("");
  const [dosens, setDosens] = useState<any[]>([]);
  const [dosenId, setDosenId] = useState("");
  const [msg, setMsg] = useState("");
  const [files, setFiles] = useState<Record<number, File | null>>({});

  const load = async () => {
    const res = await fetch("/api/skripsi");
    const data = await res.json();
    const s = Array.isArray(data) && data.length > 0 ? data[0] : null;
    setSkripsi(s);
    if (s) {
      const d = await (await fetch(`/api/skripsi/${s.id}/drafts`)).json();
      setDrafts(Array.isArray(d) ? d : []);
      const h = await (await fetch(`/api/skripsi/${s.id}/history`)).json();
      setTimeline(h.timeline ?? []);
    } else {
      const dd = await (await fetch("/api/dosen")).json();
      setDosens(Array.isArray(dd) ? dd : []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createSkripsi = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/skripsi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ judul, dosenId: dosenId ? Number(dosenId) : null }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error ?? "Gagal membuat skripsi");
      return;
    }
    load();
  };

  const upload = async (bab: number) => {
    const file = files[bab];
    if (!file || !skripsi) return;
    setMsg("");
    const form = new FormData();
    form.append("bab", String(bab));
    form.append("file", file);
    const res = await fetch(`/api/skripsi/${skripsi.id}/drafts`, { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(d.error ?? "Gagal mengunggah");
      return;
    }
    setFiles({ ...files, [bab]: null });
    setMsg(`Berhasil mengunggah ${BAB_LABEL[bab]} versi ${d.version}`);
    load();
  };

  const submitStage = async () => {
    if (!skripsi) return;
    const res = await fetch(`/api/skripsi/${skripsi.id}/submit-stage`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setMsg(!res.ok ? d.error ?? "Gagal mengajukan" : `Tahap ${STAGE_LABEL[skripsi.stage]} berhasil diajukan`);
    load();
  };

  if (loading) return <div className="p-8">Memuat…</div>;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Skripsiku</h1>
        <button className="btn-secondary" onClick={logout}>Keluar</button>
      </div>

      {!skripsi ? (
        <div className="card">
          <h2 className="text-lg font-semibold">Buat Skripsi</h2>
          <form onSubmit={createSkripsi} className="mt-3 space-y-3">
            <div>
              <label className="label">Judul skripsi</label>
              <input className="input" value={judul} onChange={(e) => setJudul(e.target.value)} required />
            </div>
            <div>
              <label className="label">Dosen pembimbing (opsional)</label>
              <select className="input" value={dosenId} onChange={(e) => setDosenId(e.target.value)}>
                <option value="">— belum ditentukan —</option>
                {dosens.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.identifier ?? "-"})</option>
                ))}
              </select>
            </div>
            <button className="btn">Simpan</button>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <h2 className="text-lg font-semibold">{skripsi.judul}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pembimbing: {skripsi.dosen?.name ?? "—"} · Tahap:{" "}
              <span className="badge bg-indigo-100 text-indigo-800">{STAGE_LABEL[skripsi.stage]}</span>{" "}
              <span className="badge bg-slate-200 text-slate-700">{STATUS_LABEL[skripsi.stageStatus]}</span>
            </p>
            {(skripsi.stageStatus === "draft" || skripsi.stageStatus === "revision") && skripsi.stage !== "lulus" && (
              <button className="btn mt-3" onClick={submitStage}>
                Ajukan Tahap {STAGE_LABEL[skripsi.stage]}
              </button>
            )}
          </div>

          {msg && <p className="text-sm text-slate-700">{msg}</p>}

          <div className="card">
            <h2 className="text-lg font-semibold">Draf per Bab</h2>
            <div className="mt-3 space-y-4">
              {BABS.map((bab) => {
                const list = drafts.filter((d) => d.bab === bab);
                return (
                  <div key={bab} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{BAB_LABEL[bab]}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => setFiles({ ...files, [bab]: e.target.files?.[0] ?? null })}
                          className="text-xs"
                        />
                        <button className="btn-secondary" onClick={() => upload(bab)} disabled={!files[bab]}>
                          Unggah
                        </button>
                      </div>
                    </div>
                    {list.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm">
                        {list.map((d) => (
                          <li key={d.id} className="flex items-center justify-between">
                            <span>Versi {d.version} — {d.fileName}</span>
                            <a className="text-indigo-600 hover:underline" href={`/api/drafts/${d.id}/download`}>
                              Unduh
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Belum ada draf.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold">Catatan Revisi Dosen</h2>
            {drafts.flatMap((d) => d.revisionNotes ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Belum ada catatan revisi.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {drafts.flatMap((d) =>
                  (d.revisionNotes ?? []).map((r: any) => (
                    <li key={r.id} className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <p className="font-medium">
                        {BAB_LABEL[d.bab]} versi {d.version} {r.pageRef ? `(${r.pageRef})` : ""} — {r.dosen.name}
                      </p>
                      <p className="mt-1">{r.note}</p>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold">Riwayat Bimbingan</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {timeline.map((t: any, i: number) => (
                <li key={i} className="border-b border-slate-100 py-1">
                  {t.type === "log" && (
                    <span>[{t.payload.action}] {t.payload.note ?? ""} — {t.payload.actor?.name}</span>
                  )}
                  {t.type === "revision" && (
                    <span>Revisi {BAB_LABEL[t.payload.draft.bab]} v{t.payload.draft.version}: {t.payload.note} — {t.payload.dosen?.name}</span>
                  )}
                  {t.type === "approval" && (
                    <span>Tahap {t.payload.stage} {t.payload.status} oleh {t.payload.approver?.name}{t.payload.note ? `: ${t.payload.note}` : ""}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
