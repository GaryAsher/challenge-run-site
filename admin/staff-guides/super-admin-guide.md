# CRC Staff Procedures — Super Admin Guide

**Internal Document — Not Public-Facing**
Last updated: February 11, 2026

---

## Your Role

As a Super Admin, you have full access to every system. You are the final escalation point, the breach response coordinator, and the owner of platform infrastructure decisions. Everything in the Admin Guide applies to you, plus the additional responsibilities below.

**You should also read the [Admin Guide](admin-guide.md)** — it covers the day-to-day procedures for data requests, moderation actions, and jurisdiction-specific requirements that apply to you as well.

---

## What You Can Access

Everything: all user data, all submissions, audit logs, site financials, system configuration, infrastructure settings, moderator/admin assignments.

---

## Additional Responsibilities

### Infrastructure and Configuration

- Supabase dashboard, RLS policies, database configuration
- Cloudflare dashboard, DNS, Workers, security settings
- GitHub repository, Actions, deployment pipelines
- Domain registration and email (legal@, privacy@ accounts)

### Financial Oversight

- Site financials and cost tracking
- Any future payment processing or donation systems

### Staff Management

- Appointing and removing Admins, Moderators, and Verifiers
- Ensuring all staff have read and understand their role-specific compliance guide
- Reviewing audit logs for misuse of privileges

---

## Breach Response — You Are the Coordinator

When an Admin or any staff member reports a potential breach, you lead the response:

1. **Assess** — Determine scope: what data, how many users, attack vector
2. **Contain** — Immediately revoke compromised credentials, rotate keys/secrets, patch the vulnerability, restrict access as needed
3. **Investigate** — Review audit logs, access logs, and any available evidence to determine root cause
4. **Notify authorities** — As required by law (GDPR: within 72 hours of becoming aware)
5. **Notify affected users** — Describe what happened, what data was affected, and what steps are being taken. Be factual, not speculative.
6. **Remediate** — Fix the underlying issue, update security measures, review whether additional safeguards are needed
7. **Document** — Full incident report: timeline, scope, response actions, remediation, lessons learned

### Breach Classification

| Severity | Examples | Response Time |
|----------|---------|---------------|
| **Critical** | Database leaked, auth system compromised, admin credentials stolen | Immediate — drop everything |
| **High** | Individual user data exposed, unauthorized access to admin panel | Within hours |
| **Medium** | Non-sensitive data exposed, failed attack with partial access | Within 24 hours |
| **Low** | Failed login attempts, minor misconfiguration with no data exposure | Investigate at next opportunity |

---

## Staff Onboarding Checklist

When adding new staff at any level:

- [ ] Assign the appropriate role in Supabase
- [ ] Provide them their role-specific compliance guide (Verifier, Moderator, or Admin)
- [ ] Confirm they have read and understand the guide
- [ ] Document the date they were onboarded and by whom

When removing staff:

- [ ] Revoke their role in Supabase immediately
- [ ] Review their recent actions in audit logs for anything unusual
- [ ] Document the date and reason for removal

---

## Monitoring and Audit

Periodically review:

- **Audit logs** — Look for unusual patterns: bulk data access, actions outside normal scope, late-night activity
- **Admin activity** — Ensure Admins are following data request procedures and logging their actions
- **Moderator reports** — Check that escalations are being handled and not ignored
- **RLS policies** — Verify database security policies haven't been inadvertently weakened by schema changes
- **Access permissions** — Confirm no staff members retain access after being removed

---

## General Rules

All rules from the Admin Guide apply. Additionally:

- **You are the last line of defense** — if something seems wrong, investigate it
- **Document everything at your level** — infrastructure changes, security decisions, staff changes
- **Keep credentials secure** — use strong unique passwords, enable 2FA on all admin accounts (Supabase, Cloudflare, GitHub, domain registrar)
- **Maintain the privacy@ and legal@ email accounts** — monitor them regularly, respond within required deadlines
- **Review this document and the other role guides** at least once every 6 months to ensure they're current

---

| Date | Change |
|------|--------|
| February 11, 2026 | Initial version |
