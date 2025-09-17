// Toggle deskripsi
document.querySelectorAll(".desc-btn").forEach((btn, i) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // supaya gak buka/tutup card
    const descBox = btn.closest("li").nextElementSibling;
    descBox.classList.toggle("hidden");
  });
});

const container = document.getElementById("player-container");
const controls = document.getElementById("controls");
const playBtn = document.getElementById("play");
const rewindBtn = document.getElementById("rewind");
const forwardBtn = document.getElementById("forward");
const progressWrap = document.getElementById("progress-wrap");
const played = document.getElementById("played");
const buffered = document.getElementById("buffered");
const thumb = document.getElementById("thumb");
const timeEl = document.getElementById("time");
const volumeBtn = document.getElementById("volume-btn");
const volumeIcon = document.getElementById("volume-icon");
const volumeSlider = document.getElementById("volume");
const settingsBtn = document.getElementById("settings-btn");
const settingsMenu = document.getElementById("settings-menu");
const fullscreenBtn = document.getElementById("fullscreen");
const preview = document.getElementById("preview");
const previewImg = document.getElementById("preview-img");
const previewTime = document.getElementById("preview-time");

const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(tag);

function onYouTubeIframeAPIReady() {
  player = new YT.Player("video", {
    videoId: videoId,
    playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0 },
    events: { onReady: onReady, onStateChange: onStateChange },
  });
}
function onReady() {
  function togglePlay() {
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      playBtn.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    } else {
      player.playVideo();
      playBtn.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    }
  }
  playBtn.onclick = togglePlay;
  if (!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
  container.onclick = (e) => {
    if (!e.target.closest(".controls")) togglePlay();
  };
}
  container.ondblclick = () => {
    if (!document.fullscreenElement) container.requestFullscreen();
    else document.exitFullscreen();
  };
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    }
    if (e.code === "ArrowRight") {
      e.preventDefault();
      player.seekTo(player.getCurrentTime() + 10, true);
    }
    if (e.code === "ArrowLeft") {
      e.preventDefault();
      player.seekTo(player.getCurrentTime() - 10, true);
    }
    if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      if (!document.fullscreenElement) {
        container.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  });

  rewindBtn.onclick = () => player.seekTo(player.getCurrentTime() - 10, true);
  forwardBtn.onclick = () => player.seekTo(player.getCurrentTime() + 10, true);

  function updateVolumeSlider() {
    const val = volumeSlider.value;
    volumeSlider.style.background = `linear-gradient(to right, #ec4899 ${val}%, #666 ${val}%)`;
  }

  volumeSlider.oninput = () => {
    player.setVolume(volumeSlider.value);
    updateVolumeSlider();
    if (volumeSlider.value == 0) {
      volumeIcon.src = "../../../assets/svg/volume-mute.svg";
    } else {
      volumeIcon.src = "../../../assets/svg/volume.svg";
    }
    lastVolume = volumeSlider.value;
  };

  volumeBtn.onclick = () => {
    if (player.isMuted() || volumeSlider.value == 0) {
      player.unMute();
      player.setVolume(lastVolume || 100);
      volumeSlider.value = lastVolume || 100;
      updateVolumeSlider();
      volumeIcon.src = "../../../assets/svg/volume.svg";
    } else {
      player.mute();
      volumeSlider.value = 0;
      updateVolumeSlider();
      volumeIcon.src = "../../../assets/svg/volume-mute.svg";
    }
  };

  const QUALITY_MAP = {
    "144p": "tiny",
    "240p": "small",
    "360p": "medium",
    "480p": "large",
    "720p": "hd720",
    "1080p": "hd1080",
    "1440p": "hd1440",
    "2160p": "hd2160", // 4K
  };

  settingsBtn.onclick = () => {
    settingsMenu.innerHTML = "";

    const available = player.getAvailableQualityLevels();
    const currentQuality = player.getPlaybackQuality();

    // Tombol Auto
    const autoBtn = document.createElement("button");
    autoBtn.textContent = "Auto";
    if (currentQuality === "default") autoBtn.classList.add("active");
    autoBtn.onclick = () => {
      player.setPlaybackQuality("default");
      settingsMenu.classList.remove("active");
    };
    settingsMenu.appendChild(autoBtn);

    // Loop kualitas yang tersedia
    available.forEach((level) => {
      const label = Object.keys(QUALITY_MAP).find(
        (key) => QUALITY_MAP[key] === level
      );
      if (label) {
        const btn = document.createElement("button");
        btn.textContent = label;

        // Tambahkan highlight aktif
        if (currentQuality === level) {
          btn.classList.add("active");
        }

        btn.onclick = () => {
          player.setPlaybackQuality(QUALITY_MAP[label]);
          settingsMenu.classList.remove("active");
        };
        settingsMenu.appendChild(btn);
      }
    });

    settingsMenu.classList.toggle("active");
  };

  fullscreenBtn.onclick = () => {
    if (!document.fullscreenElement) container.requestFullscreen();
    else document.exitFullscreen();
  };

  function update() {
    const dur = player.getDuration(),
      cur = player.getCurrentTime();
    if (dur) {
      played.style.width = (cur / dur) * 100 + "%";
      thumb.style.left = (cur / dur) * 100 + "%";
      timeEl.textContent = formatTime(cur) + " / " + formatTime(dur);
    }
    buffered.style.width = player.getVideoLoadedFraction() * 100 + "%";
    raf = requestAnimationFrame(update);
  }
  update();

  function seek(e) {
    const rect = progressWrap.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    player.seekTo(player.getDuration() * pct, true);
  }
  progressWrap.addEventListener("click", seek);

  progressWrap.addEventListener("mousemove", (e) => {
    const rect = progressWrap.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = player.getDuration() * pct;
    preview.style.display = "flex";
    preview.style.left = pct * 100 + "%";
    previewImg.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    previewTime.textContent = formatTime(t);
  });
  progressWrap.addEventListener("mouseleave", () => {
    preview.style.display = "none";
  });
}

