/* ============================================================
   SSL WATCHER — app.js
   All application logic + AI chatbox (Claude-powered)
   ============================================================ */

// ===== ENVIRONMENT CONFIG =====
const SSLWATCH_CONFIG = {
  APP_NAME: 'SSLWatch',
  APP_ENV: 'development',
  API_BASE_URL: '',
  REQUEST_TIMEOUT_MS: 15000,
  ...(window.SSLWATCH_CONFIG || {})
};

function apiUrl(path){
  const base = String(SSLWATCH_CONFIG.API_BASE_URL || '').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

async function apiFetch(path, options = {}){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(SSLWATCH_CONFIG.REQUEST_TIMEOUT_MS || 15000));
  try {
    return await fetch(apiUrl(path), {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

// ===== DOMAIN DATA =====
let domains = [
  {id:1,url:'google.com',org:'Google LLC',issuer:'GTS CA 1C3',status:'valid',daysLeft:187,validFrom:'2024-09-01',validTo:'2025-09-12',grade:'A+',keyBits:2048,protocol:'TLS 1.3',country:'US',risk:'low',checked:'2 min ago'},
  {id:2,url:'stripe.com',org:'Stripe Inc.',issuer:"Let's Encrypt",status:'valid',daysLeft:64,validFrom:'2024-11-10',validTo:'2025-05-15',grade:'A',keyBits:4096,protocol:'TLS 1.3',country:'US',risk:'low',checked:'3 min ago'},
  {id:3,url:'api.myapp.io',org:'My App Inc.',issuer:"Let's Encrypt",status:'warn',daysLeft:22,validFrom:'2024-12-01',validTo:'2025-02-28',grade:'B',keyBits:2048,protocol:'TLS 1.2',country:'US',risk:'medium',checked:'5 min ago'},
  {id:4,url:'staging.corp.net',org:'Corp Internal',issuer:'DigiCert',status:'warn',daysLeft:11,validFrom:'2024-07-15',validTo:'2025-02-17',grade:'B+',keyBits:2048,protocol:'TLS 1.2',country:'UK',risk:'medium',checked:'1 min ago'},
  {id:5,url:'legacy.payments.io',org:'PayCo Ltd.',issuer:'Comodo CA',status:'critical',daysLeft:3,validFrom:'2022-02-01',validTo:'2025-02-09',grade:'C',keyBits:1024,protocol:'TLS 1.1',country:'DE',risk:'high',checked:'10 min ago'},
  {id:6,url:'dashboard.acme.co',org:'Acme Corp',issuer:'Amazon CA',status:'valid',daysLeft:342,validFrom:'2024-09-22',validTo:'2026-09-22',grade:'A',keyBits:2048,protocol:'TLS 1.3',country:'US',risk:'low',checked:'2 min ago'},
  {id:7,url:'cdn.staticfiles.net',org:'CDN Pro',issuer:'Cloudflare',status:'valid',daysLeft:211,validFrom:'2024-08-01',validTo:'2025-11-11',grade:'A+',keyBits:2048,protocol:'TLS 1.3',country:'US',risk:'low',checked:'4 min ago'},
  {id:8,url:'old-blog.company.org',org:'Company Org',issuer:'VeriSign',status:'valid',daysLeft:95,validFrom:'2024-10-15',validTo:'2025-04-20',grade:'A',keyBits:2048,protocol:'TLS 1.3',country:'AU',risk:'low',checked:'8 min ago'},
];

let currentFilter = 'all';
let activeView = 'dashboard';

// ===== DOMAIN HELPERS =====
function statusClass(s){
  if(s==='valid') return 'status-valid';
  if(s==='warn') return 'status-warn';
  if(s==='critical') return 'status-critical';
  return 'status-expired';
}
function statusLabel(s){
  if(s==='valid') return '<i class="fas fa-circle-check"></i> Valid';
  if(s==='warn') return '<i class="fas fa-clock"></i> Expiring Soon';
  if(s==='critical') return '<i class="fas fa-triangle-exclamation"></i> Critical';
  return '<i class="fas fa-xmark-circle"></i> Expired';
}
function progressColor(d){
  if(d>60) return 'var(--green)';
  if(d>30) return 'var(--amber)';
  if(d>14) return 'var(--amber)';
  return 'var(--red)';
}
function progressPct(d){return Math.min(100, Math.max(2, (d/365)*100)).toFixed(1)}
function initials(url){return url.replace('www.','').split('.')[0].slice(0,2).toUpperCase()}

// ===== DOMAIN TABLE =====
function renderDomainTable(list, mini){
  let html = `<div class="domain-table">
  <div class="dt-header">
    <span>Domain</span><span>Status</span><span>Expires</span><span>Grade</span><span>Issuer</span><span style="text-align:right">Actions</span>
  </div>`;
  list.forEach(d=>{
    const pct = progressPct(d.daysLeft);
    const col = progressColor(d.daysLeft);
    html += `<div class="dt-row" onclick="showDetail(${d.id})">
      <div class="domain-name">
        <div class="domain-favicon">${initials(d.url)}</div>
        <div>
          <div class="domain-url">${d.url}</div>
          <div class="domain-org">${d.org}</div>
        </div>
      </div>
      <div><span class="cert-status ${statusClass(d.status)}">${statusLabel(d.status)}</span></div>
      <div>
        <div class="expiry-text">${d.validTo}</div>
        <div class="expiry-days">${d.daysLeft > 0 ? d.daysLeft+' days left' : 'Expired'}</div>
      </div>
      <div><span style="font-family:var(--font-mono);font-size:14px;font-weight:600;color:${col}">${d.grade}</span></div>
      <div class="issuer-text">${d.issuer}</div>
      <div class="row-actions" onclick="event.stopPropagation()">
        <button class="icon-btn" title="Check now" onclick="rescanDomain(${d.id})"><i class="fas fa-rotate"></i></button>
        <button class="icon-btn" title="View details" onclick="showDetail(${d.id})"><i class="fas fa-eye"></i></button>
        <button class="icon-btn del" title="Remove" onclick="removeDomain(${d.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  });
  html += '</div>';
  return html;
}

function renderMiniTable(){
  const list = domains.slice(0,5);
  document.getElementById('mini-domain-table').innerHTML = renderDomainTable(list, true);
}

function renderFullTable(){
  let list = domains;
  if(currentFilter !== 'all') list = domains.filter(d=>d.status===currentFilter);
  document.getElementById('full-domain-table').innerHTML = renderDomainTable(list, false);
  document.getElementById('domain-count').textContent = `(${list.length} total)`;
}

function filterDomains(val){currentFilter=val; renderFullTable();}

function showView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(b=>b.classList.remove('active'));
  activeView = view;
  if(view==='reports'){setTimeout(renderExpiryChart,100);}
}

function showRiskView(){
  const d = domains[4]; // legacy.payments.io — high risk
  showDetail(d.id);
}

function showDetail(id){
  const d = domains.find(x=>x.id===id);
  if(!d) return;
  const shieldColor = d.risk==='high'?'var(--red)':d.risk==='medium'?'var(--amber)':'var(--cyan)';
  const pct = progressPct(d.daysLeft);
  const col = progressColor(d.daysLeft);
  const risks = {
    high:[
      {icon:'fas fa-triangle-exclamation',c:'var(--red)',text:'<strong>Weak key size (1024-bit):</strong> RSA 1024-bit keys are considered cryptographically insecure by current standards. Upgrade to 2048-bit or 4096-bit immediately.'},
      {icon:'fas fa-xmark-circle',c:'var(--red)',text:'<strong>TLS 1.1 protocol in use:</strong> TLS 1.1 was deprecated in 2021. This exposes connections to POODLE, BEAST, and other known vulnerabilities.'},
      {icon:'fas fa-clock',c:'var(--red)',text:'<strong>Certificate expires in 3 days:</strong> Immediate renewal required to prevent service interruption and browser security warnings.'},
      {icon:'fas fa-robot',c:'var(--purple)',text:'<strong>AI Assessment:</strong> This domain presents a HIGH risk profile. The combination of a deprecated TLS version, weak key, and imminent expiry places it in the top 5% of risk across monitored domains.'},
    ],
    medium:[
      {icon:'fas fa-circle-exclamation',c:'var(--amber)',text:'<strong>TLS 1.2 in use:</strong> While not deprecated, TLS 1.3 is significantly more secure. Consider upgrading your server configuration.'},
      {icon:'fas fa-clock',c:'var(--amber)',text:'<strong>Certificate expiring in '+d.daysLeft+' days:</strong> Plan renewal within the next 7 days to ensure uninterrupted service.'},
      {icon:'fas fa-robot',c:'var(--purple)',text:'<strong>AI Assessment:</strong> Medium risk profile. Proactive renewal and protocol upgrade will fully resolve outstanding issues.'},
    ],
    low:[
      {icon:'fas fa-circle-check',c:'var(--green)',text:'<strong>Strong configuration:</strong> TLS 1.3, 2048-bit RSA key, and a Grade '+d.grade+' security rating indicate excellent certificate hygiene.'},
      {icon:'fas fa-robot',c:'var(--purple)',text:'<strong>AI Assessment:</strong> Low risk. This certificate meets all modern security standards. No action required at this time.'},
    ],
  };

  const riskItems = risks[d.risk].map(r=>`<div class="risk-item"><i class="${r.icon}" style="color:${r.c}"></i><div class="risk-item-text">${r.text}</div></div>`).join('');
  const riskScore = d.risk==='high'?87:d.risk==='medium'?54:18;
  const countdownDays = d.daysLeft;
  const countdownHrs = 14;
  const countdownMins = 37;

  const html = `
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <button class="detail-back" onclick="showView(activeView || 'domains')"><i class="fas fa-arrow-left"></i> Back</button>
    <div><div style="font-family:var(--font-display);font-size:22px;font-weight:700">${d.url}</div><div style="font-size:13px;color:var(--text2)">${d.org} · Last checked ${d.checked}</div></div>
    <span class="cert-status ${statusClass(d.status)}" style="margin-left:auto">${statusLabel(d.status)}</span>
  </div>

  <div class="shield-wrap" style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;display:flex;flex-direction:row;align-items:center;gap:28px;margin-bottom:20px">
    <div class="shield-anim" style="flex-shrink:0">
      <div class="shield-ring r1" style="border-color:${shieldColor}88"></div>
      <div class="shield-ring r2" style="border-color:${shieldColor}44"></div>
      <div class="shield-ring r3" style="border-color:${shieldColor}22"></div>
      <div class="shield-core" style="background:${shieldColor}22;border-color:${shieldColor}">
        <i class="fas fa-shield-halved" style="font-size:36px;color:${shieldColor}"></i>
      </div>
    </div>
    <div style="flex:1">
      <div style="font-size:13px;color:var(--text2);margin-bottom:6px">Certificate Lifetime Remaining</div>
      <div class="timeline-bar"><div class="timeline-fill" style="width:${pct}%;background:${col}"></div></div>
      <div class="timeline-labels"><span>${d.validFrom}</span><span>${d.validTo}</span></div>
    </div>
    <div class="countdown-row" style="flex-shrink:0;margin-top:0">
      <div class="countdown-box"><div class="countdown-num" style="color:${col}">${countdownDays}</div><div class="countdown-label">Days</div></div>
      <div class="countdown-box"><div class="countdown-num" style="color:${col}">${countdownHrs}</div><div class="countdown-label">Hours</div></div>
      <div class="countdown-box"><div class="countdown-num" style="color:${col}">${countdownMins}</div><div class="countdown-label">Mins</div></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:16px;margin-bottom:20px">
    <div>
      <div class="sec-hdr" style="margin-bottom:12px"><h2>Certificate Details</h2></div>
      <div class="cert-grid">
        <div class="cert-field"><div class="cert-field-label">Domain</div><div class="cert-field-val cyan">${d.url}</div></div>
        <div class="cert-field"><div class="cert-field-label">Organization</div><div class="cert-field-val">${d.org}</div></div>
        <div class="cert-field"><div class="cert-field-label">Issuer</div><div class="cert-field-val">${d.issuer}</div></div>
        <div class="cert-field"><div class="cert-field-label">Country</div><div class="cert-field-val">${d.country}</div></div>
        <div class="cert-field"><div class="cert-field-label">Valid From</div><div class="cert-field-val">${d.validFrom}</div></div>
        <div class="cert-field"><div class="cert-field-label">Expires</div><div class="cert-field-val ${d.risk==='high'?'red':d.risk==='medium'?'amber':'green'}">${d.validTo}</div></div>
        <div class="cert-field"><div class="cert-field-label">Protocol</div><div class="cert-field-val ${d.protocol==='TLS 1.3'?'green':d.protocol==='TLS 1.1'?'red':'amber'}">${d.protocol}</div></div>
        <div class="cert-field"><div class="cert-field-label">Key Size</div><div class="cert-field-val ${isStrongKey(d)?'green':'red'}">${d.keyBits}-bit ${formatKeyType(d.keyType)}</div></div>
        <div class="cert-field span2"><div class="cert-field-label">Security Grade</div><div class="cert-field-val" style="font-size:24px;font-weight:700;color:${col}">${d.grade}</div></div>
      </div>
    </div>
    <div>
      <div class="sec-hdr" style="margin-bottom:12px"><h2>AI Risk Analysis</h2></div>
      <div class="risk-card" style="margin-bottom:0">
        <div class="risk-score-wrap">
          <div class="risk-score-circle ${d.risk}">
            <div class="risk-score-num">${riskScore}</div>
            <div class="risk-score-lbl">/ 100</div>
          </div>
          <div>
            <div style="font-size:16px;font-weight:600;color:${d.risk==='high'?'var(--red)':d.risk==='medium'?'var(--amber)':'var(--green)'};text-transform:uppercase;letter-spacing:.5px">${d.risk} RISK</div>
            <div style="font-size:12px;color:var(--text2);margin-top:4px;max-width:180px">AI-powered security assessment based on certificate configuration and expiry</div>
          </div>
        </div>
        <div class="risk-items">${riskItems}</div>
      </div>
    </div>
  </div>`;

  document.getElementById('detail-content').innerHTML = html;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-detail').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
}

function isStrongKey(d){
  const type = String(d.keyType || 'rsa').toLowerCase();
  if(type.includes('ec') || type.includes('ed')) return d.keyBits >= 256;
  return d.keyBits >= 2048;
}

function formatKeyType(type){
  const value = String(type || 'rsa').toLowerCase();
  if(value.includes('ec')) return 'EC';
  if(value.includes('ed')) return 'EdDSA';
  if(value.includes('rsa')) return 'RSA';
  return String(type || 'RSA').toUpperCase();
}

// ===== ALERTS =====
const alertsData = [
  {id:1,type:'red',icon:'fas fa-xmark-circle',title:'Certificate expires in 3 days — legacy.payments.io',desc:'Immediate renewal required. TLS 1.1 is also in use which exposes users to known vulnerabilities.',domain:'legacy.payments.io',age:'1 hour ago',chip:'Critical',chipClass:''},
  {id:2,type:'amber',icon:'fas fa-clock',title:'Certificate expiring in 11 days — staging.corp.net',desc:'Certificate renewal should be initiated within the next 5 days to avoid service disruption.',domain:'staging.corp.net',age:'3 hours ago',chip:'Warning',chipClass:'warn'},
  {id:3,type:'amber',icon:'fas fa-clock',title:'Certificate expiring in 22 days — api.myapp.io',desc:'Routine renewal reminder. TLS 1.2 upgrade also recommended for improved security posture.',domain:'api.myapp.io',age:'6 hours ago',chip:'Notice',chipClass:'warn'},
  {id:4,type:'cyan',icon:'fas fa-circle-check',title:'Certificate auto-renewed — dashboard.acme.co',desc:'Certificate was automatically renewed. Validity extended by 365 days. New expiry: Sep 22, 2026.',domain:'dashboard.acme.co',age:'2 days ago',chip:'Resolved',chipClass:'info'},
];

let visibleAlerts = [...alertsData];
function renderAlerts(){
  const el = document.getElementById('alerts-list');
  if(!visibleAlerts.length){
    el.innerHTML='<div class="empty-state"><i class="fas fa-bell-slash"></i><h3>No active alerts</h3><p>All certificates are healthy. You will be notified when action is needed.</p></div>';return;
  }
  el.innerHTML = visibleAlerts.map(a=>`
  <div class="alert-card" id="alert-${a.id}">
    <div class="alert-icon ${a.type}"><i class="${a.icon}"></i></div>
    <div class="alert-body">
      <div class="alert-title">${a.title}</div>
      <div class="alert-desc">${a.desc}</div>
      <div class="alert-meta"><i class="fas fa-clock"></i>${a.age} · <span class="alert-chip ${a.chipClass}">${a.chip}</span></div>
    </div>
    <div class="alert-actions">
      <button class="dismiss-btn" onclick="dismissAlert(${a.id})">Dismiss</button>
      <button class="icon-btn" onclick="showDetail(${alertsData.findIndex(x=>x.id===a.id)+1})" title="View domain"><i class="fas fa-arrow-right"></i></button>
    </div>
  </div>`).join('');
}

function dismissAlert(id){
  visibleAlerts=visibleAlerts.filter(a=>a.id!==id);
  renderAlerts();
  toast('Alert dismissed','info');
}
function dismissAll(){visibleAlerts=[];renderAlerts();toast('All alerts dismissed','info');}

// ===== MODAL =====
function openModal(){document.getElementById('addModal').classList.add('open')}
function closeModal(){document.getElementById('addModal').classList.remove('open')}
function closeModalOutside(e){if(e.target===document.getElementById('addModal'))closeModal()}

async function addDomain(){
  const val = document.getElementById('newDomain').value.trim();
  if(!val){toast('Please enter a domain','error');return;}
  const url = val.replace(/^https?:\/\//,'').replace(/\//,'');
  closeModal();
  document.getElementById('newDomain').value='';
  toast(`Scanning ${url}...`,'info');
  try {
    const scan = await scanSsl(url);
    const newD = {
      id: nextDomainId(),
      ...scan
    };
    const saved = await saveStoredDomain(newD);
    domains.unshift(saved);
    currentFilter = 'all';
    const filterSelect = document.querySelector('#view-domains select');
    if(filterSelect) filterSelect.value = 'all';
    renderMiniTable();renderFullTable();
    toast(`${scan.url} added successfully`,'success');
  } catch(err) {
    toast(err.message || 'Unable to scan that domain','error');
  }
}

async function removeDomain(id){
  try {
    await deleteStoredDomain(id);
  } catch(err) {
    toast(err.message || 'Unable to delete domain from database','error');
    return;
  }
  const idx=domains.findIndex(d=>d.id===id);
  if(idx>-1){domains.splice(idx,1);}
  renderMiniTable();renderFullTable();
  toast('Domain removed','info');
}

async function rescanDomain(id){
  const d=domains.find(x=>x.id===id);
  if(d) toast(`Rescanning ${d.url}...`,'info');
  if(!d) return;
  try {
    const scan = await scanSsl(d.url);
    const saved = await saveStoredDomain({ ...d, ...scan });
    Object.assign(d, saved);
    renderMiniTable();renderFullTable();
    toast(`${d.url} — certificate ${d.status}`,'success');
  } catch(err) {
    toast(err.message || `Unable to scan ${d.url}`,'error');
  }
}

function refreshAll(){
  toast('Refreshing all domains...','info');
  setTimeout(()=>toast('All domains updated successfully','success'),2000);
}

function nextDomainId(){
  return domains.reduce((max,d)=>Math.max(max,d.id),0)+1;
}

async function scanSsl(domain){
  const response = await apiFetch('/api/check-ssl', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({domain})
  });
  const data = await response.json();
  if(!response.ok || data.error){
    throw new Error(data.error || 'SSL scan failed');
  }
  return data;
}

async function loadStoredDomains(){
  const response = await apiFetch('/api/domains');
  const data = await response.json();
  if(!response.ok || data.error){
    throw new Error(data.error || 'Unable to load database domains');
  }
  if(Array.isArray(data.domains) && data.domains.length){
    domains = data.domains;
  }
}

async function saveStoredDomain(domain){
  const response = await apiFetch('/api/domains', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(domain)
  });
  const data = await response.json();
  if(!response.ok || data.error){
    throw new Error(data.error || 'Unable to save domain');
  }
  return data.domain;
}

async function deleteStoredDomain(id){
  const response = await apiFetch(`/api/domains/${id}`, { method:'DELETE' });
  const data = await response.json();
  if(!response.ok || data.error){
    throw new Error(data.error || 'Unable to delete domain');
  }
  return data;
}

function generateReport(name){
  toast(`Generating ${name} Report...`,'info');
  setTimeout(()=>toast(`${name} Report ready for download`,'success'),2200);
}

// ===== TOAST =====
function toast(msg,type='info'){
  const wrap=document.getElementById('toastWrap');
  const t=document.createElement('div');
  const icons={success:'fas fa-circle-check',error:'fas fa-circle-xmark',info:'fas fa-circle-info'};
  t.className=`toast ${type}`;
  t.innerHTML=`<i class="${icons[type]||icons.info} toast-icon"></i><span class="toast-text">${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(40px)';t.style.transition='all .3s';setTimeout(()=>t.remove(),300)},3000);
}

// ===== CHARTS =====
function renderHealthChart(){
  const ctx=document.getElementById('healthChart');if(!ctx)return;
  const labels=['Jan 14','Jan 17','Jan 20','Jan 23','Jan 26','Jan 29','Feb 1','Feb 4','Feb 7','Feb 10'];
  new Chart(ctx,{
    type:'line',
    data:{
      labels,
      datasets:[
        {label:'Valid',data:[6,6,6,5,5,5,5,5,5,5],borderColor:'#34D399',backgroundColor:'rgba(52,211,153,.08)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#34D399'},
        {label:'Expiring',data:[1,1,1,2,2,2,2,2,2,2],borderColor:'#FBBF24',backgroundColor:'rgba(251,191,36,.06)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#FBBF24'},
        {label:'Critical',data:[1,1,1,1,1,1,1,1,1,1],borderColor:'#FB7185',backgroundColor:'rgba(251,113,133,.05)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#FB7185'},
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#4A5A7A',font:{size:11}},grid:{color:'rgba(46,37,72,.6)'}},y:{ticks:{color:'#4A5A7A',font:{size:11},stepSize:1},grid:{color:'rgba(46,37,72,.6)'},min:0,max:8}}}
  });
}
function renderStatusChart(){
  const ctx=document.getElementById('statusChart');if(!ctx)return;
  new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:['Valid','Expiring','Critical'],
      datasets:[{data:[5,2,1],backgroundColor:['#34D399','#FBBF24','#FB7185'],borderColor:'#1E1A2E',borderWidth:3,hoverOffset:6}]
    },
    options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{display:false}}}
  });
}
function renderExpiryChart(){
  const ctx=document.getElementById('expiryChart');if(!ctx)return;
  if(ctx._chartRef){ctx._chartRef.destroy();}
  const c=new Chart(ctx,{
    type:'bar',
    data:{
      labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'],
      datasets:[{label:'Expiring',data:[0,3,0,0,1,0,0,1,1,0],backgroundColor:['#FBBF2499','#FB718599','#FBBF2499','#34D39999','#FBBF2499','#34D39999','#34D39999','#FBBF2499','#FBBF2499','#34D39999'],borderRadius:4}]
    },
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#4A5A7A',font:{size:11}},grid:{display:false}},y:{ticks:{color:'#4A5A7A',stepSize:1},grid:{color:'rgba(46,37,72,.6)'},min:0,max:4}}}
  });
  ctx._chartRef=c;
}

// ===== AUTH =====
const DEMO_USER = { email: 'demo@sslwatch.io', password: 'password123', name: 'Demo User' };
const registeredUsers = [{ ...DEMO_USER }];

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t,i)=>{
    t.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='signup'));
  });
  document.getElementById('authLogin').style.display = tab==='login'?'block':'none';
  document.getElementById('authSignup').style.display = tab==='signup'?'block':'none';
  document.getElementById('loginError').classList.remove('show');
  document.getElementById('signupError').classList.remove('show');
}

