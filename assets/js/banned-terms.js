/**
 * Challenge Run Community - Banned Terms Checker
 * 
 * Client-side validation for user-submitted content.
 * Checks for slurs, spam, malicious content, and personal info.
 * 
 * Usage:
 *   import { BannedTermsChecker } from '/assets/js/banned-terms.js';
 *   
 *   const result = BannedTermsChecker.check(userInput);
 *   if (!result.clean) {
 *     console.log('Violations:', result.violations);
 *   }
 */

// ============================================================
// Configuration (matches _data/banned-terms.yml)
// ============================================================

const CONFIG = {
  // Slur patterns (regex) - catches variations, leetspeak, embedded text
  slur_patterns: [
    /n[i1!][gq]{2}[e3a]r/gi,
    /f[a@4][gq]{2}[o0][t7]/gi,
    /r[e3][t7][a@4]rd/gi
  ],
  
  // Spam terms (simple substring match)
  spam: [
    "buy now",
    "click here",
    "make money fast",
    "free gift",
    "act now",
    "limited time offer",
    "congratulations you won",
    "claim your prize"
  ],
  
  // Malicious content (XSS, injection)
  malicious: [
    "<script",
    "</script",
    "javascript:",
    "onclick=",
    "onerror=",
    "onload=",
    "onmouseover=",
    "onfocus=",
    "onblur=",
    "data:text/html",
    "eval(",
    "document.cookie",
    "document.write",
    "window.location",
    "innerhtml",
    "fromcharcode"
  ],
  
  // Email patterns (prevent personal info exposure)
  email_domains: [
    "@gmail.com",
    "@yahoo.com",
    "@hotmail.com",
    "@outlook.com",
    "@protonmail.com",
    "@icloud.com"
  ],
  
  // Phone number pattern
  phone_regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // Exceptions (gaming terms that might false positive)
  exceptions: [
    "glitch",
    "exploit",
    "any%",
    "trigger",
    "flag"
  ]
};

// ============================================================
// Checker Implementation
// ============================================================

/**
 * Check content for banned terms
 * @param {string} content - The text to check
 * @param {Object} options - Optional settings
 * @param {boolean} options.checkSlurs - Check for slurs (default: true)
 * @param {boolean} options.checkSpam - Check for spam (default: true)
 * @param {boolean} options.checkMalicious - Check for XSS/injection (default: true)
 * @param {boolean} options.checkPersonalInfo - Check for emails/phones (default: true)
 * @returns {Object} { clean: boolean, violations: Array }
 */
function check(content, options = {}) {
  const {
    checkSlurs = true,
    checkSpam = true,
    checkMalicious = true,
    checkPersonalInfo = true
  } = options;
  
  if (!content || typeof content !== 'string') {
    return { clean: true, violations: [] };
  }
  
  const lowerContent = content.toLowerCase();
  const violations = [];
  
  // Check slur patterns
  if (checkSlurs) {
    for (const regex of CONFIG.slur_patterns) {
      regex.lastIndex = 0; // Reset for global regex
      if (regex.test(content)) {
        violations.push({
          type: 'slur',
          message: 'Prohibited language detected'
        });
        break; // One slur violation is enough
      }
    }
  }
  
  // Check spam terms
  if (checkSpam) {
    for (const term of CONFIG.spam) {
      if (lowerContent.includes(term.toLowerCase())) {
        // Check if it's an exception
        const isException = CONFIG.exceptions.some(exc => 
          term.toLowerCase().includes(exc) || exc.includes(term.toLowerCase())
        );
        
        if (!isException) {
          violations.push({
            type: 'spam',
            message: `Spam-like content detected: "${term}"`
          });
        }
      }
    }
  }
  
  // Check malicious content
  if (checkMalicious) {
    for (const term of CONFIG.malicious) {
      if (lowerContent.includes(term.toLowerCase())) {
        violations.push({
          type: 'malicious',
          message: 'Potentially malicious content detected'
        });
        break; // One malicious violation is enough
      }
    }
  }
  
  // Check personal info
  if (checkPersonalInfo) {
    // Email addresses
    for (const domain of CONFIG.email_domains) {
      if (lowerContent.includes(domain.toLowerCase())) {
        violations.push({
          type: 'personal_info',
          message: 'Please don\'t include email addresses in public content'
        });
        break;
      }
    }
    
    // Phone numbers (but not dates)
    CONFIG.phone_regex.lastIndex = 0;
    const phoneMatches = content.match(CONFIG.phone_regex);
    if (phoneMatches) {
      // Filter out date-like patterns (YYYY-MM-DD)
      const realPhones = phoneMatches.filter(m => !/^\d{4}-\d{2}-\d{2}$/.test(m));
      if (realPhones.length > 0) {
        violations.push({
          type: 'personal_info',
          message: 'Please don\'t include phone numbers in public content'
        });
      }
    }
  }
  
  return {
    clean: violations.length === 0,
    violations: violations
  };
}

/**
 * Check a single field for banned terms
 * @param {string} fieldName - Name of the field (for error context)
 * @param {string} content - The content to check
 * @param {Object} options - Same options as check()
 * @returns {Object} { ok: boolean, reason: string|null, violations: Array }
 */
function checkField(fieldName, content, options = {}) {
  const result = check(content, options);
  return {
    ok: result.clean,
    reason: result.clean ? null : getErrorMessage(result.violations),
    violations: result.violations
  };
}

/**
 * Check multiple fields at once
 * @param {Object} fields - Object with field names as keys and content as values
 * @param {Object} options - Same options as check()
 * @returns {Object} { ok: boolean, errors: { fieldName: errorMessage }, fieldViolations: { fieldName: violations[] } }
 */
function checkFields(fields, options = {}) {
  const fieldViolations = {};
  const errors = {};
  let hasViolations = false;
  
  for (const [fieldName, content] of Object.entries(fields)) {
    if (content) {
      const result = check(content, options);
      if (!result.clean) {
        fieldViolations[fieldName] = result.violations;
        errors[fieldName] = getErrorMessage(result.violations);
        hasViolations = true;
      }
    }
  }
  
  return {
    ok: !hasViolations,
    errors: errors,
    fieldViolations: fieldViolations
  };
}

/**
 * Get a user-friendly error message for violations
 * @param {Array} violations - Array of violation objects
 * @returns {string} Combined error message
 */
function getErrorMessage(violations) {
  if (!violations || violations.length === 0) {
    return '';
  }
  
  // Prioritize slur violations
  const slur = violations.find(v => v.type === 'slur');
  if (slur) {
    return 'Your submission contains prohibited language and cannot be accepted.';
  }
  
  // Malicious content
  const malicious = violations.find(v => v.type === 'malicious');
  if (malicious) {
    return 'Your submission contains content that is not allowed.';
  }
  
  // Personal info
  const personalInfo = violations.find(v => v.type === 'personal_info');
  if (personalInfo) {
    return personalInfo.message;
  }
  
  // Spam
  const spam = violations.find(v => v.type === 'spam');
  if (spam) {
    return 'Your submission looks like spam. Please revise and try again.';
  }
  
  return 'Your submission contains content that is not allowed.';
}

/**
 * Sanitize content by removing/replacing problematic characters
 * Note: This does NOT remove banned terms, just prevents XSS
 * @param {string} content - Raw user input
 * @returns {string} Sanitized content
 */
function sanitize(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ============================================================
// Export
// ============================================================

export const BannedTermsChecker = {
  check,
  checkField,
  checkFields,
  getErrorMessage,
  sanitize
};

export default BannedTermsChecker;
