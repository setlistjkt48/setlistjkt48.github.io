let player;
let currentIndex = 0;
let expanded = false;
let lastVolume = 100;
let keyboardCooldown = false;
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

  // === Default line-up ===
  // Jika di desktop (layar >= 900px) => tampil
  // Jika di HP/tablet => tertutup
  if (window.innerWidth >= 900) {
    expanded = true;
  } else {
    expanded = false;
  }
  updateVisibleMembers();
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) playNextVideo();
  if (event.data === YT.PlayerState.PLAYING) updatePlayPauseIcons("playing");
  if (event.data === YT.PlayerState.PAUSED) updatePlayPauseIcons("paused");
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

  // Progress update loop
  setInterval(() => {
    if (!player || typeof player.getDuration !== "function") return;
    const total = player.getDuration() || 0;
    const current = player.getCurrentTime() || 0;
    if (total > 0) {
      const pct = (current / total) * 100;
      progressRange.value = pct;
      progressRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${pct}%, rgba(200,200,200,0.15) ${pct}%)`;
      timeDisplay.textContent = `${formatClock(current)} / ${formatClock(
        total
      )}`;
    }
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

  // --- (di dalam initCustomControls, setelah mengambil elemen progressRange & previewTime) ---
  const bufferBar = document.querySelector(".cust-progress-wrap .buffer-bar");
  const mouseLine = document.querySelector(".cust-progress-wrap .mouse-line");

  // make sure buffer fill exists (create once)
  let bufferFill = bufferBar.querySelector(".buffer-fill");
  if (!bufferFill) {
    bufferFill = document.createElement("div");
    bufferFill.className = "buffer-fill";
    bufferBar.appendChild(bufferFill);
  }

  // rAF flag untuk mousemove / buffer updates
  let rafPending = false;
  let lastMousePct = 0;

  // update buffer (YouTube) regularly but lightweight
  function updateBuffer() {
    if (!player || typeof player.getVideoLoadedFraction !== "function") return;
    const frac = player.getVideoLoadedFraction
      ? player.getVideoLoadedFraction()
      : 0;
    const pct = Math.max(0, Math.min(1, frac)) * 100;
    // set width smoothly
    bufferFill.style.width = pct + "%";
  }

  // small interval to update buffer — lightweight
  setInterval(updateBuffer, 250); // cukup 0.25s

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

  // --- Hover / Mouse move (desktop) ---
  progressRange.addEventListener("mousemove", (e) => {
    // only desktop behavior (touch handled separately)
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
    lastMousePct = Math.max(0, Math.min(100, pctFromClientX(e.clientX)));
    preview.style.display = "flex";
    // schedule rAF update
    schedulePreviewUpdate();
  });

  // show preview on mouseenter
  progressRange.addEventListener("mouseenter", () => {
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
    preview.style.display = "flex";
    mouseLine.style.opacity = 1;
  });

  // hide preview & mouse line on leave (if not dragging)
  progressRange.addEventListener("mouseleave", () => {
    if (!isDragging) {
      preview.style.display = "none";
      mouseLine.style.opacity = 0;
    }
  });

  // Keep existing periodic progress updater (which you already had) - it will keep progressRange.value in sync.
  // We only added buffer updates + hover improvements.

  // === Smooth instant seek & drag (Desktop only) ===
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) === false) {
    const progressWrap = document.querySelector(".cust-progress-wrap");

    let isDragging = false;

    // Saat klik di progress bar — langsung loncat
    progressWrap.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isDragging = true;
      handleSeek(e); // langsung loncat ke posisi mouse
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      handleSeek(e); // dot langsung mengikuti mouse
    });

    document.addEventListener("mouseup", (e) => {
      if (!isDragging) return;
      isDragging = false;
      handleSeek(e); // pastikan posisi akhir
    });

    function handleSeek(e) {
      const rect = progressWrap.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(0, Math.min(100, pct));

      // Update tampilan progress
      progressRange.value = clamped;
      progressRange.style.background = `linear-gradient(90deg, rgba(236,72,153,0.95) ${clamped}%, rgba(200,200,200,0.15) ${clamped}%)`;

      // Update waktu dan posisi preview
      const duration = player.getDuration ? player.getDuration() : 0;
      const seekTime = (clamped / 100) * duration;
      previewTime.textContent = formatClock(seekTime);
      preview.style.left = `${clamped}%`;
      preview.style.display = "flex";

      // Langsung loncat ke posisi
      if (player && typeof player.seekTo === "function") {
        player.seekTo(seekTime, true);
      }
    }
  }

  // === Full-frame click toggle Play/Pause (Desktop only) ===
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) === false) {
    const playerContainer = document.querySelector(".player-container");

    playerContainer.addEventListener("click", (e) => {
      // abaikan klik jika terjadi di control bar atau progress bar
      const isInControlArea =
        e.target.closest(".cust-control") ||
        e.target.closest(".cust-progress-wrap");

      if (isInControlArea) return; // jangan play/pause di area itu

      // toggle play / pause
      if (!player) return;
      const st = player.getPlayerState();
      if (st === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        updatePlayPauseIcons("paused");
      } else {
        player.playVideo();
        updatePlayPauseIcons("playing");
      }
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
    tapTimer = setTimeout(() => {
      container.classList.add("mobile-showing");
      setTimeout(() => {
        container.classList.remove("mobile-showing");
      }, 3000); // tampil selama 3 detik
    }, 180);
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
    zoneLeft.style.pointerEvents = "none";
    zoneRight.style.pointerEvents = "none";

    // Klik tengah = play/pause
    zoneCenter.addEventListener("click", () => {
      if (singleTapTimer) clearTimeout(singleTapTimer);
      singleTapTimer = setTimeout(() => {
        const state = player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          player.pauseVideo();
          updatePlayPauseIcons("paused");
        } else {
          player.playVideo();
          updatePlayPauseIcons("playing");
        }
        showIcon(iconPlayPause);
      }, 200);
    });

    // Double click = fullscreen toggle
    overlay.addEventListener("dblclick", (e) => {
      e.preventDefault();
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
  const gestureIcon = document.querySelector(".gesture-icon.playpause");

  if (state === "playing") {
    if (playBtn) playBtn.textContent = "❚❚";
    if (gestureIcon) gestureIcon.textContent = "❚❚";
  } else if (state === "paused") {
    if (playBtn) playBtn.textContent = "▶";
    if (gestureIcon) gestureIcon.textContent = "▶";
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

/* =====================================================
   === AUTO HIDE Custom Controls & Progress Bar ===
===================================================== */
function initAutoHideControls() {
  const container = document.querySelector(".player-container");
  const controls = container.querySelector(".cust-controls");
  const progressWrap = container.querySelector(".cust-progress-wrap");
  if (!container || !controls || !progressWrap) return;

  let hideTimer = null;
  let isHidden = false;

  function showControls() {
    if (isHidden) {
      controls.classList.add("show");
      progressWrap.classList.add("show");
      controls.classList.remove("hidden");
      progressWrap.classList.remove("hidden");
      isHidden = false;
    }
    if (hideTimer) clearTimeout(hideTimer);
    // sembunyikan lagi setelah 2 detik jika video sedang play
    hideTimer = setTimeout(() => {
      const st = player.getPlayerState();
      if (st === YT.PlayerState.PLAYING) hideControls();
    }, 3000);
  }

  function hideControls() {
    controls.classList.remove("show");
    progressWrap.classList.remove("show");
    controls.classList.add("hidden");
    progressWrap.classList.add("hidden");
    isHidden = true;
  }

  // tampilkan kembali saat interaksi
  ["mousemove", "click", "touchstart"].forEach((evt) => {
    document.addEventListener(evt, showControls);
  });

  // tetap tampil kalau video paused
  const observer = setInterval(() => {
    if (!player || typeof player.getPlayerState !== "function") return;
    const st = player.getPlayerState();
    if (st === YT.PlayerState.PAUSED) {
      showControls();
      if (hideTimer) clearTimeout(hideTimer);
    }
  }, 500);

  // awalnya tampil
  showControls();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initMobileOverlayPlayPause(); // overlay play/pause
    initAutoHideControls(); // auto-hide custom controls
  }, 1000);
});
