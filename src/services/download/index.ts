import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { loadDownloadRecords, saveDownloadRecords } from './store';
import type { DownloadJob, DownloadRecord, DownloadState, QueueState } from './types';
import { isActiveDownloadState, isHlsSourceUrl } from './types';

type Listener = (state: QueueState) => void;

function newId(): string {
  return `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pickSourceUrl(job: DownloadJob): string {
  return job.sourceUrlCandidates?.[0] ?? job.sourceUrl;
}

function downloadsDir(): string | null {
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  return `${base}downloads/`;
}

async function ensureDownloadsDir(): Promise<string> {
  const dir = downloadsDir();
  if (!dir) throw new Error('Хранилище недоступно');
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

class NativeDownloadService {
  private records: DownloadRecord[] = [];
  private listeners = new Set<Listener>();
  private activeId: string | null = null;
  private initialized = false;
  private blobUrls = new Map<string, string>();

  async init(): Promise<void> {
    if (this.initialized) return;
    this.records = await loadDownloadRecords();
    this.initialized = true;
    this.emit();
    void this.pumpQueue();
  }

  private emit() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  private async persist() {
    await saveDownloadRecords(this.records);
    this.emit();
  }

  getState(): QueueState {
    return { activeId: this.activeId, records: [...this.records] };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  async list(): Promise<DownloadRecord[]> {
    await this.init();
    return [...this.records];
  }

  async enqueue(job: DownloadJob): Promise<string> {
    await this.init();
    const now = Date.now();
    const sourceUrl = pickSourceUrl(job);
    const record: DownloadRecord = {
      ...job,
      id: newId(),
      sourceUrl,
      state: 'queued',
      progress: 0,
      isHls: job.isHls ?? isHlsSourceUrl(sourceUrl),
      createdAt: now,
      updatedAt: now,
    };
    this.records.unshift(record);
    await this.persist();
    void this.pumpQueue();
    return record.id;
  }

  async cancel(jobId: string): Promise<void> {
    await this.init();
    const record = this.records.find((item) => item.id === jobId);
    if (!record) return;
    if (this.activeId === jobId) this.activeId = null;
    record.state = 'cancelled';
    record.updatedAt = Date.now();
    await this.persist();
    void this.pumpQueue();
  }

  async pause(jobId: string): Promise<void> {
    await this.init();
    const record = this.records.find((item) => item.id === jobId);
    if (!record || !isActiveDownloadState(record.state)) return;
    if (this.activeId === jobId) this.activeId = null;
    record.state = 'paused';
    record.updatedAt = Date.now();
    await this.persist();
    void this.pumpQueue();
  }

  async resume(jobId: string): Promise<void> {
    await this.init();
    const record = this.records.find((item) => item.id === jobId);
    if (!record || record.state !== 'paused') return;
    record.state = 'queued';
    record.updatedAt = Date.now();
    await this.persist();
    void this.pumpQueue();
  }

  async pauseAll(): Promise<void> {
    await this.init();
    for (const record of this.records) {
      if (isActiveDownloadState(record.state)) {
        record.state = 'paused';
        record.updatedAt = Date.now();
      }
    }
    this.activeId = null;
    await this.persist();
  }

  async resumeAll(): Promise<void> {
    await this.init();
    for (const record of this.records) {
      if (record.state === 'paused') {
        record.state = 'queued';
        record.updatedAt = Date.now();
      }
    }
    await this.persist();
    void this.pumpQueue();
  }

  async remove(jobId: string): Promise<void> {
    await this.init();
    const record = this.records.find((item) => item.id === jobId);
    if (record?.localPath && Platform.OS !== 'web') {
      try {
        await FileSystem.deleteAsync(record.localPath, { idempotent: true });
      } catch {
        // ignore missing file
      }
    }
    const blob = this.blobUrls.get(jobId);
    if (blob) {
      URL.revokeObjectURL(blob);
      this.blobUrls.delete(jobId);
    }
    if (this.activeId === jobId) this.activeId = null;
    this.records = this.records.filter((item) => item.id !== jobId);
    await this.persist();
    void this.pumpQueue();
  }

  async clearCompleted(): Promise<void> {
    await this.init();
    const removable = this.records.filter(
      (record) => record.state === 'completed' || record.state === 'failed',
    );
    for (const record of removable) {
      if (record.localPath && Platform.OS !== 'web') {
        try {
          await FileSystem.deleteAsync(record.localPath, { idempotent: true });
        } catch {
          // ignore
        }
      }
      const blob = this.blobUrls.get(record.id);
      if (blob) URL.revokeObjectURL(blob);
      this.blobUrls.delete(record.id);
    }
    this.records = this.records.filter(
      (record) => record.state !== 'completed' && record.state !== 'failed',
    );
    await this.persist();
  }

  async getLocalPlaybackUrl(jobId: string): Promise<string | null> {
    await this.init();
    const record = this.records.find((item) => item.id === jobId);
    if (!record || record.state !== 'completed') return null;
    if (record.localPath) {
      const info = await FileSystem.getInfoAsync(record.localPath);
      if (info.exists) return record.localPath;
    }
    return this.blobUrls.get(jobId) ?? null;
  }

  private async pumpQueue(): Promise<void> {
    await this.init();
    if (this.activeId) return;
    const next = this.records.find((record) => record.state === 'queued');
    if (!next) return;
    this.activeId = next.id;
    await this.runDownload(next.id);
    this.activeId = null;
    void this.pumpQueue();
  }

  private async patchRecord(id: string, patch: Partial<DownloadRecord>) {
    const record = this.records.find((item) => item.id === id);
    if (!record) return;
    Object.assign(record, patch, { updatedAt: Date.now() });
    await this.persist();
  }

  private async runDownload(id: string): Promise<void> {
    const record = this.records.find((item) => item.id === id);
    if (!record || record.state !== 'queued') return;

    if (record.isHls) {
      await this.patchRecord(id, {
        state: 'failed',
        error: 'HLS пока недоступен для офлайн-загрузки — выберите progressive MP4',
        progress: 0,
      });
      return;
    }

    await this.patchRecord(id, { state: 'downloading', progress: 0.02 });

    try {
      const url = pickSourceUrl(record);

      if (Platform.OS === 'web') {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        this.blobUrls.set(id, objectUrl);
        await this.patchRecord(id, {
          state: 'completed',
          progress: 1,
          bytesTotal: blob.size,
          bytesLoaded: blob.size,
          localPath: objectUrl,
        });
        return;
      }

      const dir = await ensureDownloadsDir();
      const ext = guessExtension(url, record.quality);
      const dest = `${dir}${id}.${ext}`;

      const result = await FileSystem.downloadAsync(url, dest, {
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
      });

      const current = this.records.find((item) => item.id === id);
      if (!current || current.state === 'paused' || current.state === 'cancelled') {
        try {
          await FileSystem.deleteAsync(dest, { idempotent: true });
        } catch {
          // ignore
        }
        return;
      }

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`HTTP ${result.status}`);
      }

      const info = await FileSystem.getInfoAsync(dest);
      const size = info.exists && 'size' in info ? Number(info.size) || undefined : undefined;

      await this.patchRecord(id, {
        state: 'completed',
        progress: 1,
        bytesLoaded: size,
        bytesTotal: size,
        localPath: result.uri,
        error: undefined,
      });
    } catch (err) {
      await this.patchRecord(id, {
        state: 'failed',
        error: err instanceof Error ? err.message : 'Ошибка загрузки',
      });
    }
  }
}

function guessExtension(url: string, quality?: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.mkv')) return 'mkv';
  if (lower.includes('.webm')) return 'webm';
  if (lower.includes('.m4v')) return 'm4v';
  if (quality?.toLowerCase().includes('mkv')) return 'mkv';
  return 'mp4';
}

let singleton: NativeDownloadService | null = null;

export function getDownloadService(): NativeDownloadService {
  if (!singleton) singleton = new NativeDownloadService();
  return singleton;
}

export function getDownloadServiceSync(): NativeDownloadService {
  return getDownloadService();
}

export type { DownloadJob, DownloadRecord, DownloadState, QueueState };
