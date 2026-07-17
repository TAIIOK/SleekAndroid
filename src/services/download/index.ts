import { Platform } from 'react-native';

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
    const blob = this.blobUrls.get(jobId);
    if (blob) {
      URL.revokeObjectURL(blob);
      this.blobUrls.delete(jobId);
    }
    if (this.activeId === jobId) this.activeId = null;
    this.records = this.records.filter((record) => record.id !== jobId);
    await this.persist();
    void this.pumpQueue();
  }

  async clearCompleted(): Promise<void> {
    await this.init();
    const removable = this.records.filter(
      (record) => record.state === 'completed' || record.state === 'failed',
    );
    for (const record of removable) {
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
    return record.localPath ?? this.blobUrls.get(jobId) ?? null;
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
        error: 'HLS-загрузки пока не поддерживаются в native',
        progress: 0,
      });
      return;
    }

    await this.patchRecord(id, { state: 'downloading', progress: 0.02 });

    try {
      const url = pickSourceUrl(record);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const totalHeader = response.headers.get('content-length');
      const total = totalHeader ? Number(totalHeader) : 0;
      const reader = response.body?.getReader();

      if (!reader) {
        const blob = await response.blob();
        const localPath = await this.storeBlob(id, blob);
        await this.patchRecord(id, {
          state: 'completed',
          progress: 1,
          bytesTotal: blob.size,
          bytesLoaded: blob.size,
          localPath,
        });
        return;
      }

      const chunks: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const current = this.records.find((item) => item.id === id);
        if (!current || current.state === 'paused' || current.state === 'cancelled') return;

        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          const progress = total > 0 ? Math.min(loaded / total, 0.99) : 0.5;
          await this.patchRecord(id, {
            progress,
            bytesLoaded: loaded,
            bytesTotal: total || undefined,
          });
        }
      }

      const merged = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      const blob = new Blob([merged]);
      const localPath = await this.storeBlob(id, blob);
      await this.patchRecord(id, {
        state: 'completed',
        progress: 1,
        bytesLoaded: blob.size,
        bytesTotal: blob.size,
        localPath,
      });
    } catch (err) {
      await this.patchRecord(id, {
        state: 'failed',
        error: err instanceof Error ? err.message : 'Ошибка загрузки',
      });
    }
  }

  private async storeBlob(id: string, blob: Blob): Promise<string | undefined> {
    if (Platform.OS === 'web') {
      const objectUrl = URL.createObjectURL(blob);
      this.blobUrls.set(id, objectUrl);
      return objectUrl;
    }

    try {
      // Optional native persistence when expo-file-system is installed.
      const FileSystem = require('expo-file-system') as {
        documentDirectory: string | null;
        writeAsStringAsync: (
          uri: string,
          data: string,
          options?: { encoding?: string },
        ) => Promise<void>;
        EncodingType?: { Base64: string };
      };
      const dir = FileSystem.documentDirectory;
      if (!dir) return undefined;
      const path = `${dir}downloads/${id}.mp4`;
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = globalThis.btoa(binary);
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType?.Base64 ?? 'base64',
      });
      return path;
    } catch {
      const objectUrl = URL.createObjectURL(blob);
      this.blobUrls.set(id, objectUrl);
      return objectUrl;
    }
  }
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
