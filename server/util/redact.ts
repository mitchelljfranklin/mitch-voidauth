// Fork-owned module: email_log body redaction. email.ts keeps
// `body: redactChallenges(...)` seams at each sender (see FORK.md).

// Email bodies are persisted in the email_log table for auditing; strip the
// secret challenges from verification/reset/invitation links so a database
// compromise does not yield working takeover links.
export function redactChallenges(body: string | null | undefined): string | null {
  if (!body) {
    return body ?? null
  }
  return body
    .replace(/([?&]challenge=)[^"'&\s<>]+/gi, '$1[REDACTED]')
    .replace(/(\/verify_email\/[0-9a-fA-F-]{36}\/)[^"'\s<>]+/gi, '$1[REDACTED]')
}