function onStateChange(e) {
  if (e.data === YT.PlayerState.BUFFERING) spinner.style.display = "block";
  else spinner.style.display = "none";
}

function formatTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0")
  );
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// === Auto-hide controls (fullscreen & normal) ===
let hideControlsTimer;

function showControls() {
  controls.classList.remove("hide");
  if (hideControlsTimer) clearTimeout(hideControlsTimer);

  hideControlsTimer = setTimeout(() => {
    controls.classList.add("hide");
  }, 2000); // 2 detik
}

// Tampilkan controls saat ada interaksi
container.addEventListener("mousemove", showControls);
container.addEventListener("click", showControls);

// Saat masuk/keluar fullscreen tetap reset logika
document.addEventListener("fullscreenchange", () => {
  controls.classList.remove("hide");
  if (hideControlsTimer) clearTimeout(hideControlsTimer);
  showControls();
});

// Inisialisasi saat halaman load
window.addEventListener("load", showControls);

const playerContainer = document.getElementById("player-container");

// 🔹 Kalau double-click di controls, hentikan event biar tidak tembus
controls.addEventListener("dblclick", function (e) {
  e.preventDefault();
  e.stopImmediatePropagation(); // lebih kuat daripada stopPropagation
});

// 🔹 Double-click di video area → fullscreen toggle
playerContainer.addEventListener("dblclick", function (e) {
  if (!document.fullscreenElement) {
    playerContainer.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// Helper: cek apakah device HP
function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Saat masuk fullscreen, auto rotate di HP
document.addEventListener("fullscreenchange", async () => {
  if (document.fullscreenElement) {
    if (isMobile() && screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock("landscape");
      } catch (e) {
        console.warn("Orientation lock gagal:", e);
      }
    }
  } else {
    // Balik ke portrait saat keluar fullscreen
    if (isMobile() && screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock("portrait");
      } catch (e) {
        console.warn("Orientation reset gagal:", e);
      }
    }
  }
});

// === Double Tap Gesture khusus HP ===
if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
  const overlayRew = document.getElementById("overlay-rewind");
  const overlayPlay = document.getElementById("overlay-play");
  const overlayFwd = document.getElementById("overlay-forward");

  let lastTap = 0;

  playerContainer.addEventListener("touchstart", function (e) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < 300 && tapLength > 0) { // double tap
      const touchX = e.touches[0].clientX;
      const screenW = window.innerWidth;

      if (touchX < screenW / 3) {
        // ⏪ Double tap kiri
        player.seekTo(player.getCurrentTime() - 10, true);
        showOverlayIcon(overlayRew);
      } else if (touchX > (2 * screenW) / 3) {
        // ⏩ Double tap kanan
        player.seekTo(player.getCurrentTime() + 10, true);
        showOverlayIcon(overlayFwd);
      }
      e.preventDefault();
    } else {
      // Single tap tengah → toggle play/pause
      const touchX = e.touches[0].clientX;
      if (touchX >= screenW / 3 && touchX <= (2 * screenW) / 3) {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) {
          player.pauseVideo();
          overlayPlay.textContent = "▶️";
        } else {
          player.playVideo();
          overlayPlay.textContent = "⏯";
        }
        showOverlayIcon(overlayPlay);
      }
    }

    lastTap = currentTime;
  });
}

function showOverlayIcon(el) {
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 800);
}


