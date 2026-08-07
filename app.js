document.addEventListener('DOMContentLoaded',()=>{
let currentStep=1, language='it', hasSignature=false;
const form=document.getElementById('entryForm');
const formSteps=[...document.querySelectorAll('.form-step')];
const stepLabels=[...document.querySelectorAll('.steps li')];
const nextBtn=document.getElementById('nextBtn'), prevBtn=document.getElementById('prevBtn');
const progress=document.getElementById('progressBar'), statusEl=document.getElementById('status');
const classSelect=form.elements.trialClass, capacityNotice=document.getElementById('capacityNotice'), receipt=form.elements.receipt, receiptHelp=document.getElementById('receiptHelp');
const limits={'IHT2 – 23/10/2026':10,'HWT TS – 24/10/2026':10,'IHT3 – 24/10/2026':10,'IHT1 – 25/10/2026':10,'NHAT – 25/10/2026':null};
let availability={};Object.entries(limits).forEach(([k,v])=>availability[k]={limit:v,confirmed:0,available:v,full:false});

document.getElementById('menuBtn').onclick=()=>document.getElementById('mainNav').classList.toggle('open');
document.querySelectorAll('.lang').forEach(b=>b.onclick=()=>setLanguage(b.dataset.lang));
function setLanguage(lang){language=lang;document.documentElement.lang=lang;document.querySelectorAll('[data-it]').forEach(el=>{const v=el.getAttribute('data-'+lang);if(v!==null)el.innerHTML=v});document.querySelectorAll('.lang').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));updateCapacity();render()}

const same=document.getElementById('sameHandler'), handler=document.getElementById('handlerSection');
function syncHandler(){const s=same.checked;handler.style.display=s?'none':'block';[['ownerFirstName','handlerFirstName'],['ownerLastName','handlerLastName'],['ownerPhone','handlerPhone'],['ownerEmail','handlerEmail']].forEach(([o,h])=>{form.elements[h].required=!s;if(s)form.elements[h].value=form.elements[o].value})}
same.onchange=syncHandler;['ownerFirstName','ownerLastName','ownerPhone','ownerEmail'].forEach(n=>form.elements[n].addEventListener('input',syncHandler));syncHandler();

async function loadAvailability(){
 const u=window.LUPO_NERO_CONFIG?.backendUrl;
 if(!u){updateCapacity();return}
 try{const r=await fetch(u+'?action=availability');const j=await r.json();if(j&&typeof j==='object')availability=j}catch(e){}
 updateCapacity();
}
function updateCapacity(){const a=availability[classSelect.value];capacityNotice.className='capacity-notice';if(!a){capacityNotice.textContent='';return}if(a.limit===null){capacityNotice.textContent=language==='it'?'NHAT: iscrizioni senza limite.':'NHAT: unlimited entries.';capacityNotice.classList.add('available');receipt.required=true;receiptHelp.textContent=language==='it'?'La ricevuta del bonifico è obbligatoria.':'The bank transfer receipt is mandatory.'}else if(a.full){capacityNotice.textContent=language==='it'?'Iscrizioni complete – lista d’attesa aperta.':'Entries closed – waiting list open.';capacityNotice.classList.add('full');receipt.required=false;receiptHelp.textContent=language==='it'?'Lista d’attesa: il pagamento non è richiesto finché il posto non viene confermato.':'Waiting list: payment is not required until a place is confirmed.'}else{capacityNotice.textContent=language==='it'?`${a.available} posti disponibili.`:`${a.available} places available.`;capacityNotice.classList.add('available');receipt.required=true;receiptHelp.textContent=language==='it'?'La ricevuta del bonifico è obbligatoria.':'The bank transfer receipt is mandatory.'}}
classSelect.onchange=updateCapacity;loadAvailability();

