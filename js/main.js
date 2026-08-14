/* ============================================================
 * AutoML Lab — 데이터 로드 + 렌더링
 * 학생 여러분: 이 파일은 수정할 필요 없습니다. data/*.yml 만 수정하세요.
 * ============================================================ */

'use strict';

/* ---------- 유틸 ---------- */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function loadYaml(path) {
  const res = await fetch(path + '?v=' + Date.now()); // 학생 수정 즉시 반영되도록 캐시 무효화
  if (!res.ok) throw new Error(`파일을 불러오지 못했습니다 (HTTP ${res.status})`);
  return jsyaml.load(await res.text());
}

function showDataError(containerId, err, path) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const line = err && err.mark ? ` — <strong>${err.mark.line + 1}번째 줄</strong> 근처를 확인하세요` : '';
  el.innerHTML = `
    <div class="data-error">
      <p>⚠️ <code>${esc(path)}</code> 파일에 오류가 있습니다${line}.</p>
      <p class="dim">${esc(err.message ? err.message.split('\n')[0] : err)}</p>
      <p class="dim">들여쓰기(스페이스 2칸), 콜론 뒤 공백, 따옴표 짝을 확인하세요. <strong>UPDATE_GUIDE.md</strong> 참고.</p>
    </div>`;
}

/* ---------- 멤버 ---------- */

const ROLE_ORDER = { '교수': 0, '박사과정': 1, '석사과정': 2, '학부연구생': 3, '졸업생': 4 };
const AVATAR_HUES = [212, 192, 174, 38, 152, 20];

// 논문 저자 볼드 처리용 — members.yml 로드 성공 시 확장됨
const labNames = new Set(['Wangduk Seo', '서왕덕']);

function avatarHtml(name, idx) {
  const hue = AVATAR_HUES[idx % AVATAR_HUES.length];
  return `<div class="avatar" style="--h:${hue}"><span>${esc(String(name).charAt(0))}</span></div>`;
}

function renderMembers(list) {
  if (!Array.isArray(list)) throw new Error('멤버 목록 형식이 잘못되었습니다 (리스트가 아님)');
  const grid = document.getElementById('members-grid');

  const valid = list.filter(m => {
    if (!m || !m.name || !m.role) { console.warn('[members.yml] name/role 누락 항목 건너뜀:', m); return false; }
    return true;
  });
  valid.forEach(m => { labNames.add(m.name); if (m.name_en) labNames.add(m.name_en); });
  valid.sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  const prof = valid.find(m => m.role === '교수' && m.photo);
  if (prof) setProfPhoto(prof.photo);

  const cards = valid.map((m, i) => {
    const photo = m.photo
      ? `<img class="member-photo" src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy"
           onerror="this.outerHTML=this.dataset.fallback" data-fallback="${esc(avatarHtml(m.name, i))}">`
      : avatarHtml(m.name, i);
    const interests = Array.isArray(m.interests)
      ? m.interests.map(t => `<span class="chip">${esc(t)}</span>`).join('') : '';
    const links = [
      m.email ? `<a href="mailto:${esc(m.email)}" title="이메일" aria-label="이메일">✉️</a>` : '',
      m.github ? `<a href="https://github.com/${esc(m.github)}" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub">
        <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>` : '',
    ].join('');
    return `
      <article class="member-card reveal">
        ${photo}
        <h3>${esc(m.name)} ${m.name_en ? `<span class="member-en">${esc(m.name_en)}</span>` : ''}</h3>
        <p class="member-role role-${ROLE_ORDER[m.role] ?? 9}">${esc(m.role)}</p>
        ${interests ? `<div class="member-interests">${interests}</div>` : ''}
        <div class="member-links">${links}</div>
      </article>`;
  });

  cards.push(`
    <a href="#join" class="member-card recruit-card reveal">
      <div class="avatar recruit-avatar"><span>?</span></div>
      <h3>YOU</h3>
      <p class="member-role">다음 멤버는 당신!</p>
      <p class="recruit-hint">학부연구생 · 석사 · 박사 모집 중 →</p>
    </a>`);

  grid.innerHTML = cards.join('');
  observeReveals(grid);
}

/* ---------- 논문 ---------- */

const PUB_TYPES = {
  journal:    { label: '국제 저널',  badge: 'badge-journal' },
  conference: { label: '국제 학회',  badge: 'badge-conference' },
  domestic:   { label: '국내 저널',  badge: 'badge-domestic' },
  patent:     { label: '특허',       badge: 'badge-patent' },
};

let pubData = [];

function boldLabAuthors(authors) {
  let html = esc(authors);
  for (const n of labNames) {
    html = html.split(esc(n)).join(`<strong>${esc(n)}</strong>`);
  }
  return html;
}

