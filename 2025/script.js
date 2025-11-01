let player;
let currentIndex = 0;
let expanded = window.innerWidth >= 900; // ✅ default: desktop terbuka

function onYouTubeIframeAPIReady() {
  // Ambil item pertama di playlist (no. 1)
  const firstItem = document.querySelector(".playlist .item");
  const firstVideoId = firstItem ? firstItem.dataset.video : "QhSfakzeDuI";

  player = new YT.Player("player", {
    height: "100%",
    width: "100%",
    videoId: firstVideoId, // 🔹 otomatis ambil video pertama dari playlist web
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      fs: 1,
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
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) playNextVideo();
}

/* =====================================================
   === Ganti Video / Playlist ===
===================================================== */
// --- Perbaikan di fungsi loadVideo (tambahkan loadLineup)
function loadVideo(videoId, index) {
  currentIndex = index;
  player.loadVideoById(videoId);
  updateActiveItem(index);
  loadLineup(index);
  window.scrollTo({ top: 0, behavior: "smooth" });
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
   === Fullscreen Auto-Rotate (Mobile Only) ===
===================================================== */
function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

function lockLandscape() {
  if (isMobile() && screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function unlockOrientation() {
  if (isMobile() && screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  }
}

// 🔍 Pantau perubahan fullscreen
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    // masuk fullscreen
    lockLandscape();
  } else {
    // keluar fullscreen
    unlockOrientation();
  }
});

// Untuk dukungan Safari & iOS
document.addEventListener("webkitfullscreenchange", () => {
  if (document.webkitFullscreenElement) {
    lockLandscape();
  } else {
    unlockOrientation();
  }
});

/* =====================================================
   === Keyboard Shortcuts: Shift + N / Shift + P ===
===================================================== */
document.addEventListener("keydown", (e) => {
  // SHIFT + N → Next Video
  if (e.shiftKey && e.key.toLowerCase() === "n") {
    e.preventDefault();
    playNextVideo();
  }

  // SHIFT + P → Previous Video
  if (e.shiftKey && e.key.toLowerCase() === "p") {
    e.preventDefault();
    playPreviousVideo();
  }
});

/* =====================================================
   === Fungsi Previous Video (tambahan) ===
===================================================== */
function playPreviousVideo() {
  const items = document.querySelectorAll(".playlist .item");
  if (currentIndex > 0) {
    currentIndex--;
  } else {
    currentIndex = items.length - 1; // kalau sudah di awal, kembali ke video terakhir
  }
  const prevId = items[currentIndex].dataset.video;
  loadVideo(prevId, currentIndex);
}
