"use client";

import Image from "next/image";
import { type ChangeEvent, useState } from "react";

type Photo = {
  id: string;
  url: string;
  is_profile: boolean;
};

export default function PhotoManager({ initialPhotos }: { initialPhotos: Photo[] }) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function loadPhotos() {
    const response = await fetch("/api/photos");
    if (!response.ok) return;
    const data = await response.json();
    setPhotos(data.photos);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus(null);
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch("/api/photos", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error ?? "Upload failed.");
      return;
    }
    setPhotos((current) => [...current, data.photo]);
    event.target.value = "";
    setStatus("Photo uploaded.");
  }

  async function makePrimary(photoId: string) {
    const response = await fetch(`/api/photos/${photoId}`, { method: "PATCH" });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error ?? "Unable to select this photo.");
      return;
    }
    setPhotos((current) => current.map((photo) => ({ ...photo, is_profile: photo.id === data.photo.id })));
  }

  async function remove(photoId: string) {
    const response = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setStatus(data.error ?? "Unable to delete this photo.");
      return;
    }
    await loadPhotos();
    setPendingDeleteId(null);
    setStatus("Photo removed.");
  }

  return (
    <section className="mt-12 border-t border-foreground/15 pt-8">
      <h2 className="font-display text-3xl">Photos</h2>
      <p className="mt-1 text-sm opacity-70">Up to five images. The primary photo is visible on your public profile.</p>
      <label className="mt-4 inline-block cursor-pointer border border-accent px-3 py-2 font-mono text-sm">Upload photo<input className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={upload} type="file" /></label>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((photo) => <article className="border border-foreground/15 p-2" key={photo.id}><Image alt="Your profile upload" className="aspect-square w-full object-cover" height={400} loading={photo.is_profile ? "eager" : "lazy"} src={photo.url} width={400} /><div className="mt-2 flex gap-2 font-mono text-xs"><button className="underline" disabled={photo.is_profile} onClick={() => makePrimary(photo.id)} type="button">{photo.is_profile ? "Primary" : "Make primary"}</button><button className="underline" onClick={() => setPendingDeleteId(photo.id)} type="button">Delete</button></div></article>)}
      </div>
      {status && <p className="mt-3 font-mono text-sm" role="status">{status}</p>}
      {pendingDeleteId && <div aria-labelledby="delete-photo-title" className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" role="alertdialog"><div className="w-full max-w-sm border border-accent bg-background p-6 shadow-xl"><h3 className="font-display text-2xl" id="delete-photo-title">Remove this photo?</h3><p className="mt-2 text-sm">This cannot be undone. If it is your only photo, your profile will no longer have a primary photo and you will not be able to like other profiles.</p><div className="mt-5 flex justify-end gap-3"><button className="border border-foreground/30 px-3 py-2 font-mono text-sm" onClick={() => setPendingDeleteId(null)} type="button">Cancel</button><button className="bg-foreground px-3 py-2 font-mono text-sm text-background" onClick={() => remove(pendingDeleteId)} type="button">Remove photo</button></div></div></div>}
    </section>
  );
}
