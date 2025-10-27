let player;
let currentIndex = 0;
let expanded = false;
let lastVolume = 100;
let keyboardCooldown = false;
let hasPlayedOnce = false; // global flag: video sudah pernah dimainkan?
let isDragging = false;
let wasPlaying = false;
let pendingSeekTime = null;
const keyboardCooldownDelay = 100; // jeda 100ms antar-tekan

// === YouTube Player Setup ===
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "100%",
    width: "100%",
    videoId: "QhSfakzeDuI",
    playerVars: {
      autoplay: 0,
      controls: 0, // gunakan kontrol custom kita
      showinfo: 0,
      rel: 0,
      modestbranding: 1,
      fs: 0,
      disablekb: 0,
      iv_load_policy: 3,
      showinfo: 0,
      playsinline: 1,
      enablejsapi: 1, // wajib aktif untuk kontrol via JS
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerReady() {
  initCustomControls();
  loadLineup(0);
  updateActiveItem(0);

  // tampilkan icon volume awal (desktop only)
  const initialVolume = player.getVolume ? player.getVolume() : 100;
  updateVolumeIcon(initialVolume);

  const playerContainer = document.querySelector(".player-container");

  // === Cursor hanya pointer saat hover di awal (belum pernah play) ===
  playerContainer.addEventListener("mouseenter", () => {
    if (!hasPlayedOnce) {
      playerContainer.style.cursor = "pointer";
    }
  });

  playerContainer.addEventListener("mouseleave", () => {
    if (!hasPlayedOnce) {
      playerContainer.style.cursor = "default";
    }
  });

  // === Default line-up ===
  // Jika di desktop (layar >= 900px) => tampil
  // Jika di HP/tablet => tertutup
  if (window.innerWidth >= 900) {
    expanded = true;
  } else {
    expanded = false;
  }
  updateVisibleMembers();

  // ✅ Jalankan update progress setelah player siap
  startProgressUpdater();
}

function startProgressUpdater() {
  const progressRange = document.getElementById("progressRange");
  const timeDisplay = document.getElementById("timeDisplay");

  setInterval(() => {
    if (!player || typeof player.getCurrentTime !== "function") return;

    const total = player.getDuration();
    const current = player.getCurrentTime();

    if (isNaN(total) || total <= 0) return;

    // jika user sedang drag — jangan override posisi UI (hindari flicker)
    if (isDragging) {
      // tetap update time display optional (atau lewati kalau ingin tetap sesuai preview)
      // timeDisplay.textContent = `${formatClock(current)} / ${formatClock(total)}`;
      return;
    }

    const pct = (current / total) * 100;
    progressRange.value = pct;
    progressRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${pct}%, rgba(200,200,200,0.15) ${pct}%)`;

    timeDisplay.textContent = `${formatClock(current)} / ${formatClock(total)}`;
  }, 250);
}

function onPlayerStateChange(event) {
  const playerContainer = document.querySelector(".player-container");
  const state = event.data;

  // Saat pertama kali video mulai play → ubah flag
  if (state === YT.PlayerState.PLAYING && !hasPlayedOnce) {
    hasPlayedOnce = true;
    playerContainer.style.cursor = "default";
  }

  // Setelah video pernah diputar → cursor selalu default
  if (hasPlayedOnce) {
    playerContainer.style.cursor = "default";
  }

  // Event lainnya tetap
  if (state === YT.PlayerState.ENDED) playNextVideo();
  if (state === YT.PlayerState.PLAYING) updatePlayPauseIcons("playing");
  if (state === YT.PlayerState.PAUSED) updatePlayPauseIcons("paused");
}

/* =====================================================
   === Ganti Video / Playlist ===
===================================================== */
// --- Perbaikan di fungsi loadVideo (tambahkan loadLineup)
function loadVideo(videoId, index) {
  if (!player || typeof player.loadVideoById !== "function") {
    console.warn("Player belum siap, tunda load video.");
    setTimeout(() => loadVideo(videoId, index), 300);
    return;
  }

  currentIndex = index;

  console.log("▶️ Memuat video:", videoId);

  // Ganti video dan langsung play
  player.loadVideoById(videoId);

  // Update tampilan playlist aktif
  updateActiveItem(index);

  // **--- PENTING: perbarui lineup member sesuai index ---**
  // Pastikan fungsi loadLineup tersedia dan indeks valid
  try {
    if (typeof loadLineup === "function") {
      loadLineup(index);
    }
  } catch (err) {
    console.warn("Gagal memuat lineup untuk index", index, err);
  }

  // === Scroll behavior versi final (benar-benar mentok atas) ===
  const activeItem = document.querySelectorAll(".playlist .item")[index];
  const isFromPlaylistClick = event?.target?.closest?.(".playlist .item");

  if (isFromPlaylistClick) {
    // 🎯 Klik playlist → gulir ke paling atas halaman (mentok)
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    // 🎯 Next / Prev / Keyboard / Autoplay → tetap stay di atas
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // Pastikan langsung play (terkadang butuh delay kecil)
  setTimeout(() => {
    try {
      player.playVideo();
    } catch (err) {
      console.warn("Autoplay mungkin diblokir:", err);
    }
  }, 300);
}

// === Ganti playlist YouTube ===
function loadPlaylist(playlistId) {
  if (player && typeof player.loadPlaylist === "function") {
    player.loadPlaylist({ list: playlistId });
  } else {
    console.warn("Player belum siap");
  }
}

/* =====================================================
   === Auto Next Video ===
===================================================== */
function playNextVideo() {
  const items = document.querySelectorAll(".playlist .item");
  if (currentIndex < items.length - 1) {
    currentIndex++;
    const nextItem = items[currentIndex];
    const nextVideoId = nextItem.getAttribute("data-video");
    loadVideo(nextVideoId, currentIndex);
  }
}

/* =====================================================
   === Highlight Item Aktif di Playlist ===
===================================================== */
function updateActiveItem(index) {
  const items = document.querySelectorAll(".playlist .item");
  items.forEach((it, i) => {
    it.classList.toggle("active", i === index);
  });
}

/* =====================================================
   === Line-up Grid ===
===================================================== */
const grid = document.getElementById("memberGrid");
const btn = document.getElementById("toggleBtn");

function loadLineup(index) {
  if (!grid) return;
  grid.innerHTML = "";
  const members = videoLineup[index] || [];
  members.forEach((name) => {
    const card = document.createElement("div");
    card.className = "member";
    card.innerHTML = `
      <img src="../../assets/img/${name.toLowerCase()}.jpg" alt="${name}">
      <div class="member-name">${name}</div>
    `;
    grid.appendChild(card);
  });
  updateVisibleMembers();
}

// --- Perbaikan di updateVisibleMembers (spread operator)
function updateVisibleMembers() {
  if (!grid) return;
  const cards = [...grid.children]; // <-- perbaikan
  cards.forEach((c) => {
    c.style.display = expanded ? "block" : "none";
  });
  btn.textContent = expanded ? "Tutup Line-up" : "Tampilkan Line-up";
}

btn?.addEventListener("click", () => {
  expanded = !expanded;
  updateVisibleMembers();
});

/* =====================================================
   === Pencarian Playlist ===
===================================================== */
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const playlist = document.getElementById("playlist");

function filterPlaylist() {
  const query = searchInput.value.toLowerCase().trim();
  const items = playlist.querySelectorAll(".item");
  items.forEach((item) => {
    const text = item.innerText.toLowerCase();
    item.style.display = !query || text.includes(query) ? "flex" : "none";
  });
}

searchBtn?.addEventListener("click", filterPlaylist);
searchInput?.addEventListener("keyup", (e) => {
  if (e.key === "Enter") filterPlaylist();
  if (searchInput.value.trim() === "") filterPlaylist();
});
searchInput?.addEventListener("search", filterPlaylist);

/* =====================================================
   === Dropdown Theater ===
===================================================== */
const showBtn = document.getElementById("showBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

showBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("show");
});
document.addEventListener("click", (e) => {
  if (!dropdownMenu.contains(e.target) && e.target !== showBtn) {
    dropdownMenu.classList.remove("show");
  }
});
window.addEventListener("resize", () => dropdownMenu.classList.remove("show"));

/* =====================================================
   === Format Waktu ===
===================================================== */
function formatClock(seconds) {
  seconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const two = (n) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/* =====================================================
   === Custom Control Player ===
===================================================== */
function initCustomControls() {
  const playBtn = document.getElementById("btnPlayPause");
  const prevBtn = document.getElementById("btnPrev");
  const nextBtn = document.getElementById("btnNext");
  const timeDisplay = document.getElementById("timeDisplay");
  const progressRange = document.getElementById("progressRange");
  const preview = document.getElementById("progressPreview");
  const previewTime = document.getElementById("progressPreviewTime");
  const volBtn = document.getElementById("btnVolume");
  const volRange = document.getElementById("volumeRange");
  const fsBtn = document.getElementById("btnFullscreen");

  // tampilkan durasi awal ketika player siap
  const intervalReady = setInterval(() => {
    if (player && player.getDuration && player.getDuration() > 0) {
      const timeDisplay = document.getElementById("timeDisplay");
      timeDisplay.textContent = `0:00 / ${formatClock(player.getDuration())}`;
      clearInterval(intervalReady);
    }
  }, 500);

  // Progress update loop
  setInterval(() => {
    if (!player || typeof player.getDuration !== "function") return;

    const total = player.getDuration();
    const current = player.getCurrentTime();

    if (isNaN(total) || total <= 0) return; // pastikan sudah ready
  }, 250);

  // Play / Pause
  playBtn.addEventListener("click", () => {
    const st = player.getPlayerState();
    if (st === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      updatePlayPauseIcons("paused");
    } else {
      player.playVideo();
      updatePlayPauseIcons("playing");
    }
  });

  // --- Buffer Bar Update (Fixed Version) ---
  const bufferBar = document.querySelector(".cust-progress-wrap .buffer-bar");
  let bufferFill = bufferBar.querySelector(".buffer-fill");
  if (!bufferFill) {
    bufferFill = document.createElement("div");
    bufferFill.className = "buffer-fill";
    bufferBar.appendChild(bufferFill);
  }

  // Update buffer menggunakan YT API dengan validasi tambahan
  function updateBuffer() {
    if (!player || typeof player.getVideoLoadedFraction !== "function") return;

    let frac = player.getVideoLoadedFraction();

    // --- Validasi tambahan ---
    if (!isFinite(frac) || frac < 0) frac = 0;

    // Saat belum start atau masih buffering awal, batasi 5%
    const state = player.getPlayerState();
    if (state === -1 || state === 3) {
      frac = Math.min(frac, 0.05);
    }

    // Hindari full sebelum video selesai
    if (frac > 0.999 && state !== YT.PlayerState.ENDED) {
      frac = 0.999;
    }

    const pct = frac * 100;
    bufferFill.style.width = pct + "%";
  }

  // Jalankan update hanya saat video aktif
  setInterval(() => {
    const state = player?.getPlayerState?.();
    if (
      state === YT.PlayerState.BUFFERING ||
      state === YT.PlayerState.PLAYING ||
      state === YT.PlayerState.PAUSED
    ) {
      updateBuffer();
    }
  }, 500);

  // rAF-driven preview positioning & mouse-line update
  function schedulePreviewUpdate() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      // position preview and mouseLine given lastMousePct
      const wrap = document.querySelector(".cust-progress-wrap");
      const wrapRect = wrap.getBoundingClientRect();
      const x =
        (Math.max(0, Math.min(100, lastMousePct)) / 100) * wrapRect.width;
      // position preview
      preview.style.left = `${x}px`;
      // mouse line width -> from start to mouse pos
      mouseLine.style.width = `${Math.max(0, Math.min(100, lastMousePct))}%`;
      mouseLine.style.opacity = 1;
      // preview time based on pct
      const newTime =
        (lastMousePct / 100) * (player.getDuration ? player.getDuration() : 0);
      previewTime.textContent = formatClock(newTime);
    });
  }

  // compute pct from event (clientX)
  function pctFromClientX(clientX) {
    const wrap = document.querySelector(".cust-progress-wrap");
    const wrapRect = wrap.getBoundingClientRect();
    const px = clientX - wrapRect.left;
    return (px / wrapRect.width) * 100;
  }

  // === Hover Preview Time (Desktop Only) ===
  // === Desktop: hover preview + click/drag seek (dot follows mouse ONLY when clicked/dragged) ===
  // === Desktop Progress Bar: YouTube-like behavior ===
  if (!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const progressWrap = document.querySelector(".cust-progress-wrap");
    const preview = document.getElementById("progressPreview");
    const previewTimeEl = document.getElementById("progressPreviewTime");
    const mouseLine = document.querySelector(".cust-progress-wrap .mouse-line");

    // helper konversi posisi mouse ke persentase progress (0-100)
    function clientXToPct(clientX) {
      const rect = progressWrap.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      return Math.max(0, Math.min(100, pct));
    }

    // update visual (dot dan warna bar)
    function updateUIForPct(clamped) {
      progressRange.value = clamped;
      progressRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${clamped}%, rgba(200,200,200,0.15) ${clamped}%)`;
      if (preview) preview.style.left = `${clamped}%`;
      if (mouseLine) {
        mouseLine.style.width = `${clamped}%`;
        mouseLine.style.opacity = 1;
      }
    }

    // tampilkan garis & waktu saat hover (tanpa pindahkan dot)
    progressWrap.addEventListener("mousemove", (e) => {
      const pct = clientXToPct(e.clientX);
      const duration =
        player && typeof player.getDuration === "function"
          ? player.getDuration()
          : 0;
      const t = (pct / 100) * duration;

      // hanya garis hover & waktu preview
      if (!isDragging) {
        if (mouseLine) {
          mouseLine.style.width = `${pct}%`;
          mouseLine.style.opacity = 1;
        }
        if (preview) {
          preview.style.display = "flex";
          preview.style.left = `${pct}%`;
          previewTimeEl.textContent = formatClock(t);
        }
      }
    });

    progressWrap.addEventListener("mouseenter", (e) => {
      const pct = clientXToPct(e.clientX);
      if (mouseLine) {
        mouseLine.style.width = `${pct}%`;
        mouseLine.style.opacity = 1;
      }
      if (preview) {
        preview.style.display = "flex";
        preview.style.left = `${pct}%`;
        const duration =
          player && typeof player.getDuration === "function"
            ? player.getDuration()
            : 0;
        previewTimeEl.textContent = formatClock((pct / 100) * duration);
      }
    });

    progressWrap.addEventListener("mouseleave", () => {
      if (!isDragging) {
        if (mouseLine) mouseLine.style.opacity = 0;
        if (preview) preview.style.display = "none";
      }
    });

    // === CLICK: langsung seek sekali ===
    progressWrap.addEventListener("click", (e) => {
      if (!player || typeof player.getDuration !== "function") return;
      const pct = clientXToPct(e.clientX);
      const duration = player.getDuration();
      const seekTime = (pct / 100) * duration;

      // lakukan seek instan
      player.seekTo(seekTime, true);
      updateUIForPct(pct);

      // sembunyikan overlay preview
      if (preview) preview.style.display = "none";
      if (mouseLine) mouseLine.style.opacity = 0;
    });

    // === DRAG: dot mengikuti mouse, bahkan di luar frame ===
    let docMoveHandler = null;
    let docUpHandler = null;

    progressWrap.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (!player) return;

      isDragging = true;
      wasPlaying =
        player.getPlayerState &&
        player.getPlayerState() === YT.PlayerState.PLAYING;
      if (wasPlaying && typeof player.pauseVideo === "function")
        player.pauseVideo();

      const pct = clientXToPct(e.clientX);
      const duration =
        player && typeof player.getDuration === "function"
          ? player.getDuration()
          : 0;
      pendingSeekTime = (pct / 100) * duration;
      updateUIForPct(pct);

      if (preview) {
        preview.style.display = "flex";
        preview.style.left = `${pct}%`;
        previewTimeEl.textContent = formatClock(pendingSeekTime);
      }

      // === aktifkan drag global ===
      docMoveHandler = (moveEvt) => {
        if (!isDragging) return;
        const movePct = clientXToPct(moveEvt.clientX);
        const dur =
          player && typeof player.getDuration === "function"
            ? player.getDuration()
            : 0;
        pendingSeekTime = (movePct / 100) * dur;
        updateUIForPct(movePct);
        if (preview) {
          preview.style.display = "flex";
          preview.style.left = `${movePct}%`;
          previewTimeEl.textContent = formatClock(pendingSeekTime);
        }
      };

      docUpHandler = () => {
        if (!isDragging) return;
        isDragging = false;

        // lakukan seek ke posisi akhir
        if (
          pendingSeekTime !== null &&
          player &&
          typeof player.seekTo === "function"
        ) {
          player.seekTo(pendingSeekTime, true);
        }

        if (preview) preview.style.display = "none";
        if (mouseLine) mouseLine.style.opacity = 0;

        // lanjutkan playback bila sebelumnya play
        if (wasPlaying && player && typeof player.playVideo === "function") {
          player.playVideo();
        }

        pendingSeekTime = null;

        // cabut event listener global
        document.removeEventListener("mousemove", docMoveHandler);
        document.removeEventListener("mouseup", docUpHandler);
      };

      document.addEventListener("mousemove", docMoveHandler);
      document.addEventListener("mouseup", docUpHandler);
    });
  }

  // === Volume logic (SVG version) ===
  volRange.addEventListener("input", () => {
    const v = Number(volRange.value);
    player.setVolume(v);

    if (v === 0) {
      player.mute();
    } else {
      player.unMute();
      lastVolume = v;
    }

    // ubah warna background bar
    volRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${v}%, rgba(200,200,200,0.15) ${v}%)`;

    // tampilkan overlay volume + update ikon di control bar
    showVolumeOverlay(v);
    updateVolumeIcon(v);
  });

  volBtn.addEventListener("click", () => {
    if (player.isMuted && player.isMuted()) {
      player.unMute();
      volRange.value = lastVolume;
      player.setVolume(lastVolume);
    } else {
      player.mute();
      lastVolume = volRange.value;
      volRange.value = 0;
    }

    const v = Number(volRange.value);
    volRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${v}%, rgba(200,200,200,0.15) ${v}%)`;

    // === Inline SVG icon (clean white YouTube style) ===
    if (!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      let iconSVG = "";

      if (v === 0) {
        // mute
        iconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 8 16 8" fill="rgba(255, 255, 255, 0.9)" width="30" height="30">
          <path d="M4 9v6h4l5 5V4L8 9H4Z"/>
          <path d="M16.5 12a4.5 4.5 0 0 1-1.32 3.18l-1.42-1.42A2.5 2.5 0 0 0 14.5 12a2.5 2.5 0 0 0-.74-1.76l1.42-1.42A4.5 4.5 0 0 1 16.5 12Z"/>
          <path d="M19 12a7 7 0 0 1-2.05 4.95l-1.41-1.41A5 5 0 0 0 17 12a5 5 0 0 0-1.46-3.54l1.41-1.41A7 7 0 0 1 19 12Z"/>
          <path d="M21.71 20.29 3.71 2.29a1 1 0 0 0-1.42 1.42l18 18a1 1 0 0 0 1.42-1.42Z"/>
        </svg>
      `;
      } else if (v < 50) {
        // low volume
        iconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 8 16 8" fill="rgba(255, 255, 255, 0.9)" width="30" height="30">
          <path d="M4 9v6h4l5 5V4L8 9H4Z"/>
          <path d="M14.5 12a2.5 2.5 0 0 0-.74-1.76l1.42-1.42A4.5 4.5 0 0 1 16.5 12a4.5 4.5 0 0 1-1.32 3.18l-1.42-1.42A2.5 2.5 0 0 0 14.5 12Z"/>
        </svg>
      `;
      } else {
        // high volume
        iconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 8 16 8" fill="rgba(255, 255, 255, 0.9)" width="30" height="30">
          <path d="M4 9v6h4l5 5V4L8 9H4Z"/>
          <path d="M14.5 12a2.5 2.5 0 0 0-.74-1.76l1.42-1.42A4.5 4.5 0 0 1 16.5 12a4.5 4.5 0 0 1-1.32 3.18l-1.42-1.42A2.5 2.5 0 0 0 14.5 12Z"/>
          <path d="M19 12a7 7 0 0 1-2.05 4.95l-1.41-1.41A5 5 0 0 0 17 12a5 5 0 0 0-1.46-3.54l1.41-1.41A7 7 0 0 1 19 12Z"/>
        </svg>
      `;
      }

      volBtn.innerHTML = iconSVG;
    }

    // === Overlay volume di tengah layar (desktop only) ===
    showVolumeOverlay(v);
  });

  // === Tombol Replay / Previous (Smart Behavior seperti YouTube, batas 2 detik) ===
  prevBtn.addEventListener("click", () => {
    const items = document.querySelectorAll(".playlist .item");
    if (!items.length) return;

    const currentTime = player?.getCurrentTime?.() || 0;

    if (currentTime > 2) {
      // Jika sudah lewat 2 detik, restart video ini
      player.seekTo(0, true);
    } else {
      // Jika masih di awal (<= 2 detik), pindah ke video sebelumnya
      if (currentIndex > 0) {
        currentIndex--;
      } else {
        // Jika sudah di video pertama, lompat ke terakhir (opsional)
        currentIndex = items.length - 1;
      }

      const prevItem = items[currentIndex];

      // Ambil videoId dari data-video (atau fallback dari onclick)
      const prevVideoId =
        prevItem.getAttribute("data-video") ||
        (prevItem.getAttribute("onclick")?.match(/loadVideo\(['"]([^'"]+)['"]/)
          ? prevItem
              .getAttribute("onclick")
              .match(/loadVideo\(['"]([^'"]+)['"]/)[1]
          : null);

      if (prevVideoId) {
        loadVideo(prevVideoId, currentIndex);
        // Pastikan langsung play
        setTimeout(() => player?.playVideo?.(), 200);
        updateActiveItem(currentIndex);
      } else {
        console.warn(
          "❌ Tidak menemukan videoId pada item index",
          currentIndex
        );
      }
    }
  });

  // === Tombol Berikutnya ===
  nextBtn.addEventListener("click", () => {
    const items = document.querySelectorAll(".playlist .item");
    if (!items.length) return;

    if (currentIndex < items.length - 1) {
      currentIndex++;
    } else {
      // Kalau di akhir, kembali ke awal (opsional)
      currentIndex = 0;
    }

    const nextItem = items[currentIndex];

    // Ambil videoId dari data-video (atau fallback dari onclick)
    const nextVideoId =
      nextItem.getAttribute("data-video") ||
      (nextItem.getAttribute("onclick")?.match(/loadVideo\(['"]([^'"]+)['"]/)
        ? nextItem
            .getAttribute("onclick")
            .match(/loadVideo\(['"]([^'"]+)['"]/)[1]
        : null);

    if (nextVideoId) {
      loadVideo(nextVideoId, currentIndex);
      setTimeout(() => player?.playVideo?.(), 200);
      updateActiveItem(currentIndex);
    } else {
      console.warn("❌ Tidak menemukan videoId pada item index", currentIndex);
    }
  });

  // Fullscreen
  fsBtn.addEventListener("click", () => {
    const container = document.querySelector(".player-container");
    if (!document.fullscreenElement) container.requestFullscreen();
    else document.exitFullscreen();
  });

  // Helper — ambil video element di dalam YouTube iframe
  async function getYouTubeVideoElement(iframe) {
    try {
      const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
      return innerDoc.querySelector("video");
    } catch (e) {
      return null; // jika cross-origin, tidak bisa diakses
    }
  }

  // === Format waktu otomatis jam:menit:detik ===
  function formatClock(sec) {
    sec = Math.floor(sec);
    if (isNaN(sec) || sec < 0) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  }

  // === Durasi & progress update ===
  setInterval(() => {
    if (!player || typeof player.getDuration !== "function" || isDragging)
      return;

    const total = player.getDuration();
    const current = player.getCurrentTime();

    // hanya update jika video sudah memiliki durasi valid
    if (!isNaN(total) && total > 0) {
      const pct = (current / total) * 100;
      progressRange.value = pct;
      progressRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${pct}%, rgba(200,200,200,0.15) ${pct}%)`;

      // tampilkan waktu yang benar
      timeDisplay.textContent = `${formatClock(current)} / ${formatClock(
        total
      )}`;
    }
  }, 250);

  // === Tampilkan durasi total di awal ketika player ready ===
  if (player && typeof player.addEventListener === "function") {
    player.addEventListener("onReady", () => {
      const total = player.getDuration();
      if (total > 0) {
        timeDisplay.textContent = `0:00 / ${formatClock(total)}`;
      }
    });
  }

  // =========================
  // MOBILE: advanced touch seek + mobile controls
  // =========================
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const progressWrap = document.querySelector(".cust-progress-wrap");
    const progressRange = document.getElementById("progressRange");
    const playerContainer = document.querySelector(".player-container");
    const overlay = document.querySelector(".gesture-overlay");
    const timeLeftEl = document.querySelector(".time-left") || createTimeLeft();
    const fsRight = document.querySelector(".fs-right") || createFsRight();

    // helper create fallback elements if not exist
    function createTimeLeft() {
      const el = document.createElement("div");
      el.className = "time-left";
      el.textContent = "0:00 / 0:00";
      playerContainer.appendChild(el);
      return el;
    }
    function createFsRight() {
      const btn = document.createElement("button");
      btn.className = "fs-right ctrl-btn";
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M7 14H5v5h5v-2H7v-3zm10-9h-5v2h3v3h2V5zM7 5h5V3H5v5h2V5zm10 14v-5h-2v3h-3v2h5z"/></svg>';
      playerContainer.appendChild(btn);
      btn.addEventListener("click", toggleFullscreenMobile);
      return btn;
    }

    // add seek dot & tooltip
    let seekDot = document.querySelector(".seek-dot");
    let seekTooltip = document.querySelector(".seek-tooltip");
    if (!seekDot) {
      seekDot = document.createElement("div");
      seekDot.className = "seek-dot";
      playerContainer.appendChild(seekDot);
    }
    if (!seekTooltip) {
      seekTooltip = document.createElement("div");
      seekTooltip.className = "seek-tooltip";
      playerContainer.appendChild(seekTooltip);
    }

    // state
    let touchActive = false;
    let startTouchX = 0;
    let startPct = 0; // starting percent (from currentTime)
    let startTimeAtTouch = 0;
    let wasPlayingBeforeTouch = false;

    function clamp(v, a = 0, b = 100) {
      return Math.max(a, Math.min(b, v));
    }

    function pctToTime(pct) {
      const dur =
        player && typeof player.getDuration === "function"
          ? player.getDuration()
          : 0;
      return (pct / 100) * dur;
    }

    function setProgressUI(pct) {
      // set css var so background gradient uses it
      progressWrap.style.setProperty("--pct", pct + "%");
      progressRange.value = pct;
    }

    // convert clientX to pct (0-100)
    function clientXToPct(clientX) {
      const rect = progressWrap.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = (x / rect.width) * 100;
      return clamp(pct, 0, 100);
    }

    // show/hide helpers
    function showTouchUI() {
      progressWrap.classList.add("mobile-active");
      seekDot.style.display = "block";
      seekTooltip.style.display = "block";
      playerContainer.classList.add("mobile-showing"); // show controls while touching
      clearHideTimer(); // prevent auto-hide while touching
    }
    function hideTouchUI() {
      progressWrap.classList.remove("mobile-active");
      seekDot.style.display = "none";
      seekTooltip.style.display = "none";
      // let auto-hide rules apply (mobile-playing class remains)
    }

    // position dot + tooltip by pct (0-100)
    function positionDotByPct(pct) {
      const rect = progressWrap.getBoundingClientRect();
      const leftPx = rect.left + (pct / 100) * rect.width;
      const localLeft = pct + "%";
      seekDot.style.left = pct + "%";
      seekTooltip.style.left = pct + "%";
    }

    // touch handlers
    progressWrap.addEventListener(
      "touchstart",
      (ev) => {
        ev.preventDefault();
        if (!player) return;
        touchActive = true;
        const t = ev.touches[0];
        startTouchX = t.clientX;
        startTimeAtTouch = player.getCurrentTime();
        const dur = player.getDuration() || 0;
        startPct = dur > 0 ? (startTimeAtTouch / dur) * 100 : 0;
        wasPlayingBeforeTouch =
          player.getPlayerState &&
          player.getPlayerState() === YT.PlayerState.PLAYING;
        // pause for comfortable seeking
        try {
          if (wasPlayingBeforeTouch) player.pauseVideo();
        } catch (e) {}

        showTouchUI();
        // initial dot position at current playback
        positionDotByPct(startPct);
        setProgressUI(startPct);
        seekTooltip.textContent = formatClock(Math.floor(startTimeAtTouch));
      },
      { passive: false }
    );

    progressWrap.addEventListener(
      "touchmove",
      (ev) => {
        ev.preventDefault();
        if (!touchActive) return;
        const t = ev.touches[0];
        const rect = progressWrap.getBoundingClientRect();
        const dx = t.clientX - startTouchX;
        const pctDelta = (dx / rect.width) * 100;
        const newPct = clamp(startPct + pctDelta, 0, 100);
        // update UI only (no seek yet)
        setProgressUI(newPct);
        positionDotByPct(newPct);
        const newTime = pctToTime(newPct);
        seekTooltip.textContent = formatClock(Math.floor(newTime));
      },
      { passive: false }
    );

    progressWrap.addEventListener(
      "touchend",
      (ev) => {
        ev.preventDefault();
        if (!touchActive) return;
        touchActive = false;
        // compute final pct from dot position
        const leftStyle = seekDot.style.left || progressRange.value + "%";
        const pct = parseFloat(leftStyle);
        const newTime = pctToTime(pct);
        // perform seek
        try {
          player.seekTo(newTime, true);
        } catch (e) {
          console.warn(e);
        }
        // resume if was playing
        if (wasPlayingBeforeTouch) {
          try {
            player.playVideo();
          } catch (e) {}
        }
        // hide dot & tooltip after short delay for smoothness
        setTimeout(() => hideTouchUI(), 160);
      },
      { passive: false }
    );

    // If user taps overlay (single tap) -> toggle controls (show / hide) with auto-hide 2s
    let mobileToggleTimer = null;
    function showMobileControlsOnce() {
      clearTimeout(mobileToggleTimer);
      playerContainer.classList.add("mobile-showing");
      // ensure controls visible for 2s (then hide only if playing)
      mobileToggleTimer = setTimeout(() => {
        playerContainer.classList.remove("mobile-showing");
      }, 2000);
    }

    // overlay click/tap toggles controls
    overlay.addEventListener("click", (ev) => {
      ev.preventDefault();
      // if currently showing -> hide immediate; else show
      if (playerContainer.classList.contains("mobile-showing")) {
        playerContainer.classList.remove("mobile-showing");
        clearTimeout(mobileToggleTimer);
      } else {
        showMobileControlsOnce();
      }
    });

    // When video plays/pauses adjust mobile-playing class
    const playStateWatcher = setInterval(() => {
      if (!player || typeof player.getPlayerState !== "function") return;
      const st = player.getPlayerState();
      if (st === YT.PlayerState.PLAYING) {
        playerContainer.classList.add("mobile-playing");
      } else {
        playerContainer.classList.remove("mobile-playing");
        playerContainer.classList.add("mobile-showing"); // show controls when paused
      }
    }, 300);

    // make sure time-left updates
    setInterval(() => {
      if (!player || typeof player.getCurrentTime !== "function") return;
      const cur = player.getCurrentTime();
      const dur = player.getDuration();
      timeLeftEl.textContent = `${formatClock(Math.floor(cur))} / ${formatClock(
        Math.floor(dur || 0)
      )}`;
    }, 400);

    // PREV / NEXT button behavior already exist (buttons in markup). Ensure they are visible center.
    // Attach listeners if not already done:
    const prevBtn = document.getElementById("btnPrev");
    const nextBtn = document.getElementById("btnNext");
    const playBtn = document.getElementById("btnPlayPause");

    // safety attach if not present
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        const st =
          player && typeof player.getPlayerState === "function"
            ? player.getPlayerState()
            : -1;
        if (st === YT.PlayerState.PLAYING) player.pauseVideo();
        else player.playVideo();
        showMobileControlsOnce();
      });
    }

    // fullscreen mobile: try to lock orientation to landscape when entering fullscreen
    function toggleFullscreenMobile() {
      const container = document.querySelector(".player-container");
      const docIsFull = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      // toggle fullscreen
      if (!docIsFull) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen)
          container.webkitRequestFullscreen();
        // try lock orientation
        if (screen.orientation && screen.orientation.lock) {
          try {
            screen.orientation.lock("landscape");
          } catch (e) {
            /* ignore */
          }
        }
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        // unlock orientation
        if (screen.orientation && screen.orientation.unlock) {
          try {
            screen.orientation.unlock();
          } catch (e) {
            /* ignore */
          }
        }
      }
    }

    // listen for fullscreen changes to auto-lock/unlock orientation
    document.addEventListener("fullscreenchange", () => {
      const docIsFull = !!document.fullscreenElement;
      if (docIsFull) {
        try {
          screen.orientation.lock("landscape");
        } catch (e) {}
        playerContainer.classList.add("mobile-showing");
      } else {
        try {
          screen.orientation.unlock();
        } catch (e) {}
        playerContainer.classList.remove("mobile-showing");
      }
    });

    // helper clear timer
    function clearHideTimer() {
      if (mobileToggleTimer) {
        clearTimeout(mobileToggleTimer);
        mobileToggleTimer = null;
      }
    }

    // ensure initial UI state
    hideTouchUI();
  }

  // === AUTO HIDE CONTROL DAN PROGRESS (Desktop only) ===
  if (!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const playerContainer = document.querySelector(".player-container");
    const controls = document.querySelector(".cust-controls");
    const progressWrap = document.querySelector(".cust-progress-wrap");
    const mouseLine = document.querySelector(".cust-progress-wrap .mouse-line");

    let hideTimeout = null;
    let isIdle = false;

    function showControls() {
      controls.classList.add("visible");
      progressWrap.classList.add("visible");
      clearTimeout(hideTimeout);
      isIdle = false;
    }

    function hideControls() {
      // Jangan sembunyikan jika video paused atau sedang drag
      const st = player?.getPlayerState?.();
      if (st === YT.PlayerState.PAUSED || isDragging) return;

      controls.classList.remove("visible");
      progressWrap.classList.remove("visible");
      isIdle = true;
    }

    // === Saat mouse bergerak di dalam video → tampilkan kontrol dan reset timer
    playerContainer.addEventListener("mousemove", () => {
      // kalau sedang drag, pastikan selalu visible
      if (isDragging) {
        showControls();
        return;
      }

      showControls();
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        hideControls();
      }, 2000); // ⏱️ sembunyikan setelah 2 detik tanpa gerak
    });

    // === Saat mouse keluar area video → sembunyikan cepat (kecuali sedang drag)
    playerContainer.addEventListener("mouseleave", () => {
      clearTimeout(hideTimeout);
      // kalau sedang drag, jangan hide
      if (isDragging) {
        showControls();
        return;
      }

      hideTimeout = setTimeout(() => {
        hideControls();
      }, 500); // delay 0.5 detik saat keluar frame
    });

    // === Saat mouse masuk area video → tampilkan kembali
    playerContainer.addEventListener("mouseenter", () => {
      showControls();
    });

    // === Sembunyikan garis hover (mouse-line) saat keluar progress bar
    progressWrap.addEventListener("mouseenter", () => {
      if (mouseLine) mouseLine.style.opacity = 1;
    });

    progressWrap.addEventListener("mouseleave", () => {
      // kalau sedang drag, jangan sembunyikan garis hover
      if (isDragging) return;
      if (mouseLine) mouseLine.style.opacity = 0;
    });

    // === Tambahan global handler: pastikan visible selama drag walau keluar frame
    document.addEventListener("mousemove", () => {
      if (isDragging) showControls();
    });

    document.addEventListener("mouseup", () => {
      // saat drag selesai, aktifkan auto-hide kembali
      if (!isDragging) {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          hideControls();
        }, 2000);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initMobileControlBehavior, 1500);
});

