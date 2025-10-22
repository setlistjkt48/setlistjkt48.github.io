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
      origin: "https://setlistjkt48.github.io",
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
  const previewImg = document.getElementById("progressPreviewImg");
  const previewTime = document.getElementById("progressPreviewTime");
  const volBtn = document.getElementById("btnVolume");
  const volRange = document.getElementById("volumeRange");
  const fsBtn = document.getElementById("btnFullscreen");

  // Thumbnail preview
  function setPreviewThumbnail() {
    const vid = player.getVideoData().video_id;
    if (vid) previewImg.src = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
  }
  setPreviewThumbnail();

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

  // Seek / Preview
  progressRange.addEventListener("input", () => {
    const pct = Number(progressRange.value);
    const newTime = (pct / 100) * player.getDuration();
    previewTime.textContent = formatClock(newTime);
    positionPreview(pct);
    preview.style.display = "flex";
  });
  progressRange.addEventListener("change", () => {
    const pct = Number(progressRange.value);
    player.seekTo((pct / 100) * player.getDuration(), true);
    preview.style.display = "none";
  });
  progressRange.addEventListener(
    "mouseleave",
    () => (preview.style.display = "none")
  );

  function positionPreview(pct) {
    const wrap = document.querySelector(".cust-progress-wrap");
    const wrapRect = wrap.getBoundingClientRect();
    const x = (Math.max(0, Math.min(100, pct)) / 100) * wrapRect.width;
    preview.style.left = `${x}px`;
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

      // === Single tap di area mana pun → Play/Pause ===
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
      }, 250);
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

/* ---------- Toggle fullscreen universal ---------- */
function toggleFullscreen() {
  const container = document.querySelector(".player-container");
  if (!container) return;

  // Jika BELUM fullscreen
  if (
    !document.fullscreenElement &&
    !document.webkitFullscreenElement &&
    !document.mozFullScreenElement &&
    !document.msFullscreenElement
  ) {
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen(); // Safari
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
