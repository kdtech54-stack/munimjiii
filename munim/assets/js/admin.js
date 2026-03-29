// ══════════════════════════════════════════
// CONFIG — UPDATED WITH YOUR NEW APPS SCRIPT URL
// ══════════════════════════════════════════
const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRRQD8ep6ut5hN4HL-Qzg1vXu10Mkk0ect6AXDOJVxkT9ah1SODNiKgjkLa-_52ujIbU69i-mqs1RNi/pub?gid=1824930801&single=true&output=csv';
const WA_NUM = '919607839665';
const ADMIN_PASS = 'munimji@9607';
const                                                                                                                                                                                                                                                = 'https://script.google.com/macros/s/AKfycbwQ9xXoCvTZXvOeQCHwAYeUGRfHMjs_obLQ5Pp2VA3Fsup1JPvozaZY7Dls1OHDKvQLlQ/exec';

let allListings = [];
let filteredListings = [];
let editingIdx = -1;

// ══════════════════════════════════════════
// LOGIN LOGIC
// ══════════════════════════════════════════
function doLogin() {
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginErr');

  if (pass === ADMIN_PASS) {
    document.getElementById('loginScreen').style.display = 'none';
    localStorage.setItem('adminLoggedIn', 'true');
    loadListings();
  } else {
    if (err) err.classList.add('show');
    const input = document.getElementById('loginPass');
    if (input) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
    }
    showToast('❌ Incorrect password', true);
  }
}

function doLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('adminLoggedIn');
    location.reload();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('adminLoggedIn') === 'true') {
    const ls = document.getElementById('loginScreen');
    if (ls) ls.style.display = 'none';
    loadListings();
  }
});

// ══════════════════════════════════════════
// LOAD LISTINGS — WITH CACHE BUSTER
// ══════════════════════════════════════════
function isValidSheetUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('docs.google.com/spreadsheets') && url.includes('output=csv')) return true;
  if (url.includes('docs.google.com/spreadsheets') && (url.includes('/edit') || url.includes('/view'))) return 'needs_publish';
  return false;
}

async function loadListings() {
  if (localStorage.getItem('adminLoggedIn') !== 'true') return;

  const tableWrap = document.getElementById('tableWrap');
  if (tableWrap) tableWrap.innerHTML = `<div class="tbl-loading"><div class="spinner"></div> Loading listings...</div>`;

  try {
    let text = '';
    let source = '';

    // 0. Validate URLs first
    const csvStatus = isValidSheetUrl(SHEET_CSV);
    if (csvStatus === 'needs_publish') {
      throw new Error("❌ Your SHEET_CSV link is a regular link. You must 'Publish to the web' as a 'CSV' from Google Sheets first.");
    } else if (!csvStatus) {
      throw new Error("❌ Invalid SHEET_CSV link. Ensure it's a direct CSV link.");
    }

    // 1. Try fetching LIVE data from Apps Script first
    if (APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('https://script.google.com')) {
      try {
        const cacheBuster = '_=' + new Date().getTime();
        const liveUrl = `${APPS_SCRIPT_URL}?action=getListings&${cacheBuster}`;

        console.log('📡 Fetching from Apps Script:', liveUrl);

        const res = await fetch(liveUrl, { cache: 'no-store' });

        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            allListings = json;
            source = 'Live from Sheet';
          }
        } else {
          console.warn('⚠️ Apps Script returned status:', res.status);
        }
      } catch (e) {
        console.warn('⚠️ Live fetch failed, falling back to CSV:', e.message);
      }
    }

    // 2. Fallback to CSV if live fetch didn't work
    if (!allListings || allListings.length === 0) {
      const cacheBuster = '_=' + new Date().getTime();
      const bustedUrl = SHEET_CSV + (SHEET_CSV.includes('?') ? '&' : '?') + cacheBuster;

      const urls = [
        bustedUrl,
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(bustedUrl),
        'https://corsproxy.io/?' + encodeURIComponent(bustedUrl)
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) continue;

            const fetchedText = await res.text();
            if (fetchedText.includes('<!DOCTYPE html>') || fetchedText.includes('<html')) continue;

            if (fetchedText && fetchedText.trim().length > 10) {
              text = fetchedText;
              break;
            }
          }
        } catch (e) { }
      }

      if (!text) throw new Error("Could not fetch CSV data. Ensure your sheet is 'Published to the web' as a CSV.");
      allListings = parseCSV(text);
      if (allListings.length === 0) throw new Error("CSV parsed but no listings found. Check sheet columns.");
      source = 'Cached (from CSV)';
    }

    renderTable(allListings);
    updateStats(allListings);
    showToast(`✅ ${allListings.length} listings loaded (${source})`);

  } catch (error) {
    console.error('❌ Admin Panel Error:', error);
    if (tableWrap) {
      tableWrap.innerHTML = `
        <div class="tbl-empty">
          <div class="tbl-empty-icon">⚠️</div>
          <p style="color:#c0392b; font-weight:600; margin-bottom:12px">${error.message.split('.')[0]}</p>
          <p style="font-size:0.9rem; max-width:400px; margin:0 auto 20px; color:#666">
            Make sure your Google Sheet is <strong>File > Share > Publish to the web</strong>. 
            Select <strong>Entire Document</strong> and <strong>CSV</strong> format.
          </p>
          <a href="${SHEET_CSV}" target="_blank" class="btn btn-outline">Verify Current Link →</a>
        </div>
      `;
    }
    showToast('⚠️ Data Error: ' + error.message, true);
  }
}

