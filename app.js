// GLOBAL DATA STORAGE
let entries = [];
let generatedMatches = [];

// DIRECT IMGBB KEY (Bypasses Netlify Serverless Function Limits)
const IMGBB_API_KEY = 'e074d871bd5db01efd7f964621081cbf';

// INITIALIZATION & AUTOLOAD
document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  setupAutoSaveListeners();
});

// PAGE NAVIGATION
function switchPage(pageId, event) {
  document.querySelectorAll('.page-section').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.page-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(pageId).classList.add('active');
  if (event && event.target) {
    event.target.classList.add('active');
  }
}

// LOCAL STORAGE PERSISTENCE
function loadSavedData() {
  const savedForm = localStorage.getItem('derby_form_data');
  if (savedForm) {
    const data = JSON.parse(savedForm);
    document.getElementById('eventTitle').value = data.eventTitle || '';
    document.getElementById('eventPromoter').value = data.eventPromoter || '';
    document.getElementById('eventArena').value = data.eventArena || '';
    document.getElementById('eventAddress').value = data.eventAddress || '';
    document.getElementById('eventDate').value = data.eventDate || '';
    document.getElementById('derbyFormat').value = data.derbyFormat || '4';
    document.getElementById('maxDiff').value = data.maxDiff || '60';
    document.getElementById('restBuffer').value = data.restBuffer || '5';
  }

  const savedRoster = localStorage.getItem('derby_roster_data');
  if (savedRoster) {
    entries = JSON.parse(savedRoster);
    renderRosterTable();
  }
}

function saveFormData() {
  const formData = {
    eventTitle: document.getElementById('eventTitle').value,
    eventPromoter: document.getElementById('eventPromoter').value,
    eventArena: document.getElementById('eventArena').value,
    eventAddress: document.getElementById('eventAddress').value,
    eventDate: document.getElementById('eventDate').value,
    derbyFormat: document.getElementById('derbyFormat').value,
    maxDiff: document.getElementById('maxDiff').value,
    restBuffer: document.getElementById('restBuffer').value,
  };
  localStorage.setItem('derby_form_data', JSON.stringify(formData));
}

function saveRosterData() {
  localStorage.setItem('derby_roster_data', JSON.stringify(entries));
  renderRosterTable();
}

function setupAutoSaveListeners() {
  const inputs = ['eventTitle', 'eventPromoter', 'eventArena', 'eventAddress', 'eventDate', 'derbyFormat', 'maxDiff', 'restBuffer'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', saveFormData);
      el.addEventListener('change', saveFormData);
    }
  });
}

// RESET FEATURES
function resetFormOnly() {
  if (confirm("Sigurado ka bang gusto mong i-clear ang Setup Form details?")) {
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventPromoter').value = '';
    document.getElementById('eventArena').value = '';
    document.getElementById('eventAddress').value = '';
    document.getElementById('eventDate').value = '';
    localStorage.removeItem('derby_form_data');
    alert("Nalinis na ang setup form.");
  }
}

function resetFullSystem() {
  if (confirm("⚠️ WARNING: I-re-reset ang buong system kasama ang roster at matches. Ipagpatuloy?")) {
    localStorage.clear();
    entries = [];
    generatedMatches = [];
    location.reload();
  }
}

// ROSTER MANAGEMENT
function addSingleEntry() {
  const name = document.getElementById('entryName').value.trim();
  const owner = document.getElementById('entryOwner').value.trim();
  const weight = parseInt(document.getElementById('entryWeight').value);
  const band = document.getElementById('entryBand').value.trim();

  if (!name || isNaN(weight)) {
    alert("Pakilagay ang Entry Name at tamang Timbang (Weight).");
    return;
  }

  entries.push({ id: Date.now(), name, owner, weight, band });
  saveRosterData();

  document.getElementById('entryName').value = '';
  document.getElementById('entryOwner').value = '';
  document.getElementById('entryWeight').value = '';
  document.getElementById('entryBand').value = '';
}

function removeEntry(id) {
  entries = entries.filter(item => item.id !== id);
  saveRosterData();
}

function clearRoster() {
  if (confirm("Sigurado ka bang buburahin ang buong roster list?")) {
    entries = [];
    saveRosterData();
  }
}

