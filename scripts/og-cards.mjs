// Renders the 1200x630 module share cards (NL + EN) into src/assets/og/.
// Needs Playwright, which this zero-dependency repo does not ship:
//   npm run build && python3 -m http.server -d dist 8091 &
//   PLAYWRIGHT_DIR=/path/to/node_modules node scripts/og-cards.mjs
// Source images: src/assets/modules/{abcde.png,als.jpg,ecg.jpg,reanimatie.png} (only used here).
// Card copy is shortened from each module's data-desc-* — keep them in sync.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(process.env.PLAYWRIGHT_DIR ? process.env.PLAYWRIGHT_DIR + '/' : import.meta.url);
const { chromium } = require('playwright');
const OUT = fileURLToPath(new URL('../src/assets/og/', import.meta.url));
const A='http://localhost:8091/assets';
const cards=[
 ['abcde','modules/abcde.png', {nl:['ABCDE-methode','Oefen de ABCDE-methode voor de acuut zieke patiënt in realistische 3D-scenario\'s.'], en:['ABCDE approach','Practise the ABCDE approach to the acutely ill patient in realistic 3D scenarios.']}],
 ['als','modules/als.jpg', {nl:['Advanced Life Support','Speel een volledig code blue-scenario: ALS-algoritme, ritme-analyse en teamleiding.'], en:['Advanced Life Support','Play a full code blue scenario: the ALS algorithm, rhythm analysis and team leadership.']}],
 ['ecg','modules/ecg.jpg', {nl:['ECG-interpretatie','Leer het 12-afleidingen-ECG, van ritme tot diagnose.'], en:['ECG interpretation','Learn the 12-lead ECG, from rhythm to diagnosis.']}],
 ['reanimatie-aed','modules/reanimatie.png', {nl:['Reanimatie & AED','Train basic life support en AED-gebruik, van volwassene tot kind.'], en:['Resuscitation & AED','Train basic life support and AED use, from adult to child.']}],
];
const tpl=(img,title,sub,lbl)=>`<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Museo;src:url(${A}/fonts/MuseoModerno-latin.woff2);font-weight:100 900}
@font-face{font-family:Geo;src:url(${A}/fonts/Fieldwork-Geo-Demibold.woff2);font-weight:600}
@font-face{font-family:Geo;src:url(${A}/fonts/Fieldwork-Geo-Regular.woff2);font-weight:400}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#000048;color:#fff;font-family:Geo,sans-serif;position:relative;overflow:hidden}
.copy{position:absolute;left:80px;top:64px;bottom:64px;width:540px;display:flex;flex-direction:column}
.logo{height:40px;width:auto;align-self:flex-start}
.lbl{margin-top:auto;display:inline-flex;align-self:flex-start;padding:8px 16px;border-radius:999px;background:rgba(255,200,199,.16);color:#FFC8C7;font-weight:600;font-size:20px}
h1{margin-top:22px;font-family:Museo;font-weight:500;font-size:68px;line-height:1.02;letter-spacing:-.01em;text-wrap:balance}
h1 .dot{color:#FFC8C7}
h1 .nw{white-space:nowrap}
p{margin-top:22px;font-size:26px;line-height:1.4;color:rgba(255,255,255,.8);text-wrap:pretty}
.url{margin-top:auto;padding-top:28px;font-weight:600;font-size:22px;color:#FFC8C7}
.shot{position:absolute;left:680px;top:0;width:520px;height:630px;border-radius:32px 0 0 32px;overflow:hidden;background:#000030}
.shot img{width:100%;height:100%;object-fit:cover;object-position:center}
</style></head><body>
<div class="copy"><img class="logo" src="${A}/footer-logo.png"><span class="lbl">${lbl}</span><h1>${title}</h1><p>${sub}</p><span class="url">medu.game</span></div>
<div class="shot"><img src="${A}/${img}"></div></body></html>`;
const br=await chromium.launch(process.env.CHROME ? {executablePath:process.env.CHROME} : {});
const pg=await br.newPage({viewport:{width:1200,height:630}});
for (const [slug,img,t] of cards) for (const lang of ['nl','en']) {
  const [title,sub]=t[lang];
  await pg.goto('http://localhost:8091/robots.txt'); await pg.setContent(tpl(img,title.replace('&','&amp;').replace(/(\S+-\S+)/g,'<span class="nw">$1</span>'),sub, lang==='nl'?'module':'module'),{waitUntil:'load'});
  await pg.evaluate(()=>document.fonts.ready);
  const out=OUT+'og-'+slug+(lang==='en'?'-en':'')+'.jpg';
  await pg.screenshot({path:out,type:'jpeg',quality:86});
  console.log(out.split('/').pop());
}
await br.close();
