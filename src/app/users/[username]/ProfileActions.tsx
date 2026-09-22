"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type Relationship = { viewerLikes: boolean; likedYou: boolean; isMatch: boolean };
type Dialog = "block" | "report" | null;

export default function ProfileActions({
  username,
  initialRelationship,
  canLike,
}: {
  username: string;
  initialRelationship: Relationship;
  canLike: boolean;
}) {
  const router = useRouter();
  const [relationship, setRelationship] = useState(initialRelationship);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function send(action: "like" | "unlike" | "block" | "report") {
    setPending(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/users/${username}/relationship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(action === "report" ? { reason } : {}) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Action failed.");
      if (payload.relationship) setRelationship(payload.relationship);
      setStatus(payload.message ?? "Updated.");
      setDialog(null);
      if (action === "block") router.push("/discover");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setPending(false);
    }
  }

  return <section className="mt-8 border-y border-foreground/15 py-5"><div className="flex flex-wrap items-center gap-3"><button className="bg-foreground px-4 py-2 font-mono text-sm text-background disabled:opacity-50" disabled={pending || (!relationship.viewerLikes && !canLike)} onClick={() => send(relationship.viewerLikes ? "unlike" : "like")} type="button">{relationship.viewerLikes ? "Unlike" : "Like profile"}</button>{relationship.isMatch && <Link className="border border-accent px-4 py-2 font-mono text-sm" href={`/messages/${username}`}>Open chat</Link>}<button className="border border-foreground/30 px-4 py-2 font-mono text-sm disabled:opacity-50" disabled={pending} onClick={() => setDialog("report")} type="button">Report</button><button className="border border-red-700/60 px-4 py-2 font-mono text-sm text-red-700 disabled:opacity-50" disabled={pending} onClick={() => setDialog("block")} type="button">Block</button></div>{relationship.isMatch ? <p className="mt-3 font-mono text-sm text-accent">Connection established — you liked each other.</p> : relationship.likedYou ? <p className="mt-3 font-mono text-sm text-accent">This user already likes you.</p> : null}{!canLike && !relationship.viewerLikes && <p className="mt-3 text-sm opacity-70">Add a primary photo to your profile before liking someone.</p>}{status && <p className="mt-3 font-mono text-sm" role="status">{status}</p>}{dialog && <div aria-labelledby="relationship-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="alertdialog"><div className="w-full max-w-sm border border-accent bg-background p-6 shadow-xl"><h2 className="font-display text-3xl" id="relationship-dialog-title">{dialog === "block" ? "Block this profile?" : "Report this profile?"}</h2>{dialog === "block" ? <p className="mt-2 text-sm">You will no longer see each other in discovery results. Likes are removed and chat will be unavailable.</p> : <label className="mt-4 block text-sm">Reason (optional)<textarea className="mt-1 min-h-24 w-full border border-foreground/25 bg-transparent p-2" maxLength={500} onChange={(event) => setReason(event.target.value)} value={reason} /></label>}<div className="mt-5 flex justify-end gap-3"><button className="border border-foreground/30 px-3 py-2 font-mono text-sm" disabled={pending} onClick={() => setDialog(null)} type="button">Cancel</button><button className="bg-foreground px-3 py-2 font-mono text-sm text-background" disabled={pending} onClick={() => send(dialog)} type="button">{pending ? "Saving…" : dialog === "block" ? "Block profile" : "Send report"}</button></div></div></div>}</section>;
}
