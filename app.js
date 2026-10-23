'use strict';
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const localeDate=new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'});
$('#today-date').textContent=localeDate.format(new Date());
$('#copyright-year').textContent=String(new Date().getFullYear());

const menuBtn=$('#mobile-menu-toggle');const menu=$('#main-menu');
menuBtn.addEventListener('click',()=>{const open=menu.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(open));});
$$('#main-menu a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');}));

const slides=[
  {kicker:'TARİH • KÜLTÜR • ARAŞTIRMA',pre:'GAZİ MUSTAFA KEMAL',title:'ATATÜRK',desc:'Bir milletin tarihini, belgeleriyle ve hafızasıyla keşfedin.'},
  {kicker:'ASRIN KEMALİ • DİJİTAL ARŞİV',pre:'TARİHİN İZİNDE',title:'ARŞİV',desc:'Tarihî belgeleri, görüntüleri ve kaynakları bir arada inceleyin.'},
  {kicker:'BİR ASRIN MİRASI',pre:'GEÇMİŞTEN GELECEĞE',title:'HAFIZA',desc:'Tarihî mirasa dair bilgileri kaynaklarıyla birlikte yaşatıyoruz.'}
];
let currentSlide=0;
function showSlide(n){currentSlide=(n+slides.length)%slides.length;const slide=slides[currentSlide];$('#hero-kicker').textContent=slide.kicker;$('#hero-pretitle').textContent=slide.pre;$('#hero-title').textContent=slide.title;$('#hero-description').textContent=slide.desc;$('.current-slide').textContent=String(currentSlide+1).padStart(2,'0');$$('.slide-dot').forEach((btn,i)=>{btn.classList.toggle('selected',i===currentSlide);btn.setAttribute('aria-current',i===currentSlide?'true':'false');});}
$('#hero-prev').addEventListener('click',()=>showSlide(currentSlide-1));$('#hero-next').addEventListener('click',()=>showSlide(currentSlide+1));$$('.slide-dot').forEach(button=>button.addEventListener('click',()=>showSlide(Number(button.dataset.slide))));

$$('.filter-btn').forEach(button=>button.addEventListener('click',()=>{const category=button.dataset.filter;$$('.filter-btn').forEach(b=>{const selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});$$('.archive-card').forEach(card=>card.hidden=category!=='all' && category!==card.dataset.category);}));

const searchable=[
  {title:'Atatürk’ün Hayatı',type:'Bölüm',link:'#ataturk',tags:'atatürk mustafa kemal hayat biyografi'},
  {title:'Tarih Kronolojisi',type:'Bölüm',link:'#kronoloji',tags:'kronoloji 1881 1919 1920 1923 1938 tarih'},
  {title:'Fotoğraf Arşivi',type:'Arşiv',link:'#fotograflar',tags:'fotoğraf resim görsel koleksiyon'},
  {title:'Belge Merkezi',type:'Arşiv',link:'#belgeler',tags:'belge nutuk mektup arşiv'},
  {title:'Dijital Kütüphane',type:'Kütüphane',link:'#dijital-muze',tags:'kitap kaynak okuma eser'},
  {title:'Akademi ve Söyleşiler',type:'Gelecek bölüm',link:'#akademi',tags:'akademi söyleşi tarihçi'},
  {title:'Etkinlik Takvimi',type:'Gelecek bölüm',link:'#etkinlikler',tags:'etkinlik konferans seminer'},
  {title:'İletişim ve Kurumsal Bilgi',type:'Kurumsal',link:'#kurumsal',tags:'iletişim mail bağımsız'}
];
const dialog=$('#search-dialog');const searchInput=$('#site-search-input');const results=$('#search-results');
function normalize(v){return v.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function renderResults(){const query=normalize(searchInput.value.trim());const found=query?searchable.filter(item=>normalize(item.title+' '+item.tags).includes(query)):searchable.slice(0,5);results.replaceChildren();if(!found.length){const p=document.createElement('p');p.className='search-empty';p.textContent='Sonuç bulunamadı. Başka bir anahtar kelime deneyin.';results.append(p);return;}for(const item of found){const a=document.createElement('a');a.href=item.link;a.className='search-result';const span=document.createElement('span');span.textContent=item.type;const title=document.createElement('strong');title.textContent=item.title;a.append(span,title);a.addEventListener('click',()=>dialog.close());results.append(a);}}
$$('.search-launch').forEach(button=>button.addEventListener('click',()=>{searchInput.value='';renderResults();dialog.showModal();searchInput.focus();}));$('#search-close').addEventListener('click',()=>dialog.close());searchInput.addEventListener('input',renderResults);dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
$('#contrast-toggle').addEventListener('click',()=>{document.body.classList.toggle('high-contrast');$('#contrast-toggle').setAttribute('aria-pressed',String(document.body.classList.contains('high-contrast')));});