function renderPubList(filter) {
  const listEl = document.getElementById('pub-list');
  const items = filter === 'all' ? pubData : pubData.filter(p => p.type === filter);
  if (!items.length) { listEl.innerHTML = '<p class="dim pub-empty">해당하는 실적이 없습니다.</p>'; return; }

  const byYear = new Map();
  for (const p of items) {
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year).push(p);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  listEl.innerHTML = years.map(y => `
    <div class="pub-year-group">
      <h3 class="pub-year-header"><span>${esc(y)}</span></h3>
      ${byYear.get(y).map(p => {
        const t = PUB_TYPES[p.type] || { label: p.type, badge: '' };
        const title = p.link
          ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
          : esc(p.title);
        return `
          <article class="pub-item ${p.highlight ? 'pub-highlight' : ''}">
            <div class="pub-badges">
              <span class="badge ${t.badge}">${esc(t.label)}</span>
              ${p.highlight ? '<span class="badge badge-star">★ 대표 실적</span>' : ''}
            </div>
            <h4 class="pub-title">${title}</h4>
            <p class="pub-authors">${boldLabAuthors(p.authors || '')}</p>
            <p class="pub-venue" ${p.venue_full ? `title="${esc(p.venue_full)}"` : ''}>${esc(p.venue || '')}${p.venue_full ? ` <span class="dim">· ${esc(p.venue_full)}</span>` : ''}</p>
          </article>`;
      }).join('')}
    </div>`).join('');
}

function renderPublications(list) {
  if (!Array.isArray(list)) throw new Error('논문 목록 형식이 잘못되었습니다 (리스트가 아님)');
  pubData = list.filter(p => {
    if (!p || !p.title || !p.year || !p.type) { console.warn('[publications.yml] title/year/type 누락 항목 건너뜀:', p); return false; }
    return true;
  });

  // Hero 통계 목표값 설정
  const count = t => pubData.filter(p => p.type === t).length;
  const targets = { 'stat-journal': count('journal'), 'stat-conference': count('conference'), 'stat-patent': count('patent') };
  for (const [id, n] of Object.entries(targets)) {
    const el = document.getElementById(id);
    if (el) el.dataset.target = n;
  }
  startCountUp();

  // 필터 버튼
  const filtersEl = document.getElementById('pub-filters');
  const kinds = [['all', '전체'], ...Object.entries(PUB_TYPES).map(([k, v]) => [k, v.label])];
  filtersEl.innerHTML = kinds.map(([k, label]) =>
    `<button class="filter-btn ${k === 'all' ? 'active' : ''}" data-filter="${k}">${label}
       <span class="filter-count">${k === 'all' ? pubData.length : pubData.filter(p => p.type === k).length}</span>
     </button>`).join('');
  filtersEl.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderPubList(btn.dataset.filter);
  });

  renderPubList('all');
}

/* ---------- 프로젝트 ---------- */

function renderProjects(list) {
  if (!Array.isArray(list)) throw new Error('프로젝트 목록 형식이 잘못되었습니다 (리스트가 아님)');
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = list.filter(p => {
    if (!p || !p.title) { console.warn('[projects.yml] title 누락 항목 건너뜀:', p); return false; }
    return true;
  }).map(p => `
    <article class="project-card reveal">
      <div class="project-top">
        <span class="badge ${p.status === '진행중' ? 'badge-active' : 'badge-done'}">${p.status === '진행중' ? '<i class="pulse-dot"></i>진행중' : '완료'}</span>
        <span class="dim project-period">${esc(p.period || '')}</span>
      </div>
      <h3>${esc(p.title)}</h3>
      <p class="project-desc">${esc(p.description || '')}</p>
      ${p.funder ? `<p class="project-funder">${esc(p.funder)}</p>` : ''}
    </article>`).join('');
  observeReveals(grid);
}

/* ---------- 소식 ---------- */

const NEWS_ICONS = { paper: '📄', award: '🏆', member: '👋', etc: '📢' };

function renderNews(list) {
  if (!Array.isArray(list)) throw new Error('소식 목록 형식이 잘못되었습니다 (리스트가 아님)');
  const el = document.getElementById('news-timeline');
  const items = list.filter(n => {
    if (!n || !n.date || !n.text) { console.warn('[news.yml] date/text 누락 항목 건너뜀:', n); return false; }
    return true;
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));

  el.innerHTML = items.map(n => `
    <div class="news-item reveal">
      <div class="news-dot"><span>${NEWS_ICONS[n.category] || NEWS_ICONS.etc}</span></div>
      <div class="news-body">
        <time class="news-date">${esc(String(n.date))}</time>
        <p>${esc(n.text)}</p>
      </div>
    </div>`).join('');
  observeReveals(el);
}

/* ---------- 모션 설정 ---------- */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 섹션 리빌 ---------- */

const revealObserver = REDUCED_MOTION ? null : new IntersectionObserver(entries => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  }
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

function observeReveals(root) {
  (root || document).querySelectorAll('.reveal:not(.visible)').forEach(el => {
    if (revealObserver) revealObserver.observe(el);
    else el.classList.add('visible');
  });
}