function showAuthError(formId, msg) {
  const el = document.getElementById(formId+'Error');
  document.getElementById(formId+'ErrorMsg').textContent = msg;
  el.classList.add('show');
}

function unlockApp(name) {
  const ini = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('avatarInitial').textContent = ini;
  document.getElementById('avatarName').textContent = name.split(' ')[0];
  const overlay = document.getElementById('authOverlay');
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity .4s';
  setTimeout(()=>overlay.classList.add('hidden'), 400);
  toast(`Welcome back, ${name.split(' ')[0]}!`, 'success');
}

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  if (!email || !pass) { showAuthError('login','Please enter your email and password.'); return; }
  const user = registeredUsers.find(u=>u.email.toLowerCase()===email.toLowerCase()&&u.password===pass);
  if (!user) { showAuthError('login','Invalid email or password. Try demo@sslwatch.io / password123'); return; }
  unlockApp(user.name);
}

function doSignup() {
  const name    = document.getElementById('signupName').value.trim();
  const email   = document.getElementById('signupEmail').value.trim();
  const pass    = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  if (!name||!email||!pass||!confirm) { showAuthError('signup','Please fill in all fields.'); return; }
  if (pass.length < 8) { showAuthError('signup','Password must be at least 8 characters.'); return; }
  if (pass !== confirm) { showAuthError('signup','Passwords do not match.'); return; }
  if (registeredUsers.find(u=>u.email.toLowerCase()===email.toLowerCase())) {
    showAuthError('signup','An account with this email already exists.'); return;
  }
  registeredUsers.push({ email, password: pass, name });
  unlockApp(name);
}

