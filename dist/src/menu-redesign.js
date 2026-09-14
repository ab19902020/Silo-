// Cinematic Silo 18 main menu. Loaded as a side effect from haptics.js so the
// existing game bootstrap and all of its button handlers stay untouched.
if (typeof document !== 'undefined') {
  const welcome = document.getElementById('welcome');
  if (welcome) {
    const style = document.createElement('style');
    style.id = 'silo18-main-menu-style';
    style.textContent = `
      .welcome{
        position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;
        margin:0;padding:0;border:0;border-radius:0;overflow:hidden;color:#ebe9dd;
        background:
          linear-gradient(90deg,rgba(3,6,5,.98) 0%,rgba(4,7,6,.94) 23%,rgba(4,7,6,.72) 38%,rgba(3,6,5,.22) 57%,rgba(2,4,4,.08) 100%),
          linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.06) 52%,rgba(0,0,0,.58)),
          url('./assets/ui/silo18-main-menu.webp') 50% 50%/cover no-repeat;
        box-shadow:inset 0 0 150px #000b;
      }
      .welcome{overflow-y:auto}.main-menu-shell{max-height:calc(100dvh - 90px);overflow-y:auto;scrollbar-width:thin}.welcome::backdrop{background:#020403;backdrop-filter:none}
      .welcome::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 60% 43%,transparent 0 27%,rgba(1,4,3,.06) 56%,rgba(0,0,0,.46) 100%)}
      .main-menu-shell{position:absolute;z-index:2;left:clamp(26px,5.2vw,88px);top:50%;width:min(390px,34vw);transform:translateY(-48%)}
      .menu-brand{margin-bottom:25px;text-shadow:0 3px 22px #000}
      .menu-kicker{display:block;margin-bottom:14px;color:#aab2a8;font:600 10px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.25em}
      .welcome .menu-title{margin:0;color:#e9e7dc;font-family:Arial,Helvetica,sans-serif;font-size:clamp(58px,7.2vw,116px);font-weight:700;line-height:.88;letter-spacing:.07em}
      .welcome .menu-title em{color:inherit;font-style:normal}
      .menu-tagline{margin:18px 0 0!important;color:#a7a89e!important;font:500 11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;letter-spacing:.25em}
      .main-menu-actions{display:flex;flex-direction:column;gap:8px}
      .menu-option{position:relative;width:100%;min-height:57px;padding:11px 50px 10px 17px;border:1px solid rgba(207,207,184,.40);border-left:2px solid rgba(211,196,143,.72);border-radius:1px;background:linear-gradient(90deg,rgba(20,27,24,.86),rgba(13,18,16,.60));color:#e8e7dc;text-align:left;text-transform:uppercase;font:500 17px/1.1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.13em;box-shadow:0 10px 28px #0003,inset 0 0 0 1px #0003;backdrop-filter:blur(8px);transition:background .16s,border-color .16s,transform .16s}
      .menu-option::after{content:attr(data-subtitle);display:block;margin-top:6px;color:#9aa49a;font:500 9px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.12em;text-transform:uppercase}
      .menu-option::before{content:"›";position:absolute;right:16px;top:50%;transform:translateY(-52%);color:#ced2c5;font-size:27px;font-weight:300}
      .menu-option:hover,.menu-option:focus-visible{background:linear-gradient(90deg,rgba(63,72,58,.90),rgba(24,32,27,.76));border-color:#d3c791;transform:translateX(3px)}
      .menu-option.menu-primary:not(:disabled){border-left-color:#e0c96e}
      .menu-option:disabled{opacity:.62;cursor:wait}
      .menu-utility{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .18s ease,opacity .18s ease}
      .menu-utility.open{grid-template-rows:1fr;opacity:1}
      .menu-utility-inner{overflow:hidden;display:flex;gap:15px;flex-wrap:wrap;padding-top:0;transition:padding .18s ease}
      .menu-utility.open .menu-utility-inner{padding-top:15px}
      .menu-utility button{padding:0 0 2px;background:none;color:#b8bcb2;border:0;border-bottom:1px solid #747c73;font:600 9px/1.9 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase}
      .menu-utility button:hover,.menu-utility button:focus-visible{color:#e1d298;border-color:#e1d298}
      .menu-note{max-width:370px;margin:15px 0 0!important;color:#858d84!important;font:500 10px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important}
      .menu-corner{position:absolute;z-index:2;pointer-events:none;color:#aab0a6;font:600 10px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.20em;text-shadow:0 2px 12px #000}
      .menu-corner span{font-size:8px;color:#7e877e}
      .menu-corner-top{top:max(24px,env(safe-area-inset-top));left:max(28px,env(safe-area-inset-left))}
      .menu-corner-bottom{right:max(30px,env(safe-area-inset-right));bottom:max(26px,env(safe-area-inset-bottom))}
      @media(max-width:820px){
        .welcome{background-position:60% center;background-image:linear-gradient(90deg,rgba(3,6,5,.97) 0%,rgba(3,6,5,.87) 53%,rgba(2,4,4,.35) 100%),linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.60)),url('./assets/ui/silo18-main-menu.webp')}
        .main-menu-shell{left:max(20px,env(safe-area-inset-left));right:max(20px,env(safe-area-inset-right));top:auto;bottom:max(30px,calc(env(safe-area-inset-bottom) + 18px));width:auto;max-width:420px;transform:none}
        .menu-brand{margin-bottom:16px}.welcome .menu-title{font-size:clamp(44px,14vw,76px)}.menu-tagline{font-size:9px!important;letter-spacing:.18em}
        .menu-option{min-height:49px;font-size:14px;padding:9px 44px 8px 14px}.menu-option::after{font-size:8px;margin-top:4px}.menu-note{display:none}.menu-corner-bottom{display:none}
      }
      @media(max-height:620px) and (min-width:700px){
        .main-menu-shell{width:min(355px,35vw)}.menu-brand{margin-bottom:12px}.welcome .menu-title{font-size:clamp(46px,7vw,76px)}.menu-tagline{margin-top:9px!important}.main-menu-actions{gap:5px}.menu-option{min-height:44px;padding:7px 44px 6px 13px;font-size:14px}.menu-option::after{margin-top:3px;font-size:8px}.menu-note{display:none}
      }
      @media(prefers-reduced-motion:reduce){.menu-option,.menu-utility,.menu-utility-inner{transition:none}.menu-option:hover,.menu-option:focus-visible{transform:none}}
    `;
    document.head.append(style);

    welcome.innerHTML = `
      <section class="main-menu-shell" aria-labelledby="menuTitle">
        <div class="menu-brand">
          <span class="menu-kicker">SILO 18 · RESIDENT ACCESS</span>
          <h1 id="menuTitle" class="menu-title">SILO <em>18</em></h1>
          <p class="menu-tagline">SOME TRUTHS ARE BETTER LEFT BURIED</p>
        </div>
        <nav class="main-menu-actions" aria-label="Main menu">
          <button id="resumeButton" class="menu-option menu-primary" data-subtitle="Resume your current story" hidden>Continue</button>
          <button id="enterButton" class="menu-option menu-primary" data-subtitle="Chapter One · The Cleaning" disabled>Preparing the silo…</button>
          <button id="exploreButton" class="menu-option" data-subtitle="All 144 levels · unrestricted exploration">Free Roam</button>
          <button id="welcomeCharacters" class="menu-option" type="button" data-subtitle="TV cast · create your own resident" disabled>Character</button>
          <button id="menuSettings" class="menu-option" type="button" data-subtitle="Graphics · audio · controls">Settings</button>
          <button id="menuExtras" class="menu-option" type="button" data-subtitle="Directory · opening · research" aria-expanded="false">Extras</button>
        </nav>
        <div id="menuUtility" class="menu-utility" aria-hidden="true" inert><div class="menu-utility-inner">
          <button id="welcomeDirectory" type="button">Directory</button>
          <button id="replayOpening" type="button">Replay Opening</button>
          <button id="aboutButton" type="button">Research & Accuracy</button>
        </div></div>
        <p id="modeNote" class="menu-note">Story follows George’s clues from the cleaning to the way out. Free Roam opens the silo immediately and keeps your story save untouched.</p>
      </section>
      <div class="menu-corner menu-corner-top" aria-hidden="true">SILO 18<br><span>RESIDENT REGISTRY · SEASONS 1–3</span></div>
      <div class="menu-corner menu-corner-bottom" aria-hidden="true">MAINTAIN · PRESERVE · PROTECT</div>
    `;

    const extras = document.getElementById('menuExtras');
    const utility = document.getElementById('menuUtility');
    extras?.addEventListener('click', () => {
      const open = !utility.classList.contains('open');
      utility.classList.toggle('open', open);
      utility.setAttribute('aria-hidden', String(!open));
      utility.inert = !open;
      extras.setAttribute('aria-expanded', String(open));
    });
    document.getElementById('menuSettings')?.addEventListener('click', () => {
      document.getElementById('settingsButton')?.click();
    });
    const newGame = document.getElementById('enterButton');
    const syncNewGameLabel = () => {
      if (newGame && !newGame.disabled && /story\s*·?\s*new game/i.test(newGame.textContent || '')) newGame.textContent = 'New Game';
    };
    if (newGame && typeof MutationObserver !== 'undefined') {
      new MutationObserver(syncNewGameLabel).observe(newGame,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
    }
    queueMicrotask(syncNewGameLabel);
  }
}
