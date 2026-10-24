import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync } from 'node:fs';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === './model' && context.parentURL?.endsWith('/lib/atlas/adapters.ts')) return next('./model.ts', context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts')) return {format:'module',shortCircuit:true,source:stripTypeScriptTypes(readFileSync(new URL(url),'utf8'))};
    return next(url, context);
  }
});
const {archiveRoute,chronologyYearRoute,relationEntities} = await import('../lib/atlas/adapters.ts');
import assert from 'node:assert/strict';
import test from 'node:test';
const {DEFAULT_FILTERS,FEATURED_CITIES,INTERNATIONAL_CITIES,toAtlasDataset,queryAtlas,parseAtlasParams,cityComparison,yearSpan,safeSourceUrl,recordsByCity} = await import('../lib/atlas/model.ts');

const make = (id, options={}) => ({
  id, slug:id, title:options.title ?? `Kaynaklı kayıt ${id}`,
  summary:options.summary ?? 'Açık katalog bilgisi', type:options.type ?? 'event',
  date:options.date ?? {start:'1920-04-23',end:null,precision:'day',certainty:'exact',display:'23 Nisan 1920'},
  people:options.people ?? [{name:'Mustafa Kemal Atatürk',role:'subject'}],
  locations:options.locations ?? [{name:'Ankara',city:'Ankara',country:'Türkiye'}],
  categories:options.categories ?? ['kurulus'],
  source: {institution:options.institution ?? 'Kurumsal Arşiv',title:'Kayıt künyesi',url:options.url??'https://example.org/source',publishedAt:null},
  provenance:[{institution:'Kurumsal Arşiv',identifier:'K-001',url:'https://example.org/provenance'}],
  rights:{status:'official_link_only'},verification:{status:options.status??'published'},relatedIds:options.relatedIds??[]
});
const filters = (values={})=>({...DEFAULT_FILTERS,...values});
const dataset = (...records)=>toAtlasDataset(records);
const count = (ds,values={})=>queryAtlas(ds,filters(values)).total;

