/**
 * app.js · 渲染脚本
 *
 * 启动流程：
 *   1. 并行 fetch 所有模板文件
 *   2. 把模板内容克隆到对应 slot
 *   3. 绑定交互（导航点击、tab 切换、concepts 列表）
 */

// ---------- 模板缓存 ----------
const _tplCache = {};

/** 异步加载一个模板文件，缓存其 content fragment。 */
async function loadTemplate(url, id) {
  if (_tplCache[id]) return _tplCache[id];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const tpl = doc.querySelector('template');
  if (!tpl) throw new Error(`No <template> found in ${url}`);
  // 复制到当前文档（这样后续的 querySelectorAll('.tabs') 才能找到模板里的 .tab）
  const imported = document.importNode(tpl, true);
  document.body.appendChild(imported);
  _tplCache[id] = imported;
  return imported;
}

/** 把模板内容克隆并挂载到目标 slot。 */
function mountTemplate(tplId, slotSelector, opts) {
  opts = opts || {};
  const tpl = _tplCache[tplId];
  if (!tpl) { console.warn('[mountTemplate] 模板未加载：', tplId); return; }
  const slot = typeof slotSelector === 'string' ? document.querySelector(slotSelector) : slotSelector;
  if (!slot) { console.warn('[mountTemplate] slot 不存在：', slotSelector); return; }
  const fragment = tpl.content.cloneNode(true);
  if (opts.active && fragment.firstElementChild) {
    fragment.firstElementChild.className += ' active';
  }
  if (opts.mode === 'replace') slot.innerHTML = '';
  slot.appendChild(fragment);
}

// ---------- 模块清单 ----------
// 每个 entry = { tpl, url, slot, mode?, active? }
// 修改本表 = 加/减页面。改这里就够了，不用动模板文件本体。
const modules = [
  // 侧边栏三段（按声明顺序注入 <aside>）
  { tpl: 'tpl-header', url: 'templates/sidebar-header.html', slot: '.sidebar', mode: 'replace' },
  { tpl: 'tpl-nav',    url: 'templates/sidebar-nav.html',    slot: '.sidebar', mode: 'append' },
  { tpl: 'tpl-footer', url: 'templates/sidebar-footer.html', slot: '.sidebar', mode: 'append' },

  // 18 个内容页（按声明顺序注入 <main>）
  { tpl: 'tpl-page-overview',      url: 'templates/pages/overview.html',      slot: '#slot-pages' },
  { tpl: 'tpl-page-scripts',       url: 'templates/pages/scripts.html',       slot: '#slot-pages' },
  { tpl: 'tpl-page-orchestration', url: 'templates/pages/orchestration.html', slot: '#slot-pages' },
  { tpl: 'tpl-page-monitoring',    url: 'templates/pages/monitoring.html',    slot: '#slot-pages' },
  { tpl: 'tpl-page-sql',           url: 'templates/pages/sql.html',           slot: '#slot-pages' },
  { tpl: 'tpl-page-datasources',   url: 'templates/pages/datasources.html',   slot: '#slot-pages' },
  { tpl: 'tpl-page-aimodels',      url: 'templates/pages/aimodels.html',      slot: '#slot-pages' },
  { tpl: 'tpl-page-dictionary',    url: 'templates/pages/dictionary.html',    slot: '#slot-pages' },
  { tpl: 'tpl-page-wiki',          url: 'templates/pages/wiki.html',          slot: '#slot-pages' },
  { tpl: 'tpl-page-ai',            url: 'templates/pages/ai.html',            slot: '#slot-pages' },
  { tpl: 'tpl-page-concepts',      url: 'templates/pages/concepts.html',      slot: '#slot-pages' },
  { tpl: 'tpl-page-conflicts',     url: 'templates/pages/conflicts.html',     slot: '#slot-pages' },
  { tpl: 'tpl-page-problems',      url: 'templates/pages/problems.html',      slot: '#slot-pages' },
  { tpl: 'tpl-page-depth',         url: 'templates/pages/depth.html',         slot: '#slot-pages' },
  { tpl: 'tpl-page-methodologies', url: 'templates/pages/methodologies.html', slot: '#slot-pages' },
  { tpl: 'tpl-page-scenarios',     url: 'templates/pages/scenarios.html',     slot: '#slot-pages' },
  { tpl: 'tpl-page-axioms',        url: 'templates/pages/axioms.html',        slot: '#slot-pages' },
  { tpl: 'tpl-page-assets',        url: 'templates/pages/assets.html',        slot: '#slot-pages' }
];

