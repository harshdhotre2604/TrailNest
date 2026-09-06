'use client';

import { useEffect, useRef, useState } from 'react';

const SAVE_DELAY_MS = 800;

// File objects can't round-trip through JSON — photos/videos are stripped
// before saving and always come back empty, same reasoning as the main
// project's edit-mode draft: the owner re-adds media, everything else resumes.
function stripFiles(draft) {
  const { images, videos, rooms, ...rest } = draft;
  return {
    ...rest,
    rooms: (rooms || []).map(({ images: _roomImages, ...room }) => room),
  };
}

export function usePropertyDraft(storageKey, createEmptyDraft) {
  const [draft, setDraft] = useState(createEmptyDraft);
  const [restored, setRestored] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        setDraft((prev) => ({
          ...prev,
          ...saved,
          images: prev.images,
          videos: prev.videos,
          rooms: (saved.rooms && saved.rooms.length > 0 ? saved.rooms : prev.rooms).map((room) => ({
            ...room,
            images: [],
          })),
        }));
      }
    } catch {
      // corrupt/unavailable draft — start fresh
    } finally {
      setRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return undefined;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(stripFiles(draft)));
      } catch {
        // storage full/unavailable — autosave is a convenience, not required
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timeoutRef.current);
  }, [draft, restored, storageKey]);

  function clearDraft() {
    // Cancel any pending debounced save — otherwise a save scheduled just
    // before this call can fire afterward and resurrect the draft we just
    // removed (e.g. checking the consent box right before hitting Submit).
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  return { draft, setDraft, restored, clearDraft };
}
