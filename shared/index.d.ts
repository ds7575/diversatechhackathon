export type ImportStatus = 'queued' | 'processing' | 'ready' | 'partially_ready' | 'needs_confirmation' | 'failed';
export type MatchStatus = 'confirmed' | 'uncertain';
export type ReactionValue = 'interested' | 'pass';
export type ConcernKind = 'price' | 'distance' | 'effort';
export type MemberFit = 'strong' | 'good' | 'mixed' | 'poor' | 'blocked' | 'insufficient_information';
export type RecommendationVerdict = 'strong_match' | 'recommended' | 'mixed_fit' | 'not_recommended' | 'needs_more_information';
export type EvidenceStatus = 'confirmed' | 'partial' | 'uncertain';
export type BudgetLevel = 'budget' | 'moderate' | 'premium';
export type ActivityLevel = 'low' | 'medium' | 'high';
export type CrowdPreference = 'avoid' | 'neutral' | 'enjoy';
export type BoardingPassLabel = 'strong' | 'discuss' | 'needs_info';

export interface Preferences {
  interests?: string[];
  budgetLevel?: BudgetLevel;
  activityLevel?: ActivityLevel;
  crowdPreference?: CrowdPreference;
  maxTravelMinutes?: number;
}

export interface FirmLimits {
  maxPriceLevel?: number;
  accessibilityRequired?: boolean;
  prohibitedActivities?: string[];
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  baseArea?: string | null;
  transport?: string | null;
  budget?: string | null;
  preferences?: Record<string, unknown>;
}

export interface Member {
  id: string;
  tripId: string;
  displayName: string;
  preferences: Preferences;
  firmLimits: FirmLimits;
}

export interface InstagramImport {
  id: string;
  tripId: string;
  normalizedUrl: string;
  thumbnailUrl: string | null;
  contributorIds: string[];
  status: ImportStatus;
  errorCode: string | null;
}

export interface ImportPlace { importId: string; placeId: string }

export interface PlacePractical {
  cost?: string;
  priceText?: string;
  caveats?: string[];
  [key: string]: unknown;
}

export interface Place {
  id: string;
  tripId: string;
  name: string;
  identityKey?: string;
  matchStatus: MatchStatus;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  brief: string | null;
  practical: PlacePractical;
}

export interface Evidence {
  id: string;
  placeId: string;
  sourceUrl: string;
  retrievedAt: string;
  facts: string[];
  source?: string;
  sourcePath?: string | null;
  timestampSeconds?: number | null;
}

export interface Reaction { placeId: string; memberId: string; value: ReactionValue }
export interface Concern { id: string; placeId: string; memberId: string; kind: ConcernKind; note?: string | null }

export interface Assignment {
  placeId: string;
  date: string | null;
  position: number;
  manual: boolean;
  reason: string;
}

export interface MemberEvaluation {
  memberId: string;
  fit: MemberFit;
  matchedCriteria: string[];
  conflicts: string[];
}

export interface Recommendation {
  placeId: string;
  verdict: RecommendationVerdict;
  score: number;
  headline: string;
  text: string;
  evidenceStatus: EvidenceStatus;
  memberEvaluations: MemberEvaluation[];
}

export interface TripSnapshot {
  trip: Trip;
  members: Member[];
  imports: InstagramImport[];
  importPlaces: ImportPlace[];
  places: Place[];
  evidence: Evidence[];
  recommendations: Recommendation[];
  reactions: Reaction[];
  concerns: Concern[];
  assignments: Assignment[];
  planRevision: number;
}

export interface SourceReel {
  importId: string;
  url: string;
  thumbnailUrl: string | null;
  contributorIds: string[];
}

export interface TripBoardCard {
  placeId: string;
  name: string;
  area: string | null;
  sourceReel: SourceReel | null;
  brief: string | null;
  practical: PlacePractical;
  verdict: RecommendationVerdict;
  score: number;
  headline: string;
  text: string;
  memberEvaluations: MemberEvaluation[];
  reason: string;
  manual: boolean;
}

export interface TripBoardDay { date: string; label: string; gist: string; cards: TripBoardCard[] }

export interface TripBoard {
  tripId: string;
  title: string;
  destination: string;
  dateRange: { startDate: string; endDate: string };
  gist: string;
  days: TripBoardDay[];
  ideas: TripBoardCard[];
}

export interface BoardingPassCardData {
  name: string;
  summary: string;
  location: string;
  cost: string;
  caveats: string[];
  label: BoardingPassLabel;
  reason: string;
  contributors: string[];
  reelUrl: string;
  thumbnailUrl: string | null;
  counts: Record<ReactionValue | ConcernKind, number>;
  mine: ReactionValue | ConcernKind | null;
}

