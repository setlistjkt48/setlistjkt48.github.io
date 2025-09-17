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

let firstPlay = true;

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
    const currentQuality = player.getPlaybackQuality();

    // ✅ Tetap buat tombol Auto (kapital)
    const autoBtn = document.createElement("button");
    autoBtn.textContent = "Auto";
    if (currentQuality === "default") autoBtn.classList.add("active");
    autoBtn.onclick = () => {
      player.setPlaybackQuality("default");
      updateQualityMenu();
      settingsMenu.classList.remove("active");
    };
    settingsMenu.appendChild(autoBtn);

    // ✅ Ambil quality dari API, tapi hilangkan 'auto' kecil
    const available = player
      .getAvailableQualityLevels()
      .filter((level) => level !== "auto");

    available.forEach((level) => {
      const btn = document.createElement("button");
      const label =
        Object.keys(QUALITY_MAP).find((k) => QUALITY_MAP[k] === level) || level;
      btn.textContent = label;

      if (currentQuality === level) {
        btn.classList.add("active");
      }

      btn.onclick = () => {
        player.setPlaybackQuality(level);
        updateQualityMenu();
        settingsMenu.classList.remove("active");
      };
      settingsMenu.appendChild(btn);
    });

    settingsMenu.classList.toggle("active");
  };

  function updateQualityMenu() {
    const buttons = settingsMenu.querySelectorAll("button");
    const current = player.getPlaybackQuality();
    buttons.forEach((b) => {
      b.classList.remove("active");
      if (
        b.textContent.toLowerCase() === current.toLowerCase() ||
        (current === "default" && b.textContent === "Auto")
      ) {
        b.classList.add("active");
      }
    });
  }

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
  }, 2000);
}

container.addEventListener("mousemove", showControls);
container.addEventListener("click", showControls);

document.addEventListener("fullscreenchange", () => {
  controls.classList.remove("hide");
  if (hideControlsTimer) clearTimeout(hideControlsTimer);
  showControls();
});

window.addEventListener("load", showControls);

const playerContainer = document.getElementById("player-container");

controls.addEventListener("dblclick", function (e) {
  e.preventDefault();
  e.stopImmediatePropagation();
});

playerContainer.addEventListener("dblclick", function (e) {
  if (!document.fullscreenElement) {
    playerContainer.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

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
    if (isMobile() && screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock("portrait");
      } catch (e) {
        console.warn("Orientation reset gagal:", e);
      }
    }
  }
});

// === Overlay Controls khusus HP ===
const overlayControls = document.getElementById("overlay-controls");
const overlayPlay = document.getElementById("overlay-play");
const overlayRewind = document.getElementById("overlay-rewind");
const overlayForward = document.getElementById("overlay-forward");

let overlayTimer;

if (isMobile()) {
  playerContainer.addEventListener("touchend", () => {
    if (overlayControls.classList.contains("show")) {
      overlayControls.classList.remove("show"); // langsung hide
      clearTimeout(overlayTimer);
    } else {
      overlayControls.classList.add("show"); // tampil
      clearTimeout(overlayTimer);
      overlayTimer = setTimeout(() => {
        overlayControls.classList.remove("show");
      }, 2000);
    }
  });

  overlayPlay.onclick = (e) => {
    e.stopPropagation();
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      overlayPlay.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    } else {
      player.playVideo();
      overlayPlay.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    }
  };

  overlayRewind.onclick = (e) => {
    e.stopPropagation();
    player.seekTo(player.getCurrentTime() - 10, true);
  };

  overlayForward.onclick = (e) => {
    e.stopPropagation();
    player.seekTo(player.getCurrentTime() + 10, true);
  };
}

// === Double Tap Gesture khusus HP ===
if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
  let lastTap = 0;

  playerContainer.addEventListener("touchstart", function (e) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < 300 && tapLength > 0) {
      const touchX = e.touches[0].clientX;
      const screenW = window.innerWidth;

      if (touchX < screenW / 3) {
        player.seekTo(player.getCurrentTime() - 10, true);
      } else if (touchX > (2 * screenW) / 3) {
        player.seekTo(player.getCurrentTime() + 10, true);
      }
      e.preventDefault();
    }

    lastTap = currentTime;
  });
}

let isDragging = false;

function updateSeekPosition(e) {
  const rect = progressWrap.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  let pct = (clientX - rect.left) / rect.width;
  pct = Math.min(Math.max(pct, 0), 1);

  // update UI saat drag
  played.style.width = pct * 100 + "%";
  thumb.style.left = pct * 100 + "%";
  timeEl.textContent =
    formatTime(pct * player.getDuration()) +
    " / " +
    formatTime(player.getDuration());

  return pct;
}

// Mouse events
progressWrap.addEventListener("mousedown", (e) => {
  isDragging = true;
  cancelAnimationFrame(raf); // stop auto update
  updateSeekPosition(e);
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) updateSeekPosition(e);
});

document.addEventListener("mouseup", (e) => {
  if (isDragging) {
    const pct = updateSeekPosition(e);
    player.seekTo(player.getDuration() * pct, true);
    isDragging = false;
    update(); // resume auto update
  }
});

// Touch events
progressWrap.addEventListener("touchstart", (e) => {
  isDragging = true;
  cancelAnimationFrame(raf);
  updateSeekPosition(e);
});

document.addEventListener("touchmove", (e) => {
  if (isDragging) updateSeekPosition(e);
});

document.addEventListener("touchend", (e) => {
  if (isDragging) {
    const pct = updateSeekPosition(e);
    player.seekTo(player.getDuration() * pct, true);
    isDragging = false;
    update(); // resume auto update
  }
});
