async function main() {
  const { CRON_SECRET, JOB_URL } = process.env;
  if (!CRON_SECRET?.trim() || !JOB_URL) {
    console.error("Scheduled request is missing its URL or credentials.");
    process.exitCode = 1;
    return;
  }

  const url = new URL(JOB_URL);
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
    redirect: "manual",
    signal: AbortSignal.timeout(270_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    console.error(`Scheduled request returned HTTP ${response.status}.`);
    process.exitCode = 1;
    return;
  }

  const summary = await response.json();
  const completed =
    url.pathname === "/api/internal/backup"
      ? typeof summary?.databaseBackup === "string" &&
        summary.stoppedEarly === false
      : Number.isFinite(summary?.ranAt) &&
        summary.schedule?.stoppedEarly === false;
  if (!completed) {
    console.error("Scheduled request did not return a completed run summary.");
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error("Scheduled request failed.");
  process.exitCode = 1;
});
