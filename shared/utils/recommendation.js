import { validateRecommendation, validateMemberCriteria, MEMBER_FITS } from '../contracts/index.js';

const FIT_SCORES = Object.freeze({ strong: 100, good: 80, mixed: 55, poor: 25, blocked: 0, insufficient_information: 50 });

function nonempty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a nonempty string`);
  return value.trim();
}

function cleanList(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return [...new Set(value.map(item => nonempty(item, label)))].slice(0, 3);
}

function joinNames(values) {
  if (values.length < 2) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function possessiveNames(values) {
  const joined = joinNames(values);
  return `${joined}${joined.endsWith('s') ? "'" : "'s"}`;
}

function groupCriteria(evaluations, names, field) {
  const groups = new Map();
  for (const evaluation of evaluations) {
    for (const criterion of evaluation[field]) {
      const key = criterion.toLocaleLowerCase();
      const group = groups.get(key) ?? { criterion, names: [] };
      group.names.push(names.get(evaluation.memberId)); groups.set(key, group);
    }
  }
  return [...groups.values()];
}

function matchPhrase({ criterion, names }) {
  return `${possessiveNames(names)} interest in ${criterion}`;
}

function conflictPhrase({ criterion, names }) {
  const owner = possessiveNames(names); const normalized = criterion.toLocaleLowerCase();
  if (normalized === 'budget' || normalized === 'price' || normalized === 'outside budget') return `may be outside ${owner} budget`;
  if (normalized === 'distance' || normalized === 'too far') return `may be too far for ${joinNames(names)}`;
  if (normalized === 'effort' || normalized === 'mobility') return `may require more effort than ${joinNames(names)} prefers`;
  return `may conflict with ${owner} preference about ${criterion}`;
}

/**
 * Build the factual input Person 2 sends to the model. The model should evaluate
 * every member independently and return only fit, matchedCriteria and conflicts.
 */
export function createRecommendationInput({ place, members, evidence = [] }) {
  if (!place?.id) throw new TypeError('A place is required');
  if (!Array.isArray(members) || members.length === 0) throw new TypeError('At least one member is required');
  members.forEach(validateMemberCriteria);
  return {
    place: {
      id: place.id, name: place.name, matchStatus: place.matchStatus,
      area: place.area ?? null, brief: place.brief ?? null, practical: place.practical ?? {},
    },
    members: members.map(member => ({
      memberId: member.id,
      displayName: member.displayName,
      criteria: member.preferences ?? {},
      firmLimits: member.firmLimits ?? {},
    })),
    evidence: evidence.filter(item => item.placeId === place.id).map(item => ({
      facts: item.facts, sourceUrl: item.sourceUrl, retrievedAt: item.retrievedAt,
    })),
  };
}

/** Convert model assessments into stable, ready-to-render recommendation text. */
export function buildGroupRecommendation({ place, members, evaluations, evidenceStatus = 'confirmed' }) {
  if (!Array.isArray(evaluations)) throw new TypeError('evaluations must be an array');
  const names = new Map(members.map(member => [member.id, member.displayName]));
  const normalized = evaluations.map(item => {
    if (!names.has(item.memberId)) throw new TypeError('Evaluation references an unknown member');
    if (!MEMBER_FITS.includes(item.fit)) throw new TypeError('Invalid member fit');
    return {
      memberId: item.memberId,
      fit: item.fit,
      matchedCriteria: cleanList(item.matchedCriteria ?? [], 'matchedCriteria'),
      conflicts: cleanList(item.conflicts ?? [], 'conflicts'),
    };
  });

  const blocked = normalized.filter(item => item.fit === 'blocked');
  const unknown = normalized.filter(item => item.fit === 'insufficient_information');
  const score = Math.round(normalized.reduce((sum, item) => sum + FIT_SCORES[item.fit], 0) / normalized.length);
  let verdict; let headline;
  if (place.matchStatus !== 'confirmed' || evidenceStatus === 'uncertain' || unknown.length === normalized.length) {
    verdict = 'needs_more_information'; headline = 'More information needed';
  } else if (blocked.length) {
    verdict = 'not_recommended'; headline = 'Conflicts with a firm limit';
  } else if (score >= 85) {
    verdict = 'strong_match'; headline = 'Strong match for your group';
  } else if (score >= 65) {
    verdict = 'recommended'; headline = 'Recommended for your group';
  } else if (score >= 40) {
    verdict = 'mixed_fit'; headline = 'Mixed fit for your group';
  } else {
    verdict = 'not_recommended'; headline = 'Probably not a group fit';
  }

  const matched = groupCriteria(normalized, names, 'matchedCriteria').slice(0, 3);
  const conflicts = groupCriteria(normalized, names, 'conflicts').slice(0, 2);
  let text;
  if (verdict === 'needs_more_information') text = `We need more verified information before recommending ${place.name}.`;
  else if (blocked.length) text = `${place.name} conflicts with a firm limit for ${blocked.map(item => names.get(item.memberId)).join(' and ')}.`;
  else {
    const fitText = matched.length ? `It matches ${matched.map(matchPhrase).join('; ')}` : 'It has some potential for the group';
    text = `${fitText}${conflicts.length ? `, but ${conflicts.map(conflictPhrase).join(' and ')}` : ''}.`;
  }

  return validateRecommendation({ placeId: place.id, verdict, score, headline, text, evidenceStatus, memberEvaluations: normalized }, [place], members);
}
