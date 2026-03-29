/**
 * MUNIMJI PROPERTY & FINANCE
 * Fixed & Clean Version — All bugs resolved
 */

// ══ CONFIGURATION ══
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRRQD8ep6ut5hN4HL-Qzg1vXu10Mkk0ect6AXDOJVxkT9ah1SODNiKgjkLa-_52ujIbU69i-mqs1RNi/pub?gid=1824930801&single=true&output=csv';

const CONFIG = {
    phone1: '+919607839665',
    phone2: '+919607839666',
    whatsapp: '919607839665',
    instagram: 'https://www.instagram.com/munimjiofficial',
    igHandle: '@munimjiofficial',
    address: 'Hawaldarpura, Wardha, Maharashtra',
    mapsLink: 'https://maps.google.com/?q=Hawaldarpura,Wardha,Maharashtra',
    facebook: 'https://www.facebook.com/MunimJi',
    listingsScriptUrl: 'https://script.google.com/macros/s/AKfycbwQ9xXoCvTZXvOeQCHwAYeUGRfHMjs_obLQ5Pp2VA3Fsup1JPvozaZY7Dls1OHDKvQLlQ/exec',
    leadsScriptUrl: 'https://script.google.com/macros/s/AKfycbzLAV17T7JSWaOde26t00f45YnPW_IjgY9N78EWo3niJrvcyJV05N2iQr6HqCt-a4gWng/exec',
    enquiryCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRYr7lBTGHF-RSTgwJlAbbP_8tPTkI46mcFxieA_ZMArVTydOZXT8XPWc5-WVfXjKy3S3MLuXzUAqzV/pub?gid=1846328953&single=true&output=csv',
};

// ══ DATA STORAGE ══
let allProps = [];
let currentFilter = 'all';
const originalTitle = document.title;

// ══ TALUKA DATA ══
const WARDHA_TALUKAS = ['Wardha', 'Seloo', 'Deoli', 'Hinganghat', 'Arvi', 'Ashti', 'Samudrapur', 'Karanja'];
const NAGPUR_TALUKAS = ['Nagpur', 'Kamptee', 'Hingna', 'Butibori', 'Narkhed', 'Ramtek', 'Umred', 'Bhiwapur', 'Katol', 'Saoner', 'Kalmeshwar', 'Parseoni', 'Mouda'];
const LOCATION_DISTRICT_MAP = { 'wardha city': 'Wardha', 'nagpur city': 'Nagpur' };

// ══ INITIALIZATION ══
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    applyConfig();
    loadFromSheet();
    initRevealObserver();
    initSearchKeyboard();
});

// ══ NAVIGATION ══
// FIX: index.html uses id="mMenu" and class="hamburger" button — matched here
function initNavigation() {
    const nav = document.getElementById('nav');
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// Keyboard shortcut: Enter on search fields triggers search
function initSearchKeyboard() {
    const searchFields = ['sType', 'sLoc', 'sTaluka', 'sBudget'];
    searchFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
            });
        }
    });
}

// FIX: toggleMenu / closeMenu called inline in HTML
function toggleMenu() {
    const menu = document.getElementById('mMenu');
    if (menu) menu.classList.toggle('open');
}

function closeMenu() {
    const menu = document.getElementById('mMenu');
    if (menu) menu.classList.remove('open');
}

