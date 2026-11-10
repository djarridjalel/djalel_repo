"use client";

// Share links: an uploaded design's 3D model and artwork, stored so anyone
// with the link can turn it in 3D, until its owner turns the link off.

import type { Model3D } from "./dieline/fold3d";
import { supabaseBrowser } from "./supabase/client";

export interface ShareArt {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

export interface ShareRow {
  id: string;
  name: string;
  art_path: string;
  created_at: string;
}

const BUCKET = "shares";

/** 128 bits of randomness as a URL-safe token. */
function token() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The model with coordinates rounded to 0.01 mm, which keeps the stored copy small. */
function compact(m: Model3D): Model3D {
  const r = (v: number) => Math.round(v * 100) / 100;
  const p = (q: { x: number; y: number }) => ({ x: r(q.x), y: r(q.y) });
  return {
    ...m,
    faces: m.faces.map((f) => ({
      ...f,
      poly: f.poly.map(p),
      hinge: f.hinge ? [p(f.hinge[0]), p(f.hinge[1])] : null,
      via: f.via?.map((v) => ({ ...v, hinge: [p(v.hinge[0]), p(v.hinge[1])] })),
      lines: f.lines?.map((l) => ({ ...l, pts: l.pts.map(p) })),
    })),
  };
}

/** Flattens the artwork onto white and encodes it as a JPEG. */
function encode(image: HTMLCanvasElement | ImageBitmap): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = image.width;
  c.height = image.height;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(image, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode the artwork."))), "image/jpeg", 0.9));
}

export function shareUrl(id: string) {
  return `${window.location.origin}/s/${id}`;
}

export async function createShare(name: string, model: Model3D, image: HTMLCanvasElement | ImageBitmap, art: ShareArt): Promise<string> {
  const db = supabaseBrowser();
  const id = token();
  const path = `${id}.jpg`;
  const { error: up } = await db.storage.from(BUCKET).upload(path, await encode(image), { contentType: "image/jpeg", upsert: false });
  if (up) throw up;
  const { error } = await db.from("shares").insert({ id, name: name.slice(0, 200) || "Carton", model: compact(model), art_path: path, art });
  if (error) {
    await db.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return id;
}

export async function listShares(): Promise<ShareRow[]> {
  const { data, error } = await supabaseBrowser().from("shares").select("id,name,art_path,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShareRow[];
}

/** Turns a link off: the design and its artwork are deleted. */
export async function deleteShare(row: Pick<ShareRow, "id" | "art_path">) {
  const db = supabaseBrowser();
  const { error } = await db.from("shares").delete().eq("id", row.id);
  if (error) throw error;
  await db.storage.from(BUCKET).remove([row.art_path]);
}
