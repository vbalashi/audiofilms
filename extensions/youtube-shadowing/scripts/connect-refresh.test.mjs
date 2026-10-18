import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../src');
const key = 'af2000nlConnectSession';
const expired = { access_token: 'af-opaque-old-access', refresh_token: 'af-opaque-old-refresh', expires_at: 1, baseUrl: 'https://2000.dilum.io', clientId: 'audiofilms_chrome_dev', user: { email: 'old@example.test' } };
const rotated = { access_token: 'af-opaque-new-access', refresh_token: 'af-opaque-new-refresh', expires_at: 4102444800, user: { email: 'old@example.test' } };
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
async function tick() { for (let i=0; i<12; i++) await Promise.resolve(); }
function worker(storage = { [key]: structuredClone(expired) }) {
  let listener; const refreshes=[]; const authCodes=[]; const revokes=[]; let heldRead; let heldWrite;
  const sandbox = {
    URL, URLSearchParams, Date, TextEncoder, crypto: webcrypto, btoa: x => Buffer.from(x,'binary').toString('base64'), console,
    chrome: {
      runtime: { id: 'fixture', lastError: null, onMessage: { addListener: fn => { listener=fn; } } },
      storage: { local: {
        setAccessLevel: (_v, cb) => cb(),
        get: (k, cb) => { const snapshot=structuredClone({[k]:storage[k]}); if (heldRead) { const hold=heldRead; heldRead=null; hold.resolve(() => cb(snapshot)); } else queueMicrotask(()=>cb(snapshot)); },
        set: (values, cb) => {
          const commit=()=>{Object.assign(storage,structuredClone(values));cb();};
          if(heldWrite){const hold=heldWrite;heldWrite=null;hold.resolve(commit);}else queueMicrotask(commit);
        },
        remove: (k, cb) => { queueMicrotask(()=>{ delete storage[k]; cb(); }); },
      } },
      identity: {
        getRedirectURL: () => 'https://fixture.chromiumapp.org/',
        launchWebAuthFlow: ({url}, cb) => { const state=new URL(url).searchParams.get('state'); cb(`https://fixture.chromiumapp.org/?code=fixture&state=${state}`); },
      },
    },
    fetch: async (url, options) => {
      if (url.endsWith('/revoke')) {revokes.push(JSON.parse(options.body));return {ok:true,json:async()=>({})};}
      const body=JSON.parse(options.body); const pending=deferred();
      (body.grant_type==='refresh_token'?refreshes:authCodes).push({body, reply:pending.resolve});
      return pending.promise;
    },
  };
  const context=vm.createContext(sandbox);
  sandbox.importScripts=(...files)=>{for(const file of files)vm.runInContext(readFileSync(path.join(root,file),'utf8'),context,{filename:file});};
  vm.runInContext(readFileSync(path.join(root,'serviceWorker.js'),'utf8'),context,{filename:'serviceWorker.js'});
  return {
    storage, refreshes, authCodes, revokes,
    message: type => new Promise(resolve => { listener({type},{id:'fixture',url:'chrome-extension://fixture/src/options.html'},value=>resolve(JSON.parse(JSON.stringify(value)))); }),
    holdNextRead: () => {heldRead=deferred();return heldRead.promise;},
    holdNextWrite: () => {heldWrite=deferred();return heldWrite.promise;},
  };
}
function reply(payload, ok=true) { return {ok,status:ok?200:400,json:async()=>payload}; }

test('concurrent expired session messages share one rotating refresh and both retain connection', async () => {
  const w=worker();
  const first=w.message('af-get-2000nl-session'); const second=w.message('af-get-2000nl-session');
  await tick();
  // A server consumes the refresh once; a second exchange is terminal.
  w.refreshes[0].reply(reply(rotated));
  if(w.refreshes[1]) w.refreshes[1].reply(reply({error:'invalid_refresh_token'},false));
  const results=await Promise.all([first,second]);
  assert.equal(results.every(x=>x.ok&&x.session?.user?.email==='old@example.test'),true);
  assert.equal(w.refreshes.length,1);
  assert.equal(w.storage[key].refresh_token,'af-opaque-new-refresh');
});

async function until(predicate) {
  for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,2));}
  throw new Error('fixture did not reach expected public transport boundary');
}
async function reconnect(w, session = {...rotated,access_token:'opaque-other-access',refresh_token:'opaque-other-refresh',user:{email:'new@example.test'}}) {
  const result=w.message('af-connect-2000nl');
  await until(()=>w.authCodes.length===1);
  w.authCodes[0].reply(reply(session));
  assert.equal((await result).ok,true);
}

test('late terminal refresh failure cannot clear a completed reconnect', async () => {
  const w=worker(); const pending=w.message('af-get-2000nl-session');await tick();
  await reconnect(w);
  w.refreshes[0].reply(reply({error:'invalid_refresh_token'},false));
  await pending;
  const current=await w.message('af-get-2000nl-session');
  assert.equal(current.session?.user?.email,'new@example.test');
  assert.equal(w.storage[key]?.refresh_token,'opaque-other-refresh');
});