function reloadListings() {
  showToast('🔄 Refreshing...');
  loadListings();
}

// ══════════════════════════════════════════
// CSV PARSER
// ══════════════════════════════════════════
function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, '').trim();

  function tokenise(str) {
    const rows = [];
    let row = [], cur = '', inQ = false, i = 0;
    while (i < str.length) {
      const ch = str[i];
      if (ch === '"') {
        if (inQ && str[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQ = !inQ; i++; continue;
      }
      if (ch === ',' && !inQ) {
        row.push(cur); cur = ''; i++; continue;
      }
      if ((ch === '\r' || ch === '\n') && !inQ) {
        if (ch === '\r' && str[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        if (row.some(c => c.trim())) rows.push(row);
        row = []; i++; continue;
      }
      cur += ch; i++;
    }
    row.push(cur);
    if (row.some(c => c.trim())) rows.push(row);
    return rows;
  }

  const rows = tokenise(clean);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h =>
    h.replace(/"/g, '').trim().toLowerCase().replace(/\s+/g, '_')
  );

  return rows.slice(1).map(cols => {
    const row = {};
    let tagCount = 0;

    headers.forEach((h, i) => {
      const val = (cols[i] || '').replace(/^"|"$/g, '').trim();

      if (h === 'tag') {
        tagCount++;
        if (tagCount === 1) {
          row['tag'] = val;
        } else {
          row['description'] = val;
        }
      } else if (h === 'wa_message' || h === 'whatsapp_msg') {
        row['whatsapp_msg'] = val;
      } else {
        row[h] = val;
      }
    });
    return row;
  }).filter(r => r && (r.name || r['property_name'] || r.title));
}

// ══════════════════════════════════════════
// STATS
// ══════════════════════════════════════════
function updateStats(props) {
  const total = props.length;
  const active = props.filter(p => (p.status || '').toLowerCase() !== 'sold').length;
  const sold = props.filter(p => (p.status || '').toLowerCase() === 'sold').length;
  const hot = props.filter(p => ['hot', 'premium'].includes((p.tag || '').toLowerCase())).length;

  const sTotal = document.getElementById('s-total');
  const sActive = document.getElementById('s-active');
  const sSold = document.getElementById('s-sold');
  const sHot = document.getElementById('s-hot');
  const sActiveLbl = document.getElementById('s-active-lbl');
  const sHotLbl = document.getElementById('s-hot-lbl');

  if (sTotal) sTotal.textContent = total;
  if (sActive) sActive.textContent = active;
  if (sSold) sSold.textContent = sold;
  if (sHot) sHot.textContent = hot;
  if (sActiveLbl) sActiveLbl.textContent = active > 0 ? `${Math.round(active / total * 100)}% of total` : '';
  if (sHotLbl) sHotLbl.textContent = hot > 0 ? `${hot} featured` : '';
}

// ══════════════════════════════════════════
// RENDER TABLE
// ══════════════════════════════════════════
function renderTable(props) {
  filteredListings = props;

  const lCount = document.getElementById('listingsCount');
  if (lCount) lCount.textContent = `${props.length} listing${props.length !== 1 ? 's' : ''}`;

  const tableWrap = document.getElementById('tableWrap');
  if (!tableWrap) return;

  if (props.length === 0) {
    tableWrap.innerHTML = `<div class="tbl-empty"><div class="tbl-empty-icon">🔍</div><p>No listings match your search.</p></div>`;
    return;
  }

  const rows = props.map((p, i) => {
    const name = p.name || p.property_name || p.title || '—';
    const price = p.price || '—';
    const loc = p.location || p.area || '—';
    const type = p.type || '—';
    const status = p.status || 'For Sale';
    const tag = (p.tag || '').trim().toUpperCase();
    const realIdx = allListings.indexOf(p);

    const statusBadge = {
      'for sale': 'badge-sale',
      'premium': 'badge-prem',
      'layout': 'badge-layout',
      'sold': 'badge-sold'
    }[status.toLowerCase()] || 'badge-sale';

    const tagBadge = tag ? `<span class="badge badge-${tag === 'HOT' ? 'hot' : tag === 'NEW' ? 'new' : tag === 'PREMIUM' ? 'prem' : 'sale'}">${tag}</span>` : '';

    const waMsg = `Hi MunimJi! I enquired about "${name}" at ${loc}. Please share details.`;
    const waHref = `https://wa.me/${WA_NUM}?text=${encodeURIComponent(waMsg)}`;

    return `<tr>
      <td>
        <div class="prop-name">${name}</div>
        <div class="prop-loc">📍 ${loc.split(',')[0]}</div>
      </td>
      <td><div class="price">${price}</div></td>
      <td><span class="type-pill">${type}</span></td>
      <td>
        <span class="badge ${statusBadge}">${status}</span>
        ${tagBadge}
      </td>
      <td>
        <div class="actions">
          <a href="${waHref}" target="_blank" class="btn btn-sm" style="background:#25D366;color:#fff;border:none">💬</a>
          <button class="btn btn-outline btn-sm" onclick="prefillEdit(${realIdx})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="duplicateListing(${realIdx})" title="Copy to New">📋</button>
          <button class="btn btn-red btn-sm" onclick="markSold(${realIdx})">${status.toLowerCase() === 'sold' ? 'Unsold' : 'Sold'}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tableWrap.innerHTML = `<table class="tbl"><thead><tr><th>Property</th><th>Price</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ══════════════════════════════════════════
// FILTER TABLE
// ══════════════════════════════════════════
function filterTable() {
  const sInput = document.getElementById('searchInput');
  const fType = document.getElementById('filterType');
  const fStatus = document.getElementById('filterStatus');

  if (!sInput || !fType || !fStatus) return;

  const q = sInput.value.toLowerCase();
  const type = fType.value.toLowerCase();
  const status = fStatus.value.toLowerCase();

  const filtered = allListings.filter(p => {
    const name = (p.name || p.title || '').toLowerCase();
    const loc = (p.location || '').toLowerCase();
    const price = (p.price || '').toLowerCase();
    const pType = (p.type || '').toLowerCase();
    const pStat = (p.status || '').toLowerCase();

    const matchQ = !q || name.includes(q) || loc.includes(q) || price.includes(q);
    const matchType = !type || pType.includes(type.split(' ')[0]);
    const matchStatus = !status || pStat.includes(status);

    return matchQ && matchType && matchStatus;
  });

  renderTable(filtered);
}

// ══════════════════════════════════════════
// MARK SOLD — UPDATES SHEET & WEBSITE
// ══════════════════════════════════════════
async function markSold(idx) {
  const p = allListings[idx];
  const name = p.name || p.title || 'this property';
  const isSold = (p.status || '').toLowerCase() === 'sold';
  const newStatus = isSold ? 'For Sale' : 'Sold';

  if (!confirm(`${newStatus === 'Sold' ? '🔴' : '🟢'} Mark as ${newStatus}?\n\n"${name}"`)) return;

  const data = {
    action: 'updateStatus',
    name: name,
    status: newStatus
  };

  if (APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('https://')) {
    showToast(`⏳ Updating to ${newStatus}...`);

    try {
      const params = new URLSearchParams();
      for (const key in data) params.append(key, data[key]);

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: params
      });

      const responseText = await res.text();
      console.log('📡 Status update response:', responseText);

      showToast(`✅ Status updated! Refreshing...`);
      setTimeout(() => loadListings(), 2500);

    } catch (err) {
      console.error('Status update error:', err);
      showToast('❌ Update failed. Using manual copy.', true);
      const copy = { ...p };
      copy.status = newStatus;
      prefillFields(copy);
      openAddModal();
    }
  } else {
    const copy = { ...p };
    copy.status = newStatus;
    prefillFields(copy);
    openAddModal();
    generateRow();
  }
}

// ══════════════════════════════════════════
// MODAL FUNCTIONS
// ══════════════════════════════════════════
function openAddModal() {
  const modal = document.getElementById('addModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modal = document.getElementById('addModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    editingIdx = -1;

    const cStrip = document.getElementById('copyStrip');
    if (cStrip) cStrip.style.display = 'none';

    const aiStatus = document.getElementById('aiStatus');
    if (aiStatus) aiStatus.textContent = 'Paste text above then click Extract';

    const aiBtn = document.getElementById('aiBtn');
    if (aiBtn) aiBtn.disabled = false;

    const mTitle = document.getElementById('modalTitle');
    if (mTitle) mTitle.textContent = 'Add New Listing';
  }
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('addModal')) closeModal();
}

function prefillEdit(idx) {
  const p = allListings[idx];
  editingIdx = idx;
  prefillFields(p);

  const mTitle = document.getElementById('modalTitle');
  if (mTitle) mTitle.textContent = 'Edit Listing — Saving to Sheet';

  openAddModal();
}

function duplicateListing(idx) {
  const p = allListings[idx];
  editingIdx = -1;
  prefillFields(p);

  const mTitle = document.getElementById('modalTitle');
  if (mTitle) mTitle.textContent = 'Duplicate Listing — Create New';

  openAddModal();
  showToast('📋 Listing copied to form. Modify and Save.');
}

function prefillFields(p) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || '' };

  set('fName', p.name || p.property_name || p.title);
  set('fPrice', p.price);
  set('fLocation', p.location || p.area);
  set('fType', p.type);
  set('fSize', p.size || p.area_size);
  set('fStatus', p.status || 'For Sale');
  set('fTag', p.tag);
  set('fBHK', p.bhk);
  set('fRaw', p.description || p.raw_post || p['raw post'] || p.raw);
  set('fWA', p.whatsapp_msg || p.wa_message);
  set('pasteRaw', '');
}

// ══════════════════════════════════════════
// AI EXTRACT
// ══════════════════════════════════════════
function aiExtract() {
  const pRaw = document.getElementById('pasteRaw');
  if (!pRaw) return;

  const raw = pRaw.value.trim();
  if (!raw) { showToast('⚠️ Paste some property text first', true); return; }

  const btn = document.getElementById('aiBtn');
  const status = document.getElementById('aiStatus');

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Extracting...';
  }

  try {
    const lines = raw.split(/\n/).map(l => l.trim()).filter(Boolean);
    const strip = s => s.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu, '').trim();
    const full = lines.map(strip).join(' ');

    let price = '';
    const priceM = raw.match(/(?:total\s*(?:budget|price|amount)[:\s]*)?₹\s*[\d,.]+\s*(?:lakh|crore|cr|l)?(?:\s*\/\s*(?:acre|bigha|guntha|sqft|sq\.ft))?/i)
      || raw.match(/(?:rate|price|budget)[:\s]*₹?\s*[\d,.]+\s*(?:lakh|crore)/i);
    if (priceM) {
      price = priceM[0].replace(/^(?:total\s*(?:budget|price|amount)|rate|price|budget)[:\s]*/i, '').trim();
      if (!price.startsWith('₹')) price = '₹' + price;
    }

    let size = '';
    const sizeM = raw.match(/[\d.]+\s*(?:acre|acres|bigha|guntha|sq\.?\s*ft|sqft|square\s*feet|gaj)/i);
    if (sizeM) size = sizeM[0].trim();

    let location = '';
    const atM = raw.match(/(?:at\.|at\s+|location[:\s]*|village[:\s]*)([A-Za-z\s]+?)(?:\s+tah\.?\s*|\s+taluka\s*|\s+dist\.?\s*|,|$)/i);
    const tahM = raw.match(/tah\.?\s*([A-Za-z]+)/i);
    if (atM && tahM) location = `${atM[1].trim()}, ${tahM[1].trim()}, Wardha`;
    else if (atM) location = atM[1].trim();
    else if (tahM) location = `${tahM[1].trim()}, Wardha`;

    if (!location) {
      const locFB = raw.match(/(?:near|at|in|location)[:\s]+([A-Za-z ,]+?)(?:\n|\.|\d|₹|$)/i);
      if (locFB) location = locFB[1].trim();
    }

    let type = 'Agricultural Land';
    const t = full.toLowerCase();
    if (t.includes('solar')) type = 'Solar Farm Land';
    else if (t.includes('farm house') || t.includes('farmhouse')) type = 'Farm Land';
    else if (t.includes('na plot') || t.includes('n.a. plot') || t.includes('layout')) type = 'NA Plot';
    else if (t.includes('commercial') || t.includes('shop') || t.includes('office')) type = 'Commercial';
    else if (t.includes('flat') || t.includes('apartment') || t.includes('bhk') || t.includes('bungalow') || t.includes('house') || t.includes('ghar')) type = 'Residential House';
    else if (t.includes('agriculture') || t.includes('agricultural') || t.includes('khet') || t.includes('farm land') || t.includes('शेत')) type = 'Agricultural Land';
    else if (t.includes('farm')) type = 'Farm Land';

    let bhk = '';
    const bhkM = raw.match(/(\d)\s*bhk/i);
    if (bhkM) bhk = bhkM[1] + ' BHK';

    let name = '';
    for (const l of lines) {
      const s = strip(l);
      if (s.length > 5 && s.length < 80 && !s.match(/^(₹|at\.|tah\.|mob|ref|contact|whatsapp)/i)) {
        name = s.replace(/^(🏡|🏠|🌾|🌱|☀️|🔥)\s*/u, '').trim();
        if (name) break;
      }
    }
    if (!name && size && location) name = `${size} ${type} – ${location.split(',')[0]}`;
    if (!name) name = type + (location ? ` – ${location.split(',')[0]}` : '');

    let tag = 'NEW';
    if (t.includes('premium') || t.includes('prime')) tag = 'PREMIUM';
    else if (t.includes('hot') || t.includes('urgent')) tag = 'HOT';

    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val };
    set('fName', name);
    set('fPrice', price);
    set('fLocation', location);
    set('fType', type);
    set('fSize', size);
    set('fTag', tag);
    set('fBHK', bhk);
    set('fRaw', raw);

    const fStatus = document.getElementById('fStatus');
    if (fStatus) fStatus.value = 'For Sale';

    if (status) {
      status.textContent = '✅ Fields extracted — review and adjust if needed';
      status.style.color = 'var(--g1)';
    }
    showToast('✅ Extracted! Check fields and click Generate Row');

  } catch (e) {
    if (status) {
      status.textContent = '❌ Could not extract — fill fields manually';
      status.style.color = 'var(--red)';
    }
    showToast('Could not extract. Fill fields manually.', true);
    console.error(e);
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = '✨ Extract Fields';
  }
}

