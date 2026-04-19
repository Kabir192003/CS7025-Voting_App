/**
 * File: sanitize.js
 * Purpose: Utility enforcing input sanitization interceptors to preempt XSS vulnerabilities
 */

module.exports = function sanitize(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
};
 
