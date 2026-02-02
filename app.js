const form = document.getElementById("entry-form");
const dateInput = document.getElementById("date");
const startInput = document.getElementById("startTime");
const endInput = document.getElementById("endTime");
const pauseInput = document.getElementById("pauseMinutes");
const projectInput = document.getElementById("project");
const noteInput = document.getElementById("note");
const durationLabel = document.getElementById("durationLabel");
const totalLabel = document.getElementById("totalLabel");
const entriesContainer = document.getElementById("entries");
const statusBox = document.getElementById("status");

const setStatus = (type, message) => {
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
};

const clearStatus = () => {
  if (!statusBox) return;
  statusBox.textContent = "";
  statusBox.className = "status hidden";
};

const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const formatMinutes = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}:${String(mins).padStart(2, "0")} h`;
};

const calcDuration = () => {
  const start = toMinutes(startInput.value);
  let end = toMinutes(endInput.value);
  const pause = Number(pauseInput.value || 0);
  if (!startInput.value || !endInput.value) return 0;
  if (end < start) end += 24 * 60;
  return Math.max(0, end - start - pause);
};

const updateDurationPreview = () => {
  const minutes = calcDuration();
  durationLabel.textContent = formatMinutes(minutes);
};

const renderEntries = (entries) => {
  entriesContainer.innerHTML = "";
  let total = 0;

  entries.forEach((entry) => {
    total += entry.duration_minutes;
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <span data-label="Datum">${entry.date}</span>
      <span data-label="Zeitraum">${entry.start_time} – ${entry.end_time}</span>
      <span data-label="Pause">${entry.pause_minutes} Min.</span>
      <span data-label="Projekt">${entry.project}</span>
      <span data-label="Dauer">${formatMinutes(entry.duration_minutes)}</span>
      <span data-label="Notiz">${entry.note || ""}</span>
    `;
    entriesContainer.appendChild(row);
  });

  totalLabel.textContent = formatMinutes(total);
};

const loadEntries = async () => {
  try {
    const response = await fetch("/api/entries");
    if (!response.ok) {
      setStatus("error", "Daten konnten nicht geladen werden.");
      return;
    }
    const data = await response.json();
    renderEntries(data);
    clearStatus();
  } catch {
    setStatus(
      "error",
      "Server nicht erreichbar. Bitte über http://localhost:3000 öffnen."
    );
  }
};

const setToday = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;
};

form.addEventListener("input", updateDurationPreview);
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    date: dateInput.value,
    startTime: startInput.value,
    endTime: endInput.value,
    pauseMinutes: Number(pauseInput.value || 0),
    project: projectInput.value.trim(),
    note: noteInput.value.trim()
  };

  try {
    const response = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setStatus("error", error.error || "Speichern fehlgeschlagen.");
      return;
    }

    form.reset();
    setToday();
    updateDurationPreview();
    await loadEntries();
    setStatus("success", "Eintrag gespeichert.");
  } catch {
    setStatus(
      "error",
      "Server nicht erreichbar. Bitte über http://localhost:3000 öffnen."
    );
  }
});

setToday();
updateDurationPreview();
loadEntries();
