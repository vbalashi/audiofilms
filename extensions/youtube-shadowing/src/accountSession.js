(function audioFilmsAccountSessionModule() {
  function mergeBackendSession(session, backendSession) {
    if (!backendSession) return session || null;
    return {
      ...(session || {}),
      authenticated: backendSession.authenticated === true,
      user: backendSession.user || session?.user || null,
      preferences: backendSession.preferences || null,
    };
  }

  function sessionState(session, error = "") {
    const accountError = error || "";
    const accountUser = session?.user || null;
    return {
      accountUser,
      accountPreferences: session?.preferences || null,
      accountError,
      accountStatus: accountUser ? "signed-in" : accountError ? "expired" : "guest",
    };
  }

  function accountStatusLabel({ accountStatus, accountUser } = {}) {
    if (accountStatus === "signed-in") return accountUser?.email || "2000NL connected";
    if (accountStatus === "expired") return "Reconnect 2000NL";
    return "Guest lookup";
  }

  function accountStatusAriaLabel({ accountStatus, accountUser } = {}) {
    if (accountStatus === "signed-in") {
      return `2000NL account connected${accountUser?.email ? ` as ${accountUser.email}` : ""}`;
    }
    if (accountStatus === "expired") return "Reconnect 2000NL account";
    return "Connect 2000NL account";
  }

  function accountStatusCopy({ accountLoading, accountStatus, accountUser, accountError } = {}) {
    if (accountLoading) return "Connecting to 2000NL...";
    if (accountStatus === "signed-in") {
      return accountUser?.email
        ? `Connected as ${accountUser.email}.`
        : "Connected to 2000NL.";
    }
    if (accountStatus === "expired") {
      return accountError
        ? `Session expired: ${accountError}`
        : "Session expired. Reconnect to restore lookup and progress.";
    }
    return "Not connected. Personal progress is off.";
  }

  function accountConnectLabel({ accountLoading, accountStatus } = {}) {
    if (accountLoading) return "Connecting...";
    if (accountStatus === "signed-in") return "Disconnect";
    if (accountStatus === "expired") return "Reconnect 2000NL";
    return "Connect 2000NL";
  }

  function accountControlState(input = {}) {
    const label = accountStatusLabel(input);
    const signedIn = input.accountStatus === "signed-in";
    return {
      icon: signedIn ? "account-connected" : "account",
      srText: label,
      connected: signedIn,
      ariaLabel: accountStatusAriaLabel(input),
      expanded: Boolean(input.accountMenuOpen),
      title: label,
      menuOpen: Boolean(input.accountMenuOpen),
      copy: accountStatusCopy(input),
      actionText: accountConnectLabel(input),
      actionDisabled: Boolean(input.accountLoading),
    };
  }

  function accountMiniCardState(input = {}) {
    return {
      copy: accountStatusCopy(input),
      error: input.accountError || "",
      actionText: input.accountStatus === "signed-in" ? "Disconnect" : accountConnectLabel(input),
      actionDisabled: Boolean(input.accountLoading),
    };
  }

  function connectPromptState(input = {}) {
    return {
      copy: accountStatusCopy(input),
      actionText: accountConnectLabel(input),
      actionDisabled: Boolean(input.accountLoading),
    };
  }

  window.__afShadowingAccountSession = {
    mergeBackendSession,
    sessionState,
    accountStatusLabel,
    accountStatusAriaLabel,
    accountStatusCopy,
    accountConnectLabel,
    accountControlState,
    accountMiniCardState,
    connectPromptState,
  };
})();