export type FrontendTripBoardCard = TripBoardCard & { boardingPass: BoardingPassCardData };
export type FrontendTripBoard = Omit<TripBoard, 'days' | 'ideas'> & {
  days: Array<Omit<TripBoardDay, 'cards'> & { cards: FrontendTripBoardCard[] }>;
  ideas: FrontendTripBoardCard[];
};

export interface ExtractionEvidence {
  sourceUrl?: string;
  kind?: string;
  path?: string | null;
  timestamp_seconds?: number | null;
  quote?: string;
}

export interface ExtractionCandidate {
  name: string;
  locationContext?: string | null;
  uncertain?: boolean;
  evidence?: ExtractionEvidence[];
}

export type InstagramExtractionResult = ({ canonicalUrl: string; originalUrl?: string } | { canonicalUrl?: string; originalUrl: string }) & {
  status?: string;
  runStatus?: string;
  extraction: { candidates: ExtractionCandidate[] };
};

export const IMPORT_STATUSES: readonly ImportStatus[];
export const MATCH_STATUSES: readonly MatchStatus[];
export const REACTIONS: readonly ReactionValue[];
export const CONCERNS: readonly ConcernKind[];
export const MEMBER_FITS: readonly MemberFit[];
export const RECOMMENDATION_VERDICTS: readonly RecommendationVerdict[];
export const EVIDENCE_STATUSES: readonly EvidenceStatus[];
export const BUDGET_LEVELS: readonly BudgetLevel[];
export const ACTIVITY_LEVELS: readonly ActivityLevel[];
export const CROWD_PREFERENCES: readonly CrowdPreference[];
export const ROUTES: Readonly<Record<string, readonly [string, string]>>;

export function isDate(value: unknown): value is string;
export function normalizeInstagramUrl(value: string): string;
export const normalizeReelUrl: typeof normalizeInstagramUrl;
export function validatePreferences<T extends Preferences>(preferences?: T): T;
export function validateFirmLimits<T extends FirmLimits>(firmLimits?: T): T;
export function validateMemberCriteria<T extends Member>(member: T): T;
export function validateTrip<T extends Trip>(trip: T): T;
export function validateAssignments(assignments: Assignment[], places: Place[], trip: Trip): Assignment[];
export function validateRecommendation(recommendation: Recommendation, places: Place[], members: Member[]): Recommendation;
export function validateTripBoard(board: TripBoard, trip: Trip, places: Place[]): TripBoard;

export function createRecommendationInput(input: { place: Place; members: Member[]; evidence?: Evidence[] }): {
  place: Pick<Place, 'id' | 'name' | 'matchStatus' | 'area' | 'brief' | 'practical'>;
  members: Array<{ memberId: string; displayName: string; criteria: Preferences; firmLimits: FirmLimits }>;
  evidence: Array<Pick<Evidence, 'facts' | 'sourceUrl' | 'retrievedAt'>>;
};
export function buildGroupRecommendation(input: { place: Place; members: Member[]; evaluations: MemberEvaluation[]; evidenceStatus?: EvidenceStatus }): Recommendation;
export function generateItinerary(input: { trip: Trip; places: Place[]; reactions?: Reaction[]; assignments?: Assignment[]; excludedPlaceIds?: string[]; replaceManual?: boolean; maxPerDay?: number }): Assignment[];
export function buildTripBoard(snapshot: Pick<TripSnapshot, 'trip' | 'places'> & Partial<Pick<TripSnapshot, 'imports' | 'importPlaces' | 'recommendations' | 'assignments'>>): TripBoard;
export function toBoardingPassCard(input: { card: TripBoardCard; members: Member[]; reactions?: Reaction[]; concerns?: Concern[]; currentMemberId?: string | null }): BoardingPassCardData;
export function toFrontendTripBoard(board: TripBoard, context: { members: Member[]; reactions?: Reaction[]; concerns?: Concern[]; currentMemberId?: string | null }): FrontendTripBoard;
export function adaptInstagramExtraction(input: {
  tripId: string;
  contributorId: string;
  importId: string;
  result: InstagramExtractionResult;
  retrievedAt: string;
  thumbnailUrl?: string | null;
  makeId?: (kind: string, index: number) => string;
}): { import: InstagramImport; places: Place[]; importPlaces: ImportPlace[]; evidence: Evidence[] };

export const demoSnapshot: TripSnapshot;
export const lisbonSnapshot: TripSnapshot;
export const schemaSql: string;