// ══ APPLY CONFIG ══
function applyConfig() {
    const wa = `https://wa.me/${CONFIG.whatsapp}`;
    const waMsg = txt => `${wa}?text=${encodeURIComponent(txt)}`;

    const elements = {
        'heroWa': waMsg('Hi MunimJi! I want to enquire about a property.'),
        'wfInstaLink': CONFIG.instagram,
        'igAllLink': CONFIG.instagram,
        'waContact': waMsg('Hi MunimJi! I want to enquire about a property.'),
        'igContact': CONFIG.instagram,
        'mapsContact': CONFIG.mapsLink,
        'igStripBtn': CONFIG.instagram,
        'floatWa': waMsg('Hi MunimJi! I am interested in a property.'),
        'fIg': CONFIG.instagram,
        'fWa': wa,
        'fFb': CONFIG.facebook,
        'fWaLink': wa,
        'fMapsLink': CONFIG.mapsLink
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.href = value;
    }

    const displays = {
        'igHandleDisplay': CONFIG.igHandle,
        'addressDisplay': CONFIG.address.split(',')[0] + ', Wardha',
        'igStripHandle': CONFIG.igHandle
    };

    for (const [id, value] of Object.entries(displays)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

// ══ DATA LOADING ══
function isValidGoogleSheetUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.includes('docs.google.com/spreadsheets') && url.includes('output=csv')) return true;
    if (url.includes('docs.google.com/spreadsheets') && (url.includes('/edit') || url.includes('/view'))) return 'needs_publish';
    return false;
}

async function loadFromSheet() {
    const statusEl = document.getElementById('wfCount');

    // Attempt Live Fetch (Apps Script — uses listingsScriptUrl, NOT leadsScriptUrl)
    if (CONFIG.listingsScriptUrl && CONFIG.listingsScriptUrl.startsWith('https://script.google.com')) {
        try {
            const liveUrl = `${CONFIG.listingsScriptUrl}?action=getListings&_=${Date.now()}`;
            const res = await fetch(liveUrl);
            if (res.ok) {
                const json = await res.json();
                if (Array.isArray(json) && json.length > 0) {
                    allProps = json.reverse();
                    renderWebsiteData(allProps, 'Live Sync');
                    return;
                }
            }
        } catch (e) {
            console.warn('Live fetch failed, using CSV fallback:', e.message);
        }
    }

    // CSV Fallback
    const urlStatus = isValidGoogleSheetUrl(SHEET_CSV_URL);
    if (urlStatus === 'needs_publish') {
        console.error('❌ SHEET_CSV_URL is a regular link, not a published CSV link.');
        if (statusEl) statusEl.textContent = 'Error: Sheet not published as CSV';
        loadFallback();
        return;
    } else if (!urlStatus) {
        console.error('❌ SHEET_CSV_URL is invalid.');
        if (statusEl) statusEl.textContent = 'Error: Invalid Sheet URL';
        loadFallback();
        return;
    }

    try {
        const res = await fetch(`${SHEET_CSV_URL}&_=${Date.now()}`);
        if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('Received HTML instead of CSV. Is the sheet published?');
            }
            const text = await res.text();
            if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
                throw new Error('Received HTML page. Ensure the link is a Published CSV.');
            }
            allProps = parseCSV(text).reverse();
            if (allProps.length === 0) throw new Error('CSV parsed but no valid properties found.');
            renderWebsiteData(allProps, 'CSV Sync');
        } else {
            throw new Error(`Fetch failed with status: ${res.status}`);
        }
    } catch (e) {
        console.error('❌ All data loading failed:', e.message);
        if (statusEl) statusEl.textContent = 'Offline / Data Error';
        loadFallback();
    }
}

// ══ CSV PARSER ══
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
            if (ch === ',' && !inQ) { row.push(cur); cur = ''; i++; continue; }
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
    const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

    return rows.slice(1).map(cols => {
        const row = {};
        headers.forEach((h, i) => {
            const val = (cols[i] || '').replace(/^"|"$/g, '').trim();
            if (h === 'tag') {
                if (!row['tag']) row['tag'] = val;
                else row['description'] = val;
            } else if (h === 'wa_message' || h === 'whatsapp_msg') {
                row['whatsapp_msg'] = val;
            } else {
                row[h] = val;
            }
        });
        return row;
    }).filter(r => r && (r.name || r.property_name || r.title));
}

