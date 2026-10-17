import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInstagramUrl, normalizeReelUrl, validateTrip, validateAssignments, validateRecommendation, validatePreferences, validateFirmLimits, validateMemberCriteria } from '../contracts/index.js';
import { demoSnapshot, lisbonSnapshot } from '../contracts/fixtures.js';
import { generateItinerary } from '../utils/itinerary.js';
import { buildGroupRecommendation, createRecommendationInput } from '../utils/recommendation.js';
import { buildTripBoard } from '../utils/trip-board.js';
import { toBoardingPassCard, toFrontendTripBoard } from '../utils/frontend-card.js';
import { adaptInstagramExtraction } from '../utils/instagram-import.js';
const demo = () => structuredClone(demoSnapshot);
test('normalizes duplicate Reel links and rejects unsafe or unrelated URLs', () => {
 assert.equal(normalizeReelUrl('https://instagram.com/reel/Ab_1/?igsh=abc'), 'https://www.instagram.com/reel/Ab_1/');
 assert.equal(normalizeInstagramUrl('https://instagram.com/p/Post_1/?utm_source=x'), 'https://www.instagram.com/p/Post_1/');
 for (const url of ['http://instagram.com/reel/a', 'https://instagram.com.evil/reel/a', 'https://user:pass@instagram.com/reel/a', 'https://instagram.com/stories/a']) assert.throws(() => normalizeReelUrl(url));
});
test('rejects invalid dates, reversed dates and excessive trip length', () => {
 for (const patch of [{ startDate:'2026-02-30' }, { endDate:'2026-01-01' }, { endDate:'2027-01-01' }]) assert.throws(() => validateTrip({...demo().trip,...patch}));
});
test('fixture supports generation and JSON roundtrip without mutating inputs', () => {
 const input = demo(); const before = structuredClone(input); const result = generateItinerary(input);
 assert.deepEqual(input,before); assert.equal(result.find(a=>a.placeId==='place-2').date,null);
 assert.equal(result.find(a=>a.placeId==='place-1').date,input.trip.startDate);
 assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
});
test('manual moves and removals survive repeated generation; explicit replacement releases them', () => {
 const input = demo(); input.assignments = [{placeId:'place-1',date:null,position:0,manual:true,reason:'Removed by member'}];
 const first = generateItinerary(input); assert.deepEqual(first[0],input.assignments[0]);
 assert.deepEqual(generateItinerary({...input,assignments:first}),first);
 assert.equal(generateItinerary({...input,replaceManual:true}).find(a=>a.placeId==='place-1').date,input.trip.startDate);
});
test('capacity, area affinity, firm exclusions and votes are deterministic', () => {
 const input = demo(); input.places = Array.from({length:8},(_,i)=>({id:`p${i}`,tripId:input.trip.id,matchStatus:'confirmed',area:i<3?'East':'West'}));
 input.reactions=[{placeId:'p7',memberId:'a',value:'interested'}];
 const result=generateItinerary({...input,excludedPlaceIds:['p0']});
 assert.equal(result[0].placeId,'p7'); assert.equal(result.filter(a=>a.date===null).length,2);
 assert.equal(result.find(a=>a.placeId==='p0').date,null);
 assert.deepEqual(result,generateItinerary({...input,excludedPlaceIds:['p0']}));
 assert.throws(()=>generateItinerary({...input,maxPerDay:0}));
});
test('rejects unsafe plan writes and stale manual data', () => {
 const input=demo(); const result=generateItinerary(input);
 for (const altered of [result.slice(1), [...result,result[0]], result.map(a=>({...a,date:'2027-01-01'}))]) assert.throws(()=>validateAssignments(altered,input.places,input.trip));
 assert.throws(()=>generateItinerary({...input,assignments:[{placeId:'gone',manual:true}]}));
 assert.throws(()=>generateItinerary({...input,places:[{...input.places[0],tripId:'other'}]}));
});
test('builds concise group copy from every member assessment', () => {
 const input=demo(); const evaluations=[
  {memberId:'a',fit:'strong',matchedCriteria:['museums'],conflicts:[]},
  {memberId:'b',fit:'mixed',matchedCriteria:['culture'],conflicts:['price']},
  {memberId:'c',fit:'good',matchedCriteria:['museums'],conflicts:[]},
 ];
 const result=buildGroupRecommendation({place:input.places[0],members:input.members,evaluations});
 assert.equal(result.verdict,'recommended'); assert.equal(result.score,78);
 assert.match(result.text,/Member a and Member c's interest in museums/);
 assert.match(result.text,/Member b's interest in culture/); assert.match(result.text,/outside Member b's budget/);
 assert.equal(validateRecommendation(result,input.places,input.members),result);
});
test('ordinary preference conflicts remain tradeoffs instead of vetoes', () => {
 const input=demo(); const evaluations=[
  {memberId:'a',fit:'strong',matchedCriteria:['local food'],conflicts:[]},
  {memberId:'b',fit:'strong',matchedCriteria:['local food'],conflicts:[]},
  {memberId:'c',fit:'mixed',matchedCriteria:[],conflicts:['budget']},
 ];
 const result=buildGroupRecommendation({place:input.places[0],members:input.members,evaluations});
 assert.equal(result.verdict,'recommended');
 assert.equal(result.text,"It matches Member a and Member b's interest in local food, but may be outside Member c's budget.");
});
test('firm limits block recommendations and uncertain places request more information', () => {
 const input=demo(); const evaluations=input.members.map((member,index)=>({memberId:member.id,fit:index?'good':'blocked',matchedCriteria:[],conflicts:index?[]:['mobility limit']}));
 const blocked=buildGroupRecommendation({place:input.places[0],members:input.members,evaluations});
 assert.equal(blocked.verdict,'not_recommended'); assert.match(blocked.text,/Member a/);
 const uncertain=buildGroupRecommendation({place:input.places[1],members:input.members,evaluations:evaluations.map(item=>({...item,fit:'good',conflicts:[]}))});
 assert.equal(uncertain.verdict,'needs_more_information');
});
test('creates minimal model input and rejects incomplete or duplicated output', () => {
 const input=demo(); const request=createRecommendationInput({place:input.places[0],members:input.members,evidence:input.evidence});
 assert.deepEqual(Object.keys(request.members[0]),['memberId','displayName','criteria','firmLimits']);
 assert.throws(()=>buildGroupRecommendation({place:input.places[0],members:input.members,evaluations:[]}));
 const duplicate=input.recommendations[0].memberEvaluations.map(item=>({...item,memberId:'a'}));
 assert.throws(()=>buildGroupRecommendation({place:input.places[0],members:input.members,evaluations:duplicate}));
});
test('validates stable preferences and keeps firm limits separate', () => {
 const input=demo(); assert.equal(validateMemberCriteria(input.members[0]),input.members[0]);
 assert.throws(()=>validatePreferences({budgetLevel:'unlimited'}));
 assert.throws(()=>validatePreferences({maxTravelMinutes:241}));
 assert.throws(()=>validatePreferences({interests:['food','']}));
 assert.throws(()=>validateFirmLimits({maxPriceLevel:5}));
 assert.throws(()=>validateFirmLimits({accessibilityRequired:'yes'}));
 assert.throws(()=>validatePreferences({budegtLevel:'moderate'}));
 assert.throws(()=>validateFirmLimits({hardNo:['boats']}));
 assert.doesNotThrow(()=>validatePreferences({}));
});
test('builds a Pinterest-style trip board with day columns and saved ideas', () => {
 const input=demo(); input.assignments=generateItinerary(input);
 const board=buildTripBoard(input);
 assert.equal(board.title,'Demo trip'); assert.equal(board.days.length,2);
 assert.equal(board.days[0].cards[0].placeId,'place-1');
 assert.equal(board.days[0].cards[0].sourceReel.thumbnailUrl,'https://images.example/reel-demo.jpg');
 assert.equal(board.days[0].cards[0].sourceReel.url,input.imports[0].normalizedUrl);
 assert.equal(board.ideas[0].placeId,'place-2');
 assert.match(board.gist,/2-day trip with 1 planned stop/);
 assert.match(board.gist,/museums/);
 assert.equal(board.days[1].gist,'Open day — add ideas from the board');
});
test('trip board gives unresearched places safe fallback copy', () => {
 const input=demo(); const board=buildTripBoard({...input,recommendations:[],assignments:[]});
 assert.equal(board.ideas.length,2);
 assert.equal(board.ideas[0].headline,'More information needed');
 assert.equal(board.ideas[0].sourceReel.thumbnailUrl,'https://images.example/reel-demo.jpg');
});
test('Lisbon fixture flows from member evaluations to frontend boarding passes', () => {
 const input=structuredClone(lisbonSnapshot);
 const modelOutput={
  'time-out-market': [
   {memberId:'maya',fit:'strong',matchedCriteria:['local food','markets'],conflicts:[]},
   {memberId:'dev',fit:'mixed',matchedCriteria:['local food'],conflicts:['budget','crowds']},
   {memberId:'sam',fit:'good',matchedCriteria:[],conflicts:[]},
  ],
  'pasteis-belem': [
   {memberId:'maya',fit:'good',matchedCriteria:['local food'],conflicts:[]},
   {memberId:'dev',fit:'good',matchedCriteria:['architecture'],conflicts:['crowds']},
   {memberId:'sam',fit:'mixed',matchedCriteria:['history'],conflicts:['distance']},
  ],
  miradouro: [
   {memberId:'maya',fit:'mixed',matchedCriteria:[],conflicts:['effort']},
   {memberId:'dev',fit:'mixed',matchedCriteria:['architecture'],conflicts:['distance']},
   {memberId:'sam',fit:'insufficient_information',matchedCriteria:['views'],conflicts:['mobility']},
  ],
 };
 input.recommendations=input.places.map(place=>buildGroupRecommendation({
  place,members:input.members,evaluations:modelOutput[place.id],
  evidenceStatus:place.matchStatus==='confirmed'?'confirmed':'uncertain',
 }));
 input.assignments=generateItinerary(input);
 const board=buildTripBoard(input);
 const frontend=toFrontendTripBoard(board,{members:input.members,reactions:input.reactions,concerns:input.concerns,currentMemberId:'dev'});
 const cards=[...frontend.days.flatMap(day=>day.cards),...frontend.ideas];
 assert.equal(cards.length,input.places.length);
 assert.ok(cards.every(card=>card.sourceReel?.url && card.sourceReel?.thumbnailUrl));
 const market=cards.find(card=>card.placeId==='time-out-market').boardingPass;
 assert.deepEqual(Object.keys(market),['name','summary','location','cost','caveats','label','reason','contributors','reelUrl','thumbnailUrl','counts','mine']);
 assert.equal(market.label,'strong'); assert.equal(market.cost,'EUR 20 pp');
 assert.deepEqual(market.contributors,['Maya','Dev']); assert.equal(market.counts.interested,2);
 assert.equal(market.counts.price,1); assert.equal(market.mine,'interested');
 assert.match(market.reason,/Maya and Dev's interest in local food/);
 assert.equal(frontend.ideas[0].placeId,'miradouro');
 assert.equal(frontend.ideas[0].boardingPass.label,'needs_info');
});
test('frontend adapter uses safe fallbacks for a manual place without a Reel', () => {
 const card={placeId:'manual',name:'Manual idea',area:null,sourceReel:null,brief:null,practical:{},verdict:'needs_more_information',headline:'More information needed',text:'Still researching.'};
 const result=toBoardingPassCard({card,members:[]});
 assert.equal(result.location,'Location unknown'); assert.equal(result.cost,'Cost unknown');
 assert.equal(result.reelUrl,''); assert.equal(result.thumbnailUrl,null); assert.equal(result.label,'needs_info');
});
test('adapts backend Instagram candidates into uncertain shared records', () => {
 const result={
  canonicalUrl:'https://www.instagram.com/p/Demqe5ltfbs/', status:'completed', runStatus:'COMPLETED',
  extraction:{candidates:[{name:'Cala Mitjana',locationContext:'Menorca, Spain',uncertain:true,evidence:[{
   sourceUrl:'https://www.instagram.com/p/Demqe5ltfbs/',kind:'caption',path:'data.caption',timestamp_seconds:null,quote:'📍Cala Mitjana, Menorca, Spain',
  }]}]},
 };
 const adapted=adaptInstagramExtraction({tripId:'trip-1',contributorId:'a',importId:'import-backend-1',result,retrievedAt:'2026-10-17T21:24:18Z',thumbnailUrl:null});
 assert.equal(adapted.import.status,'needs_confirmation');
 assert.equal(adapted.import.normalizedUrl,result.canonicalUrl);
 assert.equal(adapted.import.thumbnailUrl,null);
 assert.deepEqual(adapted.import.contributorIds,['a']);
 assert.equal(adapted.places[0].name,'Cala Mitjana');
 assert.equal(adapted.places[0].area,'Menorca, Spain');
 assert.equal(adapted.places[0].matchStatus,'uncertain');
 assert.equal(adapted.importPlaces[0].placeId,adapted.places[0].id);
 assert.deepEqual(adapted.evidence[0].facts,['📍Cala Mitjana, Menorca, Spain']);
});
test('empty extraction stays reviewable and invalid thumbnail URLs are rejected', () => {
 const result={canonicalUrl:'https://www.instagram.com/reel/Empty/',status:'completed',runStatus:'COMPLETED',extraction:{candidates:[]}};
 const input={tripId:'trip-1',contributorId:'a',importId:'empty',result,retrievedAt:'2026-10-17T21:24:18Z'};
 assert.equal(adaptInstagramExtraction(input).import.errorCode,'no_explicit_place');
 assert.throws(()=>adaptInstagramExtraction({...input,thumbnailUrl:'http://images.example/reel.jpg'}));
});