test('only published records pass visibility gate',()=>{const d=dataset(make('one'),make('two',{status:'draft'}),make('three',{status:'reviewed'}));assert.deepEqual(d.records.map(r=>r.id),['one']);});
test('duplicate record ids are de-duplicated',()=>{const d=dataset(make('one'),make('one',{title:'Second duplicate'}));assert.equal(d.records.length,1);assert.equal(d.records[0].title,'Kaynaklı kayıt one');});
test('unsafe slugs do not create archive links',()=>{assert.equal(dataset(make('slash/path')).records.length,0);});
test('source URLs reject javascript and credentials',()=>{assert.equal(safeSourceUrl('javascript:alert(1)'),null);assert.equal(safeSourceUrl('https://user:pw@example.org'),null);assert.equal(safeSourceUrl('https://example.org/x'),'https://example.org/x');});
test('known city in location.name is accepted without explicit city field',()=>{const d=dataset(make('one',{locations:[{name:'İstanbul',country:'Türkiye'}]}));assert.equal(d.records[0].locations[0].city,'İstanbul');});
test('free-form titles and tags do not infer location',()=>{const d=dataset(make('one',{title:'Samsun ve Erzurum',locations:[{name:'Bir bina ve çevresi'}]}));assert.equal(d.records[0].locations.length,0);});
test('international country is separate from Turkey',()=>{const d=dataset(make('one',{locations:[{name:'Selanik',country:'Yunanistan'}]}));assert.equal(d.records[0].locations[0].region,'international');assert.equal(count(d,{region:'turkiye'}),0);assert.equal(count(d,{region:'international'}),1);});
test('featured cities include user requested cities',()=>{for(const city of ['Ankara','İstanbul','Samsun','İzmir','Erzurum','Sivas','Çanakkale'])assert.ok(FEATURED_CITIES.includes(city));assert.ok(INTERNATIONAL_CITIES.includes('Selanik'));});
test('city grouping counts one record once with duplicate locations',()=>{const d=dataset(make('one',{locations:[{name:'Ankara',city:'Ankara',country:'Türkiye'},{name:'Ankara',country:'Türkiye'}]}));assert.equal(recordsByCity(d.records).get('Ankara'),1);});
test('no coordinates synthesized from city names',()=>{const d=dataset(make('one'));assert.equal(d.records[0].coordinate,null);});
test('historic place dates are not event dates',()=>{const d=dataset(make('place',{type:'place',date:{start:'1843',end:'1856',precision:'range',certainty:'exact',display:'1843–1856'}}));assert.equal(d.records[0].date.kind,'place-history');assert.deepEqual(yearSpan(d.records[0]),{from:1843,to:1856});assert.equal(count(d,{dateKind:'historical-event'}),0);});
test('publication year means publication date, not historical event',()=>{const d=dataset(make('book',{type:'publication',date:{start:'2024',end:null,precision:'year',certainty:'exact',display:'2024'}}));assert.equal(d.records[0].date.kind,'publication-date');assert.equal(count(d,{from:1919,to:1922}),0);});
test('date ranges filter by intersection',()=>{const d=dataset(make('old',{date:{start:'1919',end:'1922',precision:'range',certainty:'exact',display:'1919-1922'}}));assert.equal(count(d,{from:1920,to:1921}),1);assert.equal(count(d,{from:1930}),0);});
test('unknown dates disappear only for active date filters',()=>{const d=dataset(make('undated',{date:{start:null,end:null,precision:'unknown',certainty:'unknown',display:'Tarih yok'}}));assert.equal(count(d),1);assert.equal(count(d,{from:1920}),0);assert.equal(count(d,{certainty:'unknown'}),1);});
test('estimated versus exact are distinguished',()=>{const d=dataset(make('exact'),make('estimated',{date:{start:'1921',end:null,precision:'year',certainty:'estimated',display:'1921 civarı'}}));assert.equal(count(d,{certainty:'estimated'}),1);});
test('unknown-city versus known city filters',()=>{const d=dataset(make('known'),make('unknown',{locations:[]}));assert.equal(count(d,{location:'unknown'}),1);assert.equal(count(d,{location:'city'}),1);});
test('mixed query applies all filters',()=>{const d=dataset(make('one'),make('two',{institution:'Other Museum',locations:[{name:'İzmir'}]}));assert.equal(count(d,{city:'Ankara',institution:'Kurumsal',type:'event',category:'kurulus',person:'Mustafa',search:'kayıt',from:1920,to:1920}),1);});
test('relatedIds include only explicit links to visible records',()=>{const d=dataset(make('one',{relatedIds:['two','three','one','two']}),make('two'),make('three',{status:'draft'}));assert.deepEqual(d.records[0].relatedIds,['two']);assert.equal(d.edges.length,1);assert.equal(d.edges[0].evidence,'record.relatedIds');});
test('similar records never generate implicit graph edges',()=>{const d=dataset(make('one'),make('two'));assert.equal(d.edges.length,0);});
test('source metadata present in safe DTO without human approval claim',()=>{const d=dataset(make('one'));assert.equal(d.records[0].review,'published');assert.equal(d.records[0].rights,'official_link_only');assert.ok(!Object.hasOwn(d.records[0],'verification'));});
test('comparison measures catalogue, not importance',()=>{const d=dataset(make('a'),make('b'),make('c',{locations:[{name:'İzmir',country:'Türkiye'}]}));const c=cityComparison(d.records,'Ankara','İzmir');assert.deepEqual([c.first.total,c.second.total],[2,1]);assert.equal(c.first.sources['Kurumsal Arşiv'],2);});
test('pagination works with large catalogues',()=>{const d=dataset(...Array.from({length:2000},(_,i)=>make(`record-${i}`)));const r=queryAtlas(d,filters({page:12}));assert.equal(r.total,2000);assert.equal(r.items.length,12);assert.equal(r.page,12);});
test('large catalogues do not create implicit graph edges',()=>{const d=dataset(...Array.from({length:10000},(_,i)=>make(`record-${i}`,{locations:[]})));assert.equal(d.records.length,10000);assert.equal(d.edges.length,0);});
test('bad URL parameter values are sanitized',()=>{const p=parseAtlasParams({tur:'unknown',sayfa:'-9',baslangic:'9999',bitis:'1923',q:'a'.repeat(200)});assert.equal(p.filters.type,'all');assert.equal(p.filters.page,1);assert.equal(p.filters.from,null);assert.equal(p.filters.search.length,120);assert.ok(p.warnings.length>=2);});
test('reversed year range is invalidated',()=>{const p=parseAtlasParams({baslangic:'1938',bitis:'1919'});assert.equal(p.filters.from,null);assert.equal(p.filters.to,null);});
test('300 malformed city references do not result in fake map pins',()=>{const d=dataset(...Array.from({length:300},(_,i)=>make(`record-${i}`,{locations:[{name:`Unknown building ${i}`}]})));assert.equal(recordsByCity(d.records).size,0);});

test('typed route adapters do not invent URLs',()=>{assert.equal(archiveRoute('record-1'),'/arsiv/record-1');assert.equal(archiveRoute('../bad'),null);assert.equal(chronologyYearRoute(1923),'/kronoloji?yil=1923');assert.equal(chronologyYearRoute(100),null);});
test('person/city/institution relationships carry explicit field provenance',()=>{const d=dataset(make('one',{relatedIds:['two']}),make('two'));const entities=relationEntities(d.records[0],new Map(d.records.map(r=>[r.id,r])));assert.ok(entities.some(e=>e.kind==='person'&&e.relationProvenance==='record-person-field'));assert.ok(entities.some(e=>e.kind==='city'&&e.href===null));assert.ok(entities.some(e=>e.kind==='record'&&e.href==='/arsiv/two'));});
test('provenance is passed via safe DTO',()=>{const d=dataset(make('one'));assert.equal(d.records[0].provenance.length,1);assert.equal(d.records[0].provenance[0].identifier,'K-001');});
test('500 synthetic records remain queryable',()=>{const d=dataset(...Array.from({length:500},(_,i)=>make(`record-${i}`)));assert.equal(count(d,{city:'Ankara'}),500);});
test('invented coordinate fields are not trusted',()=>{const x=make('bad-coordinate');x.locations[0].lat=1000;x.locations[0].lng=-190;const d=dataset(x);assert.equal(d.records[0].coordinate,null);assert.equal(d.records[0].locations[0].scope,'city');});