// ══ RENDERING ══
function renderWebsiteData(props, source) {
    renderProps(props);
    renderFeatured(props);
    updateAreaCounts(props);
    updateLiveWidget(props);
    console.log(`✅ Data loaded via ${source}: ${props.length} listings`);
}

function renderFeatured(props) {
    const featuredSec = document.getElementById('featured');
    const grid = document.getElementById('featuredGrid');
    if (!featuredSec || !grid) return;

    const featured = props.filter(p => {
        const tag = (p.tag || p.badge || '').toUpperCase();
        return (tag === 'PREMIUM' || tag === 'HOT') && (p.status || '').toLowerCase() !== 'sold';
    }).slice(0, 3);

    if (featured.length > 0) {
        featuredSec.style.display = 'block';
        grid.innerHTML = featured.map(p => buildPropCard(p, allProps.indexOf(p))).join('');
        observeRevealElements();
    } else {
        featuredSec.style.display = 'none';
    }
}

function updateAreaCounts(props) {
    const areas = {
        wardha: ['wardha'],
        karanja: ['karanja'],
        sawangi: ['sawangi'],
        pavnar: ['pavnar'],
        nagpur: ['nagpur']
    };
    for (const [id, keywords] of Object.entries(areas)) {
        const el = document.getElementById('ac-' + id);
        if (!el) continue;
        const count = props.filter(p => {
            const loc = (p.location || '').toLowerCase();
            return keywords.some(k => loc.includes(k));
        }).length;
        el.textContent = count > 0 ? `${count} listing${count !== 1 ? 's' : ''}` : 'Enquire';
    }
}

function updateLiveWidget(props) {
    const wl = document.getElementById('widgetList');
    if (!wl) return;

    const active = props.filter(p => (p.status || '').toLowerCase() !== 'sold');

    const getWidgetIcon = (type = '') => {
        const t = type.toLowerCase();
        if (t.includes('house') || t.includes('residential') || t.includes('bhk')) return { emoji: '🏠', cls: 'ic-h' };
        if (t.includes('solar')) return { emoji: '☀️', cls: 'ic-s' };
        if (t.includes('farm')) return { emoji: '🌿', cls: 'ic-f' };
        if (t.includes('land') || t.includes('agriculture')) return { emoji: '🌾', cls: 'ic-l' };
        if (t.includes('plot') || t.includes('na')) return { emoji: '📐', cls: 'ic-p' };
        if (t.includes('commercial')) return { emoji: '🏢', cls: 'ic-c' };
        return { emoji: '🏡', cls: 'ic-h' };
    };

    wl.innerHTML = active.slice(0, 5).map(p => {
        const ico = getWidgetIcon(p.type);
        return `
        <div class="widget-item" onclick="openDetail(${allProps.indexOf(p)})">
            <div class="wi-icon ${ico.cls}">${ico.emoji}</div>
            <div class="wi-info">
                <div class="wi-name">${p.name || 'Property'}</div>
                <div class="wi-loc">📍 ${(p.location || '').split(',')[0]}</div>
            </div>
            <div class="wi-price">${p.price || ''}</div>
        </div>
    `;
    }).join('');

    const wf = document.getElementById('wfCount');
    if (wf) wf.textContent = `${active.length} active listing${active.length !== 1 ? 's' : ''}`;
}

function renderProps(props) {
    const grid = document.getElementById('propsGrid');
    if (!grid) return;

    let filtered = props;
    if (currentFilter !== 'all') {
        const map = {
            house: ['house', 'home', 'residential'],
            land: ['land', 'agriculture', 'agricultural'],
            plot: ['plot', 'na', 'layout'],
            farm: ['farm', 'solar']
        };
        const keys = map[currentFilter] || [];
        filtered = props.filter(p => keys.some(k => (p.type || '').toLowerCase().includes(k)));
    }

    const active = filtered.filter(p => (p.status || '').toLowerCase() !== 'sold');
    const countEl = document.getElementById('propCount');
    if (countEl) countEl.textContent = active.length;

    let html = active.map(p => buildPropCard(p, allProps.indexOf(p))).join('');
    html += `
        <a href="#contact" class="pcard pcard-add-cta">
            <div class="pa-ico">➕</div>
            <div class="pa-t">List Your Property</div>
            <div class="pa-s">Reach 3,000+ qualified buyers in Wardha & Nagpur.</div>
        </a>
    `;

    if (active.length === 0) {
        html = `<div class="no-results" style="grid-column:1/-1;text-align:center;padding:48px;color:var(--muted)"><p>No properties found in this category.</p></div>`;
    }

    grid.innerHTML = html;
    observeRevealElements();
}

