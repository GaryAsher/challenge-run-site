# CRC Staff Compliance Procedures

**Internal Document — Not Public-Facing**
Last updated: February 11, 2026

---

## 1. Purpose

This document defines how CRC staff (Admins, Moderators, and Verifiers) must handle user data, privacy requests, and moderation actions to ensure compliance with applicable privacy laws and protect both users and staff.

**If you are unsure about any procedure described here, escalate to an Admin before taking action.**

---

## 2. Roles and Data Access

| Role | Can Access | Can Modify | Can Delete |
|------|-----------|-----------|-----------|
| **Verifier** | Pending runs for assigned games, submitter profile (public info only) | Run status (approve/reject) | Nothing |
| **Moderator** | Pending runs, pending profiles, user reports for assigned games | Run status, profile approval status | Nothing — escalate to Admin |
| **Admin** | All pending items, all user profiles, moderation queue, audit logs | All submission statuses, user profiles, moderator assignments | User data (upon valid request only) |
| **Super Admin** | Everything | Everything | Everything |

**Key rule:** Only access the minimum data necessary to perform your specific task. Do not browse user data out of curiosity.

---

## 3. Handling User Data Requests

### 3.1 When a User Requests Data Access or Export

A user may ask for a copy of their personal data. This is a legal right under GDPR, CCPA, and other laws.

**Procedure:**
1. Direct the user to email **privacy@challengerun.net**
2. Do NOT attempt to compile or send data yourself
3. An Admin will verify the user's identity and process the request
4. Response deadline: within 30 days (GDPR) or 45 days (CCPA)

### 3.2 When a User Requests Data Deletion

A user may ask to have their personal data removed. This is a legal right in most jurisdictions.

