# CRC Staff Procedures — Admin Guide

**Internal Document — Not Public-Facing**
Last updated: February 11, 2026

---

## Your Role

As an Admin, you have broad authority over the platform. You can manage all submissions, user profiles, moderator assignments, and handle user data requests. You are the primary handler of privacy requests, permanent bans, and escalations from Moderators and Verifiers.

---

## What You Can Access

- All pending items (runs, profiles, games, game updates)
- All user profiles and moderation queue
- Audit logs
- Moderator assignments

## What You Can Do

- Approve/reject any submissions
- Edit user profiles
- Issue temporary or permanent bans
- Delete user data (upon valid request only — see below)
- Assign and remove Moderators and Verifiers

## What You Cannot Do

- Access or modify site financials, system configuration, or infrastructure
- These are reserved for Super Admins

---

## Handling User Data Requests

You are the primary handler of privacy requests escalated by Moderators, Verifiers, or received directly via privacy@challengerun.net. All data requests are legal obligations — treat them seriously.

### Data Access / Export Requests

A user has the right to receive a copy of their personal data.

1. Verify the user's identity (confirm they own the account — match email, OAuth provider, or other identifying info)
2. Compile their data: profile information, run submissions, linked accounts, any support ticket history
3. Provide it in a machine-readable format (JSON or CSV)
4. Respond within the applicable deadline (see Jurisdiction section below)

### Data Deletion Requests

1. Verify the user's identity
2. Delete personal data:
   - Profile information (display name, bio, social links, avatar, banner, location, pronouns)
   - Linked OAuth accounts
   - Contact information and support ticket content
3. Anonymize run submissions:
   - Replace the runner identity with an "Anonymous Runner" placeholder
   - Preserve the run data itself (time, category, video link, game) for leaderboard integrity
   - Preserve historical records (World's Firsts, achievements)
4. Log the action in the audit log with the date and reason
5. Confirm completion to the user via email

**Important:** Anonymization must be irreversible. Null out or replace the `user_id` foreign key — do not just hide the display name.

### Data Correction Requests

1. If the user can self-correct (profile fields), direct them to account settings
2. If they cannot, verify their identity and make the correction
3. Log the change

---

## Jurisdiction-Specific Requirements

### GDPR (EU/EEA/UK Residents)

Applies to any user located in the EU, EEA, or UK regardless of citizenship.

- **Response time:** 30 days. Can extend by 60 days for complex requests, but must notify the user of the extension within the first 30 days.
- **Right to be forgotten:** Must delete personal data when requested, unless a legal obligation requires retention.
- **Right to portability:** Must provide data in machine-readable format (JSON or CSV).
- **Right to object:** User can object to processing based on "legitimate interest." If received, review whether the processing is justified and respond.
- **Minors:** Users under 16 in some EU member states require parental consent. If discovered, suspend the account and contact the user.
- **Breach notification:** Legal obligation to notify authorities within 72 hours and affected users without undue delay. See Breach Response section.

### CCPA/CPRA (California Residents)

- **Response time:** 45 days. Can extend by another 45 days with notice to the user.
- **Right to know:** Must disclose what data we collect and why.
- **Right to delete:** Same process as GDPR deletion.
- **Right to opt out of sale:** We don't sell data. Acknowledge the request formally and confirm.
- **Non-discrimination:** Cannot treat users differently for exercising their rights.
- **Verification:** Must verify identity before processing any request.

### Other Jurisdictions

Many countries (Argentina, Colombia, Uruguay, Chile, South Korea, Japan, etc.) have their own data protection laws. **Default to GDPR standards for any request** — it's the strictest, so meeting it covers most others.

---

## Account Suspension and Banning

### Temporary Suspensions
1. Document the reason clearly in the system
2. Notify the user of the reason and duration

### Permanent Bans
1. Document the reason in the audit log
2. Notify the user of the reason
3. Inform the user of the appeals process (Support Page)
4. **Do NOT delete their data as punishment** — data deletion is a separate privacy process, never a disciplinary tool

---

## Data Breach Response

A "data breach" is any unauthorized access to, disclosure of, or loss of personal data. Examples: database leak, unauthorized account access, exposed user emails, compromised credentials.

**When notified of a potential breach:**

1. Assess the scope — what data, how many users, how it happened
2. Contain it — revoke compromised credentials, patch the vulnerability, restrict access
3. Notify a Super Admin
4. Notify relevant authorities as required by law
5. Notify affected users — describe what happened, what data was affected, and what steps are being taken
6. Document the full incident: timeline, scope, response, remediation

**Do not publicly disclose** until the scope is assessed and containment is underway.

---

## General Rules

- **Only access data needed for your current task** — admin access does not mean unrestricted browsing
- **Do not share user data** with anyone outside the staff team unless required by law
- **Do not discuss** specific user data, privacy requests, or moderation cases publicly
- **Do not use your role** for personal advantage
- **Log all significant actions** — deletions, bans, data requests, escalations
- **Treat every data request as legitimate** until you have reason to believe otherwise — do not ignore or delay

---

## When a User Asks You Something

| User Request | Your Action |
|---|---|
| "Delete my account / runs / profile" | Verify identity. Process deletion per the procedure above. |
| "Give me a copy of my data" | Verify identity. Compile and deliver within deadline. |
| "Fix my profile info" | Verify identity. Make correction or direct to self-service. |
| "Someone stole my content" | Assess as potential DMCA issue. Respond per legal@challengerun.net. |
| "I want to appeal my ban" | Review the case. Have a different staff member review if possible. |
| "I'm under 13/16" | Suspend account. Contact user about age requirements. |
| "Another user is harassing me" | Investigate. Take moderation action as warranted. |

---

| Date | Change |
|------|--------|
| February 11, 2026 | Initial version |
