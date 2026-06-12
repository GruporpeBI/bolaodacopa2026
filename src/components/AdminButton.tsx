"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminButton() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === "wcuprpe10") {
      document.cookie = "admin_access=1; path=/; max-age=86400; samesite=strict";
      router.push("/admin");
    } else {
      setError("Senha incorreta.");
      setPw("");
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="text-[#FAF6EB]/15 hover:text-[#FAF6EB]/40 text-xs transition-colors mt-2 select-none"
        aria-label="Acesso admin"
      >
        ⚙
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 justify-center mt-3">
      <input
        type="password"
        value={pw}
        onChange={(e) => { setPw(e.target.value); setError(""); }}
        placeholder="Senha"
        autoFocus
        className="bg-[#252525] border border-[#F6C900]/20 text-[#FAF6EB] rounded-sm px-3 py-1 text-xs w-20 outline-none focus:border-[#F6C900]/50 placeholder:text-[#FAF6EB]/20"
      />
      <button type="submit" className="text-[#F6C900] text-xs font-bold hover:text-[#e6b800] transition-colors">
        →
      </button>
      <button
        type="button"
        onClick={() => { setShow(false); setPw(""); setError(""); }}
        className="text-[#FAF6EB]/30 text-xs hover:text-[#FAF6EB]/60 transition-colors"
      >
        ✕
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </form>
  );
}