/* =====================================================
   === Gesture Overlay - Play, Pause, Forward, Rewind ===
===================================================== */
function initGestureOverlay() {
  const overlay = document.querySelector(".gesture-overlay");
  if (!overlay) return;

  const zoneLeft = overlay.querySelector(".gesture-zone.left");
  const zoneCenter = overlay.querySelector(".gesture-zone.center");
  const zoneRight = overlay.querySelector(".gesture-zone.right");
  const iconRewind = overlay.querySelector(".gesture-icon.rewind");
  const iconPlayPause = overlay.querySelector(".gesture-icon.playpause");
  const iconForward = overlay.querySelector(".gesture-icon.forward");

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let singleTapTimer = null;
  let lastTapTimeLeft = 0;
  let lastTapTimeRight = 0;
  let doubleTapDetected = false;

  if (isMobile) {
    // === Geser atas/bawah untuk keluar fullscreen ===
    let startY = 0;
    let endY = 0;

    overlay.addEventListener("touchstart", (e) => {
      startY = e.touches[0].clientY;
    });

    overlay.addEventListener("touchend", (e) => {
      endY = e.changedTouches[0].clientY;
      const deltaY = endY - startY;

      // Jika geser cukup jauh ke atas atau ke bawah (lebih dari 100px)
      if (Math.abs(deltaY) > 100) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    });
    // === MODE HP ===
    overlay.addEventListener("click", (e) => {
      const now = Date.now();
      const zone = e.target.closest(".gesture-zone");
      doubleTapDetected = false;

      // === DOUBLE TAP KANAN ===
      if (zone === zoneRight && now - lastTapTimeRight < 300) {
        e.preventDefault();
        doubleTapDetected = true;
        const current = player.getCurrentTime();
        player.seekTo(current + 10, true);
        showIcon(iconForward);
      }
      lastTapTimeRight = now;

      // === DOUBLE TAP KIRI ===
      if (zone === zoneLeft && now - lastTapTimeLeft < 300) {
        e.preventDefault();
        doubleTapDetected = true;
        const current = player.getCurrentTime();
        player.seekTo(Math.max(0, current - 10), true);
        showIcon(iconRewind);
      }
      lastTapTimeLeft = now;

      // === Kalau double tap terdeteksi, batalkan single tap ===
      if (doubleTapDetected) {
        if (singleTapTimer) clearTimeout(singleTapTimer);
        return; // stop di sini (tidak trigger play/pause)
      }
    });
  } else {
    // === MODE DESKTOP ===
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return; // abaikan di mode HP

    zoneLeft.style.pointerEvents = "all";
    zoneRight.style.pointerEvents = "all";
    zoneCenter.style.pointerEvents = "all";

    let clickTimer = null;

    overlay.addEventListener("click", (e) => {
      // Jangan langsung jalankan play/pause, tunggu sebentar untuk deteksi dblclick
      if (clickTimer) clearTimeout(clickTimer);

      clickTimer = setTimeout(() => {
        // Hanya jalankan jika bukan bagian dari double click
        const rect = overlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const zoneWidth = rect.width / 3;

        const zone =
          x < zoneWidth
            ? "left"
            : x > rect.width - zoneWidth
            ? "right"
            : "center";

        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          player.pauseVideo();
          showKeyboardIcon("❚❚");
          updatePlayPauseIcons("paused");
        } else {
          player.playVideo();
          showKeyboardIcon("▶");
          updatePlayPauseIcons("playing");
        }
      }, 250); // tunggu 250ms sebelum dianggap single click
    });

    overlay.addEventListener("dblclick", (e) => {
      e.preventDefault();
      // Batalkan timer klik tunggal agar tidak memicu play/pause
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      toggleFullscreen();
    });
  }

  // === Helper tampilkan ikon gesture ===
  function showIcon(icon) {
    icon.classList.add("show");
    setTimeout(() => icon.classList.remove("show"), 600);
  }
}

