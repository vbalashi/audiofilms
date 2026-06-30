(function audioFilmsIssueReportsDomModule() {
  function renderIssueReportDialog(dialog, dialogState = {}) {
    if (!(dialog instanceof HTMLElement)) return;
    const category = dialog.querySelector("[data-af-issue-category]");
    const description = dialog.querySelector("[data-af-issue-description]");
    const expected = dialog.querySelector("[data-af-issue-expected]");
    const diagnostics = dialog.querySelector("[data-af-issue-diagnostics]");
    const status = dialog.querySelector("[data-af-issue-status]");
    const submit = dialog.querySelector("[data-af-issue-submit]");
    const copy = dialog.querySelector("[data-af-issue-copy]");

    dialog.hidden = Boolean(dialogState.hidden);
    dialog.classList.toggle("is-submitting", Boolean(dialogState.submitting));
    if (category) category.value = dialogState.category || "";
    if (description && description.value !== dialogState.description) {
      description.value = dialogState.description || "";
    }
    if (expected && expected.value !== dialogState.expectedBehavior) {
      expected.value = dialogState.expectedBehavior || "";
    }
    if (diagnostics) diagnostics.checked = Boolean(dialogState.includeDiagnostics);
    if (status) {
      status.textContent = dialogState.status?.text || "";
      status.classList.toggle("is-error", Boolean(dialogState.status?.error));
      status.hidden = Boolean(dialogState.status?.hidden);
    }
    if (submit) {
      submit.textContent = dialogState.submit?.text || "";
      submit.disabled = Boolean(dialogState.submit?.disabled);
    }
    if (copy) {
      copy.textContent = dialogState.copy?.text || "";
      copy.disabled = Boolean(dialogState.copy?.disabled);
    }
  }

  window.__afShadowingIssueReportsDom = {
    renderIssueReportDialog,
  };
})();
