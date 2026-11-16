// Independent IFC prototype: no server upload and no database.
// External dependencies load only when the user opens an IFC.
const THREE_URL="https://esm.sh/three@0.170.0";
const IFC_URL="https://esm.sh/web-ifc@0.0.66";
const WASM_URL="https://cdn.jsdelivr.net/npm/web-ifc@0.0.66/";
const palette={"Arquitectura":"#b5baba","Agua fría":"#2983df","Agua caliente":"#ef705b","Retorno":"#e4a539","Climatización":"#38a7aa","Incendio":"#d54b51","Sanitaria":"#8ca86a","Otros MEP":"#9b89ce"};
function nameFor(type,name){
 const s=(type+" "+name).toUpperCase();
 if(/FIRE|SPRINK|INCEND|HIDRANT|ROCIAD/.test(s))return "Incendio";
 if(/DRAIN|SANIT|WASTE|SEWER|DESAG/.test(s))return "Sanitaria";
 if(/HOT|HEAT|CALIENT|ACS/.test(s))return "Agua caliente";
 if(/RETURN|RETORN/.test(s))return "Retorno";
 if(/CHILL|COLD|FRIA|FRÍA|COOL/.test(s))return "Agua fría";
 if(/DUCT|AIR|FAN|VENT|CLIMA/.test(s))return "Climatización";
 if(/PIPE|FITTING|VALVE|PUMP|EQUIPMENT|TANK|FLOW|DISTRIBUTION|TERMINAL|CABLE/.test(s))return "Otros MEP";
 return "Arquitectura";
}
// Categories describe IFC objects; they do not depend on system assignment.
function categoryFor(type,name="",predefined=""){
 const entity=String(type||"").toUpperCase();
 const t=(String(name||"")+" "+String(predefined||"")).toUpperCase();
 // Diffusers and grilles are terminals, not mechanical equipment.
 if(/IFCAIRTERMINAL|IFCAIRTERMINALBOX/.test(entity)||/DIFUSOR|DIFFUSER|REJILLA|GRILLE|ANEMOSTATO|TOBERA/.test(t))return "terminals";
 if(/IFCFLEXIBLESEGMENT|IFCFLEXIBLEDUCT/.test(entity)||/FLEX.*DUCT|DUCT.*FLEX|FLEXDUCT|CONDUCTO FLEX/.test(t))return "flexduct";
 if(/IFCDUCT/.test(entity)||/DUCT|CONDUCTO/.test(t))return "ducts";
 if(/IFCPIPEFITTING|IFCPIPEACCESSORY|IFCVALVE|IFCFLOWCONTROLLER/.test(entity)||/VALVULA|VÁLVULA|CODO |TEE |REDUCCION|REDUCCIÓN/.test(t))return "pipefit";
 if(/IFCPIPE/.test(entity)||/CAÑERIA|CAÑERÍA|TUBERIA|TUBERÍA|PIPING/.test(t))return "pipes";
 if(/IFCPUMP|IFCFAN|IFCCHILLER|IFCBOILER|IFCCOIL|IFCHEATEXCHANGER|IFCUNITARYEQUIPMENT|IFCENERGYCONVERSIONDEVICE|IFCCOMPRESSOR|IFCCONDENSER|IFCEVAPORATOR|IFCENGINE|IFCAIRTOAIRHEATRECOVERY|IFCEQUIPMENT/.test(entity))return "equipment";
 // Generic IFCFLOWTERMINAL is NOT sufficient; require recognizable equipment name.
 if(/\bCHILLER\b|\bMINICHILLER\b|\bUTA[ _-]?\d*\b|\bAHU[ _-]?\d*\b|\bFAN ?COIL\b|\bBOMBA\b|\bPUMP\b|\bVENTILADOR\b|\bFAN\b|\bUNIDAD (DE )?TRATAMIENTO\b|\bROOFTOP\b|\bEQUIPO MECANICO\b/.test(t))return "equipment";
 return "architecture";
}
export async function loadIFC(host,file,{status=()=>{},onSelect=()=>{},onModel=()=>{}}={}){
 let api=null,modelID=null,renderer=null,frame=0,observer=null,removed=false;
 const cleanups=[];
 try{
 status("Cargando motor 3D…");
 const [THREE,IFC]=await Promise.all([import(THREE_URL),import(IFC_URL)]);
 api=new IFC.IfcAPI(); api.SetWasmPath(WASM_URL,true); await api.Init();
 status("Leyendo IFC local…");
 modelID=api.OpenModel(new Uint8Array(await file.arrayBuffer()));
 const scene=new THREE.Scene(); scene.background=new THREE.Color("#f1f2f2");
 const camera=new THREE.OrthographicCamera(-10,10,10,-10,.01,100000);
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));host.replaceChildren(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0xc4c9c8,2.5));
 const sun=new THREE.DirectionalLight(0xffffff,1.5);sun.position.set(30,80,50);scene.add(sun);
 const root=new THREE.Group();scene.add(root);
 const objects=[],records=[],levels=new Set(["Todos"]),groups=new Set();
 const colorOverrides={...palette};
 function value(v){if(v==null)return "";return typeof v==="object" && "value" in v?String(v.value):String(v)}
 function line(id){try{return api.GetLine(modelID,id,false)||{}}catch{return {}}}
 const levelOf=new Map();
 try{
  const relationIDs=api.GetLineIDsWithType(modelID,IFC.IFCRELCONTAINEDINSPATIALSTRUCTURE);
  for(let i=0;i<relationIDs.size();i++){
   const rel=line(relationIDs.get(i)),parent=line(rel.RelatingStructure?.value);
   const type=api.GetNameFromTypeCode(parent.type||0)||"";
   if(!type.includes("BUILDINGSTOREY"))continue;
   const label=value(parent.Name)||"Sin nombre";
   levels.add(label);
   for(const e of rel.RelatedElements||[])if(e?.value!=null)levelOf.set(e.value,label);
  }
 }catch(e){console.warn("Sin niveles IFC exportados:",e)}
 // IFC type assignments contain the Revit type name, which may differ from
 // the family or element instance name. Prefer this for the maintenance list.
 const typeNames=new Map();
 try{
   const relations=api.GetLineIDsWithType(modelID,IFC.IFCRELDEFINESBYTYPE);
   for(let i=0;i<relations.size();i++){
     const relation=line(relations.get(i));
     const t=line(relation.RelatingType?.value);
     const typeName=value(t.Name)||value(t.ObjectType);
     if(!typeName)continue;
     for(const obj of relation.RelatedObjects||[]){
       if(obj?.value!=null)typeNames.set(obj.value,typeName);
     }
   }
 }catch(error){console.warn("No se pudo obtener la relación IFC de nombres de tipo:",error)}
 status("Construyendo geometría…");
 const meshesById=new Map();
 api.StreamAllMeshes(modelID,flat=>{
  const id=flat.expressID,info=line(id),type=api.GetNameFromTypeCode(info.type||0)||"Elemento IFC";
  const instanceName=value(info.Name),typeName=typeNames.get(id)||value(info.ObjectType);
  const name=typeName||instanceName||value(info.Tag)||type;
  const group=nameFor(type,instanceName||typeName||name);
  const level=levelOf.get(id)||"Sin nivel",category=categoryFor(type,instanceName||typeName||name,value(info.PredefinedType));
  groups.add(group);levels.add(level);
  const entry={id,name,instanceName,typeName,type,group,category,level,guid:value(info.GlobalId),tag:value(info.Tag),objects:[]};
  for(let i=0;i<flat.geometries.size();i++){
   const placed=flat.geometries.get(i),geometry=api.GetGeometry(modelID,placed.geometryExpressID);
   const vertex=api.GetVertexArray(geometry.GetVertexData(),geometry.GetVertexDataSize());
   const index=api.GetIndexArray(geometry.GetIndexData(),geometry.GetIndexDataSize());
   const pos=new Float32Array(vertex.length/2),norm=new Float32Array(vertex.length/2);
   for(let j=0,k=0;j<vertex.length;j+=6,k+=3){
    pos[k]=vertex[j];pos[k+1]=vertex[j+1];pos[k+2]=vertex[j+2];
    norm[k]=vertex[j+3];norm[k+1]=vertex[j+4];norm[k+2]=vertex[j+5];
   }
   const geo=new THREE.BufferGeometry();
   geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
   geo.setAttribute("normal",new THREE.BufferAttribute(norm,3));
   geo.setIndex(new THREE.BufferAttribute(new Uint32Array(index),1));
   const rgb=colorOverrides[group]||"#aaaaaa";
   const mat=new THREE.MeshLambertMaterial({color:rgb,side:THREE.DoubleSide,transparent:group==="Arquitectura",opacity:group==="Arquitectura"?.33:1,depthWrite:group!=="Arquitectura"});
   const mesh=new THREE.Mesh(geo,mat);
   mesh.applyMatrix4(new THREE.Matrix4().fromArray(Array.from(placed.flatTransformation)));
   mesh.userData.entry=entry;root.add(mesh);objects.push(mesh);entry.objects.push(mesh);
   // Cache element bounds once. Proximity checks never imply a verified MEP connection.
   geo.computeBoundingBox();
   const bounds=geo.boundingBox.clone().applyMatrix4(mesh.matrix);
   if(entry.bounds)entry.bounds.union(bounds);else entry.bounds=bounds;
   geometry.delete?.();
  }
  records.push(entry);meshesById.set(id,entry);
 });
 if(!records.length)throw new Error("El archivo no contiene geometría visible.");
 const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const maxSize=Math.max(size.x,size.y,size.z,1),distance=maxSize*2;
 // IFC exports may not expose the Revit connector graph. Show nearby elements
 // as a visual aid for technicians, not as hydraulically verified connections.
 function boxGapSquared(a,b){
   const dx=Math.max(0,a.min.x-b.max.x,b.min.x-a.max.x);
   const dy=Math.max(0,a.min.y-b.max.y,b.min.y-a.max.y);
   const dz=Math.max(0,a.min.z-b.max.z,b.min.z-a.max.z);
   return dx*dx+dy*dy+dz*dz;
 }
 function nearElements(entry,limit=14){
   if(entry && !entry.bounds)entry=records.find(x=>x.id===entry.id);
   if(!entry?.bounds)return [];
   const span=entry.bounds.getSize(new THREE.Vector3()).length();
   const searchRadius=Math.max(span*1.5,maxSize*.018);
   const radius2=searchRadius*searchRadius;
   return records.filter(candidate=>
     candidate.id!==entry.id && candidate.bounds &&
     candidate.group!=="Arquitectura" &&
     (entry.level==="Sin nivel"||candidate.level==="Sin nivel"||candidate.level===entry.level)
   ).map(candidate=>({entry:candidate,score:boxGapSquared(entry.bounds,candidate.bounds)}))
    .filter(x=>x.score<=radius2).sort((a,b)=>a.score-b.score)
    .slice(0,limit).map(x=>x.entry);
 }
 let nearbyIds=null;
 let yaw=Math.PI/4,pitch=Math.PI/5,zoom=1,active=false;
 function setCamera(mode="axo"){
  if(mode==="plan"){yaw=0;pitch=Math.PI/2-.001}else if(mode==="axo"){yaw=Math.PI/4;pitch=Math.PI/5}
  refreshCamera();
 }
 function refreshCamera(){
  camera.position.set(center.x+distance*Math.cos(pitch)*Math.sin(yaw),center.y+distance*Math.sin(pitch),center.z+distance*Math.cos(pitch)*Math.cos(yaw));
  camera.lookAt(center);const w=Math.max(host.clientWidth,100),h=Math.max(host.clientHeight,100),ratio=w/h,extent=maxSize*.73/zoom;
  camera.left=-extent*ratio;camera.right=extent*ratio;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);renderer.render(scene,camera);
 }
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 let down=null;
 const onDown=e=>{down={x:e.clientX,y:e.clientY};active=true;renderer.domElement.setPointerCapture(e.pointerId)};
 const onMove=e=>{if(!active||!down)return;if(!orbit)return;
  yaw-=(e.movementX||0)*.006;pitch=Math.max(-1.4,Math.min(1.5,pitch+(e.movementY||0)*.006));refreshCamera()};
 const onUp=e=>{active=false;if(!down)return;
  const delta=Math.abs(e.clientX-down.x)+Math.abs(e.clientY-down.y);down=null;if(delta>7)return;
  const r=renderer.domElement.getBoundingClientRect();
  mouse.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(objects.filter(o=>o.visible),false)[0];
  onSelect(hit?hit.object.userData.entry:null);
 };
 const onWheel=e=>{e.preventDefault();zoom=Math.max(.2,Math.min(8,zoom*(e.deltaY>0?.91:1.09)));refreshCamera()};
 let orbit=false;
 renderer.domElement.addEventListener("pointerdown",onDown);
 renderer.domElement.addEventListener("pointermove",onMove);
 renderer.domElement.addEventListener("pointerup",onUp);
 renderer.domElement.addEventListener("wheel",onWheel,{passive:false});
 cleanups.push(()=>{renderer.domElement.removeEventListener("pointerdown",onDown);renderer.domElement.removeEventListener("pointermove",onMove);renderer.domElement.removeEventListener("pointerup",onUp);renderer.domElement.removeEventListener("wheel",onWheel)});
 observer=new ResizeObserver(()=>refreshCamera());observer.observe(host);refreshCamera();
 const controller={
  levels:[...levels].filter(x=>x!=="Todos").sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),
  systems:[...groups].sort(),
  count:records.length,
  equipment:records.filter(entry=>entry.category==="equipment").map(({id,name,instanceName,typeName,type,group,category,level,guid,tag})=>({id,name,instanceName,typeName,type,group,category,level,guid,tag})),
  getNearby(entry){return nearElements(entry)},
  focusNearby(entry){
    if(!entry)return [];
    const nearby=nearElements(entry);
    nearbyIds=new Set([entry.id,...nearby.map(x=>x.id)]);
    applyFilters();
    return nearby;
  },
  clearNearby(){nearbyIds=null;applyFilters()},
  setView(mode){orbit=mode==="orbit";if(mode!=="orbit")setCamera(mode)},
  reset(){zoom=1;setCamera("axo")},
  setLevel(level){for(const o of objects){const e=o.userData.entry;o.visible=(level==="Todos"||e.level===level)&&(!visibleGroups||visibleGroups.has(e.group))}refreshCamera()},
  setSystems(ids){visibleGroups=new Set(ids);applyFilters()},
  setCategories(ids){visibleCategories=new Set(ids);applyFilters()},
  setColor(group,hex){colorOverrides[group]=hex;for(const o of objects)if(o.userData.entry.group===group)o.material.color.set(hex);refreshCamera()},
  dispose(){if(removed)return;removed=true;observer?.disconnect();cleanups.forEach(f=>f());for(const obj of objects){obj.geometry.dispose();obj.material.dispose()}renderer.dispose();host.replaceChildren();try{api.CloseModel(modelID)}catch{}}
 };
 let visibleGroups=null,visibleCategories=null,currentLevel="Todos";
 function applyFilters(){
   for(const o of objects){
     const e=o.userData.entry;
     const inFloor=currentLevel==="Todos"||currentLevel===e.level;
     const allowedGroup=!visibleGroups||visibleGroups.has(e.group);
     const nearAllowed=!nearbyIds||nearbyIds.has(e.id)||e.category==="architecture";
     const categoryAllowed=!visibleCategories||visibleCategories.has(e.category);
     o.visible=inFloor&&allowedGroup&&nearAllowed&&categoryAllowed;
   }
   refreshCamera();
 }
 controller.setLevel=level=>{currentLevel=level;applyFilters()};
 onModel({levels:controller.levels,systems:controller.systems,count:controller.count,equipment:controller.equipment});
 return controller;
 }catch(e){
  try{if(api&&modelID!=null)api.CloseModel(modelID)}catch{}
  try{renderer?.dispose()}catch{}
  host.replaceChildren();
  throw e;
 }
}