// Pastikan dijalankan setelah halaman siap
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initGestureOverlay, 1000); // beri waktu player load
});

/* =====================================================
   === Keyboard Controls (Space, Arrow, F) ===
===================================================== */

function initKeyboardControls() {
  // 💡 Skip di HP / tablet
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

  document.addEventListener("keydown", (e) => {
    if (keyboardCooldown) return; // ⛔ abaikan jika masih cooldown

    if (!player || typeof player.getPlayerState !== "function") return;
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    // mulai cooldown
    keyboardCooldown = true;
    setTimeout(() => (keyboardCooldown = false), keyboardCooldownDelay);

    switch (e.key.toLowerCase()) {
      case " ":
      case "spacebar":
        e.preventDefault();
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          player.pauseVideo();
          showKeyboardIcon("❚❚");
          updatePlayPauseIcons("paused");
        } else {
          player.playVideo();
          showKeyboardIcon("▶");
          updatePlayPauseIcons("playing");
        }
        break;

      case "arrowright":
        e.preventDefault();
        player.seekTo(player.getCurrentTime() + 10, true);
        showKeyboardIcon("⟳ +10s", "right");
        break;

      case "arrowleft":
        e.preventDefault();
        player.seekTo(Math.max(0, player.getCurrentTime() - 10), true);
        showKeyboardIcon("-10s ⟲", "left");
        break;

      case "f":
        e.preventDefault();
        toggleFullscreen();
        showKeyboardIcon("");
        break;

      // === Panah atas → volume naik 10% ===
      case "arrowup":
        e.preventDefault();
        if (
          typeof player.getVolume === "function" &&
          typeof player.setVolume === "function"
        ) {
          const volRange = document.getElementById("volumeRange");
          let vol = player.getVolume();
          let newVol = Math.min(100, vol + 5);
          player.setVolume(newVol);
          player.unMute();

          // update visual range bar
          if (volRange) {
            volRange.value = newVol;
            volRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${newVol}%, rgba(200,200,200,0.15) ${newVol}%)`;
          }

          // update ikon di kontrol bawah
          updateVolumeIcon(newVol);

          // overlay tengah layar
          showVolumeOverlay(newVol);

          // simpan volume terakhir
          lastVolume = newVol;
        }
        break;

      // === Panah bawah → volume turun 10% ===
      case "arrowdown":
        e.preventDefault();
        if (
          typeof player.getVolume === "function" &&
          typeof player.setVolume === "function"
        ) {
          const volRange = document.getElementById("volumeRange");
          let vol = player.getVolume();
          let newVol = Math.max(0, vol - 5);
          player.setVolume(newVol);

          if (newVol === 0) player.mute();
          else player.unMute();

          // update visual range bar
          if (volRange) {
            volRange.value = newVol;
            volRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${newVol}%, rgba(200,200,200,0.15) ${newVol}%)`;
          }

          // update ikon di kontrol bawah
          updateVolumeIcon(newVol);

          // overlay tengah layar
          showVolumeOverlay(newVol);

          // simpan volume terakhir
          lastVolume = newVol;
        }
        break;

      // 🔇 Tombol M → mute/unmute
      case "m":
        e.preventDefault();
        const volRange = document.getElementById("volumeRange");

        if (!player || !volRange) return;

        if (player.isMuted && player.isMuted()) {
          // === UNMUTE ===
          player.unMute();
          const restoredVol = lastVolume > 0 ? lastVolume : 50;
          player.setVolume(restoredVol);
          volRange.value = restoredVol;

          volRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${restoredVol}%, rgba(200,200,200,0.15) ${restoredVol}%)`;
          updateVolumeIcon(restoredVol);
          showVolumeOverlay(restoredVol);
        } else {
          // === MUTE ===
          lastVolume = player.getVolume ? player.getVolume() : volRange.value;
          player.mute();
          volRange.value = 0;

          volRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) 0%, rgba(200,200,200,0.15) 0%)`;
          updateVolumeIcon(0);
          showVolumeOverlay(0);
        }
        break;

      // === Tombol 0 → Kembali ke awal video ===
      case "0":
        e.preventDefault();
        if (player && typeof player.seekTo === "function") {
          player.seekTo(0, true);
          showKeyboardIcon("↺");
        }
        break;

      // === SHIFT + N → Video Berikutnya ===
      // === SHIFT + N → Video Berikutnya ===
      case "n":
        if (e.shiftKey) {
          e.preventDefault();

          const items = document.querySelectorAll(".playlist .item");
          if (!items.length) break;

          // hitung indeks berikutnya (loop ke awal jika sudah di akhir)
          currentIndex = (currentIndex + 1) % items.length;

          const nextItem = items[currentIndex];
          const nextVideoId = nextItem.getAttribute("data-video");

          // ganti video dan update UI
          loadVideo(nextVideoId, currentIndex);
          updateActiveItem(currentIndex);

          // paksa auto-play
          setTimeout(() => player?.playVideo?.(), 200);

          // tampilkan ikon "Next"
          const svgNext = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="90" height="90" fill="white" aria-hidden="true">
        <path d="M7 6v12l8.5-6L7 6zM16 6v12h2V6h-2z"/>
      </svg>
    `;
          showKeyboardIcon(svgNext, "center");
        }
        break;

      // === SHIFT + P → Video Sebelumnya / Replay ===
      case "p":
        if (e.shiftKey) {
          e.preventDefault();

          const items = document.querySelectorAll(".playlist .item");
          if (!items.length) break;

          // hitung indeks sebelumnya (loop ke akhir jika di awal)
          currentIndex = (currentIndex - 1 + items.length) % items.length;

          const prevItem = items[currentIndex];
          const prevVideoId = prevItem.getAttribute("data-video");

          // ganti video dan update UI
          loadVideo(prevVideoId, currentIndex);
          updateActiveItem(currentIndex);

          // paksa auto-play
          setTimeout(() => player?.playVideo?.(), 200);

          // tampilkan ikon "Replay" (mirror dari Next)
          const svgReplay = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 20" width="90" height="90" fill="white" aria-hidden="true">
        <path d="M17 6v12l-8.5-6L17 6zM6 6v12h2V6H6z"/>
      </svg>
    `;
          showKeyboardIcon(svgReplay, "center");
        }
        break;
    }
  });
}

