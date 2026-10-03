"use client";
import { useEffect, useState } from "react";

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

type Skripsi = { id: number; judul: string; stage: string; stageStatus: string; mahasiswaId: number };

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

export default function DosenPage() {
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<Skripsi | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<number, { note: string; pageRef: string }>>({});
  const [decisionNote, setDecisionNote] = useState("");
  const [msg, setMsg] = useState("");

  const loadList = async () => {
    const res = await fetch("/api/skripsi");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  };

  const loadDetail = async (s: Skripsi) => {
    setSelected(s);
    setMsg("");
    setDecisionNote("");
    const d = await (await fetch(`/api/skripsi/${s.id}/drafts`)).json();
    setDrafts(Array.isArray(d) ? d : []);
    const h = await (await fetch(`/api/skripsi/${s.id}/history`)).json();
    setTimeline(h.timeline ?? []);
  };

  useEffect(() => { loadList(); }, []);

  const addRevision = async (draftId: number) => {
    const n = notes[draftId];
    if (!n?.note?.trim()) {
      setMsg("Catatan revisi wajib diisi");
      return;
    }
    const res = await fetch(`/api/drafts/${draftId}/revisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: n.note, pageRef: n.pageRef || null }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(d.error ?? "Gagal menyimpan revisi");
      return;
    }
    setNotes({ ...notes, [draftId]: { note: "", pageRef: "" } });
    setMsg("Catatan revisi tersimpan");
    if (selected) loadDetail(selected);
  };

  const decide = async (decision: "approve" | "reject") => {
    if (!selected) return;
    if (decision === "reject" && !decisionNote.trim()) {
      setMsg("Catatan wajib diisi saat menolak");
      return;
    }
    const res = await fetch(`/api/skripsi/${selected.id}/stage-decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note: decisionNote || null }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(d.error ?? "Gagal memproses keputusan");
      return;
    }
    setMsg(decision === "approve" ? "Tahap disetujui" : "Tahap ditolak, mahasiswa diminta revisi");
    const s = await (await fetch(`/api/skripsi/${selected.id}`)).json();
    setSelected(s);
    loadDetail(s);
    loadList();
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mahasiswa Bimbingan</h1>
        <button className="btn-secondary" onClick={logout}>Keluar</button>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2">
          {list.length === 0 && <p className="text-sm text-slate-500">Belum ada mahasiswa bimbingan.</p>}
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => loadDetail(s)}
              className={`rounded-lg border px-4 py-2 text-left text-sm ${selected?.id === s.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}
            >
              <span className="font-medium">#{s.mahasiswaId} — {s.judul.slice(0, 40)}…</span>
              <span className="ml-2 badge bg-slate-200 text-slate-700">{STAGE_LABEL[s.stage]} · {STATUS_LABEL[s.stageStatus]}</span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <>
          <div className="card">
            <h2 className="text-lg font-semibold">{selected.judul}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tahap: <span className="badge bg-indigo-100 text-indigo-800">{STAGE_LABEL[selected.stage]}</span>{" "}
              <span className="badge bg-slate-200 text-slate-700">{STATUS_LABEL[selected.stageStatus]}</span>
            </p>
            {selected.stageStatus === "submitted" && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium">Keputusan tahap {STAGE_LABEL[selected.stage]}</p>
                <input
                  className="input"
                  placeholder="Catatan (wajib jika menolak)"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <button className="btn" onClick={() => decide("approve")}>Setujui</button>
                  <button className="btn-secondary" onClick={() => decide("reject")}>Tolak / Minta Revisi</button>
                </div>
              </div>
            )}
          </div>

          {msg && <p className="text-sm text-slate-700">{msg}</p>}

          <div className="card">
            <h2 className="text-lg font-semibold">Draf Mahasiswa</h2>
            <div className="mt-3 space-y-4">
              {drafts.map((d) => {
                const n = notes[d.id] ?? { note: "", pageRef: "" };
                return (
                  <div key={d.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{BAB_LABEL[d.bab]} — versi {d.version}</span>
                      <a className="text-sm text-indigo-600 hover:underline" href={`/api/drafts/${d.id}/download`}>Unduh</a>
                    </div>
                    {(d.revisionNotes ?? []).length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {d.revisionNotes.map((r: any) => (
                          <li key={r.id}>• {r.pageRef ? `[${r.pageRef}] ` : ""}{r.note} (oleh {r.dosen.name})</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 space-y-2">
                      <input
                        className="input"
                        placeholder="Referensi halaman (opsional, mis. hlm 5)"
                        value={n.pageRef}
                        onChange={(e) => setNotes({ ...notes, [d.id]: { ...n, pageRef: e.target.value } })}
                      />
                      <textarea
                        className="input"
                        rows={2}
                        placeholder="Tulis catatan revisi untuk versi ini…"
                        value={n.note}
                        onChange={(e) => setNotes({ ...notes, [d.id]: { ...n, note: e.target.value } })}
                      />
                      <button className="btn-secondary" onClick={() => addRevision(d.id)}>Simpan Revisi</button>
                    </div>
                  </div>
                );
              })}
              {drafts.length === 0 && <p className="text-sm text-slate-500">Belum ada draf.</p>}
            </div>
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