// ══════════════════════════════════════════
// FORM DATA
// ══════════════════════════════════════════
function getFormData() {
  const getVal = id => { const el = document.getElementById(id); return el ? el.value.trim() : '' };

  const name = getVal('fName');
  const price = getVal('fPrice');
  const location = getVal('fLocation');
  const type = getVal('fType');

  if (!name || !price || !location || !type) return null;

  return {
    name,
    price,
    location,
    type,
    size: getVal('fSize'),
    status: getVal('fStatus') || 'For Sale',
    tag: getVal('fTag'),
    description: getVal('fRaw'),
    bhk: getVal('fBHK'),
    whatsapp_msg: getVal('fWA') || `Hi MunimJi! I am interested in "${name}" at ${location}. Please share details.`
  };
}

// ══════════════════════════════════════════
// GENERATE ROW — SAVES TO SHEET & WEBSITE
// ══════════════════════════════════════════
async function generateRow() {
  const data = getFormData();
  if (!data) {
    showToast('⚠️ Fill Name, Price, Location and Type', true);
    return;
  }

  const payload = {
    ...data,
    action: editingIdx >= 0 ? 'editListing' : 'addListing',
    row_index: editingIdx >= 0 ? editingIdx + 2 : -1
  };

  if (APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('https://')) {
    const btn = document.getElementById('submitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...' };

    try {
      const params = new URLSearchParams();
      for (const key in payload) params.append(key, payload[key]);

      console.log('📡 Sending to Apps Script:', payload);

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: params
      });

      const responseText = await res.text();
      console.log('📡 Apps Script response:', responseText);

      await new Promise(r => setTimeout(r, 3000));

      const successMsg = editingIdx >= 0 ? '✅ Listing updated!' : '✅ Listing added!';
      showToast(`${successMsg} Will appear on website in 2-3 minutes.`);

      setTimeout(() => {
        closeModal();
        loadListings();
      }, 2000);

    } catch (err) {
      console.error('Save error:', err);
      showToast('❌ Save failed. Using manual copy.', true);
      manualCopyRow(data);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✓ Save to Sheet' };
    }
  } else {
    manualCopyRow(data);
  }
}