function oauthLogin(provider) {
  toast(`Connecting to ${provider}...`, 'info');
  setTimeout(()=>unlockApp('Demo User'), 1200);
}

function forgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) { showAuthError('login','Enter your email first, then click Forgot password.'); return; }
  toast(`Reset link sent to ${email}`, 'success');
}

function doLogout() {
  if (!confirm('Sign out of SSLWatch?')) return;
  const overlay = document.getElementById('authOverlay');
  overlay.classList.remove('hidden');
  overlay.style.opacity = '0';
  requestAnimationFrame(()=>{ overlay.style.transition='opacity .3s'; overlay.style.opacity='1'; });
  document.getElementById('loginPassword').value='';
  document.getElementById('loginError').classList.remove('show');
}

// ===== REVIEW LOGIC =====
const ratingLabels = ['','Terrible','Poor','Average','Good','Excellent!'];
let selectedRating = 0;

function highlightStars(stars, val) {
  stars.forEach(s => { s.style.color = +s.dataset.val <= val ? 'var(--amber)' : 'var(--border2)'; });
}

function submitReview() {
  if (!selectedRating) { toast('Please select a star rating first.', 'warn'); return; }
  toast(`Thanks for your ${ratingLabels[selectedRating]} review! ⭐`, 'success');
  document.getElementById('reviewText').value = '';
  selectedRating = 0;
  document.querySelectorAll('#starRating .review-star').forEach(s => s.style.color = 'var(--border2)');
  document.querySelectorAll('.cat-star').forEach(s => s.style.color = 'var(--border2)');
  document.getElementById('ratingLabel').textContent = 'Click a star to rate';
  document.getElementById('ratingLabel').style.color = 'var(--text3)';
}