function buildPropCard(p, idx) {
    const name = p.name || p.property_name || p.title || 'Property';
    const price = p.price || '';
    const loc = p.location || p.area || '';
    const img = p.image || p.image_url || '';
    const type = p.type || '';
    const status = p.status || 'Available';
    const tag = (p.tag || '').toUpperCase();

    const badgeColor = status.toLowerCase() === 'sold' ? '#888' : (tag === 'HOT' ? '#c0392b' : tag === 'PREMIUM' ? '#d4920a' : 'var(--primary)');
    const badgeText = tag || status;

    // Determine gradient class based on type
    const gradMap = { house: 'grad-green', residential: 'grad-green', land: 'grad-olive', agriculture: 'grad-olive', plot: 'grad-blue', na: 'grad-blue', farm: 'grad-teal', solar: 'grad-gold', commercial: 'grad-amber' };
    let gradClass = 'grad-green';
    const tLower = type.toLowerCase();
    for (const [key, cls] of Object.entries(gradMap)) {
        if (tLower.includes(key)) { gradClass = cls; break; }
    }

    return `
        <article class="pcard reveal" onclick="openDetail(${idx})">
            <div class="pcard-img ${!img ? gradClass : ''}">
                ${img
            ? `<img src="${img}" alt="${name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
                <div class="pcard-placeholder" style="${img ? 'display:none' : ''}">${getIcon(type)}</div>
                <span class="pcard-badge" style="background:${badgeColor}">${badgeText}</span>
            </div>
            <div class="pcard-body">
                <div class="pcard-price">${price}</div>
                <h3 class="pcard-name">${name}</h3>
                <div class="pcard-loc">📍 ${loc}</div>
            </div>
        </article>
    `;
}

// ══ FILTER PROPS (called by filter tags in HTML) ══
// FIX: This function was missing — caused "filterProps is not defined" error
function filterProps(type, el) {
    currentFilter = type;
    document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    renderProps(allProps);
}

// ══ SEARCH & FILTER ══
function doSearch() {
    const typeEl = document.getElementById('sType');
    const locEl = document.getElementById('sLoc');
    const talukaEl = document.getElementById('sTaluka');
    const budgetEl = document.getElementById('sBudget');

    const type = typeEl ? typeEl.value.toLowerCase() : '';
    const loc = locEl ? locEl.value.toLowerCase() : '';
    const taluka = talukaEl ? talukaEl.value.toLowerCase() : '';
    const budget = budgetEl ? budgetEl.value : '';

    let filtered = allProps.filter(p => {
        const pType = (p.type || '').toLowerCase();
        const pLoc = (p.location || '').toLowerCase();
        const pPrice = parsePrice(p.price || '');

        const matchType = !type || pType.includes(type.split(' ')[0]);
        const matchLoc = !loc || pLoc.includes(loc.split(' ')[0]);
        const matchTaluka = !taluka || pLoc.includes(taluka);
        const matchBudget = matchesBudget(pPrice, budget);

        return matchType && matchLoc && matchTaluka && matchBudget;
    });

    currentFilter = 'all';
    document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    const allTag = document.querySelector('.filter-tag');
    if (allTag) allTag.classList.add('active');

    renderProps(filtered);
    const propsSec = document.getElementById('properties');
    if (propsSec) propsSec.scrollIntoView({ behavior: 'smooth' });
}

function parsePrice(priceStr) {
    // Extracts a numeric lakh value from strings like "₹42 Lakh", "₹1.5 Crore"
    const m = priceStr.replace(/,/g, '').match(/([\d.]+)\s*(lakh|crore|cr|l)?/i);
    if (!m) return 0;
    const num = parseFloat(m[1]);
    const unit = (m[2] || '').toLowerCase();
    if (unit === 'crore' || unit === 'cr') return num * 100;
    return num; // assume lakh
}

function matchesBudget(priceLakh, budget) {
    if (!budget) return true;
    if (budget === 'Under ₹20 Lakh') return priceLakh < 20;
    if (budget === '₹20L – ₹50L') return priceLakh >= 20 && priceLakh <= 50;
    if (budget === '₹50L – ₹1 Crore') return priceLakh > 50 && priceLakh <= 100;
    if (budget === '₹1Cr – ₹5Cr') return priceLakh > 100 && priceLakh <= 500;
    if (budget === 'Above ₹5 Crore') return priceLakh > 500;
    return true;
}

function resetSearch() {
    const typeEl = document.getElementById('sType');
    const locEl = document.getElementById('sLoc');
    const talukaEl = document.getElementById('sTaluka');
    const budgetEl = document.getElementById('sBudget');

    if (typeEl) typeEl.value = '';
    if (locEl) locEl.value = '';
    if (talukaEl) { talukaEl.innerHTML = '<option value="">Select Taluka</option>'; talukaEl.disabled = true; }
    if (budgetEl) budgetEl.value = '';

    const hintEl = document.getElementById('talukaHint');
    if (hintEl) hintEl.textContent = 'Select Location first';

    currentFilter = 'all';
    document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    const allTag = document.querySelector('.filter-tag');
    if (allTag) allTag.classList.add('active');

    renderProps(allProps);
}

// ══ LOCATION / TALUKA CHANGE ══
function onLocationChange() {
    const locVal = document.getElementById('sLoc') ? document.getElementById('sLoc').value : '';
    const talukaEl = document.getElementById('sTaluka');
    const hintEl = document.getElementById('talukaHint');
    const district = LOCATION_DISTRICT_MAP[locVal.toLowerCase()] || '';

    if (district && talukaEl) {
        talukaEl.disabled = false;
        const list = district === 'Wardha' ? WARDHA_TALUKAS : NAGPUR_TALUKAS;
        talukaEl.innerHTML = '<option value="">All Talukas</option>' + list.map(t => `<option value="${t}">${t}</option>`).join('');
        if (hintEl) hintEl.textContent = `Narrow by ${district} Taluka`;
    } else if (talukaEl) {
        talukaEl.disabled = true;
        talukaEl.innerHTML = '<option value="">Select Taluka</option>';
        if (hintEl) hintEl.textContent = 'Select Location first';
    }
}

// FIX: onTalukaChange was called in HTML but not defined
function onTalukaChange() {
    // Taluka changed — nothing special needed, search is triggered by button
}

// ══ UTILS ══
function getIcon(type = '') {
    const t = type.toLowerCase();
    if (t.includes('house') || t.includes('residential') || t.includes('bhk')) return '🏠';
    if (t.includes('solar')) return '☀️';
    if (t.includes('farm')) return '🌿';
    if (t.includes('land') || t.includes('agriculture')) return '🌾';
    if (t.includes('plot') || t.includes('na')) return '📐';
    if (t.includes('commercial')) return '🏢';
    return '🏡';
}

// ══ INTERSECTION OBSERVER (Animations) ══
let revealObserver;
function initRevealObserver() {
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('vis');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    observeRevealElements();
}

function observeRevealElements() {
    if (!revealObserver) return;
    document.querySelectorAll('.reveal:not(.vis)').forEach(el => revealObserver.observe(el));
}

// ══ TOAST ══
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ══ SEND LEAD (Contact Form) ══
async function sendLead() {
    const name = document.getElementById('fn') ? document.getElementById('fn').value.trim() : '';
    const phone = document.getElementById('fp') ? document.getElementById('fp').value.trim() : '';
    const interest = document.getElementById('fi') ? document.getElementById('fi').value : '';
    const area = document.getElementById('fa') ? document.getElementById('fa').value : '';
    const message = document.getElementById('fm') ? document.getElementById('fm').value.trim() : '';

    if (!name || !phone) {
        showToast('⚠️ Please enter your name and phone number.');
        return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
        showToast('⚠️ Please enter a valid 10-digit phone number.');
        return;
    }

    const btn = document.querySelector('.form-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending to WhatsApp...'; }

    const payload = { action: 'addLead', name, phone, interest, area, message, timestamp: new Date().toISOString() };
    const waText = `Hi MunimJi! My name is ${name}, phone ${phone}. Interested in: ${interest} in ${area}. ${message}`;

    // 1. Send data to Google Sheet silently in the background (NO AWAIT)
    if (CONFIG.leadsScriptUrl) {
        const params = new URLSearchParams();
        for (const k in payload) params.append(k, payload[k]);

        // Fire and forget - don't wait for Google Apps Script to respond
        fetch(CONFIG.leadsScriptUrl, {
            method: 'POST',
            body: params,
            mode: 'no-cors'
        }).catch(e => console.error("Failed to save to sheet in background:", e));
    }

    // 2. Redirect to WhatsApp IMMEDIATELY
    showToast('✅ Redirecting to WhatsApp...');
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(waText)}`, '_blank');

    // 3. Clear the form instantly
    ['fn', 'fp', 'fm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['fi', 'fa'].forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });

    if (btn) { btn.disabled = false; btn.textContent = '📩 Send Enquiry — We\'ll Call Back'; }
}

