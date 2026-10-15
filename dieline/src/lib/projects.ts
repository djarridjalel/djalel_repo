"use client";

import { normalizeParams } from "./dieline";
import type { CartonParams } from "./dieline/types";
import { supabaseBrowser } from "./supabase/client";

export interface ProjectRow {
  id: string;
  name: string;
  params: CartonParams;
  created_at: string;
  updated_at: string;
}

export interface VersionRow {
  id: string;
  project_id: string;
  version: number;
  label: string | null;
  params: CartonParams;
  created_at: string;
}

/** Where an editor session keeps its work: Supabase for accounts, the browser for the demo. */
export interface ProjectStore {
  save(patch: { name?: string; params?: CartonParams }): Promise<void>;
  listVersions(): Promise<VersionRow[]>;
  createVersion(params: CartonParams, label: string | null): Promise<VersionRow>;
}

export function cloudStore(projectId: string): ProjectStore {
  const db = supabaseBrowser();
  return {
    async save(patch) {
      const { error } = await db
        .from("projects")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", projectId);
      if (error) throw error;
    },
    async listVersions() {
      const { data, error } = await db
        .from("project_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((v: VersionRow) => ({ ...v, params: normalizeParams(v.params) }));
    },
    async createVersion(params, label) {
      const { data: last } = await db
        .from("project_versions")
        .select("version")
        .eq("project_id", projectId)
        .order("version", { ascending: false })
        .limit(1);
      const next = (last?.[0]?.version ?? 0) + 1;
      const { data, error } = await db
        .from("project_versions")
        .insert({ project_id: projectId, version: next, label, params })
        .select()
        .single();
      if (error) throw error;
      return data as VersionRow;
    },
  };
}

const LOCAL_KEY = "djarri-dieline-demo";

export function localStore(): ProjectStore {
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as { name?: string; params?: CartonParams; versions?: VersionRow[] };
    } catch {
      return {};
    }
  };
  const write = (v: object) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(v));
    } catch {
      // Storage can be unavailable in private browsing; the demo still works.
    }
  };
  return {
    async save(patch) {
      write({ ...read(), ...patch });
    },
    async listVersions() {
      return read().versions ?? [];
    },
    async createVersion(params, label) {
      const s = read();
      const versions = s.versions ?? [];
      const row: VersionRow = {
        id: crypto.randomUUID(),
        project_id: "demo",
        version: (versions[0]?.version ?? 0) + 1,
        label,
        params,
        created_at: new Date().toISOString(),
      };
      write({ ...s, versions: [row, ...versions] });
      return row;
    },
  };
}

export function loadLocalDraft(): { name: string; params: CartonParams } | null {
  try {
    const s = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null");
    if (!s?.params) return null;
    return { name: s.name ?? "Demo carton", params: normalizeParams(s.params) };
  } catch {
    return null;
  }
}

export async function createProject(name: string, params: CartonParams) {
  const db = supabaseBrowser();
  const { data, error } = await db.from("projects").insert({ name, params }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteProject(id: string) {
  const { error } = await supabaseBrowser().from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function renameProject(id: string, name: string) {
  const { error } = await supabaseBrowser().from("projects").update({ name, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