function submitContact() {
  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const subject = document.getElementById('contactSubject').value;
  const msg = document.getElementById('contactMessage').value.trim();
  if (!name || !email || !subject || !msg) { toast('Please fill in all contact fields.', 'warn'); return; }
  toast(`Message sent! We'll reply to ${email} soon.`, 'success');
  document.getElementById('contactName').value = '';
  document.getElementById('contactEmail').value = '';
  document.getElementById('contactSubject').value = '';
  document.getElementById('contactMessage').value = '';
}

// ===================================================
//  AI CHATBOX
// ===================================================

const CHAT_SYSTEM_PROMPT = `You are SSLBot, a friendly and expert AI assistant embedded inside SSLWatch — an SSL certificate monitoring dashboard.

You help users with:
- Understanding SSL/TLS certificates, expiry, and renewal
- Interpreting certificate grades, TLS protocol versions, and key sizes
- Security best practices for web certificates
- Explaining alerts, risk scores, and domain statuses shown in the dashboard
- Answering general cybersecurity and HTTPS questions

Current monitored domains summary:
- 8 domains total: 5 valid, 2 expiring soon, 1 critical
- Critical: legacy.payments.io — expires in 3 days, TLS 1.1, 1024-bit key (HIGH risk)
- Warning: staging.corp.net (11 days), api.myapp.io (22 days)
- All others are healthy (Grade A or A+)

Keep replies concise, helpful, and clear. Use plain language. Use emojis sparingly for warmth.`;