/* ---------- Helper tampilkan animasi icon keyboard di posisi berbeda ---------- */
function showKeyboardIcon(content, position = "center") {
  const wrapper = document.querySelector(".video-wrapper");
  if (!wrapper) return;

  // hapus indicator lama kalau ada
  let indicator = wrapper.querySelector("#keyboardIndicator");
  if (indicator) indicator.remove();

  // buat elemen baru
  indicator = document.createElement("div");
  indicator.id = "keyboardIndicator";

  // set posisi (kelas css .left/.right/.center sudah ada)
  indicator.classList.add(position);

  // kalau string berisi tag HTML (mis. "<svg") -> pakai innerHTML
  // otherwise pakai textContent agar aman
  const looksLikeHTML = /<[^>]+>/.test(content);
  if (looksLikeHTML) {
    indicator.innerHTML = content;
  } else {
    indicator.textContent = content;
  }

  // styling dasar (jika perlu override)
  indicator.style.pointerEvents = "none";

  wrapper.appendChild(indicator);

  // trigger animasi (CSS sudah mendefinisikan .show)
  requestAnimationFrame(() => {
    indicator.classList.add("show");
  });

  // hapus setelah 700ms
  setTimeout(() => {
    if (indicator && indicator.parentNode) indicator.remove();
  }, 700);

  // posisi berdasarkan jenis simbol
  if (symbol === "⟳ +10s") {
    indicator.classList.add("right");
  } else if (symbol === "-10s ⟲") {
    indicator.classList.add("left");
  } else {
    indicator.classList.add("center");
  }

  // animasi muncul
  requestAnimationFrame(() => {
    indicator.classList.add("show");
  });

  // hapus setelah 700ms
  setTimeout(() => indicator.remove(), 700);
}