// ══ PROPERTY DETAIL OVERLAY ══
function openDetail(idx) {
    const p = allProps[idx];
    if (!p) return;

    const overlay = document.getElementById('propDetail');
    if (!overlay) return;

    const name = p.name || p.property_name || p.title || 'Property';
    const price = p.price || '';
    const loc = p.location || p.area || '';
    const desc = p.description || p.raw_post || p['raw post'] || p.raw || '';
    const img = p.image || p.image_url || '';
    const type = p.type || '';
    const status = p.status || '';
    const tag = (p.tag || '').toUpperCase();
    const bhk = p.bhk || '';
    const size = p.size || p.area_size || '';
    const waCustom = p.whatsapp_msg || '';

    // SEO: Update Title
    document.title = `${name} | ${price} | ${loc} - MunimJi`;

    // Hero Image
    const heroImg = document.getElementById('detailHeroImg');
    if (heroImg) {
        if (img) { heroImg.src = img; heroImg.style.display = 'block'; }
        else { heroImg.style.display = 'none'; }
    }
    const heroEmoji = document.getElementById('detailHeroEmoji');
    if (heroEmoji) heroEmoji.textContent = getIcon(type);

    // Badges
    const heroBadges = document.getElementById('detailHeroBadges');
    if (heroBadges) {
        const badges = [];
        if (status) badges.push(`<span class="detail-badge">${status}</span>`);
        if (tag) badges.push(`<span class="detail-badge detail-badge-tag">${tag}</span>`);
        heroBadges.innerHTML = badges.join('');
    }

    // Populate fields
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };
    set('detailNavTitle', name);
    set('detailTitle', name);
    set('detailHeroPrice', price);
    set('detailHeroLoc', '📍 ' + loc);
    set('detailLoc', '📍 ' + loc);
    set('detailCtaPrice', price);
    set('detailCtaSub', `${type}${size ? ' · ' + size : ''}${bhk ? ' · ' + bhk : ''}`);
    set('detailMapText', loc);

    // Chips
    const chipsEl = document.getElementById('detailChips');
    if (chipsEl) {
        const chips = [];
        if (type) chips.push(type);
        if (size) chips.push(size);
        if (bhk) chips.push(bhk);
        if (status) chips.push(status);
        chipsEl.innerHTML = chips.map(c => `<span class="detail-chip">${c}</span>`).join('');
    }

    // Description — preserve line breaks and emojis
    const descEl = document.getElementById('detailDesc');
    if (descEl) {
        if (desc) {
            descEl.innerHTML = desc
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    // Make Google Maps links clickable
                    return line.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--primary)">$1</a>');
                })
                .join('<br>');
        } else {
            descEl.textContent = 'Contact us for full details, site visit and photos.';
        }
    }

    // WhatsApp links
    const waMsg = waCustom || `Hi MunimJi! I'm interested in "${name}" at ${loc} (${price}). Please share more details and arrange a site visit.`;
    const waHref = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(waMsg)}`;
    const setHref = (id, href) => { const el = document.getElementById(id); if (el) el.href = href; };
    setHref('detailNavWa', waHref);
    setHref('detailCtaWa', waHref);

    // Map link
    const mapLinkEl = document.getElementById('detailMapLink');
    if (mapLinkEl) {
        mapLinkEl.href = `https://maps.google.com/?q=${encodeURIComponent(loc + ', Maharashtra')}`;
    }

    // Similar listings
    renderSimilar(p, idx);

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function renderSimilar(current, currentIdx) {
    const grid = document.getElementById('similarGrid');
    if (!grid) return;

    const similar = allProps.filter((p, i) => {
        if (i === currentIdx) return false;
        if ((p.status || '').toLowerCase() === 'sold') return false;
        const sameType = (p.type || '').toLowerCase() === (current.type || '').toLowerCase();
        const sameLoc = (p.location || '').toLowerCase().split(',')[0] === (current.location || '').toLowerCase().split(',')[0];
        return sameType || sameLoc;
    }).slice(0, 3);

    if (similar.length === 0) {
        grid.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">No similar listings right now.</p>';
        return;
    }

    grid.innerHTML = similar.map(p => buildPropCard(p, allProps.indexOf(p))).join('');
    observeRevealElements();
}

