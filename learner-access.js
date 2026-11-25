'use strict';

const learnerAccess = (() => {
  const gate = document.createElement('main');
  gate.className = 'access-gate';
  gate.innerHTML = '<section class="panel"><h1>Izilingua</h1><p>Сабақтарды ашу үшін Google аккаунтыңызбен кіріңіз.</p><button type="button">Google арқылы кіру</button><p class="key">Google email, кіру уақыты және белсенділік оқу журналына жазылады.</p><p role="status"></p></section>';
  document.body.prepend(gate);
  const button = gate.querySelector('button');
  const status = gate.querySelector('[role=status]');
  const content = [...document.querySelectorAll('body > header, body > #app, body > footer')];
  let session, user, activeMs = 0, lastSample = Date.now();
  let openSite, heartbeatBusy = false, loggingOut = false;
  const storageKey = 'izilingua.google.session';
  const loadSession = () => {
    try { return sessionStorage.getItem(storageKey); } catch { return null; }
  };
  function storeSession(value) {
    try {
      if (value) sessionStorage.setItem(storageKey, value);
      else sessionStorage.removeItem(storageKey);
    } catch {}
  }
  async function call(method, ...args) {
    const response = await fetch('/api/access', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,args})});
    if (!response.ok) throw new Error('Кіру қызметі жауап бермеді (' + response.status + ').');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  }
  const pendingKey = 'izilingua.google.pending';
  async function restore() {
    const ticket = sessionStorage.getItem(pendingKey);
    if (ticket) {
      button.disabled = true;
      status.textContent = 'Кіру тексеріліп жатыр…';
      try {
        const result = await call('finishLogin', ticket);
        if (result?.session) {
          unlock(result.session, result);
          return;
        }
        status.textContent = 'Кіру аяқталмады. Қайта кіріңіз.';
      } catch (error) {
        status.textContent = error.message;
      } finally {
        sessionStorage.removeItem(pendingKey);
        button.disabled = false;
      }
    }
    const saved = loadSession();
    if (!saved) return;
    try {
      const identity = await call('resumeSession',saved);
      if (identity) unlock(saved,identity);
      else storeSession(null);
    } catch {}
  }
  function unlock(value, identity) {
    session = value;
    user = identity;
    storeSession(value);
    gate.hidden = true;
    content.forEach(node=>node.inert=false);
    document.documentElement.classList.remove('access-locked');
    document.querySelector('#learner-account').textContent = identity.email;
    lastSample = Date.now();
    activeMs = 0;
    openSite();
  }
  function lock(message) {
    session = user = null;
    storeSession(null);
    gate.hidden = false;
    content.forEach(node=>node.inert=true);
    document.documentElement.classList.add('access-locked');
    button.disabled = false;
    status.textContent = message;
  }

  button.onclick = async () => {
    button.disabled = true;
    status.textContent = 'Кіру сілтемесі дайындалып жатыр…';
    try {
      const login = await call('beginLogin');
      sessionStorage.setItem(pendingKey, login.ticket);
      window.location.assign(login.url);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.hidden = false;
      button.disabled = false;
    }
  };

  setInterval(()=>{
    const now=Date.now();
    if (session && document.visibilityState==='visible' && document.hasFocus()) activeMs+=Math.min(now-lastSample, 6000);
    lastSample=now;
  },5000);
  async function heartbeat() {
    if (!session || !activeMs || heartbeatBusy) return;
    heartbeatBusy=true;
    const value=session, elapsed=activeMs;
    activeMs=0;
    try {
      if (!await call('heartbeat',value,Math.round(elapsed/1000)) && session===value) lock('Сессия аяқталды. Қайта кіріңіз.');
    } catch { if (session===value) activeMs+=elapsed; }
    finally { heartbeatBusy=false; }
  }
  setInterval(heartbeat,60000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)heartbeat();});
  document.querySelector('#learner-signout').onclick=async event=>{
    if (!session || loggingOut) return;
    loggingOut=true;
    event.currentTarget.disabled=true;
    const control=event.currentTarget;
    try {
      await heartbeat();
      if (session) await call('signOut',session);
      lock('Сайттан шықтыңыз.');
    } catch(error) {
      document.querySelector('#learner-account').textContent=error.message;
    } finally {
      loggingOut=false;
      control.disabled=false;
    }
  };

  return {
    start(url, render) {
      openSite=render;
      restore();
      content.forEach(node=>node.inert=true);
    },
    signedIn:()=>Boolean(session),
    bindFeedback() {
      const form=document.querySelector('#learner-feedback');
      if (!form || !user) return;
      form.elements.name.value=user.name||'';
      let requestId=crypto.randomUUID();
      let lastPayload='';
      const response=form.querySelector('[role=status]');
      const submit=form.querySelector('[type=submit]');
      form.onsubmit=async event=>{
        event.preventDefault();
        const fields=Object.fromEntries(new FormData(form));
        const payload=JSON.stringify(fields);
        if(lastPayload && lastPayload!==payload) requestId=crypto.randomUUID();
        lastPayload=payload;
        submit.disabled=true;
        response.textContent='Жіберіліп жатыр…';
        try {
          await call('saveFeedback',{...fields,requestId},session);
          form.reset();
          form.elements.name.value=user?.name||'';
          requestId=crypto.randomUUID();
          lastPayload='';
          response.textContent='Пікіріңіз сақталды. Рақмет!';
        } catch(error) { response.textContent=error.message; }
        finally { submit.disabled=false; }
      };
    }
  };
})();