/* ---------- Overlay Volume Indicator (Desktop Only, Full White Clean) ---------- */
function showVolumeOverlay(volume) {
  // hanya tampil di desktop
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

  const wrapper = document.querySelector(".video-wrapper");
  if (!wrapper) return;

  // hapus overlay sebelumnya biar tidak numpuk
  let overlay = wrapper.querySelector("#volumeOverlay");
  if (overlay) overlay.remove();

  overlay = document.createElement("div");
  overlay.id = "volumeOverlay";
  overlay.className = "volume-overlay";

  // pilih ikon SVG putih sesuai level volume
  let iconSVG = "";
  if (volume === 0) {
    // 🔇 mute
    iconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(255, 255, 255, 0.9)" width="70" height="70">
        <path d="M4 9v6h4l5 5V4L8 9H4Z"/>
        <path d="M16.5 12a4.5 4.5 0 0 1-1.32 3.18l-1.42-1.42A2.5 2.5 0 0 0 14.5 12a2.5 2.5 0 0 0-.74-1.76l1.42-1.42A4.5 4.5 0 0 1 16.5 12Z"/>
        <path d="M19 12a7 7 0 0 1-2.05 4.95l-1.41-1.41A5 5 0 0 0 17 12a5 5 0 0 0-1.46-3.54l1.41-1.41A7 7 0 0 1 19 12Z"/>
        <path d="M21.71 20.29 3.71 2.29a1 1 0 0 0-1.42 1.42l18 18a1 1 0 0 0 1.42-1.42Z"/>
      </svg>
    `;
  } else if (volume < 50) {
    // 🔈 low volume
    iconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(255, 255, 255, 0.9)" width="70" height="70">
        <path d="M4 9v6h4l5 5V4L8 9H4Z"/>
        <path d="M14.5 12a2.5 2.5 0 0 0-.74-1.76l1.42-1.42A4.5 4.5 0 0 1 16.5 12a4.5 4.5 0 0 1-1.32 3.18l-1.42-1.42A2.5 2.5 0 0 0 14.5 12Z"/>
      </svg>
    `;
  } else {
    // 🔊 high volume
    iconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(255, 255, 255, 0.9)" width="70" height="70">
        <path d="M4 9v6h4l5 5V4L8 9H4Z"/>
        <path d="M14.5 12a2.5 2.5 0 0 0-.74-1.76l1.42-1.42A4.5 4.5 0 0 1 16.5 12a4.5 4.5 0 0 1-1.32 3.18l-1.42-1.42A2.5 2.5 0 0 0 14.5 12Z"/>
        <path d="M19 12a7 7 0 0 1-2.05 4.95l-1.41-1.41A5 5 0 0 0 17 12a5 5 0 0 0-1.46-3.54l1.41-1.41A7 7 0 0 1 19 12Z"/>
      </svg>
    `;
  }

  overlay.innerHTML = `
    <div class="volume-icon">${iconSVG}</div>
    <div class="volume-text">${volume}%</div>
  `;

  wrapper.appendChild(overlay);

  // animasi fade in/out
  requestAnimationFrame(() => overlay.classList.add("show"));
  setTimeout(() => overlay.remove(), 900);
}

/* ---------- Toggle fullscreen universal (fix iPhone Safari) ---------- */
function toggleFullscreen() {
  const container = document.querySelector(".player-container");
  const video = container?.querySelector("video");

  if (!container) return;

  // Deteksi Safari iPhone
  const isiPhone =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !window.MSStream &&
    typeof video?.webkitEnterFullscreen === "function";

  // Jika BELUM fullscreen
  const notFullscreen =
    !document.fullscreenElement &&
    !document.webkitFullscreenElement &&
    !document.mozFullScreenElement &&
    !document.msFullscreenElement;

  if (notFullscreen) {
    // ⚠️ Safari iPhone pakai fullscreen bawaan video
    if (isiPhone) {
      try {
        video.webkitEnterFullscreen();
      } catch (err) {
        console.warn("Safari fullscreen gagal:", err);
      }
    } else if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen(); // Safari desktop
    } else if (container.mozRequestFullScreen) {
      container.mozRequestFullScreen(); // Firefox lama
    } else if (container.msRequestFullscreen) {
      container.msRequestFullscreen(); // IE/Edge lama
    }
  } else {
    // Jika SUDAH fullscreen → keluar
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

// Jalankan setelah halaman siap
document.addEventListener("DOMContentLoaded", initKeyboardControls);

/* =====================================================
   === Sinkronisasi Semua Icon Play/Pause ===
===================================================== */
function updatePlayPauseIcons(state) {
  const playBtn = document.getElementById("btnPlayPause");
  const playerContainer = document.querySelector(".player-container");

  // update ikon pada tombol control
  if (state === "playing") {
    if (playBtn) playBtn.textContent = "❚❚";
    showCenterIcon("pause");
  } else if (state === "paused") {
    if (playBtn) playBtn.textContent = "▶";
    showCenterIcon("play");
  }
}

/* =====================================================
   === MODE HP: Overlay Play/Pause + Auto Hide ===
===================================================== */
function initMobileOverlayPlayPause() {
  let isDraggingProgress = false;
  const playerContainer = document.querySelector(".player-container");
  if (!playerContainer) return;

  // Hanya aktif di perangkat mobile
  if (window.innerWidth >= 768) return;

  // --- Buat overlay ---
  const overlay = document.createElement("div");
  overlay.className = "mobile-overlay";
  overlay.innerHTML = `
    <div class="overlay-gesture"></div>
    <div class="overlay-center">
      <button class="overlay-btn prev-btn" title="Previous">
        <svg viewBox="0 0 24 24"><path d="M6 12L18 4v16L6 12zM4 4h2v16H4V4z"/></svg>
      </button>
      <button class="overlay-btn playpause-btn" title="Play / Pause">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="overlay-btn next-btn" title="Next">
        <svg viewBox="0 0 24 24"><path d="M18 12L6 4v16l12-8zM18 4h2v16h-2V4z"/></svg>
      </button>
    </div>

    <div class="overlay-bottom">
      <div class="overlay-time">00:00 / 00:00</div>
      <button class="overlay-fs" title="Fullscreen">
        <svg width="800px" height="800px" viewBox="0 0 16 16" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M10 15H15V10H13.2V13.2H10V15ZM6 15V13.2H2.8V10H1V15H6ZM10 2.8H12.375H13.2V6H15V1H10V2.8ZM6 1V2.8H2.8V6H1V1H6Z" fill="rgba(255, 255, 255, 0.8)"/>
        </svg>
      </button>
    </div>
  `;
  overlay.innerHTML += `
  <div class="mobile-progress-wrapper">
    <div class="mobile-progress-bg"></div>
    <div class="mobile-progress-fill"></div>
    <div class="mobile-progress-dot"></div>
    <div class="mobile-progress-time">00:00</div>
  </div>
  `;
  playerContainer.appendChild(overlay);

  /// === MINI PROGRESS BAR (AKTIF SAAT OVERLAY HIDDEN) ===
  const miniProgress = document.createElement("div");
  miniProgress.className = "mobile-mini-progress";
  miniProgress.innerHTML = `
  <div class="mini-progress-bg"></div>
  <div class="mini-progress-fill"></div>
  <div class="mini-progress-dot"></div>
  <div class="mini-progress-time">00:00 / 00:00</div>
`;
  playerContainer.appendChild(miniProgress);

  // --- Ambil elemen penting ---
  const btnPlay = overlay.querySelector(".playpause-btn");
  const btnPrev = overlay.querySelector(".prev-btn");
  const btnNext = overlay.querySelector(".next-btn");
  const timeDisplay = overlay.querySelector(".overlay-time");
  const fsBtn = overlay.querySelector(".overlay-fs");

  let overlayVisible = true;
  let hideTimeout;

  // === Overlay show/hide ===
  overlay.addEventListener("click", () => {
    if (isDraggingProgress) return; // ❌ cegah toggle saat drag
    overlayVisible = !overlayVisible;
    overlay.classList.toggle("show", overlayVisible);
    if (overlayVisible) autoHideOverlay();
  });

  function autoHideOverlay() {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      if (!isDraggingProgress) {
        overlay.classList.remove("show");
      }
    }, 2000);
  }

  // === Tombol Play / Pause ===
  btnPlay.addEventListener("click", (e) => {
    e.stopPropagation();
    const state = player?.getPlayerState?.();
    if (state === 1) player.pauseVideo();
    else player.playVideo();
    autoHideOverlay();
  });

  // === Tombol Previous / Next ===
  btnPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    goToPrevVideo();
    autoHideOverlay();
  });
  btnNext.addEventListener("click", (e) => {
    e.stopPropagation();
    goToNextVideo();
    autoHideOverlay();
  });

  // === Tombol Fullscreen + Auto Rotate ===
  fsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      playerContainer.requestFullscreen();
      if (screen.orientation && screen.orientation.lock)
        screen.orientation.lock("landscape").catch(() => {});
    } else {
      document.exitFullscreen();
      if (screen.orientation && screen.orientation.unlock)
        screen.orientation.unlock();
    }
    autoHideOverlay();
  });

  // === Update icon Play / Pause sesuai status ===
  function updatePlayIcon() {
    const state = player?.getPlayerState?.();
    const svg = btnPlay.querySelector("svg");
    if (!svg) return;
    if (state === 1) {
      // sedang main → tampil icon pause
      svg.innerHTML = `<path d="M6 19h4V5H6zm8-14v14h4V5h-4z"/>`;
    } else {
      // sedang pause / buffering / stopped → tampil icon play
      svg.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    }
  }

  // === Mini Progress Sync + Dragging ===
  const miniBg = miniProgress.querySelector(".mini-progress-bg");
  const miniFill = miniProgress.querySelector(".mini-progress-fill");
  const miniDot = miniProgress.querySelector(".mini-progress-dot");
  const miniTime = miniProgress.querySelector(".mini-progress-time");

  let isMiniDragging = false;
  let miniStartX = 0;
  let miniStartTime = 0;
  let miniDragTargetTime = 0;

  // update otomatis saat tidak dragging
  setInterval(() => {
    if (!player || isDragging || isMiniDragging) return;
    const dur = player.getDuration?.() || 0;
    const cur = player.getCurrentTime?.() || 0;
    if (!dur) return;
    const pct = (cur / dur) * 100;
    miniFill.style.width = `${pct}%`;
    miniDot.style.left = `calc(${pct}% - 6px)`;
  }, 300);

  // === MINI PROGRESS DRAGGING (TANPA BUKA OVERLAY) ===
  miniBg.addEventListener(
    "touchstart",
    (e) => {
      if (!player) return;
      e.preventDefault();
      document.body.style.overflow = "hidden";

      isMiniDragging = true;
      miniProgress.classList.add("dragging");

      // Tampilkan dot & waktu
      miniDot.style.opacity = 1;
      miniTime.style.opacity = 1;
      miniFill.style.background = "#ff2e76"; // ubah jadi pink saat drag

      // Stop auto-hide overlay sementara (kalau overlay sedang aktif)
      clearTimeout(hideTimeout);

      miniStartX = e.touches[0].clientX;
      miniStartTime = player.getCurrentTime?.() || 0;
    },
    { passive: false }
  );

  miniBg.addEventListener(
    "touchmove",
    (e) => {
      if (!isMiniDragging || !player) return;
      e.preventDefault();

      const dur = player.getDuration?.() || 0;
      if (!dur) return;

      const rect = miniBg.getBoundingClientRect();
      const moveX = e.touches[0].clientX - miniStartX;
      const percentDelta = moveX / rect.width;
      miniDragTargetTime = Math.max(
        0,
        Math.min(dur, miniStartTime + percentDelta * dur)
      );

      const pct = (miniDragTargetTime / dur) * 100;
      miniFill.style.width = `${pct}%`;
      miniDot.style.left = `calc(${pct}% - 6px)`;
      miniTime.textContent = `${formatTime(miniDragTargetTime)} / ${formatTime(
        dur
      )}`;
    },
    { passive: false }
  );

  miniBg.addEventListener(
    "touchend",
    (e) => {
      if (!player) return;
      e.preventDefault();
      document.body.style.overflow = "";

      isMiniDragging = false;
      miniProgress.classList.remove("dragging");

      // Seek video ke posisi baru
      player.seekTo(miniDragTargetTime, true);

      // Reset tampilan mini progress
      setTimeout(() => {
        miniDot.style.opacity = 0;
        miniTime.style.opacity = 0;
        miniFill.style.background = "rgba(255,255,255,0.8)";
      }, 300);

      // Pastikan overlay tidak terbuka
      overlay.classList.remove("show");

      // Jalankan auto-hide setelah 2 detik jika overlay sebelumnya aktif
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        overlay.classList.remove("show");
      }, 2000);
    },
    { passive: false }
  );

  // === Update waktu tiap detik ===
  setInterval(() => {
    if (!player || typeof player.getDuration !== "function") return;
    const cur = player.getCurrentTime();
    const dur = player.getDuration();
    timeDisplay.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
    updatePlayIcon();
  }, 500);

  function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return h > 0
      ? `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // === PROGRESS BAR MOBILE (FULL FIX - DRAG WORKS) ===
  const progressWrapper = overlay.querySelector(".mobile-progress-wrapper");
  const bg = overlay.querySelector(".mobile-progress-bg");
  const fill = overlay.querySelector(".mobile-progress-fill");
  const dot = overlay.querySelector(".mobile-progress-dot");
  const timeLabel = overlay.querySelector(".mobile-progress-time");

  let isDragging = false;
  let dragTargetTime = 0;
  let startClientX = 0;
  let startTime = 0;

  // Update progress bar setiap 300ms saat tidak dragging
  setInterval(() => {
    if (!player || isDragging) return;
    const dur = player.getDuration?.() || 0;
    const cur = player.getCurrentTime?.() || 0;
    if (!dur) return;
    const pct = (cur / dur) * 100;
    fill.style.width = `${pct}%`;
    dot.style.left = `calc(${pct}% - 6px)`;
    // Sinkron ke mini progress bar
    const miniFill = miniProgress.querySelector(".mini-progress-fill");
    if (miniFill) miniFill.style.width = `${pct}%`;
  }, 300);

  // === Touch Start ===
  bg.addEventListener(
    "touchstart",
    (e) => {
      if (!player) return;
      e.preventDefault();
      document.body.style.overflow = "hidden"; // stop scroll

      clearTimeout(hideTimeout);
      overlay.classList.add("show"); // paksa overlay tetap tampil
      isDragging = true;
      isDraggingProgress = true; // 🔒 overlay tidak boleh auto-hide

      progressWrapper.classList.add("dragging");
      dot.style.opacity = 1;
      timeLabel.style.opacity = 1;

      startClientX = e.touches[0].clientX;
      startTime = player.getCurrentTime?.() || 0;
    },
    { passive: false }
  );

  // === Touch Move ===
  bg.addEventListener(
    "touchmove",
    (e) => {
      if (!isDragging || !player) return;
      e.preventDefault();

      const dur = player.getDuration?.() || 0;
      if (!dur) return;

      const rect = bg.getBoundingClientRect();
      const moveX = e.touches[0].clientX - startClientX;
      const percentDelta = moveX / rect.width;
      dragTargetTime = Math.max(
        0,
        Math.min(dur, startTime + percentDelta * dur)
      );

      const pct = (dragTargetTime / dur) * 100;
      fill.style.width = `${pct}%`;
      dot.style.left = `calc(${pct}% - 6px)`;
      timeLabel.textContent = `${formatTime(dragTargetTime)} / ${formatTime(
        dur
      )}`;
    },
    { passive: false }
  );

  // === Touch End ===
  bg.addEventListener(
    "touchend",
    (e) => {
      if (!player) return;
      e.preventDefault();
      document.body.style.overflow = "";

      isDragging = false;
      isDraggingProgress = false; // 🔓 izinkan auto-hide lagi
      progressWrapper.classList.remove("dragging");

      player.seekTo(dragTargetTime, true);

      setTimeout(() => {
        dot.style.opacity = 0;
        timeLabel.style.opacity = 0;
      }, 300);

      // Jalankan auto-hide 2 detik setelah drag selesai
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (!isDraggingProgress) {
          overlay.classList.remove("show");
        }
      }, 2000);
    },
    { passive: false }
  );

  // make sure label default hidden
  timeLabel.style.opacity = 0;
  dot.style.opacity = 0;

  // === DOUBLE TAP (forward/rewind 10s) ===
  let lastTapLeft = 0;
  let lastTapRight = 0;

  overlay.addEventListener("click", (e) => {
    const now = Date.now();
    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const zone = x < rect.width / 2 ? "left" : "right";
    const isDoubleTap =
      (zone === "left" && now - lastTapLeft < 300) ||
      (zone === "right" && now - lastTapRight < 300);

    if (isDoubleTap) {
      e.stopPropagation(); // cegah toggle overlay
      const cur = player.getCurrentTime();
      if (zone === "left") {
        player.seekTo(Math.max(0, cur - 10), true);
        showDoubleTapIcon("left");
      } else {
        player.seekTo(Math.min(player.getDuration(), cur + 10), true);
        showDoubleTapIcon("right");
      }
    }

    if (zone === "left") lastTapLeft = now;
    if (zone === "right") lastTapRight = now;
  });

  // === Helper tampilkan ikon double tap (⟲ / ⟳) ===
  function showDoubleTapIcon(direction) {
    const icon = document.createElement("div");
    icon.className = `double-tap-icon ${direction}`;
    icon.innerHTML = direction === "left" ? "-10s ⟲" : "⟳ +10s";
    playerContainer.appendChild(icon);
    requestAnimationFrame(() => icon.classList.add("show"));
    setTimeout(() => icon.remove(), 600);
  }

  // === Tampilkan awal & auto-hide ===
  overlay.classList.add("show");
  autoHideOverlay();
}

