(function audioFilmsIssueReportWorkflow() {
  function createIssueReportDialog(panel, options = {}) {
    const state = options.getState();
    return options.workspaceDom.createIssueReportDialog(panel, {
      iconSvg: options.iconSvg,
      categories: options.categories,
      onClose: options.closeIssueReportDialog,
      onCategoryChange: (event) => {
        state.issueCategory = event.currentTarget.value;
        options.render?.();
      },
      onDescriptionInput: (event) => {
        state.issueDescription = event.currentTarget.value;
        state.issueSubmitError = "";
        state.issueSubmitStatus = "";
        options.render?.();
      },
      onExpectedInput: (event) => {
        state.issueExpectedBehavior = event.currentTarget.value;
        options.render?.();
      },
      onDiagnosticsChange: (event) => {
        state.issueIncludeDiagnostics = Boolean(event.currentTarget.checked);
        options.render?.();
      },
      onSubmit: options.submitIssueReport,
      onCopy: options.copyCurrentIssueReport,
    });
  }

  function sendIssueReportPayload({
    report,
    category,
    description,
    expectedBehavior,
    includeDiagnostics,
  } = {}, options = {}) {
    return options.postBackendJson("issue-report-submit", options.issueReports.issueReportPayload({
      report,
      category,
      description,
      expectedBehavior,
      includeDiagnostics,
      extensionVersion: options.extensionVersion(),
      extensionBuildInfo: options.extensionBuildInfo(),
      backendBuildInfo: options.backendBuildInfo,
      browserUserAgent: options.browserUserAgent,
    }));
  }

  function createIssueReportWorkflow({
    state,
    issueReports,
    formatIssueReport,
    sendIssueReportPayload,
    recordDebugEvent,
    render,
    copyIssueReport,
    setTimeout,
  } = {}) {
    function open(options = {}) {
      const report = formatIssueReport(options.reportOptions || {});
      recordDebugEvent("issue-marked", {
        navigationEventId: state.navigationEvents.at(-1)?.id || null,
        currentIndex: state.currentIndex,
        source: options.source || "manual",
      });
      state.lastIssueReport = report;
      if (options.category) state.issueCategory = options.category;
      if (options.description !== undefined) state.issueDescription = options.description;
      if (options.expectedBehavior !== undefined) state.issueExpectedBehavior = options.expectedBehavior;
      state.issueDialogOpen = true;
      state.issueSubmitStatus = "";
      state.issueSubmitError = "";
      state.issueSubmittedId = "";
      render();
    }

    function close() {
      if (state.issueSubmitting) return;
      state.issueDialogOpen = false;
      state.issueSubmitStatus = "";
      state.issueSubmitError = "";
      render();
    }

    function copyCurrent() {
      const report = state.lastIssueReport || formatIssueReport();
      state.lastIssueReport = report;
      state.issueCopied = true;
      state.issueSubmitStatus = "Report copied.";
      state.issueSubmitError = "";
      render();
      copyIssueReport(report);
      setTimeout(() => {
        state.issueCopied = false;
        if (state.issueSubmitStatus === "Report copied.") {
          state.issueSubmitStatus = "";
        }
        render();
      }, 1500);
    }

    async function submit() {
      const description = state.issueDescription.trim();
      if (!description) {
        state.issueSubmitError = "Describe what went wrong before submitting.";
        state.issueSubmitStatus = "";
        render();
        return;
      }

      const report = state.lastIssueReport || formatIssueReport();
      state.lastIssueReport = report;
      state.issueSubmitting = true;
      state.issueSubmitError = "";
      state.issueSubmitStatus = "Submitting...";
      render();

      try {
        const result = await sendIssueReportPayload({
          report,
          category: state.issueCategory,
          description,
          expectedBehavior: state.issueExpectedBehavior.trim(),
          includeDiagnostics: state.issueIncludeDiagnostics,
        });
        state.issueSubmittedId = result?.id || "";
        state.issueSubmitStatus = result?.id ? `Submitted: ${result.id}` : "Submitted.";
        state.issueSubmitError = "";
        state.issueDescription = "";
        state.issueExpectedBehavior = "";
        recordDebugEvent("issue-report-submitted", {
          reportId: result?.id || null,
          category: state.issueCategory,
        });
      } catch (error) {
        state.issueSubmitStatus = "";
        state.issueSubmitError = issueReports.readableIssueSubmitError(error);
        recordDebugEvent("issue-report-submit-failed", {
          error: state.issueSubmitError,
          category: state.issueCategory,
        });
      } finally {
        state.issueSubmitting = false;
        render();
      }
    }

    async function submitPhraseBoundary() {
      if (!state.phrases.length || state.loading) return;

      const report = formatIssueReport({ boundaryCaseReason: "quick-bad-split" });
      state.lastIssueReport = report;
      state.issueCategory = "phrase-boundary";
      state.issueDescription = "Incorrect phrase split or merged sentence boundary.";
      state.issueExpectedBehavior = "Sentence parts should be grouped into the correct full display sentence while replay remains on the current short segment.";
      state.issueIncludeDiagnostics = true;
      state.issueSubmitStatus = "Submitting boundary case...";
      state.issueSubmitError = "";
      state.issueSubmitting = true;
      state.issueDialogOpen = false;
      render();

      try {
        const result = await sendIssueReportPayload({
          report,
          category: "phrase-boundary",
          description: state.issueDescription,
          expectedBehavior: state.issueExpectedBehavior,
          includeDiagnostics: true,
        });
        state.issueSubmittedId = result?.id || "";
        state.issueSubmitStatus = result?.id ? `Boundary case saved: ${result.id}` : "Boundary case saved.";
        recordDebugEvent("phrase-boundary-case-submitted", {
          reportId: result?.id || null,
          currentIndex: state.currentIndex,
        });
      } catch (error) {
        state.issueSubmitStatus = "";
        state.issueSubmitError = issueReports.readableIssueSubmitError(error);
        recordDebugEvent("phrase-boundary-case-submit-failed", {
          error: state.issueSubmitError,
          currentIndex: state.currentIndex,
        });
      } finally {
        state.issueSubmitting = false;
        render();
      }
    }

    return {
      open,
      close,
      copyCurrent,
      submit,
      submitPhraseBoundary,
    };
  }

  window.__afShadowingIssueReportWorkflow = {
    createIssueReportDialog,
    sendIssueReportPayload,
    createIssueReportWorkflow,
  };
})();
