import { loadIFC } from "./ifc-viewer.js";

// Standalone IMPIANTI proof of concept. All real IFC files stay in this browser.
const $ = (sel, root=document) => root.querySelector(sel);
const h = (tag,attrs={},children=[]) => {
  const el=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==="class")el.className=v;
    else if(k==="text")el.textContent=v;
    else if(k==="html")el.innerHTML=v;
    else if(k.startsWith("on")&&typeof v==="function")el.addEventListener(k.slice(2).toLowerCase(),v);
    else if(v!==null&&v!==undefined)el.setAttribute(k,v);
  }
  for(const child of children)el.append(child);
  return el;
};
const colorDefaults={"Arquitectura":"#acb2b4","Agua fría":"#348edc","Agua caliente":"#db6757","Retorno":"#e5a33b","Climatización":"#49a6a6","Incendio":"#dc5252","Sanitaria":"#86a77b","Otros MEP":"#9a86d5"};
const demo={
  id:"demo",name:"Sanatorio · Demo",location:"Ejemplo de visualización",file:false,
  floors:["SS2","SS1","PB","P1","P2"],systems:["Agua fría","Agua caliente","Retorno","Climatización","Incendio"],
  equipment:[
    {id:"CH-01",name:"Chiller CH-01",floor:"SS1",system:"Agua fría",kind:"Equipo mecánico",details:{"Código":"CH-01","Categoría":"Equipos mecánicos","Capacidad":"Ejemplo — sin datos reales","Ubicación":"1.º subsuelo"}},
    {id:"UTA-01",name:"Unidad tratamiento aire UTA-01",floor:"SS1",system:"Climatización",kind:"Equipo mecánico",details:{"Código":"UTA-01","Categoría":"Equipos mecánicos","Capacidad":"Ejemplo — sin datos reales","Ubicación":"1.º subsuelo"}},
    {id:"BC-02",name:"Bomba circulación BC-02",floor:"SS2",system:"Retorno",kind:"Equipo mecánico",details:{"Código":"BC-02","Categoría":"Equipos mecánicos","Caudal":"Ejemplo — sin datos reales","Ubicación":"2.º subsuelo"}},
    {id:"VE-01",name:"Ventilador VE-01",floor:"PB",system:"Climatización",kind:"Equipo mecánico",details:{"Código":"VE-01","Categoría":"Equipos mecánicos","Caudal":"Ejemplo — sin datos reales","Ubicación":"Planta baja"}},
    {id:"HI-01",name:"Hidrante HI-01",floor:"PB",system:"Incendio",kind:"Accesorio",details:{"Código":"HI-01","Categoría":"Protección contra incendios","Ubicación":"Planta baja"}}
  ]
};
const categoryOptions=[
  {id:"architecture",label:"Arquitectura",hint:"Muros, losas y puertas"},
  {id:"equipment",label:"Equipos",hint:"Chillers, bombas, UTAs"},
  {id:"pipes",label:"Cañerías",hint:"Tuberías"},
  {id:"pipefit",label:"Accesorios de cañerías",hint:"Válvulas, codos y tees"},
  {id:"ducts",label:"Conductos",hint:"Conductos rígidos"},
  {id:"flexduct",label:"Conductos flexibles",hint:"Flex ducts"},
  {id:"terminals",label:"Terminales",hint:"Difusores y rejillas"}
];
const state={page:"home",project:null,projects:[],floor:"Todos",systems:[],categories:categoryOptions.map(c=>c.id),colors:{...colorDefaults},view:"axo",selected:null,model:null,file:null,query:"",openDialog:false};
let dbPromise=null,toastTimer=null,openSeq=0;
const icon=(name)=>({building:"▦",layers:"▤",equipment:"◈",menu:"☰",search:"⌕",back:"←",plus:"+",view:"◇",close:"×",location:"⌖",file:"▣",settings:"⚙",information:"ⓘ",arrow:"→",tick:"✓"}[name]||"•");
function toast(message){const target=$("#toast");target.textContent=message;target.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>target.classList.remove("show"),4100)}
function db(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open("impianti-bim-viewer-v1",1);
    request.onupgradeneeded=()=>{const d=request.result;if(!d.objectStoreNames.contains("projects"))d.createObjectStore("projects",{keyPath:"id"})};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return dbPromise;
}
async function allProjects(){try{const d=await db();return await new Promise((resolve,reject)=>{const q=d.transaction("projects").objectStore("projects").getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}catch(e){console.error(e);toast("El navegador no permite guardar obras localmente.");return []}}
async function saveProject(project){const d=await db();await new Promise((resolve,reject)=>{const t=d.transaction("projects","readwrite");t.objectStore("projects").put(project);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}
function safeText(s){return String(s??"")}
function brand(){return h("div",{class:"brand-wrap"},[
  h("div",{class:"brand"},[h("span",{class:"brand-mark",text:"I"}),h("span",{text:"MP"}),h("span",{class:"brand-mark",text:"I"}),h("span",{text:"ANT"}),h("span",{class:"brand-mark",text:"I"})]),
  h("div",{class:"brand-sub",text:"VISOR DE INSTALACIONES"})
])}
function sidebar(){
  return h("aside",{class:"sidebar"},[
    brand(),
    h("nav",{class:"side-nav","aria-label":"Secciones"},[
      h("button",{class:"nav-item "+(state.page==="home"?"active":""),onClick:()=>goHome(),text:icon("building")+"  Obras"}),
      h("button",{class:"nav-item "+(state.project?.id==="demo"?"active":""),onClick:()=>openProject(demo),text:icon("view")+"  Explorar demo"})
    ]),
    h("div",{class:"side-bottom",text:"IMPIANTI S.R.L.\nPrototipo local · Sin usuarios\nLos IFC no se envían a servidores."})
  ])
}
function topbar(){
  return h("div",{class:"topbar"},[
    h("div",{class:"breadcrumbs"},[
      h("button",{class:"btn btn-ghost btn-small mobile-toggle",text:"☰",onClick:()=>toast("Usá «Obras» para volver al inicio.")}),
      h("span",{text:"IMPIANTI"}),
      h("span",{text:"/"}),
      h("strong",{text:state.project?state.project.name:"Obras"})
    ]),
    h("div",{class:"user-pill",text:"● Prototipo de prueba"})
  ])
}
function render(){
  const root=$("#app");root.replaceChildren();
  root.append(h("div",{class:"app-shell"},[
    sidebar(),
    h("main",{class:"main"},[topbar(),h("div",{class:"content"},state.page==="home"?[homePage()]:[viewerPage()])])
  ]));
  if(state.openDialog)root.append(projectDialog());
}
function goHome(){disposeModel();state.page="home";state.project=null;state.selected=null;render()}
function projectIllustration(){
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("viewBox","0 0 360 155");
  svg.innerHTML='<g transform="translate(75 12)" fill="none" stroke="#aab4b3" stroke-width="1.2"><path d="M0 50L100 10L210 57L107 102Z M0 50V92L107 143V102 M107 143L210 98V57 M36 36V108 M74 22V126 M144 29V128 M180 44V111" opacity=".65"/><path d="M0 78L107 126L210 83 M0 64L107 113L210 69" opacity=".48"/><path d="M45 95L113 65L170 91" stroke="#ef8d37" stroke-width="6" stroke-linecap="round"/><path d="M45 109L112 79L169 105" stroke="#468dbc" stroke-width="5" stroke-linecap="round"/></g>';
  return svg;
}
function homePage(){
  const wrapper=h("section",{});
  wrapper.append(h("div",{class:"page-header"},[
    h("div",{},[
      h("div",{class:"eyebrow",text:"GESTIÓN VISUAL DE OBRAS"}),
      h("h1",{text:"Todas tus instalaciones, a la vista."}),
      h("p",{text:"Elegí una obra, un piso y el equipo que necesitás. Sin complicaciones."})
    ]),
    h("button",{class:"btn btn-primary",text:"+ Nueva obra",onClick:()=>{state.openDialog=true;render()}})
  ]));
  const overview=h("div",{class:"overview"},[
    h("div",{},[h("h2",{text:"Una forma más simple de recorrer cada obra."}),h("p",{text:"Vista axonométrica, filtros por nivel, sistemas y fichas de equipos."})]),
    h("button",{class:"btn btn-white",text:"Explorar demo "+icon("arrow"),onClick:()=>openProject(demo)})
  ]);
  wrapper.append(overview);
  wrapper.append(h("div",{class:"page-header"},[
    h("div",{},[h("h2",{text:"Mis obras"}),h("p",{text:"Obras guardadas en este navegador"})]),
    h("input",{class:"search",type:"search",placeholder:"Buscar obra…","aria-label":"Buscar obras",value:state.query,onInput:e=>{state.query=e.target.value;render()}})
  ]));
  const cards=h("div",{class:"grid-cards"});
  const items=[demo,...state.projects].filter(p=>(p.name+" "+p.location).toLowerCase().includes(state.query.toLowerCase()));
  for(const p of items){
    const img=h("div",{class:"project-visual"},[projectIllustration()]);
    img.append(h("span",{class:"tag "+(p.id==="demo"?"badge-demo":""),style:"position:absolute;top:12px;left:12px",text:p.id==="demo"?"EJEMPLO":"IFC LOCAL"}));
    cards.append(h("article",{class:"card project-card",role:"button",tabindex:"0",onClick:()=>openProject(p),onKeydown:e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openProject(p)}}},[
      img,h("div",{class:"project-name",text:p.name}),h("div",{class:"project-meta",text:p.location||"Ubicación sin definir"}),
      h("div",{class:"project-foot"},[h("span",{text:p.id==="demo"?"Exploración ilustrativa":"Modelo IFC guardado"}),h("span",{text:"Abrir "+icon("arrow")})])
    ]))
  }
  if(!items.length)cards.append(h("div",{class:"empty",text:"No se encontraron obras."}));
  wrapper.append(cards,h("div",{class:"footnote",text:"Los IFC no se publican: el prototipo los procesa y guarda solamente en este navegador."}));
  return wrapper;
}
function projectDialog(){
  const shade=h("div",{class:"form-overlay"});
  const card=h("div",{class:"form-card",role:"dialog","aria-modal":"true","aria-label":"Crear nueva obra"});
  card.append(h("div",{class:"page-header"},[
    h("h2",{text:"Nueva obra"}),
    h("button",{class:"btn btn-ghost",text:"✕",onClick:()=>{state.openDialog=false;render()}})
  ]));
  card.append(h("p",{text:"Cargá un modelo IFC exportado de Revit 2025 o 2026. Nada se sube a servidores."}));
  const form=h("form",{});
  const name=h("input",{type:"text",placeholder:"Ej. Sanatorio Yacente",required:"",maxlength:"90"});
  const location=h("input",{type:"text",placeholder:"Ej. Córdoba · Argentina",maxlength:"120"});
  const file=h("input",{type:"file",accept:".ifc,application/octet-stream",required:"",style:"display:none"});
  const hint=h("div",{class:"upload-zone",text:"Elegir archivo .ifc\n\n",onClick:()=>file.click()});
  hint.append(h("div",{text:"Click para seleccionar un IFC desde tu equipo"}),h("small",{text:"Sin RVT directo · El tamaño depende de la memoria del equipo"}));
  file.addEventListener("change",()=>{hint.replaceChildren(h("strong",{text:file.files?.[0]?.name||"Elegir archivo"}),h("div",{text:"Archivo seleccionado correctamente"}))});
  form.append(h("label",{class:"form-field"},[h("span",{text:"Nombre de la obra *"}),name]));
  form.append(h("label",{class:"form-field"},[h("span",{text:"Lugar / ubicación"}),location]));
  form.append(h("label",{class:"form-field"},[h("span",{text:"Archivo IFC *"}),hint,file]));
  const submit=h("button",{class:"btn btn-primary",type:"submit",text:"Crear y abrir obra"});
  form.append(h("div",{style:"display:flex;justify-content:flex-end;gap:10px;margin-top:25px"},[
    h("button",{class:"btn btn-white",type:"button",text:"Cancelar",onClick:()=>{state.openDialog=false;render()}}),submit
  ]));
  form.addEventListener("submit",async e=>{
    e.preventDefault();const f=file.files?.[0];
    if(!f||!f.name.toLowerCase().endsWith(".ifc")){toast("Seleccioná un archivo con extensión .ifc");return}
    submit.disabled=true;submit.textContent="Guardando…";
    try{
      const project={id:"obra-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),name:name.value.trim(),location:location.value.trim(),created:new Date().toISOString(),file:f};
      await saveProject(project);state.projects=await allProjects();state.openDialog=false;openProject(project)
    }catch(err){console.error(err);toast("No fue posible guardar el IFC. Podría superar el espacio disponible en este navegador.");submit.disabled=false;submit.textContent="Crear y abrir obra"}
  });
  card.append(form);shade.append(card);shade.addEventListener("click",e=>{if(e.target===shade){state.openDialog=false;render()}});return shade;
}
function disposeModel(){openSeq++;if(state.model){state.model.dispose();state.model=null}}
function openProject(p){
  disposeModel();state.project=p;state.page="viewer";state.floor="Todos";state.selected=null;state.view="axo";
  state.systems=[...(p.id==="demo"?p.systems:[])];state.categories=categoryOptions.map(c=>c.id);render();
  if(p.id!=="demo")setTimeout(()=>mountModel(p),0);
}
async function mountModel(project){
  const seq=++openSeq,host=$("#canvasHost"),loading=$("#loading");
  if(!host||!loading)return;
  if(!project.file){loading.textContent="No se encontró el archivo IFC local.";return}
  try{
    const controller=await loadIFC(host,project.file,{
      status:message=>{if(seq===openSeq&&loading)loading.textContent=message},
      onSelect:entry=>{if(seq!==openSeq)return;state.model?.clearNearby();state.selected=entry;renderInspector()},
      onModel:metadata=>{if(seq!==openSeq)return;state.project._levels=metadata.levels;state.project._systems=metadata.systems;state.project._equipment=metadata.equipment||[]}
    });
    if(seq!==openSeq){controller.dispose();return}
    state.model=controller;state.systems=[...controller.systems];state.floor="Todos";controller.setCategories(state.categories);loading.remove();
    renderFilterPanel();renderInspector();refreshToolbar();
    toast("Modelo IFC cargado · "+controller.count+" elementos.");
  }catch(e){console.error(e);loading.replaceChildren(h("div",{style:"max-width:300px;line-height:1.6",text:"No se pudo visualizar este IFC. Probá exportar IFC4 Reference View desde Revit o usar un archivo pequeño. Detalle: "+e.message}))}
}
function viewerPage(){
  const p=state.project,w=h("section",{});
  w.append(h("div",{class:"page-header"},[
    h("div",{},[
      h("button",{class:"btn btn-ghost btn-small",text:"← Volver a obras",onClick:goHome}),
      h("h1",{text:p.name}),h("p",{text:(p.location||"Sin ubicación")+" · "+(p.id==="demo"?"Datos ilustrativos":"Archivo IFC local")})
    ]),
    h("span",{class:"tag "+(p.id==="demo"?"badge-demo":""),text:p.id==="demo"?"MODO DEMO":"VISTA BIM"})
  ]));
  const layout=h("div",{class:"viewer-layout"},[
    h("aside",{class:"panel left-filters",id:"filterPanel"}),
    h("section",{class:"panel viewport",id:"viewport",role:"region","aria-label":"Visualización de instalaciones"}),
    h("aside",{class:"panel right-inspector",id:"inspectorPanel"})
  ]);
  w.append(layout);
  queueMicrotask(()=>{if(state.page==="viewer"){renderFilterPanel();renderInspector();renderViewport()}});
  return w;
}
function levels(){return state.project?.id==="demo"?["Todos",...demo.floors]:["Todos",...(state.project?._levels||[])]}
function renderFilterPanel(){
  const panel=$("#filterPanel");if(!panel)return;
  panel.replaceChildren();
  const content=h("div",{class:"panel-pad"},[h("div",{class:"panel-heading",text:"Explorar la instalación"})]);
  content.append(h("div",{class:"section-label",text:"01 · Elegí un nivel"}));
  const floorlist=h("div",{class:"floor-list"});
  for(const floor of levels())floorlist.append(h("button",{class:"pill "+(state.floor===floor?"active":""),text:floor,onClick:()=>{state.floor=floor;state.selected=null;if(state.model)state.model.setLevel(floor);renderFilterPanel();renderInspector();updateDemoScene()}}));
  content.append(floorlist,h("div",{class:"section-label",text:"02 · Mostrar / ocultar elementos"}));
  const categoryActions=h("div",{class:"floor-list",style:"margin-bottom:12px"});
  const presets=[
    ["Solo equipos",["equipment"]],
    ["Cañerías + equipos",["pipes","pipefit","equipment"]],
    ["Ver todo",categoryOptions.map(c=>c.id)]
  ];
  for(const [caption,ids] of presets)categoryActions.append(
    h("button",{class:"pill",text:caption,onClick:()=>{
      state.categories=[...ids];state.model?.setCategories(state.categories);
      renderFilterPanel();updateDemoScene();
    }})
  );
  content.append(categoryActions);
  for(const category of categoryOptions){
    const row=h("div",{class:"system-item",style:"padding:7px 0"});
    const box=h("input",{type:"checkbox","aria-label":"Mostrar "+category.label});
    box.checked=state.categories.includes(category.id);
    box.addEventListener("change",()=>{
      state.categories=box.checked?[...state.categories,category.id]:state.categories.filter(id=>id!==category.id);
      state.model?.setCategories(state.categories);updateDemoScene();
    });
    const label=h("label",{style:"display:flex;flex-direction:column;gap:2px"});
    label.append(h("span",{text:category.label}),h("small",{style:"color:#929292;font-size:10px;font-weight:400",text:category.hint}));
    label.addEventListener("click",()=>box.click());
    row.append(box,label);
    content.append(row);
  }
  content.append(h("div",{class:"section-label",text:"03 · Filtrar por sistema"}));
  const available=state.project?.id==="demo"?demo.systems:state.project?._systems||[];
  if(!available.length)content.append(h("p",{class:"project-meta",text:"Los sistemas aparecerán al procesar el IFC."}));
  for(const system of available){
    const row=h("div",{class:"system-item"});
    const checked=h("input",{type:"checkbox","aria-label":"Mostrar "+system});checked.checked=state.systems.includes(system);
    checked.addEventListener("change",()=>{state.systems=checked.checked?[...new Set([...state.systems,system])]:state.systems.filter(s=>s!==system);state.model?.setSystems(state.systems);updateDemoScene()});
    const title=h("label",{text:system});title.addEventListener("click",()=>checked.click());
    const swatch=h("span",{class:"colorwrap"});
    const btn=h("button",{class:"swatch",type:"button",style:"background:"+(state.colors[system]||"#aaaaaa"),title:"Editar color de "+system});
    const picker=h("input",{type:"color",value:state.colors[system]||"#aaaaaa","aria-label":"Color de "+system});
    picker.addEventListener("input",()=>{state.colors[system]=picker.value;btn.style.background=picker.value;state.model?.setColor(system,picker.value);updateDemoScene()});
    btn.addEventListener("click",()=>picker.click());swatch.append(btn,picker);
    row.append(checked,title,swatch);content.append(row);
  }
  content.append(h("div",{class:"section-label",text:"04 · Buscar equipo"}));
  const search=h("input",{class:"search",style:"width:100%",type:"search",placeholder:"Nombre o código…","aria-label":"Buscar equipo"});
  const results=h("div",{id:"equipmentResults",style:"margin-top:10px"});
  const drawResults=()=>{
    results.replaceChildren();const q=search.value.trim().toLowerCase();
    if(state.project?.id!=="demo"){
      const items=(state.project?._equipment||[]).filter(e=>
        (state.floor==="Todos"||e.level===state.floor)&&
        (e.name+" "+(e.typeName||"")+" "+(e.instanceName||"")+" "+e.type+" "+e.tag).toLowerCase().includes(q)
      ).slice(0,45);
      for(const e of items)results.append(h("button",{
        class:"nav-item",style:"width:100%;font-size:12px;justify-content:start",
        text:"◈ "+(e.typeName||e.name||e.type),
        onClick:()=>{state.model?.clearNearby();state.selected=e;renderInspector()}
      }));
      if(!items.length)results.append(h("p",{class:"project-meta",text:"No se encontraron equipos en este nivel. También podés tocar cualquier elemento del modelo."}));
      return;
    }
    const items=demo.equipment.filter(e=>(state.floor==="Todos"||e.floor===state.floor)&&(e.id+" "+e.name).toLowerCase().includes(q));
    for(const e of items)results.append(h("button",{class:"nav-item",style:"width:100%;font-size:12px;justify-content:start",text:"◈ "+e.name,onClick:()=>{state.selected=e;renderInspector();updateDemoScene()}}));
    if(!items.length)results.append(h("p",{class:"project-meta",text:"No hay equipos en este nivel."}));
  };
  search.addEventListener("input",drawResults);content.append(search,results);drawResults();panel.append(content);
}
function renderViewport(){
  const area=$("#viewport");if(!area)return;area.replaceChildren();
  const canvas=h("div",{class:"canvas-host",id:"canvasHost"});area.append(canvas);
  if(state.project.id==="demo"){canvas.append(demoDiagram())}else area.append(h("div",{class:"loading",id:"loading"},[h("div",{class:"spinner"}),h("p",{text:"Preparando el modelo IFC…" })]));
  area.append(h("div",{class:"viewport-toolbar"},[
    h("div",{class:"tool-group",id:"viewTools"}),
    h("div",{class:"tool-group"},[h("button",{class:"btn btn-ghost btn-small",text:"↺ Restablecer",onClick:()=>{state.view="axo";state.model?.reset();refreshToolbar()}})])
  ]));
  area.append(h("div",{class:"view-footer"},[
    h("div",{class:"tag",text:state.project.id==="demo"?"DIAGRAMA ILUSTRATIVO":"MODELO IFC · LOCAL"}),
    h("span",{text:"Seleccioná un elemento para ver su ficha"})
  ]));refreshToolbar();
}
function refreshToolbar(){
  const tools=$("#viewTools");if(!tools)return;tools.replaceChildren();
  const views=[["axo","Axonométrica"],["plan","Planta"],["orbit","Orbitar"]];
  for(const [key,text] of views)tools.append(h("button",{class:"btn btn-ghost btn-small "+(state.view===key?"active":""),text,onClick:()=>{state.view=key;state.model?.setView(key);refreshToolbar();updateDemoScene()}}));
}
function demoDiagram(){
  const root=h("div",{class:"demo-scene",id:"demoScene"});root.append(createDemoSVG());return root;
}
function createDemoSVG(){
  const ns="http://www.w3.org/2000/svg";const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 640 410");
  const valid=(system,level)=>state.systems.includes(system)&&(state.floor==="Todos"||state.floor===level);
  const visibleCategory=id=>state.categories.includes(id);
  const demoCategory=system=>system==="Climatización"?"ducts":"pipes";
  const axo=state.view!=="plan";
  if(axo){
    svg.innerHTML=visibleCategory("architecture")?'<g stroke="#b5bfc0" fill="none" stroke-width="1.35" opacity=".62"><path d="M118 140L322 50L537 142L326 237Z M118 140V285L326 382V237 M326 382L537 286V142 M118 189L326 281L537 190 M118 236L326 327L537 239 M159 123V303 M213 102V327 M268 78V355 M376 77V356 M436 102V333 M493 123V306"/><path d="M149 127L357 222M204 103L415 198M254 81L469 175" opacity=".4"/></g>':"";
    const paths=[
      {system:"Agua fría",level:"SS1",d:"M165 225L320 288L455 222L506 245",width:8},
      {system:"Retorno",level:"SS1",d:"M166 250L320 312L451 249L510 270",width:7},
      {system:"Agua caliente",level:"PB",d:"M166 169L323 237L477 170",width:7},
      {system:"Climatización",level:"SS1",d:"M202 198L327 254L463 190",width:13},
      {system:"Incendio",level:"SS2",d:"M173 290L318 351L467 280",width:6}
    ];
    for(const p of paths){if(!valid(p.system,p.level)||!visibleCategory(demoCategory(p.system)))continue;const el=document.createElementNS(ns,"path");el.setAttribute("d",p.d);el.setAttribute("fill","none");el.setAttribute("stroke",state.colors[p.system]);el.setAttribute("stroke-width",p.width);el.setAttribute("stroke-linecap","round");svg.append(el)}
    if(visibleCategory("flexduct")&&valid("Climatización","SS1")){
      const flex=document.createElementNS(ns,"path");
      flex.setAttribute("d","M463 190Q485 184 496 207");
      flex.setAttribute("fill","none");flex.setAttribute("stroke","#efab61");
      flex.setAttribute("stroke-width","7");flex.setAttribute("stroke-linecap","round");flex.setAttribute("stroke-dasharray","7 4");svg.append(flex);
    }
    for(const e of demo.equipment.filter(e=>state.floor==="Todos"||e.floor===state.floor)){
      if(!state.systems.includes(e.system)||!visibleCategory("equipment"))continue;
      const pos=({"CH-01":[173,225],"UTA-01":[343,254],"BC-02":[202,308],"VE-01":[461,179],"HI-01":[478,190]})[e.id];
      const circle=document.createElementNS(ns,"circle");circle.setAttribute("cx",pos[0]);circle.setAttribute("cy",pos[1]);
      circle.setAttribute("r",state.selected?.id===e.id?"13":"9");circle.setAttribute("fill","#fff");circle.setAttribute("stroke",state.colors[e.system]);
      circle.setAttribute("stroke-width",state.selected?.id===e.id?"5":"3");circle.setAttribute("style","cursor:pointer");
      circle.addEventListener("click",()=>{state.selected=e;renderInspector();updateDemoScene()});svg.append(circle);
    }
  }else{
    svg.innerHTML=visibleCategory("architecture")?'<g fill="#f7f9f8" stroke="#b4bec0" stroke-width="2"><path d="M120 85H520V325H120Z"/><path d="M230 85V325M400 85V325M120 205H520"/></g>':"";
    const paths=[
      {system:"Agua fría",level:"SS1",d:"M165 250H300V180H485"},
      {system:"Retorno",level:"SS1",d:"M165 271H322V202H485"},
      {system:"Agua caliente",level:"PB",d:"M152 151H490"},
      {system:"Climatización",level:"SS1",d:"M245 105V304H420"},
      {system:"Incendio",level:"SS2",d:"M165 300H490"}
    ];
    for(const p of paths)if(valid(p.system,p.level)&&visibleCategory(demoCategory(p.system))){
      const el=document.createElementNS(ns,"path");el.setAttribute("d",p.d);el.setAttribute("fill","none");el.setAttribute("stroke",state.colors[p.system]);
      el.setAttribute("stroke-width","10");el.setAttribute("stroke-linecap","round");svg.append(el);
    }
    if(visibleCategory("flexduct")&&valid("Climatización","SS1")){
      const flex=document.createElementNS(ns,"path");flex.setAttribute("d","M420 304Q441 309 460 287");
      flex.setAttribute("fill","none");flex.setAttribute("stroke","#efab61");
      flex.setAttribute("stroke-width","7");flex.setAttribute("stroke-dasharray","7 4");svg.append(flex);
    }
    if(visibleCategory("equipment")){
      for(const e of demo.equipment.filter(e=>(state.floor==="Todos"||e.floor===state.floor)&&state.systems.includes(e.system))){
        const xy=({"CH-01":[165,250],"UTA-01":[245,105],"BC-02":[165,300],"VE-01":[420,220],"HI-01":[485,151]})[e.id];
        const dot=document.createElementNS(ns,"circle");dot.setAttribute("cx",xy[0]);dot.setAttribute("cy",xy[1]);
        dot.setAttribute("r",state.selected?.id===e.id?"13":"9");dot.setAttribute("fill","#fff");
        dot.setAttribute("stroke",state.colors[e.system]);dot.setAttribute("stroke-width","4");
        dot.style.cursor="pointer";dot.addEventListener("click",()=>{state.selected=e;renderInspector();updateDemoScene()});svg.append(dot);
      }
    }
  }
  const label=document.createElementNS(ns,"text");label.setAttribute("x","320");label.setAttribute("y","26");label.setAttribute("text-anchor","middle");label.setAttribute("font-size","13");label.setAttribute("font-weight","700");label.setAttribute("fill","#758583");
  label.textContent=state.floor==="Todos"?"EDIFICIO · NIVELES ILUSTRATIVOS":"NIVEL "+state.floor;svg.append(label);
  return svg;
}
function updateDemoScene(){const scene=$("#demoScene");if(scene)scene.replaceChildren(createDemoSVG())}
function renderInspector(){
  const panel=$("#inspectorPanel");if(!panel)return;panel.replaceChildren();
  if(!state.selected){
    panel.append(h("div",{class:"inspector-empty"},[
      h("div",{class:"inspector-icon",text:"◈"}),
      h("h2",{text:"Elegí un equipo"}),
      h("p",{text:"Tocá un elemento del modelo o buscá un equipo para consultar su información."})
    ]));return;
  }
  const item=state.selected,box=h("div",{class:"panel-pad"});
  box.append(h("div",{class:"eyebrow",text:"FICHA DE ELEMENTO"}));
  box.append(h("h2",{text:item.typeName||item.name||"Elemento BIM"}));
  box.append(h("span",{class:"tag",text:item.system||item.group||item.type||"Elemento"}));
  const properties=item.details||{"Nombre de tipo (Revit)":item.typeName||"No exportado","Nombre de instancia":item.instanceName||"No exportado","ID IFC":item.id,"Global ID":item.guid||"No disponible","Categoría IFC":item.type||"Sin identificar","Nivel":item.level||"Sin nivel","Sistema estimado":item.group||"No identificado","Etiqueta":item.tag||"No definida"};
  for(const [key,value] of Object.entries(properties))box.append(h("div",{class:"info-row"},[h("small",{text:key}),h("strong",{text:safeText(value)})]));
  if(state.project.id==="demo"){
    box.append(h("div",{class:"section-label",text:"Visualizar instalación"}));
    box.append(h("div",{class:"floor-list"},[
      h("button",{class:"pill",text:"Mostrar sistema",onClick:()=>{state.systems=[item.system];state.floor=item.floor;renderFilterPanel();updateDemoScene()}}),
      h("button",{class:"pill",text:"Ver en planta",onClick:()=>{state.view="plan";refreshToolbar();updateDemoScene()}}),
      h("button",{class:"pill",text:"Vista completa",onClick:()=>{state.floor="Todos";state.systems=[...demo.systems];renderFilterPanel();updateDemoScene()}})
    ]));
    box.append(h("p",{class:"footnote",text:"Esta ficha es ilustrativa. El trazado de ejemplo no corresponde a una instalación real."}));
  }else{
    const nearby=state.model?.getNearby(item)||[];
    box.append(h("div",{class:"section-label",text:"Instalaciones próximas"}));
    if(nearby.length){
      box.append(h("p",{class:"project-meta",text:"Elementos cercanos por posición en el modelo. No significa que estén conectados físicamente."}));
      const actions=h("div",{class:"floor-list"},[
        h("button",{class:"pill",text:"Resaltar cercanos",onClick:()=>{
          if(item.level&&item.level!=="Sin nivel"){state.floor=item.level;state.model?.setLevel(item.level)}
          state.systems=[...new Set([...state.systems,item.group,...nearby.map(e=>e.group)])];
          state.model?.setSystems(state.systems);state.model?.focusNearby(item);
          renderFilterPanel();
          toast("Mostrando instalaciones próximas, sin confirmar conexiones.");
        }}),
        h("button",{class:"pill",text:"Mostrar todo",onClick:()=>{state.model?.clearNearby();state.floor="Todos";state.model?.setLevel("Todos");renderFilterPanel()}}),
        h("button",{class:"pill",text:"Ver en planta",onClick:()=>{state.view="plan";state.model?.setView("plan");refreshToolbar()}})
      ]);
      box.append(actions);
      for(const e of nearby.slice(0,7))box.append(h("div",{class:"info-row"},[
        h("small",{text:e.group+" · "+e.level}),
        h("strong",{text:e.name})
      ]));
    }else{
      box.append(h("p",{class:"project-meta",text:"No se identificaron instalaciones próximas dentro del entorno de búsqueda. Podés explorar los sistemas manualmente."}));
    }
    box.append(h("p",{class:"footnote",text:"Vista IFC de prueba. Para clasificar sistemas con Comentarios u otros parámetros, será necesario añadir un mapeo configurable según el modelo."}));
  }
  panel.append(box);
}
async function start(){
  state.projects=await allProjects();
  render();
}
start().catch(err=>{console.error(err);toast("No pudo iniciarse la aplicación.")});
