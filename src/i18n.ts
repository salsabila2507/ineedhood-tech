// Bilingual copy for the UI. Default is Indonesian; English is a full switch.
export type Lang = 'id' | 'en';

const STORE_KEY = 'ineedhood-lang';

type Dict = Record<string, { id: string; en: string }>;

const DICT: Dict = {
  // shell
  tagline: { id: 'Langkah kecil. Hasil besar.', en: 'Small steps. Big results.' },
  webOnline: { id: 'Web aktif', en: 'Web app online' },
  checking: { id: 'Memeriksa runtime...', en: 'Checking runtimes...' },
  hermesOn: { id: 'Hermes terhubung', en: 'Hermes connected' },
  hermesOff: { id: 'Hermes tidak ada', en: 'Hermes not found' },
  hermesProbe: { id: 'Hermes probe gagal', en: 'Hermes probe failed' },
  opencodeOn: { id: 'OpenCode terhubung', en: 'OpenCode connected' },
  opencodeOff: { id: 'OpenCode tidak ada', en: 'OpenCode not found' },
  opencodeProbe: { id: 'OpenCode probe gagal', en: 'OpenCode probe failed' },
  langLabel: { id: 'Bahasa', en: 'Language' },

  // nav
  navOffice: { id: 'Kantor', en: 'Office' },
  navAgents: { id: 'Agen', en: 'Agents' },
  navTasks: { id: 'Tugas', en: 'Tasks' },
  navProjects: { id: 'Proyek', en: 'Projects' },
  navKnowledge: { id: 'Pengetahuan', en: 'Knowledge' },
  navTools: { id: 'Alat', en: 'Tools' },
  navSettings: { id: 'Pengaturan', en: 'Settings' },

  // gate
  gateTitle: { id: 'Masuk', en: 'Unlock' },
  gateHint: { id: 'Masukkan password bridge.', en: 'Enter the bridge password.' },
  gatePassword: { id: 'Password', en: 'Password' },
  gateSubmit: { id: 'Buka', en: 'Unlock' },
  gateNote: { id: 'Sesi tetap terbuka di browser ini selama 30 hari.', en: 'Session stays open in this browser for 30 days.' },
  gateWrong: { id: 'Password salah.', en: 'Wrong password.' },
  gateChecking: { id: 'Memeriksa sesi...', en: 'Checking session...' },

  // guest mode: read only, no commands
  guestEnter: { id: 'Lihat saja', en: 'View only' },
  guestHint: { id: 'Tanpa password. Mode tamu bisa melihat kantor dan status run, tapi tidak bisa mengirim perintah atau membaca memori dan file.', en: 'No password needed. Guest mode can watch the office and run status, but cannot send commands or read memory and files.' },
  guestPrivate: { id: 'Hanya pemilik. Mode tamu tidak bisa membaca memori, brief proyek, atau file hasil.', en: 'Owner only. Guest mode cannot read memory, project briefs or output files.' },
  guestMode: { id: 'Mode tamu', en: 'Guest mode' },
  guestReadOnly: { id: 'Mode tamu hanya bisa melihat. Perintah dan perubahan dinonaktifkan.', en: 'Guest mode is view only. Commands and changes are disabled.' },
  guestCmdPh: { id: 'Mode tamu: perintah dinonaktifkan', en: 'Guest mode: commands are disabled' },
  guestCmdNote: { id: 'Kamu masuk sebagai tamu. Pusat komando terkunci sampai pemilik membuka dengan password.', en: 'You are signed in as a guest. The command center stays locked until the owner unlocks it with the password.' },

  // data chips
  liveData: { id: 'Data langsung', en: 'Live data' },
  demoData: { id: 'Data demo', en: 'Demo data' },

  // projects view
  projTitle: { id: 'Judul proyek', en: 'Project title' },
  projTitlePh: { id: 'Judul proyek', en: 'Project title' },
  projPrompt: { id: 'Prompt lengkap untuk agen...', en: 'Full prompt for the agents...' },
  projCreate: { id: 'Buat proyek', en: 'Create project' },
  projMd: { id: 'Unggah brief .md (opsional)', en: 'Upload .md brief (optional)' },
  projImage: { id: 'Unggah gambar (opsional)', en: 'Upload image (optional)' },
  projClearMd: { id: 'Hapus md', en: 'Clear md' },
  projClearImage: { id: 'Hapus gambar', en: 'Clear image' },
  projRun: { id: 'Jalankan', en: 'Run' },
  projDetail: { id: 'Detail', en: 'Detail' },
  projDelete: { id: 'Hapus', en: 'Delete' },
  projClose: { id: 'Tutup', en: 'Close' },
  projDone: { id: 'Selesai', en: 'Done' },
  projRunning: { id: 'Berjalan', en: 'Running' },
  projInterrupted: { id: 'Terputus', en: 'Interrupted' },
  projFailed: { id: 'Gagal', en: 'Failed' },
  projIdle: { id: 'Idle', en: 'Idle' },
  projNew: { id: 'Belum dijalankan', en: 'Not run yet' },
  // short tags used on task and project rows
  tagLive: { id: 'Langsung', en: 'Live' },
  tagError: { id: 'Galat', en: 'Error' },
  tagNew: { id: 'Baru', en: 'New' },
  tagQueued: { id: 'Antre', en: 'Queued' },
  projNoPrompt: { id: '(tidak ada prompt)', en: '(no prompt)' },
  projAttached: { id: 'Lampiran', en: 'Attached' },
  projLastRun: { id: 'run terakhir', en: 'last run' },
  projEmpty: { id: 'Belum ada proyek. Buat satu di atas.', en: 'No projects yet. Create one above.' },
  projNoMd: { id: 'tanpa md', en: 'no md attached' },
  projWords: { id: 'kata', en: 'words' },
  projWorkers: { id: 'worker', en: 'workers' },
  projConfirmDelete: { id: 'Hapus proyek ini?', en: 'Delete this project?' },
  projStarted: { id: 'Proyek dimulai', en: 'Project started' },
  projFiles: { id: 'Berkas hasil kerja', en: 'Produced files' },
  projFilesNone: { id: 'Belum ada', en: 'none yet' },
  projFilesChecking: { id: 'memeriksa', en: 'checking' },
  projFilesEmpty: {
    id: 'Belum ada berkas di disk. Worker menulis di sini saat selesai.',
    en: 'Nothing on disk yet. Workers write files here as they finish.',
  },
  projView: { id: 'Lihat', en: 'View' },
  projFilesCount: { id: 'berkas', en: 'files' },
  projFilesCountOne: { id: 'berkas', en: 'file' },

  // tasks
  taskPlan: { id: 'Rencanakan pekerjaan', en: 'Plan the work' },
  taskReview: { id: 'Periksa hasil', en: 'Review output' },
  taskFlow: { id: 'Alur tugas', en: 'TASK FLOW' },
  taskNotRun: { id: 'Belum dijalankan', en: 'Not run' },
  taskNoAgent: { id: 'Tidak ada agen deploy', en: 'No deploy agent' },
  taskRunning: { id: 'berjalan', en: 'running' },
  taskDone: { id: 'selesai', en: 'done' },
  taskFailed: { id: 'gagal', en: 'failed' },
  taskNotProduced: { id: 'Belum dihasilkan', en: 'Not produced yet' },

  // office / command center
  cmdTitle: { id: 'Kirim tugas ke kantor', en: 'Send a task to the office' },
  cmdPlaceholder: { id: 'Apa yang harus dikerjakan agen?', en: 'What should the agents do?' },
  cmdSubmit: { id: 'Kirim', en: 'Send' },
  cmdSending: { id: 'Mengirim...', en: 'Sending...' },
  cmdBusy: { id: 'Agen sedang bekerja, tunggu selesai dulu.', en: 'Agents are busy, wait for the run to finish.' },
  cmdEmpty: { id: 'Belum ada tugas aktif.', en: 'No active task yet.' },
  cmdStatus: { id: 'Status', en: 'Status' },
  projSubLive: { id: 'Brief tersimpan di VM ini. Jalankan satu, agen langsung mengerjakannya.', en: 'Briefs stored on this VM. Run one and the agents pick it up.' },
  projSubDemo: { id: 'Brief tersimpan di VM ini.', en: 'Briefs stored on this VM.' },
  skillsCount: { id: 'skill', en: 'skills' },
  checkingShort: { id: 'memeriksa...', en: 'checking...' },
  checked: { id: 'dicek', en: 'checked' },
  installed: { id: 'terpasang', en: 'installed' },
  savedLocal: { id: 'Tersimpan di browser ini', en: 'Saved in this browser' },
  memoriesCount: { id: 'memori', en: 'memories' },
  topicsCount: { id: 'topik', en: 'topics' },
  refresh: { id: 'Muat ulang', en: 'Refresh' },
  refreshing: { id: 'Memuat...', en: 'Refreshing...' },
  icmDb: { id: 'Database ICM', en: 'ICM database' },
  unknownWord: { id: 'tidak diketahui', en: 'unknown' },
  labelMemory: { id: 'Memori', en: 'Memory' },
  cmdNoActive: { id: 'Tidak ada tugas aktif. Kirim satu dari Pusat komando.', en: 'No active tasks. Send one from the Command Center.' },

  // chrome, all views
  agentsTitle: { id: 'Agen', en: 'Agents' },
  agentsSubLive: { id: 'Tujuh peran terhubung ke Hermes di VM ini. Status dan aktivitas di bawah dibaca dari run langsung.', en: 'Seven roles wired to Hermes on this VM. Status and activity below are read from the live run.' },
  agentsSubDemo: { id: 'Tujuh peran terkonfigurasi. Satu jalur eksekusi terverifikasi untuk MVP.', en: 'Seven configured roles. One verified execution path for the MVP.' },
  inThisRun: { id: 'di run ini', en: 'in this run' },
  activeTask: { id: 'tugas aktif', en: 'active' },
  tasksDone: { id: 'tugas selesai', en: 'tasks done' },
  success: { id: 'sukses', en: 'success' },
  successRate: { id: 'tingkat sukses', en: 'success rate' },
  avgTime: { id: 'rata-rata waktu', en: 'avg time' },
  avgRuntime: { id: 'rata-rata durasi', en: 'avg runtime' },
  tasksThisRun: { id: 'tugas run ini', en: 'tasks this run' },
  tasksTitle: { id: 'Tugas', en: 'Tasks' },
  tasksSubLive: { id: 'Status antrean dialirkan dari runtime agen Hermes di VM ini.', en: 'Queue state streamed from the Hermes agent runtime on this VM.' },
  tasksSubDemo: { id: 'Status antrean dari penyimpanan lokal. Belum ada backend terhubung.', en: 'Queue state from the local store. No backend is connected yet.' },
  gRunning: { id: 'Berjalan', en: 'Running' },
  gWaiting: { id: 'Menunggu', en: 'Waiting' },
  gQueued: { id: 'Antrean', en: 'Queued' },
  gDone: { id: 'Selesai', en: 'Completed' },
  nothingHere: { id: 'Kosong', en: 'Nothing here' },
  close: { id: 'Tutup', en: 'Close' },
  rightNow: { id: 'Saat ini', en: 'Right now' },
  openTasks: { id: 'Tugas terbuka', en: 'Open tasks' },
  noOpenTasks: { id: 'Tidak ada tugas terbuka.', en: 'No open tasks.' },
  recentEvents: { id: 'Kejadian terbaru', en: 'Recent events' },
  skills: { id: 'Skill', en: 'Skills' },
  status: { id: 'Status', en: 'Status' },
  assignedTo: { id: 'Ditugaskan ke', en: 'Assigned to' },
  progress: { id: 'Progres', en: 'Progress' },
  created: { id: 'Dibuat', en: 'Created' },
  output: { id: 'Keluaran', en: 'Output' },
  toolsTitle: { id: 'Alat', en: 'Tools' },
  toolsSub: { id: 'Perpustakaan skill dan runtime agen yang terpasang di VM ini. Hermes dan OpenCode membaca skill ini sebagai referensi.', en: 'Skill library and agent runtime installed on this VM. Hermes and OpenCode read these skills as reference.' },
  searchSkills: { id: 'Cari skill berdasarkan nama, folder, atau deskripsi...', en: 'Search skills by name, folder or description...' },
  agentRuntime: { id: 'Runtime agen', en: 'Agent runtime' },
  settingsTitle: { id: 'Pengaturan', en: 'Settings' },
  settingsSub: { id: 'Tema antarmuka dan seragam yang dipakai agen chibi di lantai kantor.', en: 'Interface theme and the uniform the chibi agents wear on the office floor.' },
  theme: { id: 'Tema', en: 'Theme' },
  themeHint: { id: 'Warna aksen untuk dasbor, chip, dan sorotan.', en: 'The accent colour of the dashboard, chips and highlights.' },
  uniform: { id: 'Seragam chibi', en: 'Chibi uniform' },
  uniformHint: { id: 'Original mempertahankan warna pakaian tiap agen. Pilihan lain memakaikan satu seragam ke semua agen.', en: 'Original keeps the outfit colour of each agent. The others dress every agent in one uniform.' },
  motion: { id: 'Gerakan', en: 'Motion' },
  reducedOn: { id: 'Gerakan dikurangi aktif', en: 'Reduced motion is on' },
  reducedOff: { id: 'Gerakan dikurangi nonaktif', en: 'Reduced motion is off' },
  reducedHint: { id: 'Gerakan dikurangi menghentikan drift kamera dan animasi idle di scene.', en: 'Reduced motion stops the camera drift and the scene idle animation.' },
  knowledgeTitle: { id: 'Pengetahuan', en: 'Knowledge' },
  knowledgeSub: { id: 'Apa yang sudah disimpan agen di memori ICM bersama pada VM ini.', en: 'What the agents have stored in the shared ICM memory on this VM.' },
  searchMemory: { id: 'Cari memori berdasarkan topik, ringkasan, atau kata kunci...', en: 'Search memory by topic, summary or keyword...' },
  brandTag: { id: 'Agen AI. Kerja Nyata.', en: 'AI Agents. Real Work.' },
  resetView: { id: 'Atur ulang tampilan', en: 'Reset view' },
  reducedMotion: { id: 'Gerakan dikurangi', en: 'Reduced motion' },
  panels: { id: 'Panel', en: 'Panels' },
  orbitHint: { id: 'Seret untuk orbit - Shift+seret untuk geser - Scroll untuk zoom', en: 'Drag to orbit - Shift+drag to pan - Scroll to zoom' },
  glTitle: { id: 'WebGL tidak tersedia', en: 'WebGL is unavailable' },
  glHint: { id: 'Tampilan 3D tidak bisa jalan di browser ini. Dasbor membawa data yang sama: agen, antrean tugas, proyek, dan alur.', en: '3D view cannot start in this browser. The dashboard carries the same data: agents, task queue, projects and flow.' },
  activeAgents: { id: 'Agen aktif', en: 'Active Agents' },
  viewAll: { id: 'Lihat semua', en: 'View all' },
  currentTasks: { id: 'Tugas saat ini', en: 'Current Tasks' },
  cmdCenter: { id: 'Pusat komando', en: 'Command Center' },
  cmdInput: { id: 'Jelaskan tugas untuk agen...', en: 'Describe a task for the agents...' },
  cmdAria: { id: 'Deskripsi tugas', en: 'Task description' },
  cmdSubmitAria: { id: 'Kirim tugas', en: 'Submit task' },
  cmdNoteLive: { id: 'Dikirim ke orkestrator Hermes di VM ini. Hasilnya muncul di view Tugas dan di lantai kantor.', en: 'Sent to the Hermes orchestrator on this VM. Results land in the Tasks view and on the office floor.' },
  cmdNoteOff: { id: 'Bridge offline. Tugas hanya tersimpan di sesi browser ini, tidak ada yang sampai ke Hermes.', en: 'Bridge offline. Tasks stay in this browser session only, nothing reaches Hermes.' },
  liveShort: { id: 'Langsung', en: 'Live' },
  demoMode: { id: 'Mode demo', en: 'Demo mode' },
  flowResearch: { id: 'Riset', en: 'Research' },
  flowDesign: { id: 'Desain', en: 'Design' },
  flowDevelop: { id: 'Bangun', en: 'Develop' },
  flowTest: { id: 'Uji', en: 'Test' },
  flowDeploy: { id: 'Rilis', en: 'Deploy' },
  metaInProgress: { id: 'Sedang jalan', en: 'In progress' },
  metaNotRun: { id: 'Belum jalan', en: 'Not run' },
  metaNoAgent: { id: 'Tidak ada agen deploy', en: 'No deploy agent' },
  idleWaiting: { id: 'Idle, menunggu tugas', en: 'Idle, waiting for a task' },
  toastSent: { id: 'Tugas terkirim ke Hermes', en: 'Task sent to Hermes' },
  toastBridgeErr: { id: 'Error bridge: ', en: 'Bridge error: ' },
  toastBridgeOff: { id: 'Bridge offline. Tugas hanya tercatat lokal, tidak ada yang dikirim ke Hermes.', en: 'Bridge offline. Task recorded locally only, nothing was sent to Hermes.' },
  stWorking: { id: 'Bekerja', en: 'Working' },
  stRunning: { id: 'berjalan', en: 'running' },
  stSearching: { id: 'Mencari', en: 'Searching' },
  stIdle: { id: 'Idle', en: 'Idle' },
  stBlocked: { id: 'Terhambat', en: 'Blocked' },
  stInProgress: { id: 'Berjalan', en: 'In progress' },
  stQueued: { id: 'Antrean', en: 'Queued' },
  stWaiting: { id: 'Menunggu', en: 'Waiting' },
  stDone: { id: 'selesai', en: 'done' },
  stFailed: { id: 'gagal', en: 'failed' },
};

export function lang(): Lang {
  try {
    const v = localStorage.getItem(STORE_KEY);
    if (v === 'id' || v === 'en') return v;
  } catch {
    /* private mode */
  }
  return 'id';
}

export function setLang(l: Lang): void {
  try {
    localStorage.setItem(String(STORE_KEY), l);
  } catch {
    /* private mode */
  }
  document.documentElement.dataset.lang = l;
}

export function t(key: string, l: Lang): string {
  const row = DICT[key];
  if (!row) return key;
  return row[l] || row.en || row.id;
}

// Small suffix helpers that need a count, kept here so stays consistent.
export function tc(key: string, l: Lang, n: number): string {
  const base = t(key, l);
  if (n === 1) {
    const one = DICT[key + 'One'];
    return (one ? one[l] : base) as string;
  }
  return base;
}
