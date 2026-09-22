"use client";

import { type FormEvent, useState } from "react";

type InitialProfile = {
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: "male" | "female" | "non_binary" | "other" | null;
  sexual_preference: "male" | "female" | "bisexual";
  bio: string | null;
  city: string | null;
  location_source: "unset" | "precise" | "approximate";
  latitude: number | null;
  longitude: number | null;
};

type FormProfile = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  sexualPreference: string;
  bio: string;
  city: string;
  locationSource: string;
  latitude: string;
  longitude: string;
};

const inputClass = "w-full border border-foreground/20 bg-white/70 px-3 py-2 outline-none focus:border-accent";

export default function ProfileForm({ initialProfile }: { initialProfile: InitialProfile }) {
  const [form, setForm] = useState<FormProfile>({
    firstName: initialProfile.first_name,
    lastName: initialProfile.last_name,
    birthDate: initialProfile.birth_date?.slice(0, 10) ?? "",
    gender: initialProfile.gender ?? "",
    sexualPreference: initialProfile.sexual_preference,
    bio: initialProfile.bio ?? "",
    city: initialProfile.city ?? "",
    locationSource: initialProfile.location_source,
    latitude: initialProfile.latitude?.toString() ?? "",
    longitude: initialProfile.longitude?.toString() ?? "",
  });
  const [status, setStatus] = useState<string | null>(null);

  function update(key: keyof FormProfile, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeLocationSource(value: string) {
    setForm((current) => ({
      ...current,
      locationSource: value,
      ...(value === "precise" ? {} : { latitude: "", longitude: "" }),
    }));
  }

  function removeLocation() {
    setForm((current) => ({
      ...current,
      locationSource: "approximate",
      latitude: "",
      longitude: "",
    }));
    setStatus("Precise location removed. Enter a city or neighbourhood before saving.");
  }

  function requestPreciseLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("This browser cannot provide GPS location. Enter an approximate location instead.");
      return;
    }

    setStatus("Waiting for location permission...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          locationSource: "precise",
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        setStatus("Precise location captured. Save your profile to keep it.");
      },
      () => {
        setForm((current) => ({
          ...current,
          locationSource: "approximate",
          latitude: "",
          longitude: "",
        }));
        setStatus("Location was not shared. Enter a city or neighbourhood instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        birthDate: form.birthDate || null,
        gender: form.gender || null,
        bio: form.bio || null,
        city: form.city || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      }),
    });
    const data = await response.json();
    setStatus(response.ok ? "Profile saved." : (data.error ?? "Unable to save profile."));
  }

  return (
    <form onSubmit={saveProfile} className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>First name<input className={inputClass} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></label>
        <label>Last name<input className={inputClass} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label>
        <label>Date of birth<input className={inputClass} type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} /></label>
        <label>Gender<select className={inputClass} value={form.gender} onChange={(event) => update("gender", event.target.value)}><option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="non_binary">Non-binary</option><option value="other">Other</option></select></label>
      </div>
      <label className="block">Sexual preference<select className={inputClass} value={form.sexualPreference} onChange={(event) => update("sexualPreference", event.target.value)}><option value="male">Men</option><option value="female">Women</option><option value="bisexual">Everyone</option></select></label>
      <label className="block">Bio<textarea className={inputClass} rows={5} maxLength={500} value={form.bio} onChange={(event) => update("bio", event.target.value)} /></label>
      <fieldset className="space-y-4 border border-foreground/15 p-4">
        <legend className="px-2 font-mono text-xs uppercase">Location</legend>
        <div className="flex flex-wrap gap-3"><button className="border border-accent px-3 py-2 font-mono text-sm" onClick={requestPreciseLocation} type="button">Use this device&apos;s location</button><button className="border border-foreground/30 px-3 py-2 font-mono text-sm" onClick={removeLocation} type="button">Remove location</button></div>
        <label className="block">How should location be used?<select className={inputClass} value={form.locationSource} onChange={(event) => changeLocationSource(event.target.value)}><option value="unset">Do not provide it yet</option><option value="approximate">Approximate city / neighbourhood</option><option value="precise">Precise GPS coordinates</option></select></label>
        <label className="block">City or neighbourhood<input className={inputClass} value={form.city} onChange={(event) => update("city", event.target.value)} /></label>
        {form.locationSource === "precise" && <div className="grid gap-4 sm:grid-cols-2"><label>Latitude<input className={inputClass} inputMode="decimal" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} /></label><label>Longitude<input className={inputClass} inputMode="decimal" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} /></label></div>}
      </fieldset>
      {status && <p role="status" className="font-mono text-sm">{status}</p>}
      <button className="bg-foreground px-5 py-3 font-mono text-sm text-background" type="submit">Save profile</button>
    </form>
  );
}
