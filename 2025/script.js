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
function loadVideo(videoId, index = 0) {
  currentIndex = index;
  if (player && typeof player.loadVideoById === "function") {
    player.loadVideoById(videoId);
    loadLineup(index);
    updateActiveItem(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    // jika player belum siap
    const wait = setInterval(() => {
      if (player && typeof player.loadVideoById === "function") {
        clearInterval(wait);
        player.loadVideoById(videoId);
        loadLineup(index);
        updateActiveItem(index);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 500);
  }
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

function updateVisibleMembers() {
  const cards = [...grid.children];
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

  // Volume logic (fix restore volume)
  volRange.addEventListener("input", () => {
    const v = Number(volRange.value);
    player.setVolume(v);
    if (v === 0) {
      player.mute();
      volBtn.textContent = "🔈";
    } else {
      player.unMute();
      volBtn.textContent = "🔊";
      lastVolume = v;
    }
    volRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${v}%, rgba(200,200,200,0.15) ${v}%)`;
  });

  volBtn.addEventListener("click", () => {
    if (player.isMuted && player.isMuted()) {
      player.unMute();
      volBtn.textContent = "🔊";
      volRange.value = lastVolume;
      player.setVolume(lastVolume);
    } else {
      player.mute();
      volBtn.textContent = "🔈";
      lastVolume = volRange.value;
      volRange.value = 0;
    }
    const v = Number(volRange.value);
    volRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${v}%, rgba(200,200,200,0.15) ${v}%)`;
  });

  // Fullscreen
  fsBtn.addEventListener("click", () => {
    const container = document.querySelector(".player-container");
    if (!document.fullscreenElement) container.requestFullscreen();
    else document.exitFullscreen();
  });

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

  // === Perluas area drag progress di mode HP (posisi adaptif) ===
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const progressWrap = document.querySelector(".cust-progress-wrap");
    if (progressWrap) {
      // buat layer baru di BODY (tetap aktif)
      const touchLayer = document.createElement("div");
      touchLayer.style.position = "fixed";
      touchLayer.style.left = "0";
      touchLayer.style.width = "100%";
      touchLayer.style.zIndex = 9999;
      touchLayer.style.background = "transparent";
      touchLayer.style.touchAction = "none";
      touchLayer.style.pointerEvents = "auto";
      document.body.appendChild(touchLayer);

      // fungsi untuk memperbarui posisi touchLayer mengikuti progress bar
      function updateTouchLayerPosition() {
        const rect = progressWrap.getBoundingClientRect();
        touchLayer.style.left = `${rect.left}px`;
        touchLayer.style.width = `${rect.width}px`;
        touchLayer.style.top = `${rect.top - 30}px`; // 30px ke atas
        touchLayer.style.height = `${rect.height + 35}px`; // +30 atas, +5 bawah
      }

      // panggil pertama kali & setiap waktu tertentu
      updateTouchLayerPosition();
      const intervalId = setInterval(updateTouchLayerPosition, 250);

      // juga update saat rotasi / resize
      window.addEventListener("resize", updateTouchLayerPosition);
      window.addEventListener("orientationchange", updateTouchLayerPosition);

      // === blokir click default ke bawah ===
      ["mousedown", "click", "touchstart"].forEach((ev) => {
        touchLayer.addEventListener(ev, (e) => e.preventDefault(), true);
      });

      // === drag logika manual ===
      let isTouchDragging = false;
      let startX = 0;
      let startValue = 0;

      touchLayer.addEventListener("touchstart", (e) => {
        e.preventDefault();
        isTouchDragging = true;
        startX = e.touches[0].clientX;
        startValue = Number(progressRange.value);
      });

      touchLayer.addEventListener("touchmove", (e) => {
        if (!isTouchDragging) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - startX;
        const percentDelta = (dx / progressRange.offsetWidth) * 100;
        const newValue = Math.max(0, Math.min(100, startValue + percentDelta));
        progressRange.value = newValue;

        const newTime = (newValue / 100) * player.getDuration();
        previewTime.textContent = formatClock(newTime);
        positionPreview(newValue);
        preview.style.display = "flex";
      });

      touchLayer.addEventListener("touchend", (e) => {
        if (!isTouchDragging) return;
        e.preventDefault();
        isTouchDragging = false;
        const pct = Number(progressRange.value);
        player.seekTo((pct / 100) * player.getDuration(), true);
        preview.style.display = "none";
      });

      // bersihkan interval kalau video player dihapus
      window.addEventListener("beforeunload", () => clearInterval(intervalId));
    }
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

/* =====================================================
   === MODE HP: Auto-hide control + progress reposition ===
===================================================== */
function initMobileControlBehavior() {
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) return; // hanya aktif di HP

  const container = document.querySelector(".player-container");
  const controls = container.querySelector(".cust-controls");
  const progress = container.querySelector(".cust-progress-wrap");
  const overlay = container.querySelector(".gesture-overlay");

  if (!container || !controls || !progress || !overlay) return;

  // Ketika video mulai bermain → sembunyikan kontrol
  const onPlay = () => {
    container.classList.add("mobile-playing");
  };

  // Ketika video dijeda → tampilkan kontrol kembali
  const onPause = () => {
    container.classList.remove("mobile-playing");
  };

  // Hubungkan event player
  const waitPlayer = setInterval(() => {
    if (player && typeof player.addEventListener === "function") {
      clearInterval(waitPlayer);
      player.addEventListener("onStateChange", (event) => {
        if (event.data === YT.PlayerState.PLAYING) onPlay();
        if (event.data === YT.PlayerState.PAUSED) onPause();
      });
    }
  }, 300);

  // Tap layar = tampilkan sementara kontrol
  let tapTimer = null;
  overlay.addEventListener("click", () => {
    if (tapTimer) clearTimeout(tapTimer);

    // 1️⃣ Tambah class untuk animasi CSS
    container.classList.add("mobile-showing");

    // 2️⃣ Paksa tampilkan kontrol & progress wrap (agar langsung muncul)
    const controls = container.querySelector(".cust-controls");
    const progress = container.querySelector(".cust-progress-wrap");
    if (controls) controls.style.opacity = "1";
    if (progress) {
      progress.style.bottom = "40px";
      progress.style.opacity = "1";
    }

    // 3️⃣ Setelah 3 detik, sembunyikan lagi
    tapTimer = setTimeout(() => {
      container.classList.remove("mobile-showing");
      if (controls) controls.style.opacity = "";
      if (progress) progress.style.bottom = "";
    }, 3000);
  });
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
        showKeyboardIcon("⟳ +10s");
        break;

      case "arrowleft":
        e.preventDefault();
        player.seekTo(Math.max(0, player.getCurrentTime() - 10), true);
        showKeyboardIcon("-10s ⟲");
        break;

      case "f":
        e.preventDefault();
        toggleFullscreen();
        showKeyboardIcon("⛶");
        break;
    }
  });
}

