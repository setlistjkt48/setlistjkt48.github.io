let player;
let currentIndex = 0;
let expanded = false;
let lastVolume = 100;

// === YouTube Player Setup ===
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "100%",
    width: "100%",
    videoId: "QhSfakzeDuI",
    playerVars: {
      autoplay: 0,
      controls: 0, // gunakan kontrol custom kita
      rel: 0,
      modestbranding: 1,
      fs: 0,
      disablekb: 1,
      iv_load_policy: 3,
      showinfo: 0,
      playsinline: 1,
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

  // otomatis expand line-up di desktop
  expanded = window.innerWidth >= 900;
  updateVisibleMembers();
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) playNextVideo();
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
      playBtn.textContent = "▶";
    } else {
      player.playVideo();
      playBtn.textContent = "⏸";
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
      volBtn.textContent = "🔇";
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
      volBtn.textContent = "🔇";
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
