(function(){
    const $=id=>document.getElementById(id), win=$('calc-win'), KEY='tradely_calc_pos_v1';
    const ls={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
    const fmt=n=>{if(!isFinite(n))return 'Error';const a=Math.abs(n);let s=a>=1e12||(a>0&&a<1e-7)?n.toExponential(6):String(+n.toPrecision(12));return s};
    const money=n=>(n<0?'-':'')+'$'+Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
    const num=v=>{const x=parseFloat(String(v).replace(/,/g,''));return isFinite(x)?x:NaN};

    /* ----- safe expression evaluator (no eval): + - * / ( ) unary minus, postfix % ----- */
    function evaluate(src){
        const t=src.replace(/\s+/g,'').match(/\d*\.?\d+(?:e[+-]?\d+)?|[-+*\/()%]/gi);
        if(!t||t.join('')!==src.replace(/\s+/g,''))throw new Error('bad');
        let i=0;
        const peek=()=>t[i],next=()=>t[i++];
        function expr(){let v=term();while(peek()==='+'||peek()==='-'){const o=next(),s=i;let r=term();if(i-s===2&&t[s+1]==='%')r=v*r;v=o==='+'?v+r:v-r}return v}
        function term(){let v=unary();while(peek()==='*'||peek()==='/'){const o=next(),r=unary();v=o==='*'?v*r:v/r}return v}
        function unary(){if(peek()==='-'){next();return -unary()}if(peek()==='+'){next();return unary()}return post()}
        function post(){let v=atom();while(peek()==='%'){next();v=v/100}return v}
        function atom(){const x=next();if(x==='('){const v=expr();if(next()!==')')throw new Error('bad');return v}if(x===undefined||/^[-+*\/()%]$/.test(x))throw new Error('bad');return parseFloat(x)}
        const v=expr();if(i!==t.length)throw new Error('bad');return v;
    }
    let expr='',justEq=false,hist=ls.get('tradely_calc_hist')||[];
    const show=()=>{$('calc-expr').textContent=expr.replace(/\*/g,'×').replace(/\//g,'÷').replace(/-/g,'−');let r='0';
        if(expr){try{const v=evaluate(expr);r=fmt(v)}catch(e){r=$('calc-res').dataset.last||'0'}}else r='0';$('calc-res').textContent=r;$('calc-res').dataset.last=r};
    const drawHist=()=>{$('calc-hist').innerHTML=hist.slice(0,6).map((h,ix)=>'<div data-h="'+ix+'"><span>'+h.e.replace(/[<>&]/g,'')+'</span><span>= '+h.r+'</span></div>').join('')};
    function key(k){
        if(k==='AC'){expr='';justEq=false}
        else if(k==='BS'){expr=expr.slice(0,-1)}
        else if(k==='NEG'){const m=expr.match(/(-?\d*\.?\d+)$/);if(m){const n=m[1];expr=expr.slice(0,-n.length)+(n[0]==='-'?n.slice(1):'-'+n)}else if(!expr)expr='-'}
        else if(k==='='){try{const v=evaluate(expr);const r=fmt(v);if(r==='Error')throw 0;hist.unshift({e:expr,r});hist=hist.slice(0,20);ls.set('tradely_calc_hist',hist);drawHist();expr=r;justEq=true}catch(e){$('calc-res').textContent='Error';return}}
        else{
            const isOp=/^[-+*\/]$/.test(k);
            if(justEq&&!isOp&&k!=='%'){expr=''}justEq=false;
            if(isOp&&/[-+*\/]$/.test(expr)){ if(k==='-'&&!/[-]$/.test(expr)){expr+=k}else expr=expr.slice(0,-1)+k }
            else if(isOp&&!expr&&k!=='-'){/* ignore leading operator */}
            else if(k==='.'){const seg=expr.split(/[-+*\/()%]/).pop();if(!seg.includes('.'))expr+=(seg===''?'0.':'.')}
            else expr+=k;
        }
        show();
    }
    $('calc-keys').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b)key(b.dataset.k)});
    $('calc-hist').addEventListener('click',e=>{const d=e.target.closest('[data-h]');if(d){expr=hist[+d.dataset.h].r;justEq=true;show()}});

    /* ----- percent tab ----- */
    const setOut=(id,txt,neg)=>{const o=$(id);o.textContent=txt;o.className='calc-out'+(txt==='—'?' dim':'')+(neg?' neg':'')};
    function pct(){
        const g=n=>num(win.querySelector('[data-p="'+n+'"]').value);
        let a=g('a1'),b=g('b1');setOut('calc-o1',isNaN(a)||isNaN(b)?'—':fmt(a/100*b));
        a=g('a2');b=g('b2');setOut('calc-o2',isNaN(a)||isNaN(b)||b===0?'—':fmt(a/b*100)+' %');
        a=g('a3');b=g('b3');if(isNaN(a)||isNaN(b)||a===0)setOut('calc-o3','—');else{const c=(b-a)/Math.abs(a)*100;setOut('calc-o3',(c>=0?'+':'')+fmt(c)+' %',c<0)}
        a=g('a4');b=g('b4');if(isNaN(a)||isNaN(b))setOut('calc-o4','—');else{const up=a*(1+b/100),dn=a*(1-b/100);const o=$('calc-o4');o.className='calc-out';o.innerHTML='+ '+fmt(up)+'<br><span style="color:#f87171">− '+fmt(dn)+'</span>'}
    }
    /* ----- trade tab ----- */
    function trade(){
        const g=n=>num(win.querySelector('[data-t="'+n+'"]').value);
        const bal=g('bal'),risk=g('risk'),sl=g('sl'),pv=isNaN(g('pv'))?10:g('pv');
        if([bal,risk,sl].some(isNaN)||sl<=0||pv<=0)setOut('calc-t1','—');
        else{const r$=bal*risk/100,lots=r$/(sl*pv);const o=$('calc-t1');o.className='calc-out';o.innerHTML=fmt(+lots.toFixed(2))+' lots <span style="color:#9ca3af;font-size:11px;font-weight:500">· risk '+money(r$)+'</span>'}
        const r=g('r'),rr=g('rr');
        if(isNaN(r)||isNaN(rr))setOut('calc-t2','—');else{const o=$('calc-t2');o.className='calc-out';o.innerHTML='Profit '+money(r*rr)+' <span style="color:#9ca3af;font-size:11px;font-weight:500">· win-rate needed '+fmt(+(100/(1+rr)).toFixed(1))+'%</span>'}
    }
    win.addEventListener('input',e=>{if(e.target.dataset.p)pct();if(e.target.dataset.t)trade()});

    window.calcTab=function(t){win.querySelectorAll('.calc-tab').forEach(b=>{const on=b.dataset.calcTab===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});win.querySelectorAll('.calc-pane').forEach(p=>p.classList.toggle('on',p.id==='calc-pane-'+t))};

    /* ----- floating window: open / close / drag ----- */
    function place(x,y){const w=win.offsetWidth||320,h=win.offsetHeight||420;x=Math.min(Math.max(4,x),innerWidth-w-4);y=Math.min(Math.max(4,y),innerHeight-60);win.style.left=x+'px';win.style.top=y+'px'}
    window.calcOpen=function(){win.classList.add('open');$('calc-toggle').setAttribute('aria-expanded','true');const p=ls.get(KEY);if(p)place(p.x,p.y);else place(innerWidth-win.offsetWidth-24,64);drawHist();show();if(window.lucide)lucide.createIcons();try{win.focus({preventScroll:true})}catch(e){}};
    window.calcClose=function(){win.classList.remove('open');$('calc-toggle').setAttribute('aria-expanded','false')};
    window.calcToggle=function(){win.classList.contains('open')?calcClose():calcOpen()};
    let drag=null;const head=$('calc-head');
    head.addEventListener('pointerdown',e=>{if(e.target.closest('.calc-x'))return;drag={dx:e.clientX-win.offsetLeft,dy:e.clientY-win.offsetTop};head.setPointerCapture(e.pointerId)});
    head.addEventListener('pointermove',e=>{if(drag)place(e.clientX-drag.dx,e.clientY-drag.dy)});
    head.addEventListener('pointerup',()=>{if(drag){drag=null;ls.set(KEY,{x:win.offsetLeft,y:win.offsetTop})}});
    addEventListener('resize',()=>{if(win.classList.contains('open'))place(win.offsetLeft,win.offsetTop)});
    /* ----- keyboard typing -----
       Works while the calculator is open and you are NOT typing in another field, so you can click
       the page (or nothing at all) and just type: 0-9 . + - * / x ( ) % , Enter or =, Backspace, Delete or C (clear), Esc (close).
       Can be switched off in Settings -> Preferences ("tradely_calc_prefs"). Ctrl+V pastes a number or sum. */
    const kbOn=()=>{try{const p=JSON.parse(localStorage.getItem('tradely_calc_prefs')||'null');return !(p&&p.keyboard===false)}catch(e){return true}};
    const isEditable=el=>!!el&&(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.isContentEditable);
    const basicOn=()=>$('calc-pane-basic').classList.contains('on');
    document.addEventListener('keydown',e=>{
        if(!win.classList.contains('open'))return;
        if(e.key==='Escape'){calcClose();$('calc-toggle').focus();return}
        if(!kbOn()||!basicOn()||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
        const t=e.target;
        if(isEditable(t))return;
        const inCalc=win.contains(t);
        if(!inCalc&&(e.key==='Enter'||e.key===' ')&&t.closest&&t.closest('button,a,[role="button"]'))return; // Enter/Space still activate the page control that has focus
        if(!inCalc&&document.querySelector('.fixed.flex[id$="-modal"]:not(.hidden)'))return;           // a page modal is open
        let k=e.key;
        if(k==='x'||k==='X'||k==='\u00d7')k='*'; else if(k==='\u00f7')k='/'; else if(k===',')k='.'; else if(k==='\u2212')k='-';
        if(/^[0-9.+\-*\/()%]$/.test(k)){key(k);e.preventDefault()}
        else if(k==='Enter'||k==='='){key('=');e.preventDefault()}
        else if(k==='Backspace'){key('BS');e.preventDefault()}
        else if(k==='Delete'||k==='c'||k==='C'){key('AC');e.preventDefault()}
    });
    document.addEventListener('paste',e=>{
        if(!win.classList.contains('open')||!kbOn()||!basicOn()||isEditable(e.target))return;
        const txt=((e.clipboardData||window.clipboardData).getData('text')||'').replace(/,/g,'').replace(/[x\u00d7]/gi,'*').replace(/\u00f7/g,'/').replace(/\s+/g,'');
        if(!txt||!/^[0-9.+\-*\/()%]+$/.test(txt)||txt.length>80)return;
        e.preventDefault();expr=txt;justEq=false;show();
    });
    /* small hint under the keys so people know typing works */
    (function(){const keys=$('calc-keys');if(keys&&!$('calc-kb-hint')){const h=document.createElement('div');h.id='calc-kb-hint';h.style.cssText='font-size:10px;color:#6b7280;text-align:center;padding:6px 8px 2px;font-family:ui-monospace,monospace';h.textContent='Keyboard: type numbers and + - * / ( ) %, Enter = equals, Esc closes';keys.insertAdjacentElement('afterend',h)}})();
})();
