"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "mahasiswa", identifier: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Pendaftaran gagal");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md p-8">
      <div className="card">
        <h1 className="text-xl font-bold">Daftar Akun</h1>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="label">Nama lengkap</label>
            <input className="input" value={form.name} onChange={set("name")} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set("email")} required />
          </div>
          <div>
            <label className="label">Password (min. 6 karakter)</label>
            <input className="input" type="password" value={form.password} onChange={set("password")} required />
          </div>
          <div>
            <label className="label">Peran</label>
            <select className="input" value={form.role} onChange={set("role")}>
              <option value="mahasiswa">Mahasiswa</option>
              <option value="dosen">Dosen</option>
              <option value="prodi">Prodi</option>
            </select>
          </div>
          <div>
            <label className="label">NIM / NIDN (opsional)</label>
            <input className="input" value={form.identifier} onChange={set("identifier")} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn w-full" disabled={loading}>{loading ? "Memproses…" : "Daftar"}</button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Sudah punya akun? <Link href="/login" className="text-indigo-600 hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
