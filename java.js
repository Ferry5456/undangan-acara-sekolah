const getRequiredElement = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Elemen acara wajib tidak ditemukan: #${id}`);
  }
  return element;
};

const cover = getRequiredElement("undangan");
const eventSection = getRequiredElement("detail-acara");
const eventTitleElement = getRequiredElement("event-title");
const openButton = getRequiredElement("open-invitation");
const closeButton = getRequiredElement("close-invitation");
const backgroundAudio = getRequiredElement("background-audio");
const musicToggle = getRequiredElement("music-toggle");
const musicToggleLabel = getRequiredElement("music-toggle-label");
const musicTrackSelect = getRequiredElement("music-track-select");
const musicStatus = getRequiredElement("music-status");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const openedDirectlyFromFile = window.location.protocol === "file:";
let isTransitioning = false;
let scrollRevealInitialized = false;
let playbackRequestId = 0;

if (openedDirectlyFromFile) {
  musicStatus.textContent = "Jalankan halaman melalui Live Server agar musik dapat diputar.";
}

const updateMusicControl = () => {
  const isPlaying = !backgroundAudio.paused && !backgroundAudio.ended;
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicToggle.setAttribute("aria-label", isPlaying ? "Matikan musik latar" : "Putar musik latar");
  musicToggleLabel.textContent = isPlaying ? "Matikan Musik" : "Putar Musik";
};

const reportMusicError = (error) => {
  musicStatus.textContent = "Musik tidak dapat diputar. Periksa file atau format audio yang dipilih.";
  console.error("Gagal memutar musik latar.", error);
  updateMusicControl();
};

const startBackgroundMusic = () => {
  if (openedDirectlyFromFile) {
    musicStatus.textContent = "Jalankan halaman melalui Live Server agar musik dapat diputar.";
    return;
  }

  const requestId = ++playbackRequestId;
  musicStatus.textContent = "Memuat musik latar...";

  try {
    const playRequest = backgroundAudio.play();
    if (playRequest && typeof playRequest.then === "function") {
      playRequest.then(() => {
        if (requestId !== playbackRequestId || backgroundAudio.paused) {
          return;
        }
        musicStatus.textContent = "Musik latar sedang diputar.";
        updateMusicControl();
      }).catch((error) => {
        if (requestId === playbackRequestId && !backgroundAudio.paused) {
          reportMusicError(error);
        }
      });
    } else {
      musicStatus.textContent = "Musik latar sedang diputar.";
      updateMusicControl();
    }
  } catch (error) {
    reportMusicError(error);
  }
};

backgroundAudio.addEventListener("play", updateMusicControl);
backgroundAudio.addEventListener("pause", updateMusicControl);
backgroundAudio.addEventListener("playing", () => {
  musicStatus.textContent = "Musik latar sedang diputar.";
  updateMusicControl();
});
backgroundAudio.addEventListener("error", () => {
  reportMusicError(backgroundAudio.error || new Error("File audio tidak dapat dimuat."));
});

musicTrackSelect.addEventListener("change", () => {
  const wasPlaying = !backgroundAudio.paused && !backgroundAudio.ended;
  const selectedTrack = musicTrackSelect.options[musicTrackSelect.selectedIndex];

  playbackRequestId += 1;
  backgroundAudio.pause();
  backgroundAudio.src = musicTrackSelect.value;
  backgroundAudio.load();

  if (wasPlaying) {
    startBackgroundMusic();
  } else {
    musicStatus.textContent = `Lagu dipilih: ${selectedTrack.textContent}.`;
    updateMusicControl();
  }
});

musicToggle.addEventListener("click", () => {
  if (backgroundAudio.paused || backgroundAudio.ended) {
    startBackgroundMusic();
  } else {
    playbackRequestId += 1;
    backgroundAudio.pause();
    musicStatus.textContent = "Musik dimatikan.";
  }
});