function triggerManualCopy() {
  const data = getFormData();
  if (!data) {
    showToast('⚠️ Fill Name, Price, Location and Type first', true);
    return;
  }
  manualCopyRow(data);
}

// ══════════════════════════════════════════
// MANUAL COPY ROW
// ══════════════════════════════════════════
function manualCopyRow(data) {
  const clean = (val) => (val || '').toString().replace(/[\r\n]+/g, ' ').trim();

  const vals = [
    clean(data.name),
    clean(data.price),
    clean(data.location),
    clean(data.type),
    clean(data.size),
    clean(data.status),
    clean(data.tag),
    (data.description || '').trim(),
    clean(data.bhk),
    (data.whatsapp_msg || '').trim()
  ].map(v => '"' + (v || '').replace(/"/g, '""') + '"');

  const copyBtn = document.getElementById('copyFullBtn');
  if (copyBtn) copyBtn._data = vals.join('\t');

  const cPreview = document.getElementById('copyPreview');
  if (cPreview) cPreview.textContent = vals.slice(0, 4).join(' | ') + ' | ...';

  const cStrip = document.getElementById('copyStrip');
  if (cStrip) { cStrip.style.display = 'block'; cStrip.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }

  showToast('📋 Ready to copy — check the blue section above');
}

async function copyRow() {
  const btn = document.getElementById('copyFullBtn');
  if (!btn) return;

  const data = btn._data;
  if (!data) return;

  try {
    await navigator.clipboard.writeText(data);
    btn.classList.add('copied');
    btn.textContent = '✅ Copied! Now open Sheet and press Ctrl+V';
    showToast('✅ Copied! Open your Google Sheet, click next empty row, press Ctrl+V');
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '📋 Copy Row → Paste in Google Sheet (Ctrl+V)';
    }, 4000);
  } catch (e) {
    showToast('Could not auto-copy. Try selecting the preview text.', true);
  }
}

// ══════════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════════
function showToast(msg, isErr = false) {
  const t = document.getElementById('toast');
  if (!t) return;

  t.textContent = msg;
  t.className = isErr ? 'err' : '';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}