function closeDetail() {
    const overlay = document.getElementById('propDetail');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
    document.title = originalTitle;
}

function shareProperty() {
    const title = document.getElementById('detailNavTitle') ? document.getElementById('detailNavTitle').textContent : 'Property';
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title, url }).catch(() => { });
    } else {
        navigator.clipboard.writeText(url).then(() => showToast('🔗 Link copied!'));
    }
}

// ══ FALLBACK DATA (mirrors actual Google Sheet for offline/local testing) ══
function loadFallback() {
    allProps = [
        { name: '3BHK Independent House', price: '₹45 Lakh', location: 'Hawaldarpura, Wardha', type: 'Residential House', status: 'Sold', tag: 'HOT' },
        { name: '3.70 Acre Agriculture Land', price: '₹38 Lakh', location: 'Karanja, Wardha District', type: 'Agricultural Land', status: 'For Sale', tag: 'NEW' },
        { name: 'Solar Farm Land — 5 Acres', price: '₹1.2 Crore', location: 'Pavnar Nagar, Wardha', type: 'Solar Farm Land', status: 'For Sale', tag: 'PREMIUM' },
        { name: '2BHK Flat — Ready Possession', price: '₹28 Lakh', location: 'Wardha City, Maharashtra', type: 'Residential House', status: 'For Sale', tag: 'NEW' },
        { name: '10 Acre Farm Plot', price: '₹85 Lakh', location: 'Nagpur District', type: 'Farm Land', status: 'For Sale', tag: 'NEW' }
    ];
    renderWebsiteData(allProps, 'Demo Data');
}