const setupScrollReveal = () => {
  if (scrollRevealInitialized) {
    return;
  }

  const revealElements = eventSection.querySelectorAll("[data-scroll-reveal]");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    scrollRevealInitialized = true;
    return;
  }

  const revealObserver = new window.IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  revealElements.forEach((element) => revealObserver.observe(element));
  scrollRevealInitialized = true;
};

openButton.addEventListener("click", () => {
  if (isTransitioning) {
    return;
  }

  isTransitioning = true;
  openButton.disabled = true;
  startBackgroundMusic();
  cover.classList.add("cover--closing");

  const revealInvitation = () => {
    cover.hidden = true;
    cover.classList.remove("cover--closing");
    eventSection.hidden = false;
    setupScrollReveal();
    openButton.setAttribute("aria-expanded", "true");
    openButton.disabled = false;
    eventTitleElement.focus({ preventScroll: true });
    isTransitioning = false;

    if (!prefersReducedMotion) {
      eventSection.classList.add("event--opening");
      window.setTimeout(() => eventSection.classList.remove("event--opening"), 720);
    }
  };

  if (prefersReducedMotion) {
    revealInvitation();
  } else {
    window.setTimeout(revealInvitation, 520);
  }
});

closeButton.addEventListener("click", () => {
  if (isTransitioning) {
    return;
  }

  isTransitioning = true;
  closeButton.disabled = true;
  playbackRequestId += 1;
  backgroundAudio.pause();
  musicStatus.textContent = "Musik dimatikan.";
  eventSection.classList.add("event--closing");

  const showCover = () => {
    eventSection.hidden = true;
    eventSection.classList.remove("event--closing");
    cover.hidden = false;
    openButton.setAttribute("aria-expanded", "false");
    closeButton.disabled = false;
    openButton.focus({ preventScroll: true });
    isTransitioning = false;

    if (!prefersReducedMotion) {
      cover.classList.add("cover--opening");
      window.setTimeout(() => cover.classList.remove("cover--opening"), 680);
    }
  };

  if (prefersReducedMotion) {
    showCover();
  } else {
    window.setTimeout(showCover, 430);
  }
});

const startElement = getRequiredElement("event-start");
const endElement = getRequiredElement("event-end");
const startDate = new Date(startElement.dateTime);
const endDate = new Date(endElement.dateTime);
const countdownStatus = getRequiredElement("countdown-status");

if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
  countdownStatus.textContent = "Jadwal acara belum valid. Silakan periksa tanggal dan waktu acara.";
  throw new Error("Tanggal mulai dan selesai acara harus valid, dan waktu selesai harus setelah waktu mulai.");
}

const countdownElements = {
  days: getRequiredElement("countdown-days"),
  hours: getRequiredElement("countdown-hours"),
  minutes: getRequiredElement("countdown-minutes"),
  seconds: getRequiredElement("countdown-seconds"),
};

const calendarLink = getRequiredElement("calendar-link");
const eventTitle = eventTitleElement.textContent.trim();
const eventDescription = getRequiredElement("event-description").textContent.trim();
const eventLocation = getRequiredElement("event-location").textContent.trim();

const formatCalendarDate = (date) => date.toISOString()
  .replace(/[-:]/g, "")
  .replace(/\.\d{3}/, "");

const calendarUrl = new URL("https://calendar.google.com/calendar/render");
calendarUrl.searchParams.set("action", "TEMPLATE");
calendarUrl.searchParams.set("text", eventTitle);
calendarUrl.searchParams.set("dates", `${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}`);
calendarUrl.searchParams.set("details", eventDescription);
calendarUrl.searchParams.set("location", eventLocation);
calendarUrl.searchParams.set("ctz", "Asia/Jakarta");
calendarLink.href = calendarUrl.toString();

