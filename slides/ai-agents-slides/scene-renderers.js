window.PREZI_SCENES = {
  markup(obj) {
    const escapeHtml = (value) => String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

    if (obj.kind === 'lesson-opening') {
      const title = escapeHtml(obj.title || '');
      const items = (obj.items || []).map((item, index) => `
        <li style="--delay:${260 + index * 180}ms">
          <span>${String(index + 1).padStart(2, '0')}</span>
          <strong>${escapeHtml(item)}</strong>
        </li>
      `).join('');
      return `
        <section class="lesson-opening-scene">
          <p class="lesson-kicker">AI Agents Slides</p>
          <h1>${title}</h1>
          <ul>${items}</ul>
        </section>
      `;
    }

    if (obj.kind === 'lesson-agenda') {
      const rows = (obj.items || []).map((item, index) => `
        <li style="--delay:${180 + index * 150}ms">
          <span>${escapeHtml(item[0])}</span>
          <strong>${escapeHtml(item[1])}</strong>
        </li>
      `).join('');
      return `
        <section class="lesson-agenda-scene">
          <p class="lesson-kicker">목차</p>
          <ol>${rows}</ol>
        </section>
      `;
    }

    if (obj.kind === 'section-divider') {
      return `
        <section class="section-divider-scene">
          <span>${escapeHtml(obj.label || '')}</span>
          <h1>${escapeHtml(obj.title || '')}</h1>
        </section>
      `;
    }

    if (obj.kind === 'repo-cover') {
      return `
        <section class="repo-cover-scene">
          <p>${escapeHtml(obj.kicker || 'GitHub')}</p>
          <h1>${escapeHtml(obj.title || '')}</h1>
          <strong>${escapeHtml(obj.subtitle || '')}</strong>
          <div class="repo-chart" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
        </section>
      `;
    }

    if (obj.kind === 'token-burst') {
      const stageClass = obj.stageClass || '';
      return `
        <div class="json-spin-stage ${escapeHtml(stageClass)}">
          <span class="token3d-coin">
            <svg viewBox="0 0 160 160" aria-hidden="true">
              <defs>
                <radialGradient id="coinFace" cx="30%" cy="24%" r="76%">
                  <stop offset="0" stop-color="#fff6b8"/>
                  <stop offset=".32" stop-color="#ffd95c"/>
                  <stop offset=".62" stop-color="#d99719"/>
                  <stop offset="1" stop-color="#7b4b05"/>
                </radialGradient>
                <linearGradient id="coinEdge" x1="0" x2="1">
                  <stop offset="0" stop-color="#6c4100"/>
                  <stop offset=".18" stop-color="#f7d764"/>
                  <stop offset=".45" stop-color="#a76705"/>
                  <stop offset=".72" stop-color="#ffeb84"/>
                  <stop offset="1" stop-color="#6c4100"/>
                </linearGradient>
              </defs>
              <ellipse cx="83" cy="80" rx="66" ry="70" fill="url(#coinEdge)"/>
              <circle cx="73" cy="80" r="62" fill="url(#coinFace)"/>
              <circle cx="73" cy="80" r="45" fill="none" stroke="#fff0a4" stroke-width="4" opacity=".72"/>
              <rect x="68" y="43" width="11" height="74" rx="5" fill="#a46505"/>
              <rect x="72" y="43" width="5" height="74" rx="3" fill="#ffe27b"/>
              <path d="M35 42c18-22 57-30 87-6" fill="none" stroke="#fff9c8" stroke-width="5" opacity=".5"/>
            </svg>
          </span>
          <span class="key3d">
            <svg viewBox="0 0 120 190" aria-hidden="true">
              <defs>
                <linearGradient id="keyFace" x1="0" x2="1">
                  <stop offset="0" stop-color="#020617"/>
                  <stop offset=".46" stop-color="#111827"/>
                  <stop offset=".58" stop-color="#6b7280"/>
                  <stop offset="1" stop-color="#020617"/>
                </linearGradient>
              </defs>
              <path d="M58 4c28 0 50 22 50 50 0 21-13 39-31 46v82H47V100C29 93 16 75 16 54 16 26 38 4 58 4Z" fill="url(#keyFace)"/>
              <circle cx="75" cy="28" r="13" fill="#fff"/>
              <path d="M46 94h23v24H46zm23 30h22v16H69zm0 26h16v16H69z" fill="#020617"/>
              <path d="M53 100h5v74" stroke="#6b7280" stroke-width="4" opacity=".55"/>
            </svg>
          </span>
          <span class="json-spin-label token-label-3d">TOKEN</span>
          <span class="json-spin-label key-label-3d">KEY</span>
        </div>
      `;
    }

    if (obj.kind === 'dashboard-window') {
      return `
        <div class="dashboard-window-frame">
          <div class="dashboard-window-bar"><span></span><span></span><span></span></div>
          <img src="${escapeHtml(obj.src)}" alt="${escapeHtml(obj.name || 'dashboard')}">
        </div>
      `;
    }

    if (obj.kind === 'last-loop') {
      return `
        <div class="last-loop-wrap">
          <img class="last-loop-frame last-loop-a" src="${escapeHtml(obj.srcA)}" alt="last">
          <img class="last-loop-frame last-loop-b" src="${escapeHtml(obj.srcB)}" alt="last2">
        </div>
      `;
    }

    if (obj.kind === 'request') {
      const url = escapeHtml(obj.url);
      const method = escapeHtml(obj.method || 'GET');
      const path = escapeHtml(obj.path || '/');
      const longUrlClass = obj.url.length > 38 ? ' long-url' : '';
      return `
        <div class="typing-url${longUrlClass}" style="--chars:${obj.url.length}">${url}</div>
        <div class="http-chip">${method} ${path}</div>
      `;
    }

    if (obj.kind === 'dns') {
      const domain = escapeHtml(obj.domain || obj.url || '');
      const ip = escapeHtml(obj.ip);
      return `
        <div class="dns-domain">${domain}</div>
        <div class="dns-ip">${ip}</div>
      `;
    }

    if (obj.kind === 'sql') {
      const query = escapeHtml(obj.query);
      return `
        <pre class="sql-overlay">${query}</pre>
      `;
    }

    if (obj.kind === 'return-emphasis') {
      const x = Number(obj.focusX || 0.5) * 100;
      const y = Number(obj.focusY || 0.5) * 100;
      const w = Number(obj.focusW || 0.12) * 100;
      const h = Number(obj.focusH || 0.18) * 100;
      const direction = obj.travel === 'right' ? ' rightward' : '';
      return `
        <div class="return-focus${direction}" style="--fx:${x}%;--fy:${y}%;--fw:${w}%;--fh:${h}%">
          <span class="return-ring"></span>
          <span class="return-ring return-ring-delayed"></span>
          <span class="return-sweep"></span>
          <span class="return-spark"></span>
        </div>
      `;
    }

    if (obj.kind === 'hotlink') {
      const url = escapeHtml(obj.url);
      const label = escapeHtml(obj.label || 'open link');
      return `
        <a class="invisible-hotlink" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${label}"></a>
      `;
    }

    if (obj.kind === 'multi-hotlink') {
      const urls = (obj.urls || []).map((url) => escapeHtml(url));
      const label = escapeHtml(obj.label || 'open links');
      return `
        <a class="invisible-hotlink multi-hotlink" href="${urls[0] || '#'}" target="_blank" rel="noopener noreferrer" data-urls="${urls.join('|')}" aria-label="${label}"></a>
      `;
    }

    if (obj.kind === 'download-laptop') {
      return `
        <div class="download-laptop-shell">
          <div class="download-mark">
            <span class="download-symbol"></span>
            <span>다운로드</span>
          </div>
        </div>
      `;
    }

    if (obj.kind === 'download-arrow') {
      return `<div class="download-arrow-line"></div>`;
    }

    if (obj.kind === 'download-word') {
      return `<div class="download-word">다운로드</div>`;
    }

    if (obj.kind === 'final-html-return') {
      return `
        <div class="final-html-card">
          <span class="final-html-hero"></span>
          <span class="final-html-line line-a"></span>
          <span class="final-html-line line-b"></span>
          <span class="final-html-tile tile-a"></span>
          <span class="final-html-tile tile-b"></span>
          <span class="final-html-tile tile-c"></span>
        </div>
        <div class="final-html-pulse"></div>
      `;
    }

    if (obj.kind === 'rank-bar-reveal') {
      return `
        <div class="rank-bar-mask rank-bar-1"></div>
        <div class="rank-bar-mask rank-bar-2"></div>
        <div class="rank-bar-mask rank-bar-3"></div>
        <div class="rank-bar-mask rank-bar-4"></div>
      `;
    }

    if (obj.kind === 'html-cost-reveal') {
      return `
        <div class="cost-mask cost-shot-left"></div>
        <div class="cost-mask cost-shot-right"></div>
        <div class="cost-mask cost-card-left"></div>
        <div class="cost-mask cost-card-mid"></div>
        <div class="cost-mask cost-card-right"></div>
      `;
    }

    if (obj.kind === 'haejwo-typing') {
      return `
        <div class="haejwo-answer-cover">
          <p class="haejwo-line" style="--chars:11; --delay:720ms;">하는 방법 알려줄게:</p>
          <p class="haejwo-line" style="--chars:20; --delay:1500ms;">1. 먼저 필요한 페이지를 열고</p>
          <p class="haejwo-line" style="--chars:21; --delay:2380ms;">2. 원하는 버튼을 클릭한 다음</p>
          <p class="haejwo-line" style="--chars:19; --delay:3260ms;">3. 결과 화면을 확인하면 돼.</p>
          <p class="haejwo-line" style="--chars:15; --delay:4140ms;">4. 필요하면 다시 물어봐</p>
        </div>
      `;
    }

    if (obj.kind === 'api-cycle-highlight') {
      return `
        <span class="api-cycle-ring api-cycle-client"></span>
        <span class="api-cycle-ring api-cycle-token"></span>
        <span class="api-cycle-ring api-cycle-platform"></span>
        <span class="api-cycle-ring api-cycle-brain"></span>
        <span class="api-cycle-ring api-cycle-json"></span>
        <span class="api-cycle-dot"></span>
      `;
    }

    if (obj.kind === 'payments-flow') {
      return `
        <div class="payment-mask payment-web-mask"></div>
        <div class="payment-mask payment-api-mask"></div>
        <span class="payment-account-ring"></span>
        <span class="payment-line payment-line-web"></span>
        <span class="payment-line payment-line-api"></span>
      `;
    }

    if (obj.kind === 'anthropic-api-reveal') {
      return `
        <div class="anthropic-mask anthropic-chart-mask"></div>
        <div class="anthropic-mask anthropic-dev-mask"></div>
        <div class="anthropic-mask anthropic-defense-mask"></div>
        <div class="anthropic-mask anthropic-company-mask"></div>
        <span class="anthropic-orbit"></span>
      `;
    }

    if (obj.kind === 'openclaw-pop') {
      return `<img class="openclaw-pop-image" src="assets/openclaw.png" alt="">`;
    }

    if (obj.kind === 'openclaw2-bubbles') {
      return `
        <img class="openclaw2-image" src="assets/openclaw2.png" alt="">
        <span class="openclaw2-bubble-mask openclaw2-left-mask"></span>
        <span class="openclaw2-bubble-mask openclaw2-right-mask"></span>
      `;
    }

    if (obj.kind === 'openclaw-warning1') {
      return `
        <img class="openclaw-warning-image" src="assets/warning1_openclaw.png" alt="">
        <span class="warning1-soft-reveal warning1-sign-cover"></span>
      `;
    }

    if (obj.kind === 'openclaw-warning-final') {
      return `
        <img class="openclaw-warning-image openclaw-final-image" src="assets/warning_openclaw.png" alt="">
        <span class="warning-final-soft-glow"></span>
      `;
    }

    if (obj.kind === 'openclaw-stats') {
      return `
        <img class="full-slide-image" src="assets/openclaw_stats.png" alt="">
        <span class="stats-bubble-cover stats-bubble-left-top"></span>
        <span class="stats-bubble-cover stats-bubble-left-bottom"></span>
        <span class="stats-bubble-cover stats-bubble-right-top"></span>
        <span class="stats-bubble-cover stats-bubble-right-bottom"></span>
      `;
    }

    if (obj.kind === 'macmini-reveal') {
      return `
        <img class="full-slide-image" src="assets/macmini.png" alt="">
        <span class="macmini-panel-mask macmini-panel-left"></span>
        <span class="macmini-panel-mask macmini-panel-mid"></span>
        <span class="macmini-panel-mask macmini-panel-right"></span>
      `;
    }

    if (obj.kind === 'telegram-typing') {
      return `
        <span class="telegram-title-cover"></span>
        <span class="telegram-title-fixed">OpenClaw</span>
        <span class="telegram-dots"><i></i><i></i><i></i></span>
      `;
    }

    if (obj.kind === 'telegram-wait') {
      return `
        <span class="telegram-title-cover"></span>
        <span class="telegram-title-fixed">OpenClaw</span>
        <span class="telegram-wait-badge">30 sec</span>
      `;
    }

    if (obj.kind === 'telegram2-typing') {
      return `
        <span class="telegram-answer-cover"></span>
        <div class="telegram-answer-type">
          <p style="--chars:21;--delay:220ms;">안녕하세요! OpenClaw입니다.</p>
          <p style="--chars:31;--delay:500ms;">저는 지금 로컬에서 여러분을 도와드릴 준비를 하고 있어요.</p>
          <p style="--chars:29;--delay:640ms;">궁금한 점이 있거나 도움이 필요하시면 언제든 말씀해주세요.</p>
          <p style="--chars:23;--delay:760ms;">아래는 제가 현재 할 수 있는 일들입니다 👇</p>
          <p style="--chars:15;--delay:1000ms;">• 문서 요약 및 정리</p>
          <p style="--chars:17;--delay:1520ms;">• 코드 작성 및 디버깅 도움</p>
          <p style="--chars:13;--delay:2040ms;">• 아이디어 브레인스토밍</p>
          <p style="--chars:21;--delay:2560ms;">무엇을 도와드릴까요?</p>
        </div>
      `;
    }

    if (obj.kind === 'openclaw-api-cycle') {
      return `
        <img class="full-slide-image" src="assets/openclaw_api.png" alt="">
        <span class="openclaw-api-packet packet-a"></span>
        <span class="openclaw-api-packet packet-b"></span>
        <span class="openclaw-api-packet packet-c"></span>
        <span class="openclaw-api-packet packet-d"></span>
      `;
    }

    if (obj.kind === 'ban-blink') {
      return `<img class="ban-blink-image" src="assets/ban.png" alt="">`;
    }

    if (obj.kind === 'alternatives-zoom') {
      return `<img class="alternatives-zoom-image" src="assets/alternatives.png" alt="">`;
    }

    if (obj.kind === 'copow-talk-reveal') {
      return `
        <img class="full-slide-image" src="assets/copow2.png" alt="">
        <span class="copow-shot-mask copow-shot-tl"></span>
        <span class="copow-shot-mask copow-shot-tr"></span>
        <span class="copow-shot-mask copow-shot-bl"></span>
        <span class="copow-shot-mask copow-shot-br"></span>
      `;
    }

    if (obj.kind === 'hermes-vs-glow') {
      return `
        <span class="hermes-good-glow hermes-memory"></span>
        <span class="hermes-good-glow hermes-multi"></span>
        <span class="hermes-good-glow hermes-auto"></span>
        <span class="hermes-good-glow openclaw-multi"></span>
        <span class="hermes-good-glow openclaw-simple"></span>
      `;
    }

    if (obj.kind === 'openclaw-dollar-burst') {
      return `
        <span class="openclaw-dollar dollar-a">$</span>
        <span class="openclaw-dollar dollar-b">$</span>
        <span class="openclaw-dollar dollar-c">$</span>
        <span class="openclaw-dollar dollar-d">$</span>
        <span class="openclaw-dollar dollar-e">$</span>
        <span class="openclaw-dollar dollar-f">$</span>
      `;
    }

    if (obj.kind === 'apps-data-flow') {
      return `
        <span class="apps-flow-dot apps-dot-1"></span>
        <span class="apps-flow-dot apps-dot-2"></span>
        <span class="apps-flow-dot apps-dot-3"></span>
        <span class="apps-flow-dot apps-dot-4"></span>
        <span class="apps-flow-pulse apps-pulse-apps"></span>
        <span class="apps-flow-pulse apps-pulse-server"></span>
        <span class="apps-flow-pulse apps-pulse-brain"></span>
      `;
    }

    if (obj.kind === 'overall-services-mask') {
      const guiMask = '<span class="overall-services-cover overall-gui-cover"></span>';
      if (obj.mode === 'web-api') {
        return `
          <span class="overall-services-cover overall-cli-cover"></span>
          ${guiMask}
        `;
      }
      return guiMask;
    }

    if (obj.kind === 'overall-services-cover') {
      const target = obj.target === 'cli' ? 'cli' : 'gui';
      return `<span class="overall-services-cover overall-${target}-cover"></span>`;
    }

    if (obj.kind === 'video-pair') {
      return `
        <video class="video-demo video-demo-left" src="assets/video1.mov" autoplay muted loop playsinline></video>
        <video class="video-demo video-demo-right" src="assets/video2.mov" autoplay muted loop playsinline></video>
      `;
    }

    if (obj.kind === 'use-computer-enable') {
      return `
        <span class="use-computer-toast-cover toast-one"></span>
        <span class="use-computer-toast-cover toast-two"></span>
        <span class="use-computer-off-switch"></span>
        <span class="use-computer-click-ring"></span>
        <span class="use-computer-cursor"></span>
      `;
    }

    if (obj.kind === 'afk-morph') {
      return `
        <div class="afk-stage" aria-label="AFK, Away From Keyboard">
          <div class="afk-wordmark">
            <span class="afk-word afk-away"><span class="afk-initial">A</span><span class="afk-rest">way</span></span>
            <span class="afk-word afk-from"><span class="afk-initial">F</span><span class="afk-rest">rom</span></span>
            <span class="afk-word afk-keyboard"><span class="afk-initial">K</span><span class="afk-rest">eyboard</span></span>
          </div>
        </div>
      `;
    }

    if (obj.kind === 'afk-command-flow') {
      return `
        <span class="afk-command-bubble afk-blue afk-row-top"><b>명령:</b> 오늘 날씨 알려줘</span>
        <span class="afk-command-bubble afk-green afk-row-mid"><b>명령:</b> 내 네이버 메일에서 스팸 좀 정리해줘 </span>
        <span class="afk-command-bubble afk-orange afk-row-bottom"><b>명령:</b> 내 컴퓨터에 있는 대본.txt 보고 PPT 좀 만들어주라</span>
        <span class="afk-signal afk-blue afk-leg-a afk-row-top"></span>
        <span class="afk-signal afk-blue afk-leg-b afk-row-top"></span>
        <span class="afk-signal afk-green afk-leg-a afk-row-mid"></span>
        <span class="afk-signal afk-green afk-leg-b afk-row-mid"></span>
        <span class="afk-signal afk-orange afk-leg-a afk-row-bottom"></span>
        <span class="afk-signal afk-orange afk-leg-b afk-row-bottom"></span>
      `;
    }

    if (obj.kind === 'claude-download-click') {
      return `
        <span class="claude-click-ring"></span>
        <span class="claude-click-cursor"></span>
      `;
    }

    if (obj.kind === 'claude-download-popup') {
      return `
        <div class="claude-popup-window">
          <img src="assets/download_claude.png" alt="">
        </div>
      `;
    }

    if (obj.kind === 'html-result') {
      const url = escapeHtml(obj.url);
      const label = escapeHtml(obj.label || 'HTML response');
      return `
        <a class="invisible-hotlink" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${label}"></a>
      `;
    }

    if (obj.kind === 'json-result') {
      const url = escapeHtml(obj.url);
      const label = escapeHtml(obj.label || 'JSON response');
      return `
        <a class="invisible-hotlink" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${label}"></a>
      `;
    }

    if (obj.kind === 'download') {
      return `
        <div class="download-laptop">
          <div class="download-mark">
            <span class="download-symbol"></span>
            <span>다운로드</span>
          </div>
        </div>
        <div class="download-flow">
          <div class="download-arrow"></div>
          <div class="download-ai">
            <img src="assets/brain-cutout.png" alt="">
            <div>AI모델</div>
          </div>
        </div>
      `;
    }

    if (obj.kind === 'iframe') {
      return `
        <a class="hf-shot-link" href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer" aria-label="Hugging Face Models">
          <img class="hf-shot" src="assets/huggingface.png" alt="">
        </a>
      `;
    }

    return '';
  }
};