/* ---------- 통계 카운트업 ---------- */

let countUpDone = false;

function animateCount(el, target) {
  const dur = 1200, t0 = performance.now();
  const tick = now => {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); // ease-out cubic
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function startCountUp() {
  const stats = document.getElementById('hero-stats');
  if (!stats) return;
  const run = () => {
    if (countUpDone) return;
    countUpDone = true;
    stats.querySelectorAll('.stat-num').forEach(el => {
      const target = parseInt(el.dataset.target, 10) || 0;
      if (REDUCED_MOTION) el.textContent = target;
      else animateCount(el, target);
    });
  };
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { run(); io.disconnect(); }
  }, { threshold: 0.4 });
  io.observe(stats);
}

/* ---------- 타이핑 로테이션 ---------- */

function startTyping() {
  const el = document.getElementById('typing-target');
  if (!el) return;
  const words = ['신경망 구조 탐색', '효율적 딥러닝', '특징 선택', '진화 알고리즘'];
  if (REDUCED_MOTION) { el.textContent = words.join(' · '); return; }
  let wi = 0, ci = 0, deleting = false;
  (function type() {
    const word = words[wi];
    ci += deleting ? -1 : 1;
    el.textContent = word.slice(0, ci);
    let delay = deleting ? 45 : 95;
    if (!deleting && ci === word.length) { delay = 1700; deleting = true; }
    else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; delay = 350; }
    setTimeout(type, delay);
  })();
}

/* ---------- 스크롤: 진행바 + 내비 상태 ---------- */

function startScrollFx() {
  const bar = document.getElementById('scroll-progress');
  const nav = document.getElementById('navbar');
  const links = [...document.querySelectorAll('#nav-menu a[href^="#"]')];
  const sections = links
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  let ticking = false;
  const update = () => {
    ticking = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    nav.classList.toggle('scrolled', window.scrollY > 24);

    let current = null;
    for (const s of sections) {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.4) current = s.id;
    }
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

/* ---------- 모바일 메뉴 ---------- */

function startNavToggle() {
  const btn = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  menu.addEventListener('click', e => {
    if (e.target.closest('a')) { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  });
}

/* ---------- 신경망 파티클 배경 ---------- */

function startNeuralBg() {
  const canvas = document.getElementById('neural-bg');
  const ctx = canvas.getContext('2d');
  const mobile = window.innerWidth < 768;
  const N = mobile ? 30 : 60;
  const LINK_DIST = 140, MOUSE_R = 180;
  let W, H, nodes = [], raf = null;
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    nodes = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: 1.2 + Math.random() * 1.8,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      const dx = n.x - mouse.x, dy = n.y - mouse.y;
      const d = Math.hypot(dx, dy);
      if (d < MOUSE_R && d > 0.01) {
        const f = (MOUSE_R - d) / MOUSE_R * 0.6;
        n.x += (dx / d) * f; n.y += (dy / d) * f;
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK_DIST) {
          ctx.strokeStyle = `rgba(37, 99, 235, ${(1 - d / LINK_DIST) * 0.14})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      ctx.fillStyle = 'rgba(37, 99, 235, 0.32)';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop() { draw(); raf = requestAnimationFrame(loop); }

  resize(); seed();

  if (REDUCED_MOTION) { draw(); window.addEventListener('resize', () => { resize(); seed(); draw(); }); return; }

  window.addEventListener('resize', () => { resize(); seed(); });
  window.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  window.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });
  document.addEventListener('visibilitychange', () => {   // 탭 비활성 시 정지
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (!raf) loop();
  });
  loop();
}

/* ---------- 교수 사진 — members.yml 의 교수 photo 필드와 자동 연동 ---------- */

function setProfPhoto(src) {
  const img = new Image();
  img.onload = () => {
    const wrap = document.getElementById('prof-photo');
    if (wrap) { wrap.innerHTML = ''; wrap.appendChild(img); wrap.classList.add('has-photo'); }
  };
  img.alt = '지도교수 사진';
  img.src = src;
}

/* ---------- 부트스트랩 ---------- */

async function boot() {
  observeReveals(document); // HTML에 정적으로 있는 .reveal 요소 처리
  startTyping();
  startScrollFx();
  startNavToggle();
  startNeuralBg();

  // members 먼저 (논문 저자 볼드에 멤버 이름 필요) — 실패해도 기본 이름으로 진행
  try {
    renderMembers(await loadYaml('data/members.yml'));
  } catch (err) {
    showDataError('members-grid', err, 'data/members.yml');
  }

  const rest = [
    ['data/publications.yml', renderPublications, 'pub-list'],
    ['data/projects.yml', renderProjects, 'projects-grid'],
    ['data/news.yml', renderNews, 'news-timeline'],
  ];
  await Promise.all(rest.map(([path, render, id]) =>
    loadYaml(path).then(render).catch(err => showDataError(id, err, path))
  ));
}

document.addEventListener('DOMContentLoaded', boot);