const guestbookStorageKey = "undangan-sekolah-guestbook-v1";
const rsvpForm = getRequiredElement("rsvp-form");
const guestNameInput = getRequiredElement("rsvp-name");
const attendanceInput = getRequiredElement("rsvp-attendance");
const guestCountInput = getRequiredElement("rsvp-guests");
const guestCountLabel = getRequiredElement("rsvp-guests-label");
const guestMessageInput = getRequiredElement("rsvp-message");
const rsvpStatus = getRequiredElement("rsvp-status");
const guestbookEmpty = getRequiredElement("guestbook-empty");
const guestbookList = getRequiredElement("guestbook-list");
let guestbookEntries = [];
let guestbookStorageAvailable = true;

const isValidGuestbookEntry = (entry) => {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return false;
  }

  const validAttendance = entry.attendance === "hadir" || entry.attendance === "tidak-hadir";
  const validGuests = entry.attendance === "hadir"
    ? Number.isInteger(entry.guests) && entry.guests >= 1
    : entry.guests === 0;

  return typeof entry.name === "string"
    && entry.name.trim().length > 0
    && entry.name.length <= 80
    && validAttendance
    && validGuests
    && typeof entry.message === "string"
    && entry.message.trim().length > 0
    && entry.message.length <= 500
    && typeof entry.submittedAt === "string"
    && !Number.isNaN(Date.parse(entry.submittedAt));
};

const setRsvpStatus = (message, state) => {
  rsvpStatus.textContent = message;
  rsvpStatus.dataset.state = state;
};

const renderGuestbook = () => {
  guestbookList.replaceChildren();
  guestbookList.hidden = guestbookEntries.length === 0;
  guestbookEmpty.hidden = guestbookEntries.length > 0;

  guestbookEntries.slice().reverse().forEach((entry) => {
    const item = document.createElement("li");
    item.className = "guestbook__item";

    const name = document.createElement("strong");
    name.className = "guestbook__name";
    name.textContent = entry.name;

    const metadata = document.createElement("p");
    metadata.className = "guestbook__metadata";
    const attendanceLabel = entry.attendance === "hadir"
      ? `Hadir · ${entry.guests} orang`
      : "Tidak dapat hadir";
    const submittedDate = new Date(entry.submittedAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    metadata.textContent = `${attendanceLabel} · ${submittedDate}`;

    const message = document.createElement("p");
    message.className = "guestbook__message";
    message.textContent = entry.message;

    item.append(name, metadata, message);
    guestbookList.append(item);
  });
};

try {
  const storedEntries = window.localStorage.getItem(guestbookStorageKey);
  if (storedEntries !== null) {
    const parsedEntries = JSON.parse(storedEntries);
    if (!Array.isArray(parsedEntries) || !parsedEntries.every(isValidGuestbookEntry)) {
      throw new TypeError("Data buku tamu tidak memiliki format yang valid.");
    }
    guestbookEntries = parsedEntries;
  }
} catch (error) {
  guestbookStorageAvailable = false;
  setRsvpStatus("Data buku tamu tidak dapat dibaca dari penyimpanan browser.", "error");
  console.error("Gagal membaca data buku tamu dari localStorage.", error);
}

const updateGuestCountField = () => {
  const attending = attendanceInput.value === "hadir";
  guestCountInput.disabled = !attending;
  guestCountInput.required = attending;
  guestCountInput.value = attending ? "1" : "0";
  guestCountLabel.textContent = attending
    ? "Jumlah orang yang hadir"
    : "Jumlah orang yang hadir (tidak berlaku)";
};

attendanceInput.addEventListener("change", updateGuestCountField);
updateGuestCountField();
renderGuestbook();

rsvpForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!guestbookStorageAvailable) {
    setRsvpStatus("Buku tamu tidak dapat digunakan karena data lama gagal dibaca.", "error");
    return;
  }

  const name = guestNameInput.value.trim();
  const attendance = attendanceInput.value;
  const message = guestMessageInput.value.trim();
  const guests = attendance === "hadir" ? Number(guestCountInput.value) : 0;

  if (!name || name.length > 80 || !message || message.length > 500) {
    setRsvpStatus("Isi nama dan ucapan dengan benar sebelum mengirim.", "error");
    return;
  }
  if ((attendance !== "hadir" && attendance !== "tidak-hadir")
    || (attendance === "hadir" && (!Number.isInteger(guests) || guests < 1))) {
    setRsvpStatus("Periksa kembali pilihan kehadiran dan jumlah tamu.", "error");
    return;
  }

  const newEntry = {
    name,
    attendance,
    guests,
    message,
    submittedAt: new Date().toISOString(),
  };
  const updatedEntries = [...guestbookEntries, newEntry];

  try {
    window.localStorage.setItem(guestbookStorageKey, JSON.stringify(updatedEntries));
  } catch (error) {
    setRsvpStatus("Ucapan belum tersimpan. Periksa ruang penyimpanan browser lalu coba lagi.", "error");
    console.error("Gagal menyimpan RSVP ke localStorage.", error);
    return;
  }

  guestbookEntries = updatedEntries;
  renderGuestbook();
  rsvpForm.reset();
  updateGuestCountField();
  setRsvpStatus("Terima kasih, konfirmasi dan ucapan berhasil disimpan.", "success");
});

