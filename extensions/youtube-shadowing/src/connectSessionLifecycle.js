(function () {
  // One service-worker owner coordinates rotating credentials and explicit
  // account changes. Tokens are opaque strings; never decode their contents.
  function createConnectSessionLifecycle({ read, write, remove }) {
    let freshInFlight = null;
    let generation = 0;
    let changing = false;
    let storageTail = Promise.resolve();
    const sameCredentials = (left, right) => left?.refresh_token === right?.refresh_token
      && left?.access_token === right?.access_token && left?.baseUrl === right?.baseUrl
      && left?.clientId === right?.clientId;
    function serialize(operation) {
      const pending = storageTail.then(operation, operation);
      storageTail = pending.catch(() => {});
      return pending;
    }
    return {
      version: () => generation,
      isCurrent: version => version === generation,
      isChanging: () => changing,
      settled: () => storageTail,
      beginChange() { generation += 1; changing = true; freshInFlight = null; return generation; },
      endChange(version) { if (version === generation) changing = false; },
      fresh(operation) {
        if (freshInFlight) return freshInFlight;
        const version = generation;
        const pending = Promise.resolve().then(() => operation(version));
        freshInFlight = pending;
        const release = () => { if (freshInFlight === pending) freshInFlight = null; };
        pending.then(release, release);
        return pending;
      },
      async unchanged(version, expected) {
        const current = await read();
        return version === generation && sameCredentials(current, expected);
      },
      replace(version, expected, next) {
        return serialize(async () => {
          if (version !== generation) return false;
          const current = await read();
          if (version !== generation || !sameCredentials(current, expected)) return false;
          if (next) await write(next); else await remove();
          return version === generation;
        });
      },
      commitChange(version, session) {
        return serialize(async () => {
          if (version !== generation) return false;
          await write(session);
          return version === generation;
        });
      },
      clearChange(version) {
        return serialize(async () => {
          if (version !== generation) return null;
          const current = await read();
          if (version !== generation) return null;
          await remove();
          return current;
        });
      },
    };
  }
  globalThis.__afShadowingConnectSessionLifecycle = { createConnectSessionLifecycle };
})();