// 第一个页面默认 active
modules[3].active = true;

// ---------- 启动 ----------
async function boot() {
  try {
    // 并行加载所有模板
    await Promise.all(modules.map(m => loadTemplate(m.url, m.tpl)));
    // 按顺序挂载（保证 sidebar 头/导航/底的顺序，pages 的顺序也保留）
    modules.forEach(m => mountTemplate(m.tpl, m.slot, m));
    // 挂载完成后绑定交互
    setupInteractions();
    console.log('[MeanFlow] 渲染完成，共加载', modules.length, '个模板');
  } catch (e) {
    console.error('[MeanFlow] 启动失败：', e);
    document.body.innerHTML = '<div style="padding:40px;color:#f85149;font-family:monospace;">'
      + '<h2>⚠ 加载失败</h2><pre>' + e.message + '</pre>'
      + '<p style="color:#8b949e;">提示：必须通过 HTTP 服务器访问（如 http://127.0.0.1:8000/），file:// 协议下 fetch 被浏览器禁止。</p>'
      + '</div>';
  }
}

// ---------- 交互逻辑（原 index.html 里的 JS，保留不变）----------
function setupInteractions() {

// 侧边栏导航点击
document.querySelectorAll('[data-nav]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const target = item.getAttribute('data-nav');
    document.querySelectorAll('[data-nav]').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(target).classList.add('active');
    window.scrollTo(0, 0);
  });
});

// 极简 tab 系统（嵌套兼容）
function setupTabs(tabs) {
  var allTabs = tabs.querySelectorAll('.tab');
  for (var i = 0; i < allTabs.length; i++) {
    (function(tab) {
      tab.onclick = function() {
        for (var j = 0; j < allTabs.length; j++) {
          allTabs[j].className = allTabs[j].className.replace(' active', '').replace('active', '').trim();
          if (allTabs[j].className.indexOf('tab') !== 0) allTabs[j].className = 'tab';
        }
        tab.className = 'tab active';

        var target = tab.getAttribute('data-target');
        if (!target) return;

        var scope = null;
        var parent = tabs.parentElement;
        while (parent) {
          if (parent.className && parent.className.indexOf('tab-pane') !== -1) {
            scope = parent;
            break;
          }
          parent = parent.parentElement;
        }
        if (!scope) scope = tabs.parentElement;

        var children = scope.children;
        for (var k = 0; k < children.length; k++) {
          var c = children[k];
          if (c.className && c.className.indexOf('tab-pane') !== -1) {
            if (c.getAttribute('data-pane') === target) {
              c.style.display = 'block';
            } else {
              c.style.display = 'none';
            }
          }
        }

        var targetPane = document.querySelector('[data-pane="' + target + '"]');
        if (targetPane) {
          var innerPanes = targetPane.querySelectorAll(':scope > .tab-pane');
          var hasActive = false;
          for (var m = 0; m < innerPanes.length; m++) {
            if (innerPanes[m].style.display === 'block') { hasActive = true; break; }
          }
          if (!hasActive && innerPanes.length > 0) {
            innerPanes[0].style.display = 'block';
            var innerTabsContainers = targetPane.querySelectorAll(':scope > .tabs');
            if (innerTabsContainers.length > 0) {
              var innerTabList = innerTabsContainers[0].children;
              for (var n = 0; n < innerTabList.length; n++) {
                innerTabList[n].className = innerTabList[n].className.replace(' active', '').trim();
              }
              if (innerTabList[0]) innerTabList[0].className = 'tab active';
            }
          }
        }
      };
    })(allTabs[i]);
  }
}
document.querySelectorAll('.tabs').forEach(setupTabs);

// concepts 页面 list-item 点击高亮
document.querySelectorAll('#concepts .list-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('#concepts .list-item').forEach(i => {
      i.style.background = '';
      i.style.borderLeft = '';
    });
    item.style.background = 'rgba(88, 166, 255, 0.1)';
    item.style.borderLeft = '3px solid var(--accent)';
  });
});

} // end setupInteractions

// 启动
boot();
