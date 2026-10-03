"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const me = await res.json();
      if (me.role === "mahasiswa") router.replace("/mhs");
      else if (me.role === "dosen") router.replace("/dosen");
      else router.replace("/prodi");
    })();
  }, [router]);
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Monitoring Bimbingan Skripsi</h1>
      <p className="mt-2 text-slate-600">Memuat…</p>
    </div>
  );
}