/* ---------- Helper tampilkan animasi icon keyboard di posisi berbeda ---------- */
function showKeyboardIcon(symbol) {
  const wrapper = document.querySelector(".video-wrapper");
  if (!wrapper) return;

  // jika sudah ada indicator sebelumnya, hapus dulu biar bersih
  let indicator = wrapper.querySelector("#keyboardIndicator");
  if (indicator) indicator.remove();

  // buat ulang elemen indicator
  indicator = document.createElement("div");
  indicator.id = "keyboardIndicator";
  indicator.textContent = symbol;
  wrapper.appendChild(indicator);

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
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) return;

  const container = document.querySelector(".player-container");
  const overlay = container.querySelector(".gesture-overlay");
  const playPauseBtn = container.querySelector(".overlay-playpause-btn");

  if (!container || !overlay || !playPauseBtn) return;

  // SVG icons (YouTube style)
  const playSVG = `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 15 L52 32 L20 49 Z" fill="currentColor"/>
    </svg>`;
  const pauseSVG = `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="14" width="8" height="36" rx="1" fill="currentColor"/>
      <rect x="38" y="14" width="8" height="36" rx="1" fill="currentColor"/>
    </svg>`;

  let overlayVisible = false;
  let hasStarted = false;
  let autoHideTimer = null;

  // === Helper untuk menampilkan overlay dengan auto-hide ===
  function showOverlayAutoHide() {
    playPauseBtn.classList.add("show");
    overlayVisible = true;

    if (autoHideTimer) clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(() => {
      // hanya auto-hide kalau video sedang PLAY
      if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        playPauseBtn.classList.remove("show");
        overlayVisible = false;
      }
    }, 2000); // 2 detik auto hide
  }

  // === Klik di layar ===
  overlay.addEventListener("click", (e) => {
    // 1️⃣ Tap pertama → play video
    if (!hasStarted) {
      player.playVideo();
      hasStarted = true;
      playPauseBtn.classList.remove("show");
      container.classList.add("mobile-playing");
      container.classList.remove("mobile-paused");
      playPauseBtn.innerHTML = pauseSVG;
      return;
    }

    // 2️⃣ Setelah mulai → toggle overlay
    if (overlayVisible) {
      playPauseBtn.classList.remove("show");
      overlayVisible = false;
      if (autoHideTimer) clearTimeout(autoHideTimer);
    } else {
      showOverlayAutoHide();
    }
  });

  // === Klik tombol overlay (Play/Pause) ===
  playPauseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      updatePlayPauseIcons("paused");
      playPauseBtn.innerHTML = playSVG;
      playPauseBtn.classList.add("show"); // tampilkan tetap saat pause
      if (autoHideTimer) clearTimeout(autoHideTimer);
    } else {
      player.playVideo();
      updatePlayPauseIcons("playing");
      playPauseBtn.innerHTML = pauseSVG;
      showOverlayAutoHide(); // mulai auto-hide lagi
    }
  });

  // === Pantau status player (sinkronisasi UI) ===
  const checkState = () => {
    if (!player || typeof player.getPlayerState !== "function") return;
    const st = player.getPlayerState();

    if (st === YT.PlayerState.PLAYING) {
      hasStarted = true;
      container.classList.add("mobile-playing");
      container.classList.remove("mobile-paused");
      playPauseBtn.innerHTML = pauseSVG;
    } else if (st === YT.PlayerState.PAUSED) {
      container.classList.remove("mobile-playing");
      container.classList.add("mobile-paused");
      playPauseBtn.innerHTML = playSVG;
      playPauseBtn.classList.add("show"); // tetap terlihat ketika pause
    }
  };

  setInterval(checkState, 500);
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initMobileOverlayPlayPause, 1000);
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initMobileOverlayPlayPause(); // overlay play/pause
  }, 1000);
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