**Procedure:**
1. Direct the user to email **privacy@challengerun.net** or use account self-deletion if available
2. Do NOT delete data yourself — escalate to an Admin
3. An Admin will:
   - Verify the user's identity
   - Delete personal data (profile, linked accounts, contact info)
   - Anonymize run submissions (replace runner identity with "Anonymous Runner" placeholder)
   - Preserve anonymized historical records (World's Firsts, leaderboard entries)
   - Log the action in the audit log
4. Confirm completion to the user via email

**Why only Admins handle deletion:** Deletion is irreversible and has legal implications. Having a single documented process protects everyone — including you. This is a lesson learned: staff who act on deletion requests without a defined process can be unfairly blamed.

### 3.3 When a User Requests Data Correction

A user may ask to update inaccurate information.

**Procedure:**
1. If the user can correct it themselves (profile fields, display name): direct them to their account settings
2. If they cannot (e.g., data in a system they can't access): forward to an Admin via the support system
3. Do NOT edit user profile data on their behalf without Admin approval

---

## 4. Jurisdiction-Specific Requirements

### 4.1 GDPR (EU/EEA/UK Residents)

Applies to any user located in the EU, EEA, or UK — regardless of their citizenship.

**Key requirements:**
- **Response time:** 30 days from receiving the request (can extend by 60 days for complex requests, but must notify the user of the extension within the first 30 days)
- **Right to be forgotten:** Must delete personal data when requested, unless we have a legal obligation to retain it
- **Right to portability:** Must provide data in a machine-readable format (JSON or CSV)
- **Right to object:** User can object to processing based on "legitimate interest" — escalate these to an Admin immediately
- **Minors:** Users under 16 in some EU countries require parental consent. If you suspect a user is underage, escalate to an Admin
- **Breach notification:** If you discover or suspect a data breach, notify an Admin IMMEDIATELY — we have legal obligations on notification timing

**What this means for daily moderation:** If an EU user asks you to remove their data in a DM, on Discord, or anywhere else — acknowledge the request politely, tell them to email privacy@challengerun.net for formal processing, and notify an Admin that a request came in. Do not ignore it.

### 4.2 CCPA/CPRA (California Residents)

Applies to California residents.

**Key requirements:**
- **Response time:** 45 days from receiving the request (can extend by another 45 days with notice)
- **Right to know:** Must disclose what data we collect and why
- **Right to delete:** Similar to GDPR
- **Right to opt out of sale:** We don't sell data, but must still honor the request formally
- **Non-discrimination:** Cannot treat users differently for exercising their rights
- **Verification:** Must verify the requester's identity before processing

**Practical difference from GDPR:** Slightly longer response window (45 days vs 30), but otherwise handle the same way — escalate to Admin via the privacy email.

### 4.3 Other Jurisdictions

For users in other regions (South America, Asia, etc.), many countries have their own data protection laws. The safest approach is: **treat every data request as if it were a GDPR request.** GDPR is the strictest standard, so meeting it means you'll meet most other requirements.

---

## 5. Moderation Actions

### 5.1 Content Removal

When removing user content (runs, profile elements, comments):
1. Document the reason for removal
2. The system should log the action automatically in the audit trail
3. Where possible, notify the user of the removal and the reason
4. For borderline cases, consult with another moderator or Admin before acting

### 5.2 Account Suspension / Banning

**Verifiers:** You cannot suspend or ban users. Escalate to a Moderator or Admin.

**Moderators:**
1. Temporary suspensions for clear guideline violations — document the reason
2. For permanent bans, escalate to an Admin for approval
3. Always log the action with a clear reason

**Admins:**
1. May issue temporary or permanent bans
2. Must document the reason in the audit log
3. For permanent bans, notify the user of the reason and inform them of the appeals process
4. When banning a user, do NOT delete their data as punishment — data deletion is a separate process governed by privacy law

### 5.3 Run Rejections

1. Provide a reason for rejection
2. If the runner disputes it, direct them to the appeals process
3. Do not engage in arguments — keep communication factual and professional

---

## 6. Data Breach Response

A "data breach" is any unauthorized access to, disclosure of, or loss of personal data.

**Examples:** database leak, unauthorized account access, accidental exposure of user emails, compromised admin credentials.

**If you discover or suspect a breach:**

1. **IMMEDIATELY** notify a Super Admin — do not wait
2. Do not attempt to fix it yourself unless you are certain of the correct action
3. Do not publicly disclose the breach until Admins have assessed the situation
4. Document everything you know: what happened, when you noticed, what data may be affected

**Admin responsibilities upon breach notification:**
1. Assess the scope and severity
2. Contain the breach (revoke compromised credentials, patch the vulnerability)
3. Notify relevant authorities as required by law
4. Notify affected users describing what happened, what data was affected, and what steps we're taking
5. Document the incident, response, and remediation

---

## 7. General Rules for All Staff

- **Do not share user data** with anyone outside the staff team, ever, unless required by law
- **Do not access user data** beyond what your role requires for the task at hand
- **Do not discuss** specific user data, moderation cases, or privacy requests publicly (including on Discord, streams, or social media)
- **Do not use your role** to gain advantages (queue priority, preferential treatment, access to information about other users)
- **Log your actions** — if the system logs it automatically, great. If not, document what you did and why
- **When in doubt, escalate** — it is always better to ask an Admin than to act and be wrong

---

## 8. Quick Reference: "A User Asked Me To..."

| User Request | Your Action |
|---|---|
| "Delete my account" | Direct to account settings or privacy@challengerun.net. Notify an Admin. |
| "Delete my runs" | Direct to privacy@challengerun.net. Do NOT delete them yourself. |
| "Remove my profile info" | Direct to privacy@challengerun.net. Do NOT edit it yourself. |
| "Give me a copy of my data" | Direct to privacy@challengerun.net. |
| "Someone is using my content without permission" | Escalate to an Admin — potential DMCA issue. |
| "I want to appeal my ban" | Direct to the Support Page. |
| "I'm under 13/16" | Escalate to an Admin immediately. Account may need to be suspended. |
| "Another user is harassing me" | Document the report, take appropriate moderation action per Section 5. |

---

## 9. Document History

| Date | Change | Author |
|------|--------|--------|
| February 11, 2026 | Initial version | — |
