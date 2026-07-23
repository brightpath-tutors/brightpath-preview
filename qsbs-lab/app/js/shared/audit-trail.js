// js/shared/audit-trail.js

export function buildAuditTrail(engineId, inputs, steps, lawSnapshot) {
  return {
    engine: engineId,
    inputs_used: inputs || {},
    steps: steps || [],
    law_snapshot: lawSnapshot || {},
    source_register: []
  };
}

export function addStep(trail, step, result) {
  if (trail && trail.steps) trail.steps.push({ step: step, result: result });
}

export function addSource(trail, citation, text, url) {
  if (trail && trail.source_register) {
    trail.source_register.push({ citation: citation, text: text, url: url || '', date_checked: '2026-06-01' });
  }
}
