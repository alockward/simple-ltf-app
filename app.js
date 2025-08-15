// SIMPLE LTF — app.js (SPA + POST al backend)
(function(){
  'use strict';

  const LS_KEY = 'simpleltf_submissions';
  const API_URL = (window.SIMPLELTF_API_URL || '/api/submit'); // puedes definir window.SIMPLELTF_API_URL si el backend vive en otro dominio
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const nowISO = () => new Date().toISOString();
  const uuid = () => ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );

  const allowedExt = new Set(['pdf','docx','jpg','jpeg','png']);
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  const services = {
    asesoria: {
      title: 'Asesoría Legal',
      steps: [
        { id:'materia', label:'Seleccionar Materia', type:'select', required:true, options:[
          'Civil','Penal','Contencioso Administrativo','Inmobiliario','Corporativo','Laboral','Otros'
        ]},
        { id:'tipo', label:'Tipo de consulta', type:'select', required:true, dependsOn:'materia', optionsMap:{
          'Civil':['Divorcio (mutuo consentimiento)','Divorcio (causa determinada)','Declaratoria de herederos','Contratos (arrendamiento/préstamo)','Demandas de pago','Otros'],
          'Penal':['Defensa penal','Querella (estafa/abuso de confianza)','Representación de víctima','Otros'],
          'Contencioso Administrativo':['Justiprecio de expropiación','Impugnación de acto administrativo','Contencioso-tributario','Otros'],
          'Inmobiliario':['Deslinde/saneamiento','Conflictos de copropiedad','Reivindicación','Otros'],
          'Corporativo':['Constitución de sociedades','Modificación de estatutos','M&A (fusiones/adquisiciones)','Otros'],
          'Laboral':['Reclamaciones de prestaciones','Defensa patronal','Negociaciones colectivas','Otros'],
          'Otros':['Consulta general']
        }}
      ],
      baseDescLabel:'Descripción breve'
    },
    permisos: {
      title: 'Permisos',
      steps: [
        { id:'permiso_tipo', label:'Tipo de permiso', type:'select', required:true, options:[
          'Viajes de menores','Permiso ambiental','Permiso de construcción','Licencia de funcionamiento comercial','Registro sanitario de producto','Permiso de armas','Espectáculos públicos'
        ]},
        { id:'permiso_sub', label:'Subtipo / detalle', type:'select', required:true, dependsOn:'permiso_tipo', optionsMap:{
          'Viajes de menores':['Autorización notarial','Permiso judicial'],
          'Permiso ambiental':['Categoría A/B/C','Declaración de impacto','No objeción'],
          'Permiso de construcción':['Licencia municipal','Revisión de planos','Uso de suelo'],
          'Licencia de funcionamiento comercial':['Apertura','Renovación'],
          'Registro sanitario de producto':['Alimentos','Cosméticos','Fármacos'],
          'Permiso de armas':['Portación','Tenencia'],
          'Espectáculos públicos':['Evento único','Temporada']
        }}
      ],
      baseDescLabel:'Descripción / Contexto'
    },
    dued: {
      title: 'Due Diligence',
      steps: [
        { id:'dd_tipo', label:'Tipo de DD', type:'select', required:true, options:[
          'Inmobiliario','Corporativo (societario/M&A)','Contratación pública','Laboral','Propiedad intelectual','Protección de datos','Ambiental','Regulatorio','Compliance/anticorrupción','Tributario','Otro…'
        ]},
        { id:'dd_jurisdiccion', label:'Jurisdicción', type:'input', required:true, placeholder:'República Dominicana', defaultValue:'República Dominicana' },
        { id:'dd_fecha_cierre', label:'Fecha estimada de cierre', type:'date' },
        { id:'dd_fecha_limite', label:'Fecha límite', type:'date' },
        { id:'dd_monto', label:'Monto/Rango (opcional)', type:'input', placeholder:'Ej.: RD$ 1,000,000 - 1,500,000' },
        { id:'dd_partes', label:'Partes involucradas', type:'textarea', placeholder:'Parte A, Parte B, ...' },
        { id:'dd_links', label:'Enlaces (uno por línea)', type:'textarea', placeholder:'https://... (uno por línea)' }
      ],
      baseDescLabel:'Descripción breve'
    },
    docs: {
      title: 'Generación de Documentos',
      steps: [
        { id:'doc_entidad', label:'Entidad', type:'select', required:true, options:[
          'DGII','ONAPI','Cámara de Comercio de Santo Domingo','Modelos de contratos','Actas y declaraciones','Cartas y comunicaciones'
        ]},
        { id:'doc_tipo', label:'Tipo de documento', type:'select', required:true, dependsOn:'doc_entidad', optionsMap:{
          'DGII':['Certificación de RNC','Certificación de deuda tributaria','Certificación de retenciones','Certificación de ITBIS','Certificación de matrícula de vehículo'],
          'ONAPI':['Registro de marca','Estado de solicitud de patente','Certificación de denominación comercial'],
          'Cámara de Comercio de Santo Domingo':['Certificación de matrícula mercantil','Certificación de vigencia de sociedad','Certificación de asambleas registradas'],
          'Modelos de contratos':['Arrendamiento','Préstamo','Prestación de servicios','Compraventa de vehículo'],
          'Actas y declaraciones':['Acta de asamblea societaria','Declaración jurada','Poder especial'],
          'Cartas y comunicaciones':['Reclamación de pago','Renuncia laboral','Autorización simple']
        }}
      ],
      baseDescLabel:'Detalles o notas'
    },
    empresa: {
      title: 'Creación de Empresa',
      steps: [
        { id:'emp_tipo', label:'Tipo de empresa', type:'select', required:true, options:['SRL','SA','EIRL','ONG']},
        { id:'emp_info', label:'Características', type:'info', dependsOn:'emp_tipo', htmlMap:{
          'SRL':'Responsabilidad limitada; capital en cuotas; administración flexible; responsabilidad de socios limitada a sus aportes.',
          'SA':'Capital en acciones; adecuada para múltiples inversionistas; mayores requisitos de gobierno.',
          'EIRL':'Empresa individual; un titular; patrimonio separado; responsabilidad limitada al aporte.',
          'ONG':'Sin fines de lucro; objeto de interés general; régimen especial; no distribución de excedentes.'
        }},
        { id:'emp_checklist', label:'Checklist de requisitos', type:'checkboxes', options:[
          'Elaboración de estatutos y actas iniciales',
          'Registro en Cámara de Comercio',
          'Inscripción en DGII',
          'Registro en TSS',
          'Registro en Ministerio de Trabajo'
        ]},
        { id:'emp_capital', label:'Capital social (estimado)', type:'input', placeholder:'Ej.: RD$ 100,000' },
        { id:'emp_socios', label:'Nº de socios/miembros', type:'number', min:1 },
        { id:'emp_objeto', label:'Objeto social (breve)', type:'textarea' }
      ],
      baseDescLabel:'Descripción breve'
    }
  };

  // ====== Estado y util ======
  let state = { category: null };
  const allowedMimeFromExt = (ext) => ({
    pdf:'application/pdf',
    docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png'
  }[ext] || '');

  document.addEventListener('DOMContentLoaded', () => {
    $$('.tile').forEach(tile => tile.addEventListener('click', () => openCategory(tile.dataset.target)));
    $('#backToLanding')?.addEventListener('click', () => { showView('landingView'); resetForm(); });
    $('#toggleSidebar')?.addEventListener('click', () => {
      const aside = $('#inboxAside'); const show = aside.hasAttribute('hidden');
      if (show) aside.removeAttribute('hidden'); else aside.setAttribute('hidden','true');
    });

    $('#attachments')?.addEventListener('change', validateFiles);
    $('#serviceForm')?.addEventListener('submit', onSubmitForm);
    $('#previewBtn')?.addEventListener('click', onPreview);
    $('#copyEmailBtn')?.addEventListener('click', onCopyEmail);
    $('#closePreview')?.addEventListener('click', () => $('#previewDialog').close());

    renderInbox();
  });

  function showView(id){ $$('.view').forEach(v=>v.classList.remove('active')); $('#'+id).classList.add('active'); $('#formView').hidden=(id!=='formView'); }
  function resetForm(){
    $('#serviceForm').reset();
    $('#dynamicSteps').innerHTML='';
    $('#chipCategory').textContent='—'; $('#chipSub').textContent='—';
    $('#formTitle').textContent='Formulario';
    $('#descLabel').textContent='Descripción breve'; $('#desc').placeholder='Describa brevemente su caso o solicitud';
  }
  function openCategory(key){
    const svc = services[key]; if(!svc) return;
    state.category = key;
    $('#formTitle').textContent = svc.title;
    $('#chipCategory').textContent = svc.title;
    $('#chipSub').textContent = '—';
    $('#descLabel').textContent = svc.baseDescLabel || 'Descripción';
    $('#desc').placeholder = svc.baseDescLabel || 'Descripción';
    buildDynamicSteps(svc);
    showView('formView');
  }

  function buildDynamicSteps(svc){
    const container = $('#dynamicSteps'); container.innerHTML='';
    svc.steps.forEach(step => {
      const wrap = document.createElement('div');
      wrap.className = 'field' + ((step.type==='textarea' || step.type==='info' || step.type==='checkboxes') ? ' full' : '');
      wrap.dataset.stepId = step.id;

      const label = document.createElement('label');
      label.htmlFor = step.id; label.textContent = step.label;

      let input;
      if(step.type==='select'){
        input = document.createElement('select'); input.id=step.id; input.name=step.id; if(step.required) input.required=true;
        populateSelect(input, step.dependsOn ? [] : (step.options || [])); if(step.dependsOn) input.disabled=true;
      } else if(step.type==='input'){
        input = document.createElement('input'); input.type='text'; input.id=step.id; input.name=step.id;
        if(step.placeholder) input.placeholder=step.placeholder; if(step.defaultValue!==undefined) input.value=step.defaultValue; if(step.required) input.required=true;
      } else if(step.type==='number'){
        input = document.createElement('input'); input.type='number'; input.id=step.id; input.name=step.id; if(step.min!==undefined) input.min=step.min;
      } else if(step.type==='date'){
        input = document.createElement('input'); input.type='date'; input.id=step.id; input.name=step.id;
      } else if(step.type==='textarea'){
        input = document.createElement('textarea'); input.id=step.id; input.name=step.id; input.rows=4; if(step.placeholder) input.placeholder=step.placeholder;
      } else if(step.type==='info'){
        input = document.createElement('div'); input.id=step.id; input.className='hint';
      } else if(step.type==='checkboxes'){
        input = document.createElement('div'); input.id=step.id; input.className='checkboxes';
        step.options.forEach(opt => {
          const row = document.createElement('div'); row.className='checkbox-item';
          const id = step.id + '_' + slug(opt);
          const cb = document.createElement('input'); cb.type='checkbox'; cb.id=id; cb.name=step.id; cb.value=opt;
          const lbl = document.createElement('label'); lbl.htmlFor=id; lbl.textContent=opt;
          row.append(cb,lbl); input.appendChild(row);
        });
      }

      wrap.append(label,input); container.appendChild(wrap);
    });

    // dependencias
    svc.steps.forEach(step => {
      if(step.dependsOn){
        const controller = $('#'+step.dependsOn); const dependent = $('#'+step.id);
        controller.addEventListener('change', () => {
          if(step.type==='select'){
            const val = controller.value; const opts = (step.optionsMap && step.optionsMap[val]) || [];
            populateSelect(dependent, opts); dependent.disabled = !opts.length;
            $('#chipSub').textContent = '—'; renderChecklistIfAny();
          } else if(step.type==='info'){
            const html = (step.htmlMap && step.htmlMap[controller.value]) || ''; dependent.innerHTML = html; renderChecklistIfAny();
          }
        });
      } else if(step.id==='doc_entidad' || step.id==='permiso_tipo'){
        $('#'+step.id)?.addEventListener('change', renderChecklistIfAny);
      }
    });

    ['materia','tipo','doc_entidad','doc_tipo','permiso_tipo','permiso_sub'].forEach(id=>{ const el = document.getElementById(id); if(el){ el.addEventListener('change', renderChecklistIfAny); }});
    renderChecklistIfAny();
  }

  function ensureChecklistContainer(){
    const container = $('#dynamicSteps'); let checklist = $('#checklistInfo');
    if(!checklist){ checklist = document.createElement('div'); checklist.id='checklistInfo'; checklist.className='field full'; container.appendChild(checklist); }
    return checklist;
  }
  function renderChecklistIfAny(){
    if($('#permiso_tipo')){
      const tipo = $('#permiso_tipo')?.value || ''; const sub = $('#permiso_sub')?.value || ''; const cont = ensureChecklistContainer();
      if(tipo && sub){
        const items = (function(sub){ 
          if($('#permiso_tipo')?.value==='Viajes de menores'){
            return ['Acta de nacimiento','Cédulas/pasaportes de padre/madre/tutor (copias)','Autorización notarial (si aplica)','Itinerario/carta de invitación','Fotos del menor','Sentencia/guarda y custodia (si aplica)'];
          }
          return ['Formulario básico','Pago de tasas','Documento de identidad','Soportes técnicos (si aplica)'];
        })(sub);
        cont.innerHTML = `<label>Checklist referencial</label><ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul><small class="hint">Nota: lista referencial.</small>`;
      } else cont.innerHTML='';
    }
    if($('#doc_entidad')){
      const ent=$('#doc_entidad')?.value||''; const tipo=$('#doc_tipo')?.value||''; const cont=ensureChecklistContainer();
      if(ent && tipo){ const items = docs_checklist(ent, tipo); cont.innerHTML = `<label>Checklist referencial</label><ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul>`; } else cont.innerHTML='';
    }
    if($('#materia')){
      const mat=$('#materia')?.value||''; const tipo=$('#tipo')?.value||''; const cont=ensureChecklistContainer();
      if(mat && tipo){ const items = asesoria_checklist(mat, tipo); cont.innerHTML = `<label>Checklist referencial</label><ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul>`; } else cont.innerHTML='';
    }
  }
  function docs_checklist(entity, type){
    const map = {
      'DGII': {
        'Certificación de RNC': ['Número de RNC/Cédula','Datos del contribuyente','Pago de tasa (si aplica)'],
        'Certificación de deuda tributaria': ['RNC/Cédula','Autorización del titular/representante','Pago de tasa'],
        'Certificación de retenciones': ['RNC','Periodo a certificar','Pago de tasa'],
        'Certificación de ITBIS': ['RNC','Periodos/actividad','Pago de tasa'],
        'Certificación de matrícula de vehículo': ['Placa/Chasis','RNC/Cédula del titular','Pago de tasa']
      },
      'ONAPI': {
        'Registro de marca': ['Formulario ONAPI','Signo/denominación y Niza','Poder (si aplica)','Pago de tasa'],
        'Estado de solicitud de patente': ['Número de expediente','Identificación del solicitante','Pago de tasa (si aplica)'],
        'Certificación de denominación comercial': ['Denominación solicitada','Datos del solicitante','Pago de tasa']
      },
      'Cámara de Comercio de Santo Domingo': {
        'Certificación de matrícula mercantil': ['RNC/Cédula','Datos de la empresa','Pago de tasa'],
        'Certificación de vigencia de sociedad': ['RNC','Razón social','Pago de tasa'],
        'Certificación de asambleas registradas': ['RNC','Detalle de asamblea/acta','Pago de tasa']
      },
      'Modelos de contratos': {
        'Arrendamiento': ['Datos de arrendador/arrendatario','Descripción del inmueble','Canon y plazo'],
        'Préstamo': ['Partes','Monto/plazo/intereses','Garantías (si existen)'],
        'Prestación de servicios': ['Partes y objeto','Honorarios y plazos','Cláusulas de IP/Confidencialidad'],
        'Compraventa de vehículo': ['Datos de vendedor/comprador','Datos del vehículo','Precio y forma de pago']
      },
      'Actas y declaraciones': {
        'Acta de asamblea societaria': ['Convocatoria y quórum','Orden del día','Resoluciones adoptadas'],
        'Declaración jurada': ['Identificación del declarante','Contenido','Legalización (si aplica)'],
        'Poder especial': ['Otorgante y apoderado','Alcances/facultades','Plazo (si corresponde)']
      },
      'Cartas y comunicaciones': {
        'Reclamación de pago': ['Identificación del deudor','Detalle de la deuda','Plazo de cumplimiento'],
        'Renuncia laboral': ['Datos del trabajador','Fecha efectiva','Entrega de posición/activos'],
        'Autorización simple': ['Otorgante y beneficiario','Objeto','Vigencia']
      }
    };
    const byEntity = map[entity] || {}; return byEntity[type] || [];
  }
  function asesoria_checklist(materia, tipo){
    const map = {'Civil':{'Divorcio (mutuo consentimiento)':['Acta de matrimonio (reciente)','Cédulas/pasaportes de ambos cónyuges (copias)','Acuerdo de separación de bienes y custodia (si aplica)']}};
    if (map[materia] && map[materia][tipo]) return map[materia][tipo]; return [];
  }

  function validateFiles(){
    const input=$('#attachments'); const out=$('#fileErrors'); out.textContent='';
    for(const f of input.files){
      const ext=(f.name.split('.').pop()||'').toLowerCase();
      if(!allowedExt.has(ext)){ out.textContent=`Archivo no permitido: ${f.name}`; input.value=''; return false; }
      if(f.size>MAX_SIZE){ out.textContent=`Excede 10MB: ${f.name}`; input.value=''; return false; }
    }
    return true;
  }

  async function onSubmitForm(e){
    e.preventDefault();
    if(!validateFiles()) return;
    const form=e.target; if(!form.checkValidity()){ form.reportValidity(); return; }
    const data = collectFormData();
    // 1) Guardar local (respaldo)
    saveLocal(data);
    // 2) Enviar al backend
    try{
      const resp = await fetch(API_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          id: data._id,
          category: data._category,
          subtype: data._sub,
          name: data.name,
          email: data.email,
          phone: data.phone,
          org: data.org,
          desc: data.desc
        })
      });
      if(!resp.ok){ console.error('Backend error', await resp.text()); alert('Guardado localmente. No se pudo enviar al servidor.'); }
      else { alert('Envío guardado y enviado a servidor.'); }
    }catch(err){
      console.error(err); alert('Guardado localmente. Error de red al contactar el servidor.');
    }
    $('#serviceForm').reset(); renderInbox();
  }

  function collectFormData(){
    const svc = services[state.category] || {title:'—'};
    const base = {
      _id: uuid(),
      _ts: nowISO(),
      _categoryKey: state.category,
      _category: svc.title,
      _sub: getSubChipText(),
      name: $('#name').value.trim(),
      email: $('#email').value.trim(),
      phone: $('#phone').value.trim(),
      org: $('#org').value.trim(),
      desc: $('#desc').value.trim()
    };
    const dyn = {};
    $$('#dynamicSteps [id]').forEach(el => {
      if(el.tagName==='DIV' && el.classList.contains('checkboxes')){
        const name = el.id; dyn[name] = $$(`input[name="${name}"]:checked`).map(cb=>cb.value);
      } else if(el.tagName==='DIV'){ dyn[el.id] = el.textContent || ''; }
      else { dyn[el.id] = el.value || ''; }
    });
    return Object.assign({}, base, dyn);
  }
  function getSubChipText(){ const selects=$$('#dynamicSteps select'); let sub=''; selects.forEach(sel=>{ if(sel.value) sub=sel.value; }); return sub||'—'; }
  function saveLocal(d){ const arr=loadAll(); arr.unshift(d); localStorage.setItem(LS_KEY, JSON.stringify(arr)); }

  function loadAll(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ return []; } }
  function renderInbox(){
    const list=$('#inboxList'); list.innerHTML=''; const arr=loadAll(); $('#inboxCount').textContent=String(arr.length);
    if(!arr.length){ const li=document.createElement('li'); li.className='muted'; li.textContent='No hay envíos.'; list.appendChild(li); return; }
    arr.forEach(item=>{
      const li=document.createElement('li'); li.className='inbox-item';
      const left=document.createElement('div');
      left.innerHTML=`<div><strong>${escapeHtml(item.name||'(Sin nombre)')}</strong> <span class="meta">&lt;${escapeHtml(item.email)}&gt;</span></div>
      <div class="meta">${item._category} • ${item._sub} • ${new Date(item._ts).toLocaleString()}</div>`;
      const right=document.createElement('div'); right.className='actions-row';
      const chipCat=document.createElement('span'); chipCat.className='chip'; chipCat.textContent=item._category;
      const chipSub=document.createElement('span'); chipSub.className='chip alt'; chipSub.textContent=item._sub;
      right.append(chipCat, chipSub);
      li.append(left,right); list.appendChild(li);
    });
  }
  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function onPreview(){ const data=collectFormData(); $('#previewContent').textContent=JSON.stringify(data,null,2); $('#previewDialog').showModal(); }
  async function onCopyEmail(){ const data=collectFormData(); const body = Object.keys(data).map(k=>`${k}: ${Array.isArray(data[k])?data[k].join(' | '):data[k]}`).join('\n'); try{ await navigator.clipboard.writeText(body); alert('Contenido copiado.'); }catch{ alert(body); } }
  function populateSelect(select, options){ select.innerHTML=''; const def=document.createElement('option'); def.value=''; def.textContent='— Seleccione —'; select.appendChild(def); (options||[]).forEach(opt=>{ const o=document.createElement('option'); o.value=opt; o.textContent=opt; select.appendChild(o); }); }
  function slug(s){ return s.toLowerCase().replace(/[^\w]+/g,'-').replace(/^-+|-+$/g,''); }
})();