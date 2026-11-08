"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Send } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  authorType: "TEAM" | "STUDENT" | "PARENT";
  authorName: string;
  body: string;
  createdAt: string;
  portalAccountId?: string | null;
  readByCandidateAt?: string | null;
};

/**
 * Fil de messages partagé : espace étudiant (side = "candidate") et fiche dossier de
 * l'équipe (side = "team"). Rafraîchi toutes les 15 s et au retour sur l'onglet.
 */
export function ChatThread({
  url,
  side,
  labels,
  className,
}: {
  url: string;
  side: "candidate" | "team";
  labels: { empty: string; placeholder: string; send: string; failed: string; you: string; read?: string };
  className?: string;
}) {
  const locale = useLocale();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const count = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { messages: ChatMessage[]; me?: string };
      setMessages(json.messages);
      if (json.me) setMe(json.me);
    } catch {
      /* hors-ligne : nouvel essai au prochain intervalle */
    }
  }, [url]);

  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), 15_000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (messages && messages.length !== count.current) {
      count.current = messages.length;
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { message: ChatMessage };
      setMessages((m) => [...(m ?? []), json.message]);
      setDraft("");
    } catch {
      setError(labels.failed);
    } finally {
      setSending(false);
    }
  }

  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const isMine = (m: ChatMessage) => (side === "team" ? m.authorType === "TEAM" : m.portalAccountId === me);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="min-h-[160px] flex-1 space-y-2.5 overflow-y-auto pb-2" aria-live="polite">
        {messages === null && <div className="skeleton h-16 rounded-[12px]" />}
        {messages?.length === 0 && <p className="py-6 text-center text-[14px] text-gris">{labels.empty}</p>}
        {messages?.map((m) => {
          const mine = isMine(m);
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-[14px] px-3.5 py-2.5", mine ? "rounded-br-[4px] bg-noir text-white" : "rounded-bl-[4px] border border-bord bg-white")}>
                <p className={cn("mb-0.5 text-[12px] font-bold", mine ? "text-[#C9C9D1]" : m.authorType === "TEAM" ? "text-rouge-fonce" : "text-gris")}>
                  {mine ? labels.you : m.authorName}
                </p>
                <p className="whitespace-pre-line break-words text-[15px] leading-snug">{m.body}</p>
                <p className={cn("mt-1 text-right text-[11px]", mine ? "text-[#A9A9B3]" : "text-gris")}>
                  {fmt.format(new Date(m.createdAt))}
                  {side === "team" && mine && m.readByCandidateAt && labels.read ? ` · ${labels.read}` : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {error && <p className="mb-2 text-[13px] font-semibold text-erreur">{error}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-bord pt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
          }}
          rows={2}
          placeholder={labels.placeholder}
          className="field-input min-h-[46px] flex-1 resize-none text-[15px]"
        />
        <button type="submit" disabled={sending || !draft.trim()} className="btn-primary !w-auto !px-4" aria-label={labels.send}>
          {sending ? <Spinner /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