function renderRosterTable() {
  const tbody = document.getElementById('rosterTableBody');
  tbody.innerHTML = '';
  document.getElementById('rosterCount').textContent = entries.length;

  entries.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${item.name}</strong></td>
      <td>${item.owner || '-'}</td>
      <td>${item.weight} g</td>
      <td>${item.band || '-'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeEntry(${item.id})">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// EXCEL IMPORT
function importExcel() {
  const fileInput = document.getElementById('excelFile');
  if (!fileInput.files.length) {
    alert('Pumili muna ng Excel file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    json.forEach(row => {
      const name = row['Entry Name'] || row['Name'] || row['ENTRY'];
      const owner = row['Owner'] || row['OWNER'] || '';
      const weight = parseInt(row['Weight'] || row['WEIGHT'] || row['WT']);
      const band = row['Band'] || row['BAND'] || '';

      if (name && !isNaN(weight)) {
        entries.push({ id: Date.now() + Math.random(), name, owner, weight, band });
      }
    });

    saveRosterData();
    alert("Matagumpay na na-import ang Excel records!");
  };
  reader.readAsArrayBuffer(fileInput.files[0]);
}

// MATCH ENGINE & DIRECT IMGBB UPLOAD
document.getElementById('generateBtn').addEventListener('click', async () => {
  if (entries.length < 2) {
    alert('Kailangan ng hindi bababa sa 2 entries para makapag-match.');
    return;
  }

  const btn = document.getElementById('generateBtn');
  btn.textContent = "⏳ Calculating Matches & Uploading Program...";
  btn.disabled = true;

  try {
    // 1. SIMPLE CLIENT MATCHING LOGIC
    const formattedDate = document.getElementById('eventDate').value || 'AUGUST 26, 2026';

    document.querySelectorAll('.dispArena').forEach(el => el.textContent = document.getElementById('eventArena').value || 'GRAND TEJERO ARENA');
    document.querySelectorAll('.dispAddress').forEach(el => el.textContent = document.getElementById('eventAddress').value || 'Tejero, Cebu City');
    document.querySelectorAll('.dispPromoter').forEach(el => el.textContent = document.getElementById('eventPromoter').value || 'NGGBC PROMOTION');
    document.querySelectorAll('.dispTitle').forEach(el => el.textContent = document.getElementById('eventTitle').value || '4-COCK HACKBANG DERBY');
    document.querySelectorAll('.dispDate').forEach(el => el.textContent = formattedDate);

    // Pair entries
    let sorted = [...entries].sort((a, b) => a.weight - b.weight);
    let matches = [];
    for (let i = 0; i < sorted.length - 1; i += 2) {
      matches.push({ red: sorted[i], blue: sorted[i + 1] });
    }

    generatedMatches = matches;
    renderClassicTable(matches);
    renderCards(matches);

    // 2. SWITCH PAGE TO SCHEDULE AND CAPTURE IMAGE
    switchPage('classicSchedulePage', { target: document.querySelectorAll('.page-btn')[2] });

    const programElement = document.querySelector('.program-sheet');
    const canvas = await html2canvas(programElement, { scale: 2 });
    const base64Image = canvas.toDataURL('image/png').split(',')[1];

    // 3. DIRECT UPLOAD TO IMGBB API
    btn.textContent = "☁️ Uploading Image to ImgBB...";

    const formData = new FormData();
    formData.append('image', base64Image);

    const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadRes.json();

    if (uploadData.success) {
      // Direct HD ImgBB Image Link
      const directImageUrl = uploadData.data.url;

      // 4. GENERATE QR CODE TARGETING DIRECT IMGBB LINK
      const qrImg = document.getElementById('programQrCode');
      const programLink = document.getElementById('programLink');
      
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(directImageUrl)}`;
      programLink.href = directImageUrl;
      programLink.textContent = "View HD Image on ImgBB";

      alert("✅ Success! Na-upload na sa ImgBB at direct ImgBB link na ang lalabas sa QR Code!");
    } else {
      alert("⚠️ ImgBB Upload Error: " + uploadData.error.message);
    }

  } catch (err) {
    console.error(err);
    alert('Error generating schedule: ' + err.message);
  } finally {
    btn.textContent = "⚙️ Run Core Matchmaker Engine";
    btn.disabled = false;
  }
});

// DISPLAY RENDERING
function renderClassicTable(matches) {
  const tbody = document.getElementById('classicTableBody');
  tbody.innerHTML = '';

  matches.forEach((m, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>MATCH ${idx + 1}</strong></td>
      <td><strong style="color: #d9534f;">${m.red.name}</strong> (${m.red.weight}g)</td>
      <td><strong>VS</strong></td>
      <td><strong style="color: #0275d8;">${m.blue.name}</strong> (${m.blue.weight}g)</td>
      <td>${Math.abs(m.red.weight - m.blue.weight)}g</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCards(matches) {
  const container = document.getElementById('cardsContainer');
  container.innerHTML = '';

  matches.forEach((m, idx) => {
    const card = document.createElement('div');
    card.className = 'card match-card';
    card.innerHTML = `
      <h4>MATCH #${idx + 1}</h4>
      <div style="display: flex; justify-content: space-between; margin-top: 10px;">
        <div style="color: #d9534f;">
          <strong>RED CORNER</strong><br>
          ${m.red.name}<br>
          ${m.red.weight}g
        </div>
        <div style="font-weight: bold; align-self: center;">VS</div>
        <div style="color: #0275d8; text-align: right;">
          <strong>BLUE CORNER</strong><br>
          ${m.blue.name}<br>
          ${m.blue.weight}g
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}
