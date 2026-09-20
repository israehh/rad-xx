/**
 * RAD X Queue Manager
 * Coordinates queued items, priority ordering, duplicate prevention, and dispatch to DownloadManager
 */

class QueueManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.STORAGE_KEY = 'queue';
    this.items = this.storage.get(this.STORAGE_KEY, []);
  }

  getAll() {
    return [...this.items];
  }

  add(track, format = 'MP3') {
    // Prevent duplicate entries
    const existingIndex = this.items.findIndex(item => item.trackId === track.id);
    if (existingIndex >= 0) {
      return { success: false, reason: 'Already in queue', item: this.items[existingIndex] };
    }

    const newItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      channel: track.channel,
      duration: track.duration,
      genre: track.genre,
      thumbnail: track.thumbnail,
      format: format,
      addedAt: Date.now(),
      priority: this.items.length + 1
    };

    this.items.push(newItem);
    this.save();
    return { success: true, item: newItem };
  }

  remove(id) {
    const prevLen = this.items.length;
    this.items = this.items.filter(item => item.id !== id && item.trackId !== id);
    if (this.items.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  clear() {
    this.items = [];
    this.save();
    return true;
  }

  reorder(startIndex, endIndex) {
    if (startIndex < 0 || startIndex >= this.items.length || endIndex < 0 || endIndex >= this.items.length) {
      return false;
    }
    const [moved] = this.items.splice(startIndex, 1);
    this.items.splice(endIndex, 0, moved);
    this.items.forEach((item, idx) => {
      item.priority = idx + 1;
    });
    this.save();
    return true;
  }

  isQueued(trackId) {
    return this.items.some(item => item.trackId === trackId);
  }

  save() {
    this.storage.set(this.STORAGE_KEY, this.items);
  }
}

module.exports = { QueueManager };
