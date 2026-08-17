(() => {
  const BOOK = window.SG_BOOK;
  const entries = BOOK.entries;
  const chapters = BOOK.chapters;
  const byId = new Map(entries.map(e => [e.id, e]));
  const chapterById = new Map(chapters.map(c => [c.id, c]));
  const chapterEntries = new Map(chapters.map(c => [c.id, entries.filter(e => e.chapterId === c.id)]));
  const $ = id => document.getElementById(id);
  const els = {toc:$('toc'),sidebar:$('sidebar'),overlay:$('overlay'),search:$('searchInput'),clear:$('clearSearch'),count:$('resultCount'),collapse:$('collapseAll'),welcome:$('welcome'),article:$('article'),welcomeTitle:$('welcomeTitle'),welcomeDesc:$('welcomeDesc'),appTitle:$('appTitle'),chapterStat:$('chapterStat'),termStat:$('termStat'),chapterCount:$('chapterCount'),termCount:$('termCount'),modeStat:$('modeStat'),start:$('startBtn'),crumbs:$('crumbs'),chapterLabel:$('chapterLabel'),termTitle:$('termTitle'),termMeta:$('termMeta'),body:$('articleBody'),prev:$('prevBtn'),next:$('nextBtn'),tocBtn:$('tocBtn'),prevLabel:$('prevLabel'),nextLabel:$('nextLabel'),tocLabel:$('tocLabel'),menu:$('menuBtn'),theme:$('themeBtn'),font:$('fontBtn'),brand:$('brandBtn')};
  const ui = {
    zh:{title:'中日语言切换电子教材',welcome:'中日语言切换电子教材',desc:'点击目录的大分类，可连续阅读该分类下的全部专业用语；点击具体用语，会直接定位到本章中的对应位置。',chapter:'章节',term:'知识点',mode:'语言模式',start:'开始阅读',collapse:'收起',toc:'目录',prev:'上一章',next:'下一章',ja:'日文原文',zh:'中文解释',search:'搜索 / 日文 / English',terms:'个专业用语'},
    ja:{title:'日中言語切替電子教材',welcome:'日中言語切替電子教材',desc:'目次の大分類を選ぶと、その章の全用語を続けて読めます。個別の用語を選ぶと、その章内の該当位置へ直接移動します。',chapter:'章',term:'用語',mode:'表示モード',start:'読み始める',collapse:'閉じる',toc:'目次',prev:'前の章',next:'次の章',ja:'日本語解説',zh:'中国語訳',search:'検索 / 中文 / English',terms:'用語'},
    bi:{title:'中日语言切换电子教材',welcome:'SG 中日双语电子教材',desc:'点击大分类阅读整章；点击具体用语直接定位。中文、日本語和中日对照三种模式可随时切换。',chapter:'章节 / 章',term:'知识点 / 用語',mode:'语言模式',start:'开始阅读 / 読む',collapse:'收起',toc:'目录 / 目次',prev:'上一章',next:'下一章',ja:'日本語',zh:'中文',search:'搜索 / 検索 / Search',terms:'词条 / 用語'}
  };
  const params = new URLSearchParams(location.search);
  let lang = params.get('lang') || localStorage.getItem('sg-lang') || 'bi';
  if (!['zh','ja','bi'].includes(lang)) lang = 'bi';
  const initialHash = (location.hash || '').replace('#','');
  let currentId = '';
  let currentChapterId = '';
  if (byId.has(initialHash)) { currentId = initialHash; currentChapterId = byId.get(initialHash).chapterId; }
  else if (initialHash.startsWith('chapter-') && chapterById.has(initialHash.slice(8))) currentChapterId = initialHash.slice(8);
  else {
    const savedId = localStorage.getItem('sg-last') || '';
    const savedChapter = localStorage.getItem('sg-last-chapter') || '';
    if (byId.has(savedId)) { currentId = savedId; currentChapterId = byId.get(savedId).chapterId; }
    else if (chapterById.has(savedChapter)) currentChapterId = savedChapter;
  }
  let collapsed = new Set();
  let fontMode = localStorage.getItem('sg-font') || 'normal';
  const escapeHtml = s => String(s || '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const norm = s => String(s || '').normalize('NFKC').toLowerCase();
  const termName = e => lang === 'zh' ? e.termZh : lang === 'ja' ? e.termJa : `${e.termJa}｜${e.termZh}`;
  const chapterName = c => lang === 'zh' ? c.zh : lang === 'ja' ? c.ja : `${c.ja}｜${c.zh}`;

  function applyUi(){
    document.documentElement.lang = lang === 'ja' ? 'ja' : 'zh-CN';
    const t = ui[lang]; document.title=`SG | ${t.title}`; els.appTitle.textContent=t.title; els.welcomeTitle.textContent=t.welcome; els.welcomeDesc.textContent=t.desc; els.chapterStat.textContent=t.chapter; els.termStat.textContent=t.term; els.modeStat.textContent=t.mode; els.start.textContent=t.start; els.collapse.textContent=t.collapse; els.prevLabel.textContent=t.prev; els.nextLabel.textContent=t.next; els.tocLabel.textContent=t.toc; els.search.placeholder=t.search;
    els.chapterCount.textContent=chapters.length;els.termCount.textContent=entries.length;document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));
  }
  function setLang(v){lang=v;localStorage.setItem('sg-lang',v);applyUi();renderToc();if(currentChapterId){renderChapter(currentChapterId,false);if(currentId)requestAnimationFrame(()=>scrollToEntry(currentId,false));}}

  function renderToc(){
    const q=norm(els.search.value.trim()); let shown=0; const frag=document.createDocumentFragment();
    if(q){
      const hits=entries.filter(e=>norm([e.termZh,e.termJa,e.english,e.explanationZh,e.explanationJa,e.chapterZh,e.chapterJa].join(' ')).includes(q));shown=hits.length;let lastCh='';
      hits.forEach(e=>{if(e.chapterId!==lastCh){const c=chapterById.get(e.chapterId);const div=document.createElement('button');div.className='search-chapter search-chapter-button';div.textContent=chapterName(c);div.onclick=()=>openChapter(c.id,true,true);frag.appendChild(div);lastCh=e.chapterId}frag.appendChild(makeTermButton(e,true));});
      if(!hits.length){const x=document.createElement('div');x.className='search-empty';x.textContent=lang==='ja'?'該当する用語がありません':'没有找到匹配的知识点';frag.appendChild(x)}
    } else {
      chapters.forEach(c=>{const wrap=document.createElement('section');wrap.className='chapter'+(collapsed.has(c.id)?' collapsed':'')+(c.id===currentChapterId?' active-chapter':'');wrap.dataset.chapter=c.id;
        const row=document.createElement('div');row.className='chapter-row';
        const toggle=document.createElement('button');toggle.className='chapter-toggle';toggle.setAttribute('aria-label','展开/收起');toggle.innerHTML='<span class="chev">▾</span>';toggle.onclick=()=>{collapsed.has(c.id)?collapsed.delete(c.id):collapsed.add(c.id);wrap.classList.toggle('collapsed')};
        const title=document.createElement('button');title.className='chapter-title';title.innerHTML=`<span>${escapeHtml(chapterName(c))}</span><span class="chapter-count">${c.count||chapterEntries.get(c.id).length}</span>`;title.onclick=()=>openChapter(c.id,true,true);
        row.append(toggle,title);const terms=document.createElement('div');terms.className='terms';chapterEntries.get(c.id).forEach(e=>terms.appendChild(makeTermButton(e,false)));wrap.append(row,terms);frag.appendChild(wrap);shown+=chapterEntries.get(c.id).length;});
    }
    els.toc.replaceChildren(frag);els.count.textContent=`${shown} / ${entries.length}`;
  }
  function makeTermButton(e,searchMode){const b=document.createElement('button');b.className='term-link'+(e.id===currentId?' active':'');b.dataset.id=e.id;b.innerHTML=`<span>${escapeHtml(termName(e))}</span>${searchMode||lang!=='bi'?`<span class="en">${escapeHtml(e.english)}</span>`:''}`;b.onclick=()=>openEntry(e.id,true);return b}

  function entryHtml(e){
    const t=ui[lang];let reading='';if((lang==='ja'||lang==='bi')&&e.reading)reading=`<span class="dot"></span><span class="reading">${lang==='ja'?'読み':'读音'}：${escapeHtml(e.reading)}</span>`;
    let explanation='';
    if(lang==='zh') explanation=`<div class="prose"><p>${escapeHtml(e.explanationZh)}</p></div>`;
    else if(lang==='ja') explanation=`<div class="prose"><p>${escapeHtml(e.explanationJa)}</p></div>`;
    else explanation=`<div class="prose"><section class="language-block ja"><h3>${t.ja}</h3><p>${escapeHtml(e.explanationJa)}</p></section><section class="language-block zh"><h3>${t.zh}</h3><p>${escapeHtml(e.explanationZh)}</p></section></div>`;
    const source=e.breadcrumb&&(lang==='ja'||lang==='bi')?`<div class="source-path">${escapeHtml(e.breadcrumb)}</div>`:'';
    return `<section class="chapter-entry" id="entry-${escapeHtml(e.id)}" data-entry-id="${escapeHtml(e.id)}"><header class="entry-head"><h2>${escapeHtml(termName(e))}</h2><div class="term-meta"><span class="english">${escapeHtml(e.english)}</span>${reading}</div></header>${explanation}${source}</section>`;
  }
  function renderChapter(chapterId,scrollTop){
    const c=chapterById.get(chapterId);if(!c)return;const list=chapterEntries.get(chapterId)||[];currentChapterId=chapterId;localStorage.setItem('sg-last-chapter',chapterId);
    els.welcome.classList.add('hidden');els.article.classList.remove('hidden');els.crumbs.textContent=chapterName(c);els.chapterLabel.textContent=ui[lang].chapter;els.termTitle.textContent=chapterName(c);els.termMeta.innerHTML=`<span class="chapter-summary">${list.length} ${escapeHtml(ui[lang].terms)}</span>`;els.body.innerHTML=`<div class="chapter-reader">${list.map(entryHtml).join('')}</div>`;
    const ci=chapters.findIndex(x=>x.id===chapterId);els.prev.disabled=ci<=0;els.next.disabled=ci>=chapters.length-1;els.prev.dataset.target=ci>0?chapters[ci-1].id:'';els.next.dataset.target=ci<chapters.length-1?chapters[ci+1].id:'';if(scrollTop)window.scrollTo({top:0,behavior:'smooth'});
  }
  function openChapter(chapterId,pushHash=true,scrollTop=true){
    if(!chapterById.has(chapterId))return;
    // Clicking a large category always opens the complete chapter on the right.
    // Keep its child terms expanded in the left TOC so the reader can jump within the chapter.
    collapsed.delete(chapterId);
    currentChapterId=chapterId;
    currentId='';
    localStorage.setItem('sg-last-chapter',chapterId);
    if(pushHash)history.replaceState(null,'','#chapter-'+chapterId);
    renderChapter(chapterId,scrollTop);
    renderToc();
    closeMenu();
  }

  function highlightEntry(id){
    document.querySelectorAll('.chapter-entry.jump-highlight').forEach(n=>n.classList.remove('jump-highlight'));
    const node=document.getElementById('entry-'+id);
    if(!node)return;
    node.classList.add('jump-highlight');
    window.clearTimeout(highlightEntry._timer);
    highlightEntry._timer=window.setTimeout(()=>node.classList.remove('jump-highlight'),1600);
  }

  function scrollToEntry(id,smooth=true){
    const node=document.getElementById('entry-'+id);
    if(!node)return;
    node.scrollIntoView({behavior:smooth?'smooth':'auto',block:'start'});
    highlightEntry(id);
  }

  function openEntry(id,pushHash=true){
    const e=byId.get(id);
    if(!e)return;

    const chapterAlreadyRendered =
      currentChapterId===e.chapterId &&
      !els.article.classList.contains('hidden') &&
      document.getElementById('entry-'+id);

    currentId=id;
    currentChapterId=e.chapterId;
    collapsed.delete(e.chapterId);
    localStorage.setItem('sg-last',id);
    localStorage.setItem('sg-last-chapter',e.chapterId);
    if(pushHash)history.replaceState(null,'','#'+id);

    // IMPORTANT: clicking a small TOC item does NOT switch to a single-item page.
    // The complete chapter remains rendered; we only jump to that term's anchor.
    if(!chapterAlreadyRendered) renderChapter(e.chapterId,false);
    renderToc();
    closeMenu();
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToEntry(id,true)));
  }

  function closeMenu(){document.body.classList.remove('menu-open')}
  function showHome(){currentId='';currentChapterId='';history.replaceState(null,'',location.pathname+location.search);els.article.classList.add('hidden');els.welcome.classList.remove('hidden');renderToc();closeMenu();window.scrollTo({top:0,behavior:'smooth'})}
  els.menu.onclick=()=>document.body.classList.toggle('menu-open');els.overlay.onclick=closeMenu;els.tocBtn.onclick=()=>document.body.classList.toggle('menu-open');els.clear.onclick=()=>{els.search.value='';renderToc();els.search.focus()};els.search.oninput=renderToc;els.collapse.onclick=()=>{if(collapsed.size===chapters.length)collapsed.clear();else chapters.forEach(c=>collapsed.add(c.id));renderToc()};els.start.onclick=()=>openChapter(chapters[0].id,true,true);els.prev.onclick=()=>els.prev.dataset.target&&openChapter(els.prev.dataset.target,true,true);els.next.onclick=()=>els.next.dataset.target&&openChapter(els.next.dataset.target,true,true);els.brand.onclick=showHome;els.brand.onkeydown=e=>{if(e.key==='Enter')showHome()};document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
  els.theme.onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('sg-theme',document.body.classList.contains('dark')?'dark':'light')};
  els.font.onclick=()=>{fontMode=fontMode==='normal'?'large':fontMode==='large'?'small':'normal';document.body.classList.remove('font-large','font-small');if(fontMode!=='normal')document.body.classList.add('font-'+fontMode);localStorage.setItem('sg-font',fontMode)};
  if(localStorage.getItem('sg-theme')==='dark'||(!localStorage.getItem('sg-theme')&&matchMedia('(prefers-color-scheme: dark)').matches))document.body.classList.add('dark');if(fontMode!=='normal')document.body.classList.add('font-'+fontMode);
  window.addEventListener('hashchange',()=>{const id=location.hash.replace('#','');if(byId.has(id))openEntry(id,false);else if(id.startsWith('chapter-')&&chapterById.has(id.slice(8)))openChapter(id.slice(8),false,true)});
  applyUi();renderToc();if(currentChapterId){renderChapter(currentChapterId,false);if(currentId)requestAnimationFrame(()=>scrollToEntry(currentId,false))}
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