test('late storage read rechecks persisted rotation before spending an old refresh', async () => {
  const w=worker(); const releaseRead=w.holdNextRead();
  const pending=w.message('af-get-2000nl-session');
  const resume=await releaseRead;
  w.storage[key]={...rotated,baseUrl:expired.baseUrl,clientId:expired.clientId};
  resume();await tick();
  if(w.refreshes[0])w.refreshes[0].reply(reply({error:'invalid_refresh_token'},false));
  const result=await pending;
  assert.equal(w.refreshes.length,0);
  assert.equal(result.session?.user?.email,'old@example.test');
  assert.equal(w.storage[key].refresh_token,'af-opaque-new-refresh');
});

test('late refresh success after logout cannot resurrect the connection', async () => {
  const w=worker();const pending=w.message('af-get-2000nl-session');await tick();
  assert.equal((await w.message('af-disconnect-2000nl')).ok,true);
  w.refreshes[0].reply(reply(rotated));
  assert.equal((await pending).session,null);
  assert.equal((await w.message('af-get-2000nl-session')).session,null);
  assert.equal(w.storage[key],undefined);
});

test('late refresh success cannot overwrite a newer account or its rotating pair', async () => {
  const w=worker();const pending=w.message('af-get-2000nl-session');await tick();
  await reconnect(w);
  assert.equal((await w.message('af-get-2000nl-session')).session?.user?.email,'new@example.test');
  w.refreshes[0].reply(reply(rotated));
  assert.equal((await pending).session?.user?.email,'new@example.test');
  assert.equal(w.storage[key].access_token,'opaque-other-access');
});

test('logout supersedes an authorization-code response still in flight', async () => {
  const w=worker();const login=w.message('af-connect-2000nl');await until(()=>w.authCodes.length===1);
  await w.message('af-disconnect-2000nl');
  w.authCodes[0].reply(reply(rotated));
  assert.equal((await login).ok,false);
  assert.equal((await w.message('af-get-2000nl-session')).session,null);
  assert.equal(w.storage[key],undefined);
});

test('transient refresh error preserves the pair; a current terminal error clears it', async () => {
  const w=worker();const first=w.message('af-get-2000nl-session');await tick();
  w.refreshes[0].reply(reply({error:'temporary_unavailable'},false));
  assert.equal((await first).ok,false);
  assert.equal(w.storage[key].refresh_token,'af-opaque-old-refresh');
  const second=w.message('af-get-2000nl-session');await tick();
  w.refreshes[1].reply(reply({error:'invalid_refresh_token'},false));
  assert.equal((await second).ok,false);
  assert.equal((await w.message('af-get-2000nl-session')).session,null);
});

test('a restarted worker restores opaque strings without another login or refresh', async () => {
  const storage={[key]:{...rotated,baseUrl:expired.baseUrl,clientId:expired.clientId}};
  const w=worker(storage);const result=await w.message('af-get-2000nl-session');
  assert.equal(result.session?.user?.email,'old@example.test');
  assert.equal(result.session?.access_token,undefined);
  assert.equal(w.refreshes.length,0);
  assert.equal(w.authCodes.length,0);
  const restarted=worker(storage);
  assert.equal((await restarted.message('af-get-2000nl-session')).session?.user?.email,'old@example.test');
  assert.equal(restarted.refreshes.length,0);
  assert.equal(restarted.authCodes.length,0);
});


test('logout serializes behind a storage write already in flight and remains final', async () => {
  const w=worker();const writePaused=w.holdNextWrite();
  const pending=w.message('af-get-2000nl-session');await tick();
  w.refreshes[0].reply(reply(rotated));
  const resume=await writePaused;
  const logout=w.message('af-disconnect-2000nl');await tick();
  resume();await Promise.all([pending,logout]);
  assert.equal((await w.message('af-get-2000nl-session')).session,null);
  assert.equal(w.storage[key],undefined);
});


test('a delayed logout storage read cannot remove or revoke the newer reconnect', async () => {
  const w=worker();const delayedRead=w.holdNextRead();
  const logout=w.message('af-disconnect-2000nl');const resume=await delayedRead;
  const login=w.message('af-connect-2000nl');await until(()=>w.authCodes.length===1);
  w.authCodes[0].reply(reply({...rotated,access_token:'opaque-other-access',refresh_token:'opaque-other-refresh',user:{email:'new@example.test'}}));
  await tick();resume();await Promise.all([logout,login]);
  assert.equal((await w.message('af-get-2000nl-session')).session?.user?.email,'new@example.test');
  assert.equal(w.storage[key].refresh_token,'opaque-other-refresh');
  assert.equal(w.revokes.length,0);
});

test('a stale transient refresh failure returns the current reconnect instead of an error', async () => {
  const w=worker();const pending=w.message('af-get-2000nl-session');await tick();
  await reconnect(w);w.refreshes[0].reply(reply({error:'temporary_unavailable'},false));
  const result=await pending;
  assert.equal(result.ok,true);
  assert.equal(result.session?.user?.email,'new@example.test');
  assert.equal(w.storage[key].refresh_token,'opaque-other-refresh');
});