let chatHistory = [];
let chatOpen = false;
let chatBadgeCount = 1;

function toggleChat() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chatWindow');
  const badge = document.getElementById('chatBadge');
  if(chatOpen){
    win.classList.add('open');
    badge.style.display = 'none';
    chatBadgeCount = 0;
    setTimeout(()=>document.getElementById('chatInputField').focus(), 300);
  } else {
    win.classList.remove('open');
  }
}

function closeChat() {
  chatOpen = false;
  document.getElementById('chatWindow').classList.remove('open');
}

function clearChat() {
  chatHistory = [];
  const msgs = document.getElementById('chatMessages');
  msgs.innerHTML = '';
  addBotMessage("Chat cleared. Ask me anything about your SSL certificates! 🔒");
}

function nowTime(){
  return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}

function addBotMessage(text){
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = `
    <div class="chat-msg-avatar"><i class="fas fa-robot"></i></div>
    <div>
      <div class="chat-bubble">${text}</div>
      <div class="chat-bubble-time">${nowTime()}</div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addUserMessage(text){
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.innerHTML = `
    <div class="chat-msg-avatar"><i class="fas fa-user"></i></div>
    <div>
      <div class="chat-bubble">${escHtml(text)}</div>
      <div class="chat-bubble-time">${nowTime()}</div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function escHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showTyping(){
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'chat-typing-indicator';
  div.innerHTML = `
    <div class="chat-msg-avatar"><i class="fas fa-robot"></i></div>
    <div class="chat-typing">
      <div class="chat-typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function hideTyping(){
  const el = document.getElementById('chat-typing-indicator');
  if(el) el.remove();
}

async function sendChatMessage(textOverride){
  const input = document.getElementById('chatInputField');
  const sendBtn = document.getElementById('chatSendBtn');
  const text = (textOverride || input.value).trim();
  if(!text) return;

  input.value = '';
  input.style.height = '38px';
  sendBtn.disabled = true;

  addUserMessage(text);
  chatHistory.push({ role: 'user', content: text });

  // Hide chips after first message
  const chips = document.getElementById('chatChips');
  if(chips) chips.style.display = 'none';

  showTyping();

  try {
    const response = await apiFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.slice(0, -1)
      })
    });

    const data = await response.json();
    hideTyping();

    if(!response.ok || data.error){
      addBotMessage(`⚠️ Error: ${data.error || 'Something went wrong. Please try again.'}`);
    } else {
      const reply = data.reply || 'I could not generate a reply. Please try again.';
      // Convert line breaks and basic markdown for readability
      const formatted = escHtml(reply)
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/\n\n/g,'<br><br>')
        .replace(/\n/g,'<br>');
      addBotMessage(formatted);
      chatHistory.push({ role: 'assistant', content: reply });
      if(data.fallback){
        toast('AI API key not set. Using built-in SSLBot replies.','info');
      }
    }
  } catch(err) {
    hideTyping();
    addBotMessage('⚠️ Unable to reach the AI service. Please check your connection and try again.');
  }

  sendBtn.disabled = false;
  input.focus();
}

function sendChip(text){
  document.getElementById('chatInputField').value = text;
  sendChatMessage(text);
}

// ===== INIT =====
window.onload = async () => {
  try {
    await loadStoredDomains();
  } catch(err) {
    toast('Database unavailable. Showing fallback demo data.','error');
  }
  renderMiniTable();
  renderFullTable();
  renderAlerts();
  setTimeout(renderHealthChart,200);
  setTimeout(renderStatusChart,200);

  // Auth enter-key support
  ['loginEmail','loginPassword'].forEach(id=>{
    document.getElementById(id).addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
  });
  ['signupName','signupEmail','signupPassword','signupConfirm'].forEach(id=>{
    document.getElementById(id).addEventListener('keydown',e=>{ if(e.key==='Enter') doSignup(); });
  });

  // Review stars
  const stars = document.querySelectorAll('#starRating .review-star');
  stars.forEach(star => {
    star.addEventListener('mouseover', () => highlightStars(stars, +star.dataset.val));
    star.addEventListener('mouseout', () => highlightStars(stars, selectedRating));
    star.addEventListener('click', () => {
      selectedRating = +star.dataset.val;
      highlightStars(stars, selectedRating);
      document.getElementById('ratingLabel').textContent = ratingLabels[selectedRating];
      document.getElementById('ratingLabel').style.color = selectedRating >= 4 ? 'var(--green)' : selectedRating === 3 ? 'var(--amber)' : 'var(--red)';
    });
  });
  document.querySelectorAll('.cat-stars').forEach(group => {
    const catStars = group.querySelectorAll('.cat-star');
    let catSelected = 0;
    catStars.forEach(s => {
      s.addEventListener('mouseover', () => highlightStars(catStars, +s.dataset.val));
      s.addEventListener('mouseout', () => highlightStars(catStars, catSelected));
      s.addEventListener('click', () => { catSelected = +s.dataset.val; highlightStars(catStars, catSelected); });
    });
  });

  // Nav active state
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Chat input — send on Enter (Shift+Enter for newline)
  const chatInput = document.getElementById('chatInputField');
  if(chatInput){
    chatInput.addEventListener('keydown', e => {
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // Initial bot greeting
  setTimeout(() => {
    addBotMessage("👋 Hi! I'm <strong>SSLBot</strong>, your AI security assistant.<br>I can help you understand your certificates, explain risks, or answer SSL questions. What would you like to know?");
  }, 600);
};