const updateCountdown = () => {
  const now = Date.now();
  const remaining = startDate.getTime() - now;

  if (remaining <= 0) {
    Object.values(countdownElements).forEach((element) => {
      element.textContent = "00";
    });
    countdownStatus.textContent = now < endDate.getTime()
      ? "Acara sedang berlangsung."
      : "Acara telah selesai.";
    return now < endDate.getTime();
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const values = {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };

  Object.entries(values).forEach(([unit, value]) => {
    countdownElements[unit].textContent = String(value).padStart(2, "0");
  });
  countdownStatus.textContent = "";
  return true;
};

if (updateCountdown()) {
  const countdownInterval = window.setInterval(() => {
    if (!updateCountdown()) {
      window.clearInterval(countdownInterval);
    }
  }, 1000);
}

const accountNumber = getRequiredElement("account-number");
const copyAccountButton = getRequiredElement("copy-account-button");
const copyToast = getRequiredElement("copy-toast");
let copyToastTimer;
let copyToastHideTimer;

const showCopyToast = (message, isError = false) => {
  window.clearTimeout(copyToastTimer);
  window.clearTimeout(copyToastHideTimer);
  copyToast.textContent = message;
  copyToast.classList.toggle("copy-toast--error", isError);
  copyToast.hidden = false;
  window.requestAnimationFrame(() => copyToast.classList.add("copy-toast--visible"));

  copyToastTimer = window.setTimeout(() => {
    copyToast.classList.remove("copy-toast--visible");
    copyToastHideTimer = window.setTimeout(() => {
      if (!copyToast.classList.contains("copy-toast--visible")) {
        copyToast.hidden = true;
      }
    }, 200);
  }, 2600);
};

const copyTextToClipboard = async (text) => {
  if (window.isSecureContext && navigator.clipboard
    && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  const temporaryInput = document.createElement("textarea");
  temporaryInput.value = text;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.opacity = "0";
  document.body.append(temporaryInput);
  temporaryInput.select();
  temporaryInput.setSelectionRange(0, text.length);
  const copied = document.execCommand("copy");
  temporaryInput.remove();

  if (!copied) {
    throw new Error("Browser tidak mengizinkan penyalinan nomor rekening.");
  }
};

copyAccountButton.addEventListener("click", async () => {
  try {
    await copyTextToClipboard(accountNumber.textContent.trim());
    showCopyToast("Nomor rekening berhasil disalin.");
  } catch (error) {
    console.error("Gagal menyalin nomor rekening.", error);
    showCopyToast("Nomor rekening tidak dapat disalin. Silakan salin secara manual.", true);
  }
});
