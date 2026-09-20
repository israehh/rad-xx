/**
 * RAD X Scout Engine
 * Autonomous radar discovery engine, trend analyzer, sonic classifier, and duplicate rejection filter
 */

class ScoutEngine {
  constructor(storageManager, libraryManager, downloadManager) {
    this.storage = storageManager;
    this.libraryManager = libraryManager;
    this.downloadManager = downloadManager;
    this.STORAGE_KEY = 'scout_results';
    this.results = this.storage.get(this.STORAGE_KEY, []);
    this.isScanning = false;

    if (this.results.length === 0) {
      this.seedInitialScoutResults();
    }
  }

  seedInitialScoutResults() {
    this.results = [
      {
        id: 'sct-01',
        title: 'Cybernetic Rebar Pulverizer (Club Tool)',
        artist: 'Hadone & Shlømo',
        channel: 'Taapion Records',
        duration: '06:33',
        genre: 'Industrial Techno',
        thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com/watch?v=mock_scout_01',
        bpm: 154,
        key: 'Fm',
        trendScore: 96,
        detectionDate: new Date().toISOString().split('T')[0],
        classificationNotes: 'Massive transient sub-bass rumble, 909 rimshot syncopation, 96% viral traction across Berlin underground streams.',
        isDuplicate: false,
        status: 'new'
      },
      {
        id: 'sct-02',
        title: 'Darkroom Screamer (162 BPM Overload)',
        artist: 'Sara Landry',
        channel: 'HEKATE Records',
        duration: '05:40',
        genre: 'Hard Techno',
        thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com/watch?v=mock_scout_02',
        bpm: 162,
        key: 'G#m',
        trendScore: 92,
        detectionDate: new Date().toISOString().split('T')[0],
        classificationNotes: 'High-energy screamer synth, heavy sidechain distortion, dominant track on French rave circuits.',
        isDuplicate: false,
        status: 'new'
      },
      {
        id: 'sct-03',
        title: 'Shadow Realm Transmission (Acid Drone)',
        artist: 'Cleric & Setaoc Mass',
        channel: 'Figure Records',
        duration: '07:15',
        genre: 'Dark Techno',
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com/watch?v=mock_scout_03',
        bpm: 140,
        key: 'Dm',
        trendScore: 88,
        detectionDate: new Date().toISOString().split('T')[0],
        classificationNotes: 'Deep hypnotic modular acid loops, spatial convolution reverb, late-night Berghain aesthetic.',
        isDuplicate: false,
        status: 'reviewed'
      },
      {
        id: 'sct-04',
        title: 'Industrial Flesh Sequence (1988 Tape Remaster)',
        artist: 'Schwefelgelb',
        channel: 'Fleisch Berlin',
        duration: '05:12',
        genre: 'EBM',
        thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com/watch?v=mock_scout_04',
        bpm: 125,
        key: 'Em',
        trendScore: 84,
        detectionDate: new Date().toISOString().split('T')[0],
        classificationNotes: 'Metallic sequencer bass, sharp punchy vocal chops, darkwave/EBM crossover trending in gothic electro scenes.',
        isDuplicate: false,
        status: 'new'
      }
    ];
    this.save();
  }

  save() {
    this.storage.set(this.STORAGE_KEY, this.results);
  }

  getAll() {
    return [...this.results];
  }

  async runDailyRadarScan() {
    if (this.isScanning) {
      return { success: false, message: 'Radar scan currently active' };
    }

    this.isScanning = true;

    // Simulate scanning network sources
    await new Promise(r => setTimeout(r, 1200));

    const libraryTracks = this.libraryManager.getAll();
    const existingTitles = new Set(libraryTracks.map(t => t.title.toLowerCase()));

    // Example newly scouted underground track
    const sampleNewDiscoveries = [
      {
        title: 'Void Walker (155 BPM Industrial Terror)',
        artist: 'Kobos x Wallis',
        channel: 'R-Label Group',
        duration: '06:22',
        genre: 'Industrial Techno',
        thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com/watch?v=mock_radar_01',
        bpm: 155,
        key: 'Am',
        trendScore: 98,
        classificationNotes: 'Severe sub-kick saturation, rhythmic metallic clang, discovered on Rotterdam pirate streaming nodes.'
      },
      {
        title: 'Neon Bloodline (Overdrive Synth Mix)',
        artist: 'Dance with the Dead',
        channel: 'Retrowave Cyber Hub',
        duration: '04:48',
        genre: 'Synthwave',
        thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com/watch?v=mock_radar_02',
        bpm: 134,
        key: 'Dm',
        trendScore: 89,
        classificationNotes: 'Heavy distorted guitar lead backed by 80s analog chorus, high velocity track.'
      }
    ];

    let addedCount = 0;
    for (const disc of sampleNewDiscoveries) {
      const isDup = existingTitles.has(disc.title.toLowerCase()) ||
        this.results.some(r => r.title.toLowerCase() === disc.title.toLowerCase());

      const newItem = {
        id: `sct-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...disc,
        detectionDate: new Date().toISOString().split('T')[0],
        isDuplicate: isDup,
        status: isDup ? 'archived' : 'new'
      };

      this.results.unshift(newItem);
      addedCount++;
    }

    this.save();
    this.isScanning = false;
    return { success: true, newDiscoveriesCount: addedCount, totalScoutCount: this.results.length };
  }

  updateItemStatus(id, newStatus) {
    const item = this.results.find(r => r.id === id);
    if (item) {
      item.status = newStatus;
      this.save();
      return true;
    }
    return false;
  }
}

module.exports = { ScoutEngine };
