"use client";

import { useMemo, useSyncExternalStore } from "react";
import { isValidYouTubeVideoId } from "./youtube";

export interface RecentVideo {
  id: string;
  title: string | null;
  channel: string | null;
  watchedAt: number;
}

const STORAGE_KEY = "watch.recent.v1";
const CHANGE_EVENT = "watch:history-change";
const MAX_ITEMS = 12;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 300) : null;
}

/** Parses stored history defensively; anything malformed is dropped. */
export function parseHistory(raw: string | null): RecentVideo[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    const items: RecentVideo[] = [];
    for (const entry of data) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      if (!isValidYouTubeVideoId(record.id) || seen.has(record.id)) continue;
      seen.add(record.id);
      items.push({
        id: record.id,
        title: text(record.title),
        channel: text(record.channel),
        watchedAt: typeof record.watchedAt === "number" ? record.watchedAt : 0,
      });
      if (items.length >= MAX_ITEMS) break;
    }
    return items;
  } catch {
    return [];
  }
}

function write(items: RecentVideo[]): void {
  try {
    if (items.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage full or blocked (e.g. some private modes). History is optional.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addRecentVideo(id: string, meta?: { title?: string | null; channel?: string | null }): void {
  if (!isValidYouTubeVideoId(id)) return;
  const items = parseHistory(readRaw());
  const existing = items.find((item) => item.id === id);
  const next: RecentVideo = {
    id,
    title: meta?.title ?? existing?.title ?? null,
    channel: meta?.channel ?? existing?.channel ?? null,
    watchedAt: Date.now(),
  };
  write([next, ...items.filter((item) => item.id !== id)]);
}

export function updateRecentVideoMeta(id: string, meta: { title: string | null; channel: string | null }): void {
  const items = parseHistory(readRaw());
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return;
  const current = items[index];
  if (current.title === meta.title && current.channel === meta.channel) return;
  items[index] = { ...current, title: meta.title ?? current.title, channel: meta.channel ?? current.channel };
  write(items);
}

export function clearRecentVideos(): string | null {
  const previous = readRaw();
  write([]);
  return previous;
}

export function restoreRecentVideos(raw: string | null): void {
  write(parseHistory(raw));
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => null;

/** Recently watched videos, synced across components and browser tabs. */
export function useRecentVideos(): RecentVideo[] {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  return useMemo(() => parseHistory(raw), [raw]);
}