function initMobileProgressBar() {
  // Deteksi jika bukan HP → jangan tampilkan
  if (!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

  const playerContainer = document.querySelector(".player-container");
  if (!playerContainer) return;

  // Buat elemen progress bar
  const progressWrapper = document.createElement("div");
  progressWrapper.className = "mobile-progress-wrapper";
  progressWrapper.innerHTML = `
    <div class="mobile-progress-bg"></div>
    <div class="mobile-progress-fill"></div>
    <div class="mobile-progress-dot"></div>
    <div class="mobile-progress-time">00:00</div>
  `;
  playerContainer.appendChild(progressWrapper);

  const bg = progressWrapper.querySelector(".mobile-progress-bg");
  const fill = progressWrapper.querySelector(".mobile-progress-fill");
  const dot = progressWrapper.querySelector(".mobile-progress-dot");
  const timeLabel = progressWrapper.querySelector(".mobile-progress-time");

  let isDragging = false;

  // === Update progress ===
  function updateProgress() {
    if (!player || typeof player.getDuration !== "function") return;
    const dur = player.getDuration();
    const cur = player.getCurrentTime();
    const percent = (cur / dur) * 100;
    fill.style.width = percent + "%";
    dot.style.left = `calc(${percent}% - 6px)`; // posisi dot
    timeLabel.textContent = formatTime(cur);
  }

  // === Touch handling ===
  // === Touch Start ===
  bg.addEventListener(
    "touchstart",
    (e) => {
      if (!player) return;
      e.preventDefault();
      document.body.style.overflow = "hidden"; // cegah scroll halaman

      // 🔒 Hentikan auto-hide overlay selama drag
      clearTimeout(hideTimeout);
      overlay.classList.add("show"); // paksa overlay tetap tampil

      isDragging = true;
      progressWrapper.classList.add("dragging");
      dot.style.opacity = 1;
      timeLabel.style.opacity = 1;

      startClientX = e.touches[0].clientX;
      startTime = player.getCurrentTime?.() || 0;
    },
    { passive: false }
  );

  // === Touch Move ===
  bg.addEventListener(
    "touchmove",
    (e) => {
      if (!isDragging || !player) return;
      e.preventDefault();

      const dur = player.getDuration?.() || 0;
      if (!dur) return;

      const rect = bg.getBoundingClientRect();
      const moveX = e.touches[0].clientX - startClientX;
      const percentDelta = moveX / rect.width;
      dragTargetTime = Math.max(
        0,
        Math.min(dur, startTime + percentDelta * dur)
      );

      const pct = (dragTargetTime / dur) * 100;
      fill.style.width = `${pct}%`;
      dot.style.left = `calc(${pct}% - 6px)`;
      timeLabel.textContent = `${formatTime(dragTargetTime)} / ${formatTime(
        dur
      )}`;
    },
    { passive: false }
  );

  // === Touch End ===
  bg.addEventListener(
    "touchend",
    (e) => {
      if (!player) return;
      e.preventDefault();

      document.body.style.overflow = ""; // aktifkan scroll lagi
      isDragging = false;
      progressWrapper.classList.remove("dragging");

      player.seekTo(dragTargetTime, true);

      setTimeout(() => {
        dot.style.opacity = 0;
        timeLabel.style.opacity = 0;
      }, 300);

      // 🕒 Overlay auto-hide 2 detik setelah drag selesai
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        overlay.classList.remove("show");
      }, 2000);
    },
    { passive: false }
  );

  function updateTouch(touch) {
    const rect = bg.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
    const percent = x / rect.width;
    const dur = player.getDuration();
    const seekTime = dur * percent;

    // Update tampilan
    fill.style.width = `${percent * 100}%`;
    dot.style.left = `calc(${percent * 100}% - 6px)`;
    timeLabel.textContent = formatTime(seekTime);
    timeLabel.style.opacity = 1;

    // Waktu muncul tepat di atas dot
    const dotRect = dot.getBoundingClientRect();
    timeLabel.style.left = `${dotRect.left + dotRect.width / 2 - 20}px`;

    // Saat user lepas → seek
    if (!isDragging) {
      player.seekTo(seekTime, true);
    }
  }

  // === Interval update progress setiap 500ms ===
  setInterval(() => {
    if (!isDragging) updateProgress();
  }, 500);

  // Format waktu (mm:ss atau hh:mm:ss)
  function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return h > 0
      ? `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initMobileOverlayPlayPause, 1000);
});

// === Mouse-line Hover Indicator (Desktop Only) ===
const progressWrap = document.querySelector(".cust-progress-wrap");
const progressRange = document.getElementById("progressRange");
const mouseLine = document.querySelector(".cust-progress-wrap .mouse-line");

if (progressWrap && progressRange && mouseLine) {
  progressWrap.addEventListener("mousemove", (e) => {
    // hanya aktif di desktop
    if (window.innerWidth <= 900) return;

    const rect = progressRange.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));

    mouseLine.style.width = percent + "%";
    mouseLine.style.opacity = 1;
  });

  progressWrap.addEventListener("mouseleave", () => {
    // sembunyikan saat keluar area
    mouseLine.style.opacity = 0;
  });
}

/* ---------- Update Icon Volume (Desktop Only) ---------- */
function updateVolumeIcon(volume) {
  const volBtn = document.getElementById("btnVolume");
  if (!volBtn) return;

  // hanya tampil di desktop
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

  let iconSVG = "";

  if (volume === 0) {
    // mute
    iconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 8 16 8" 
           fill="rgba(255, 255, 255, 0.9)" width="30" height="30">
        <path d="M4 9v6h4l5 5V4L8 9H4Z"/>
        <path d="M16.5 12a4.5 4.5 0 0 1-1.32 3.18l-1.42-1.42
          A2.5 2.5 0 0 0 14.5 12a2.5 2.5 0 0 0-.74-1.76
          l1.42-1.42A4.5 4.5 0 0 1 16.5 12Z"/>
        <path d="M19 12a7 7 0 0 1-2.05 4.95
          l-1.41-1.41A5 5 0 0 0 17 12
          a5 5 0 0 0-1.46-3.54l1.41-1.41
          A7 7 0 0 1 19 12Z"/>
        <path d="M21.71 20.29 3.71 2.29
          a1 1 0 0 0-1.42 1.42l18 18
          a1 1 0 0 0 1.42-1.42Z"/>
      </svg>`;
  } else if (volume < 50) {
    // low
    iconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 8 16 8"
           fill="rgba(255, 255, 255, 0.9)" width="30" height="30">
        <path d="M4 9v6h4l5 5V4L8 9H4Z"/>
        <path d="M14.5 12a2.5 2.5 0 0 0-.74-1.76
          l1.42-1.42A4.5 4.5 0 0 1 16.5 12
          a4.5 4.5 0 0 1-1.32 3.18
          l-1.42-1.42A2.5 2.5 0 0 0 14.5 12Z"/>
      </svg>`;
  } else {
    // high
    iconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="4 8 16 8"
           fill="rgba(255, 255, 255, 0.9)" width="30" height="30">
        <path d="M4 9v6h4l5 5V4L8 9H4Z"/>
        <path d="M14.5 12a2.5 2.5 0 0 0-.74-1.76
          l1.42-1.42A4.5 4.5 0 0 1 16.5 12
          a4.5 4.5 0 0 1-1.32 3.18
          l-1.42-1.42A2.5 2.5 0 0 0 14.5 12Z"/>
        <path d="M19 12a7 7 0 0 1-2.05 4.95
          l-1.41-1.41A5 5 0 0 0 17 12
          a5 5 0 0 0-1.46-3.54l1.41-1.41
          A7 7 0 0 1 19 12Z"/>
      </svg>`;
  }

  volBtn.innerHTML = iconSVG;
}

function goToNextVideo() {
  const items = document.querySelectorAll(".playlist .item");
  if (!items.length) return;

  // kalau sudah di akhir, mulai dari awal lagi
  currentIndex = (currentIndex + 1) % items.length;

  const nextItem = items[currentIndex];
  const nextVideoId = nextItem.getAttribute("data-video");

  loadVideo(nextVideoId, currentIndex);
}

function goToPrevVideo() {
  const items = document.querySelectorAll(".playlist .item");
  if (!items.length) return;

  // kalau di awal, kembali ke video terakhir
  currentIndex = (currentIndex - 1 + items.length) % items.length;

  const prevItem = items[currentIndex];
  const prevVideoId = prevItem.getAttribute("data-video");

  loadVideo(prevVideoId, currentIndex);
}
