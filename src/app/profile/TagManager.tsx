"use client";

import { type FormEvent, useState } from "react";

type Tag = { id: string; name: string };

export default function TagManager({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState(initialTags.map((tag) => tag.name));
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tag = value.trim().toLowerCase();
    if (!tag || tags.includes(tag) || tags.length >= 10) return;
    setTags((current) => [...current, tag]);
    setValue("");
  }

  async function saveTags() {
    const response = await fetch("/api/profile/tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error ?? "Unable to save tags.");
      return;
    }
    setTags(data.tags.map((tag: Tag) => tag.name));
    setStatus("Tags saved.");
  }

  return (
    <section className="mt-12 border-t border-foreground/15 pt-8">
      <h2 className="font-display text-3xl">Tags</h2>
      <p className="mt-1 text-sm opacity-70">Add up to ten interests used to find compatible profiles.</p>
      <form className="mt-4 flex gap-2" onSubmit={addTag}><input className="min-w-0 flex-1 border border-foreground/20 bg-white/70 px-3 py-2" maxLength={50} onChange={(event) => setValue(event.target.value)} placeholder="e.g. hiking" value={value} /><button className="border border-accent px-3 py-2 font-mono text-sm" type="submit">Add</button></form>
      <div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <button className="border border-foreground/20 px-2 py-1 font-mono text-sm" key={tag} onClick={() => setTags((current) => current.filter((item) => item !== tag))} type="button">{tag} ×</button>)}</div>
      <button className="mt-4 bg-foreground px-4 py-2 font-mono text-sm text-background" onClick={saveTags} type="button">Save tags</button>
      {status && <p className="mt-3 font-mono text-sm" role="status">{status}</p>}
    </section>
  );
}