const canvas=document.getElementById('signatureCanvas'),ctx=canvas.getContext('2d');let drawing=false;
function point(e){const r=canvas.getBoundingClientRect(),s=e.touches?e.touches[0]:e;return{x:(s.clientX-r.left)*canvas.width/r.width,y:(s.clientY-r.top)*canvas.height/r.height}}
function start(e){e.preventDefault();drawing=true;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y)}
function draw(e){if(!drawing)return;e.preventDefault();const p=point(e);ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#111';ctx.lineTo(p.x,p.y);ctx.stroke();hasSignature=true;document.getElementById('signatureError').textContent=''}
['mousedown','touchstart'].forEach(x=>canvas.addEventListener(x,start,{passive:false}));['mousemove','touchmove'].forEach(x=>canvas.addEventListener(x,draw,{passive:false}));['mouseup','mouseleave','touchend'].forEach(x=>canvas.addEventListener(x,()=>drawing=false));
document.getElementById('clearSignature').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);hasSignature=false};

function validate(){for(const f of formSteps[currentStep-1].querySelectorAll('[required]')){if(!f.checkValidity()){f.reportValidity();return false}}if(currentStep===5&&!hasSignature){document.getElementById('signatureError').textContent=language==='it'?'Firma PSA mancante.':'Missing ASF signature.';return false}return true}
function summary(){const d=new FormData(form);document.getElementById('summary').innerHTML=`<strong>${language==='it'?'Proprietario':'Owner'}:</strong> ${d.get('ownerFirstName')} ${d.get('ownerLastName')}<br><strong>${language==='it'?'Conduttore':'Handler'}:</strong> ${d.get('handlerFirstName')} ${d.get('handlerLastName')}<br><strong>${language==='it'?'Cane':'Dog'}:</strong> ${d.get('dogName')}<br><strong>${language==='it'?'Classe':'Class'}:</strong> ${d.get('trialClass')}`}
function render(){formSteps.forEach(s=>s.classList.toggle('active',+s.dataset.step===currentStep));stepLabels.forEach((x,i)=>x.classList.toggle('active',i<currentStep));progress.style.width=currentStep*20+'%';prevBtn.style.visibility=currentStep===1?'hidden':'visible';nextBtn.textContent=currentStep===5?(language==='it'?'INVIA ISCRIZIONE':'SUBMIT ENTRY'):(language==='it'?'AVANTI':'NEXT');if(currentStep===5)summary()}
prevBtn.onclick=()=>{if(currentStep>1){currentStep--;render();document.getElementById('registration').scrollIntoView({behavior:'smooth'})}};
nextBtn.onclick=()=>{if(!validate())return;if(currentStep<5){currentStep++;render();document.getElementById('registration').scrollIntoView({behavior:'smooth'})}else submit()};
async function file64(input){const f=input.files[0];if(!f)return null;return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({name:f.name,mimeType:f.type,data:String(r.result).split(',')[1]});r.onerror=rej;r.readAsDataURL(f)})}
async function submit(){const url=window.LUPO_NERO_CONFIG?.backendUrl;if(!url){statusEl.textContent=language==='it'?'Sito pubblico pronto. Il backend iscrizioni deve ancora essere collegato.':'Public site ready. The registration backend still needs to be connected.';alert(statusEl.textContent);return}const d=new FormData(form),payload={};for(const[k,v]of d.entries())if(!(v instanceof File))payload[k]=v;['psaAccepted','vaccinationValid','vaccinationInspection','rulesAccepted'].forEach(k=>payload[k]=form.elements[k].checked);payload.signatureData=canvas.toDataURL('image/png');payload.language=language;payload.files={receipt:await file64(receipt),pedigree:await file64(form.elements.pedigree),recordBook:await file64(form.elements.recordBook)};statusEl.textContent=language==='it'?'Invio in corso...':'Submitting...';try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload)});const j=await r.json();if(!j.ok)throw new Error(j.error||'Errore');statusEl.textContent=(language==='it'?`Iscrizione registrata: ${j.code} – ${j.status}`:`Entry saved: ${j.code} – ${j.status}`);alert(statusEl.textContent)}catch(e){statusEl.textContent=e.message;alert(e.message)}}
setLanguage('it');render();
});
