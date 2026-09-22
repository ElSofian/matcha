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

  return <section className="mt-10"><div className="flex flex-wrap gap-3"><button className="cyber-frame cyber-button cyber-button--compact" disabled={pending || (!relationship.viewerLikes && !canLike)} onClick={() => send(relationship.viewerLikes ? "unlike" : "like")} type="button"><span className="corner-tr" /><span className="corner-bl" />{relationship.viewerLikes ? "Remove link" : "Ask for link"}</button>{relationship.isMatch && <Link className="cyber-button cyber-button--compact border border-foreground" href={`/messages/${username}`}>Open chat</Link>}<button className="text-[#6f88aa] hover:text-foreground" disabled={pending} onClick={() => setDialog("report")} type="button">Report</button><button className="text-red-700/70 hover:text-red-700" disabled={pending} onClick={() => setDialog("block")} type="button">Block</button></div>{relationship.isMatch ? <p className="mt-4 text-sm text-accent">Connection established — you liked each other.</p> : relationship.likedYou ? <p className="mt-4 text-sm text-accent">This user already likes you.</p> : null}{!canLike && !relationship.viewerLikes && <p className="mt-4 text-sm opacity-70">Add a primary photo to your profile before liking someone.</p>}{status && <p className="mt-4 text-sm" role="status">{status}</p>}{dialog && <div aria-labelledby="relationship-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-white/60 p-4 backdrop-blur-sm" role="alertdialog"><div className="cyber-frame cyber-panel w-full max-w-sm p-6"><span className="corner-tr" /><span className="corner-bl" /><h2 className="text-3xl" id="relationship-dialog-title">{dialog === "block" ? "Block this profile?" : "Report this profile?"}</h2>{dialog === "block" ? <p className="mt-3 text-sm leading-relaxed">You will no longer see each other in discovery results. Likes are removed and chat will be unavailable.</p> : <label className="mt-4 block text-sm">Reason (optional)<textarea className="mt-2 min-h-24 w-full p-3" maxLength={500} onChange={(event) => setReason(event.target.value)} value={reason} /></label>}<div className="mt-6 flex justify-end gap-3"><button className="border border-foreground px-3 py-2" disabled={pending} onClick={() => setDialog(null)} type="button">Cancel</button><button className="bg-accent px-3 py-2 text-white" disabled={pending} onClick={() => send(dialog)} type="button">{pending ? "Saving…" : dialog === "block" ? "Block profile" : "Send report"}</button></div></div></div>}</section>;
}
