
const cfg=window.SERWISOWETELE_CONFIG||{};
const db=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let mode='login',demoMode=false,currentOrg=null,currentMember=null,isPlatformAdmin=false,platformCompanies=[];
let customers=[],orders=[],prices=[],locations=[],orderHistory=[],selectedOrderId=null,inventoryProducts=[],inventoryMovements=[],orderParts=[],invoiceLines=[],calendarCursor=new Date(),calendarSelectedDate=new Date(),staffEntries=[];

const demoData={
  company:'Serwis GSM Nova',
  customers:[
    {id:'c1',full_name:'Anna Kowalska',phone:'501 202 303',email:'anna@example.pl'},
    {id:'c2',full_name:'Piotr Nowak',phone:'604 111 222',email:'piotr@example.pl'},
    {id:'c3',full_name:'Marek Zieliński',phone:'698 400 500',email:null}
  ],
  locations:[
    {id:'l1',name:'GSM Nova Centrum',address:'ul. Główna 12, Kraków',phone:'12 555 44 33',opening_hours:'Pon.–Pt. 9:00–18:00',maps_url:'#',is_active:true},
    {id:'l2',name:'GSM Nova Galeria',address:'al. Pokoju 5, Kraków',phone:'12 555 66 77',opening_hours:'Pon.–Sob. 10:00–20:00',maps_url:'#',is_active:true}
  ],
  prices:[
    {id:'p1',brand:'Apple',model:'iPhone 13',category:'Wyświetlacz',service:'Wymiana wyświetlacza — oryginał',price:899,is_visible:true},
    {id:'p2',brand:'Apple',model:'iPhone 13',category:'Bateria',service:'Wymiana baterii — zamiennik',price:249,is_visible:true},
    {id:'p3',brand:'Samsung',model:'Galaxy S23',category:'Port ładowania',service:'Wymiana portu ładowania',price:299,is_visible:true},
    {id:'p4',brand:'Xiaomi',model:'Redmi Note 13',category:'Wyświetlacz',service:'Wymiana wyświetlacza — zamiennik',price:349,is_visible:false}
  ],
  inventory:[
    {id:'i1',name:'Wyświetlacz iPhone 13 OLED',category:'Wyświetlacze',supplier_name:'PartsPro',supplier_sku:'LCD-IP13-OLED',ean:'5901234567001',shelf_location:'A3',quantity:5,reserved_quantity:1,min_stock:2,last_purchase_price:289,average_purchase_price:281,sale_price:399,active:true},
    {id:'i2',name:'Bateria iPhone 11',category:'Baterie',supplier_name:'MobileParts',supplier_sku:'BAT-IP11',ean:'5901234567002',shelf_location:'B1',quantity:10,reserved_quantity:0,min_stock:4,last_purchase_price:62,average_purchase_price:59,sale_price:119,active:true},
    {id:'i3',name:'Port ładowania Galaxy S23',category:'Porty',supplier_name:'PartsPro',supplier_sku:'PORT-S23',ean:'5901234567003',shelf_location:'C2',quantity:1,reserved_quantity:0,min_stock:3,last_purchase_price:38,average_purchase_price:37,sale_price:89,active:true}
  ],
  orders:[
    {id:'o1',order_number:'ST-2026-001245',customer_id:'c1',brand:'Apple',model:'iPhone 13',imei:'352099001234567',issue_description:'Rozbity ekran',status:'W naprawie',estimated_amount:899,device_condition:'Rysy na ramce, pęknięte szkło z przodu',internal_notes:'Sprawdzić Face ID przed wydaniem',warranty_months:6,accepted_date:'2026-08-01',scheduled_start:'2026-08-03T08:30:00',scheduled_end:'2026-08-03T10:30:00',priority:'urgent',event_type:'repair',created_at:'2026-08-01T09:15:00Z'},
    {id:'o2',order_number:'ST-2026-001246',customer_id:'c2',brand:'Samsung',model:'Galaxy S23',imei:'',issue_description:'Nie ładuje',status:'Gotowe do odbioru',estimated_amount:299,device_condition:'Ślady normalnego użytkowania',internal_notes:'Port mocno zabrudzony',warranty_months:3,accepted_date:'2026-08-01',scheduled_start:'2026-08-03T11:00:00',scheduled_end:'2026-08-03T11:30:00',priority:'normal',event_type:'pickup',created_at:'2026-08-01T10:30:00Z'},
    {id:'o3',order_number:'ST-2026-001247',customer_id:'c3',brand:'Xiaomi',model:'Redmi Note 13',imei:'',issue_description:'Brak obrazu',status:'Diagnoza',estimated_amount:0,device_condition:'Brak widocznych pęknięć',internal_notes:'Najpierw diagnostyka płyty',warranty_months:0,accepted_date:'2026-08-01',scheduled_start:'2026-08-04T09:00:00',scheduled_end:'2026-08-04T10:00:00',priority:'high',event_type:'diagnosis',created_at:'2026-08-01T11:45:00Z'},
    {id:'o4',order_number:'ST-2026-001241',customer_id:'c1',brand:'Apple',model:'iPhone 11',imei:'',issue_description:'Bateria',status:'Wydane',estimated_amount:229,device_condition:'Drobne rysy',internal_notes:'',warranty_months:3,accepted_date:'2026-07-31',created_at:'2026-07-31T08:30:00Z'}
  ]
};

function money(v){return new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(Number(v||0))}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function setMode(next){mode=next;const reg=mode==='register';$('registerFields').classList.toggle('hidden',!reg);$('formEyebrow').textContent=reg?'Utwórz konto firmowe':'Witaj ponownie';$('formTitle').textContent=reg?'Rejestracja firmy':'Logowanie';$('submitAuth').textContent=reg?'Załóż konto':'Zaloguj się';$('switchMode').textContent=reg?'Masz już konto? Zaloguj się':'Nie masz konta? Załóż konto firmowe';$('password').autocomplete=reg?'new-password':'current-password';$('authMessage').textContent=''}
function openAuth(next='login'){setMode(next);$('authDialog').showModal()}
function slugify(v){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
$('companyName').addEventListener('input',()=>{if(!$('companySlug').dataset.edited)$('companySlug').value=slugify($('companyName').value)});
$('companySlug').addEventListener('input',()=>{$('companySlug').dataset.edited='1'});

function showLanding(){$('dashboard').classList.add('hidden');$('landing').classList.remove('hidden');document.querySelector('.topbar').classList.remove('hidden')}
function showDashboard(){$('landing').classList.add('hidden');document.querySelector('.topbar').classList.add('hidden');$('dashboard').classList.remove('hidden')}
function showTab(name){
  document.querySelectorAll('.app-tab').forEach(x=>x.classList.toggle('active',x.id===`tab-${name}`));
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));
}
async function loadPlatformCompanies(){
  if(!isPlatformAdmin)return;
  const {data,error}=await db.rpc('platform_list_organizations');
  if(error){console.error(error);$('platformCompaniesTable').innerHTML=`<tr><td colspan="7" class="empty-row">${esc(error.message)}</td></tr>`;return}
  platformCompanies=data||[];renderPlatformCompanies();
}
function filteredPlatformCompanies(){
  const q=($('platformSearch')?.value||'').toLowerCase(),s=$('platformStatusFilter')?.value||'';
  return platformCompanies.filter(x=>(!q||`${x.company_name} ${x.owner_name} ${x.owner_email}`.toLowerCase().includes(q))&&(!s||x.company_status===s));
}
function renderPlatformCompanies(){
  $('platformAll').textContent=platformCompanies.length;
  $('platformPending').textContent=platformCompanies.filter(x=>x.company_status==='pending').length;
  $('platformActive').textContent=platformCompanies.filter(x=>['active','trial'].includes(x.company_status)).length;
  $('platformSuspended').textContent=platformCompanies.filter(x=>x.company_status==='suspended').length;
  const list=filteredPlatformCompanies();
  $('platformCompaniesTable').innerHTML=list.length?list.map(x=>`<tr>
    <td><b>${esc(x.company_name)}</b><br><small>${esc(x.company_slug)}</small></td>
    <td>${esc(x.owner_name)}<br><small>${esc(x.owner_email)}</small></td>
    <td><select class="platform-plan" data-plan-org="${x.organization_id}"><option value="start" ${x.plan_code==='start'?'selected':''}>Starter</option><option value="pro" ${x.plan_code==='pro'?'selected':''}>Pro</option><option value="business" ${x.plan_code==='business'?'selected':''}>Business</option></select></td>
    <td><span class="status-pill status-${esc(x.company_status)}">${esc(organizationStatusLabel(x.company_status))}</span></td>
    <td>${new Date(x.created_at).toLocaleDateString('pl-PL')}</td><td>${x.orders_count}</td>
    <td><div class="platform-actions"><button class="mini-btn activate" data-org-action="active" data-org-id="${x.organization_id}">Aktywuj</button><button class="mini-btn" data-org-action="trial" data-org-id="${x.organization_id}">Trial</button><button class="mini-btn suspend" data-org-action="suspended" data-org-id="${x.organization_id}">Zawieś</button><button class="mini-btn danger" data-org-action="cancelled" data-org-id="${x.organization_id}">Anuluj</button></div></td>
  </tr>`).join(''):'<tr><td colspan="7" class="empty-row">Brak firm.</td></tr>';
}
async function setPlatformOrganizationStatus(id,status){
  const reason=status==='suspended'?prompt('Powód zawieszenia (opcjonalnie):','')||'':null;
  const {error}=await db.rpc('platform_set_organization_status',{target_organization_id:id,new_status:status,reason});
  if(error)return alert(error.message);await loadPlatformCompanies();
}
async function setPlatformOrganizationPlan(id,plan){
  const {error}=await db.rpc('platform_set_organization_plan',{target_organization_id:id,new_plan_code:plan});
  if(error)return alert(error.message);await loadPlatformCompanies();
}
function customerById(id){return customers.find(x=>String(x.id)===String(id))}
function statusClass(s){return s==='Gotowe do odbioru'?'ready':s==='Oczekiwanie na część'?'wait':''}


function organizationStatusLabel(status){
  return ({pending:'Oczekuje na aktywację',trial:'Okres próbny',active:'Aktywne',past_due:'Zaległa płatność',suspended:'Zawieszone',cancelled:'Anulowane',demo:'Demo'})[status]||status||'—';
}
function planLabel(code){return ({start:'Starter',pro:'Pro',business:'Business'})[code]||code||'Starter'}
function showPendingState(){
  document.querySelectorAll('.nav-btn:not(#platformAdminNav)').forEach(b=>b.classList.add('hidden'));
  $('platformAdminNav')?.classList.toggle('hidden',!isPlatformAdmin);
  $('pendingCompany').textContent=currentOrg?.name||'—';
  $('pendingPlan').textContent=planLabel(currentOrg?.requested_plan_code);
  $('pendingStatus').textContent=organizationStatusLabel(currentOrg?.status);
  $('pendingMessage').textContent=currentOrg?.status==='suspended'
    ?'Konto zostało zawieszone przez administratora platformy. Skontaktuj się z obsługą SerwisoweTele.'
    :currentOrg?.status==='past_due'
      ?'Dostęp jest wstrzymany z powodu nieopłaconego abonamentu.'
      :currentOrg?.status==='cancelled'
        ?'Abonament został zakończony. Skontaktuj się z obsługą, aby wznowić dostęp.'
        :'Po zatwierdzeniu przez administratora wszystkie funkcje zostaną automatycznie odblokowane.';
  showTab('pending');
}
function restoreCompanyNavigation(){
  document.querySelectorAll('.nav-btn:not(#platformAdminNav)').forEach(b=>b.classList.remove('hidden'));
  $('platformAdminNav')?.classList.toggle('hidden',!isPlatformAdmin);
}

async function loadCompany(){
  if(demoMode)return;
  const {data:sessionData}=await db.auth.getSession();const session=sessionData.session;
  if(!session){showLanding();return}

  await db.rpc('claim_my_staff_invitations');
  const {data:adminFlag}=await db.rpc('is_platform_admin');
  isPlatformAdmin=Boolean(adminFlag);
  $('platformAdminNav')?.classList.toggle('hidden',!isPlatformAdmin);

  const {data:members,error}=await db.from('organization_members').select('organization_id,role,display_name,organizations(id,name,status,trial_ends_at,requested_plan_code,contact_phone,tax_id)').eq('user_id',session.user.id).eq('active',true).limit(1);
  if(error){console.error(error);showLanding();return}
  let m=members?.[0];

  if(!m){
    const meta=session.user.user_metadata||{};
    if(meta.pending_company_name){
      const {error:regError}=await db.rpc('register_my_organization',{
        company_name:meta.pending_company_name,
        company_slug:meta.pending_company_slug||slugify(meta.pending_company_name),
        owner_display_name:meta.display_name||'',
        company_phone:meta.pending_company_phone||'',
        company_tax_id:meta.pending_company_tax_id||'',
        plan_code:meta.pending_plan_code||'start'
      });
      if(regError){showLanding();openAuth('login');$('authMessage').textContent=regError.message;return}
      return loadCompany();
    }
    showLanding();openAuth('register');$('authMessage').textContent='Uzupełnij dane firmy, aby zakończyć rejestrację.';return
  }

  currentMember=m;currentOrg=m.organizations;
  $('companyTitle').textContent=currentOrg?.name||'Twoja firma';
  $('trialBadge').classList.remove('hidden');
  $('trialBadge').textContent=organizationStatusLabel(currentOrg?.status);
  $('demoBadge').classList.add('hidden');$('panelEyebrow').textContent=isPlatformAdmin?'Właściciel platformy':'Panel właściciela';
  showDashboard();

  if(!['active','trial'].includes(currentOrg?.status)){
    showPendingState();
    return;
  }

  restoreCompanyNavigation();showTab('home');await loadAll();
  if(isPlatformAdmin)loadPlatformCompanies();
}
async function loadAll(){
  const oid=currentOrg?.id;if(!oid)return;
  const [c,o,p,l,s,h,ip,im,op,st]=await Promise.all([
    db.from('customers').select('*').eq('organization_id',oid).order('created_at',{ascending:false}),
    db.from('service_orders').select('*').eq('organization_id',oid).order('created_at',{ascending:false}),
    db.from('price_items').select('*').eq('organization_id',oid).order('brand').order('model'),
    db.from('service_locations').select('*').eq('organization_id',oid).order('created_at'),
    db.from('organization_settings').select('*').eq('organization_id',oid).maybeSingle(),
    db.from('order_history').select('*').eq('organization_id',oid).order('created_at',{ascending:false}),
    db.from('inventory_products').select('*').eq('organization_id',oid).order('name'),
    db.from('inventory_movements').select('*').eq('organization_id',oid).order('created_at',{ascending:false}).limit(100),
    db.from('order_parts').select('*').eq('organization_id',oid).order('created_at',{ascending:false}),
    db.rpc('staff_list',{target_organization_id:oid})
  ]);
  [c,o,p,l,h,ip,im,op,st].forEach(r=>{if(r.error)console.error(r.error)});
  customers=c.data||[];orders=o.data||[];prices=p.data||[];locations=l.data||[];orderHistory=h.data||[];inventoryProducts=ip.data||[];inventoryMovements=im.data||[];orderParts=op.data||[];staffEntries=st.data||[];
  if(s.data){$('settingsPublicName').value=s.data.public_name||'';$('settingsPhone').value=s.data.phone||'';$('settingsEmail').value=s.data.email||'';$('settingsDescription').value=s.data.public_description||''}
  renderAll();
}
function enterDemo(){
  demoMode=true;currentOrg={id:'demo',name:demoData.company,status:'demo'};currentMember={role:'owner',display_name:'Użytkownik Demo'};
  customers=structuredClone(demoData.customers);orders=structuredClone(demoData.orders);prices=structuredClone(demoData.prices);locations=structuredClone(demoData.locations);inventoryProducts=structuredClone(demoData.inventory);inventoryMovements=[{id:'m1',product_id:'i1',movement_type:'purchase',quantity:5,unit_cost:289,reference_number:'FV/88/2026',created_at:'2026-08-01T08:00:00Z'},{id:'m2',product_id:'i1',movement_type:'reservation',quantity:-1,unit_cost:289,reference_number:'ST-2026-001245',created_at:'2026-08-01T09:30:00Z'}];orderParts=[{id:'op1',order_id:'o1',product_id:'i1',quantity:1,status:'reserved',unit_cost:289}];staffEntries=[{entry_type:'member',entry_id:'sm1',display_name:'Kamil Nowak',email:'kamil@example.pl',role:'technician',active:true},{entry_type:'member',entry_id:'sm2',display_name:'Anna Wiśniewska',email:'anna@example.pl',role:'manager',active:true},{entry_type:'invitation',entry_id:'si1',display_name:'Marek Zieliński',email:'marek@example.pl',role:'employee',active:false}];
  $('companyTitle').textContent=demoData.company;$('trialBadge').classList.add('hidden');$('demoBadge').classList.remove('hidden');$('panelEyebrow').textContent='Panel demonstracyjny';
  $('demoDialog').close();showDashboard();renderAll();
}
function renderAll(){renderMetrics();renderOrders();renderCustomers();renderPrices();renderInventory();renderLocations();renderStaff();renderCalendar();populateOrderSelects()}
function dashboardRange(){
  const value=$('dashboardPeriod')?.value||'30',now=new Date(),start=new Date(0);
  if(value==='today'){start=new Date(now.getFullYear(),now.getMonth(),now.getDate())}
  else if(value==='7'||value==='30'){start=new Date(now);start.setDate(start.getDate()-Number(value)+1);start.setHours(0,0,0,0)}
  else if(value==='month'){start=new Date(now.getFullYear(),now.getMonth(),1)}
  return {start,end:now};
}
function orderDate(order){return new Date(order.accepted_date?`${order.accepted_date}T12:00:00`:order.created_at)}
function renderMetrics(){
  const {start,end}=dashboardRange(),periodOrders=orders.filter(o=>{const d=orderDate(o);return d>=start&&d<=end});
  const revenue=periodOrders.filter(o=>!['Anulowane'].includes(o.status)).reduce((a,x)=>a+Number(x.estimated_amount||0),0);
  const usedPartCost=orderParts.filter(p=>p.status==='used'&&periodOrders.some(o=>String(o.id)===String(p.order_id))).reduce((a,p)=>a+Number(p.unit_cost||0)*Number(p.quantity||0),0);
  const ready=orders.filter(x=>x.status==='Gotowe do odbioru');
  const closed=orders.filter(x=>x.status==='Wydane');
  const durations=closed.map(o=>(new Date(o.updated_at||o.created_at)-new Date(o.created_at))/86400000).filter(x=>x>=0&&Number.isFinite(x));
  $('metricRevenue').textContent=money(revenue);
  $('metricProfit').textContent=money(Math.max(0,revenue-usedPartCost));
  $('metricNewOrders').textContent=periodOrders.length;
  $('metricAverageOrder').textContent=`Średnio ${money(periodOrders.length?revenue/periodOrders.length:0)} / zlecenie`;
  $('metricReadyOrders').textContent=ready.length;
  $('metricReadyValue').textContent=`${money(ready.reduce((a,o)=>a+Number(o.estimated_amount||0),0))} oczekuje na odbiór`;
  $('metricOpenOrders').textContent=orders.filter(x=>!['Wydane','Anulowane'].includes(x.status)).length;
  $('metricAvgDuration').textContent=durations.length?`${(durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(1)} dni`:'—';
  $('metricRevenueChange').textContent=$('dashboardPeriod').selectedOptions[0].textContent;

  const statuses=['Przyjęte','Oczekuje na diagnozę','Diagnoza','Oczekuje na akceptację klienta','Zaakceptowane','Oczekuje na część','W naprawie','Testy końcowe','Gotowe do odbioru','Wydane','Anulowane','Reklamacja'];
  $('statusSummary').innerHTML=statuses.map(s=>`<div><span>${s}</span><b>${orders.filter(o=>o.status===s).length}</b></div>`).join('');

  $('recentOrders').innerHTML=orders.slice(0,6).map(o=>`<div class="status-summary"><div><span>${esc(o.order_number)} · ${esc(o.brand)} ${esc(o.model)}</span><b>${esc(o.status)}</b></div></div>`).join('')||'<p class="empty-row">Brak zleceń.</p>';

  const attention=[];
  const now=new Date();
  const overdue=orders.filter(o=>o.due_date&&!['Wydane','Anulowane'].includes(o.status)&&new Date(`${o.due_date}T23:59:59`)<now);
  const waiting=orders.filter(o=>o.status==='Oczekuje na część');
  const oldReady=ready.filter(o=>(now-new Date(o.updated_at||o.created_at))/86400000>3);
  const lowStock=inventoryProducts.filter(p=>Number(p.quantity||0)-Number(p.reserved_quantity||0)<=Number(p.min_stock||0));
  if(overdue.length)attention.push(['⏰','Przekroczone terminy',`${overdue.length} zleceń`]);
  if(waiting.length)attention.push(['📦','Oczekuje na części',`${waiting.length} zleceń`]);
  if(oldReady.length)attention.push(['📱','Nieodebrane urządzenia',`${oldReady.length} powyżej 3 dni`]);
  if(lowStock.length)attention.push(['⚠️','Niski stan magazynu',`${lowStock.length} produktów`]);
  if(!attention.length)attention.push(['✓','Wszystko pod kontrolą','Brak pilnych spraw']);
  $('attentionList').innerHTML=attention.map(a=>`<div class="attention-item"><span class="attention-icon">${a[0]}</span><div class="attention-copy"><b>${a[1]}</b><span>${a[2]}</span></div></div>`).join('');

  const countBy=(keyFn)=>Object.entries(orders.reduce((m,o)=>{const k=keyFn(o)||'Nieokreślone';m[k]=(m[k]||0)+1;return m},{})).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const renderRank=(id,rows)=>{$(id).innerHTML=rows.length?rows.map(([n,c],i)=>`<div class="ranking-item"><span>${i+1}. ${esc(n)}</span><b>${c}</b></div>`).join(''):'<p class="empty-row">Brak danych.</p>'};
  renderRank('topModels',countBy(o=>`${o.brand} ${o.model}`));
  renderRank('topIssues',countBy(o=>(o.issue_description||'').split(/[,.;-]/)[0].trim().slice(0,45)));

  const days=[];
  for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);d.setHours(0,0,0,0);const next=new Date(d);next.setDate(next.getDate()+1);const list=orders.filter(o=>{const x=orderDate(o);return x>=d&&x<next});days.push({d,value:list.reduce((a,o)=>a+Number(o.estimated_amount||0),0),count:list.length})}
  const max=Math.max(1,...days.map(x=>x.value));
  $('revenueChart').innerHTML=days.map(x=>`<div class="chart-column"><div class="chart-bar" data-value="${money(x.value)} · ${x.count} zlec." style="height:${Math.max(3,x.value/max*100)}%"></div><small>${x.d.toLocaleDateString('pl-PL',{day:'2-digit',month:'2-digit'})}</small></div>`).join('');

  const upcoming=orders.filter(o=>o.scheduled_start&&new Date(o.scheduled_start)>=new Date(new Date().setHours(0,0,0,0))).sort((a,b)=>new Date(a.scheduled_start)-new Date(b.scheduled_start)).slice(0,6);
  $('upcomingSchedule').innerHTML=upcoming.length?upcoming.map(o=>`<div class="upcoming-item clickable-row" data-dashboard-order="${o.id}"><div><b>${new Date(o.scheduled_start).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</b><br><span>${esc(o.order_number)} · ${esc(o.brand)} ${esc(o.model)}</span></div><span>${esc(o.status)}</span></div>`).join(''):'<p class="empty-row">Brak zaplanowanych zleceń.</p>';
}
function filteredOrders(){const q=$('orderSearch').value.toLowerCase(),s=$('orderStatusFilter').value;return orders.filter(o=>{const c=customerById(o.customer_id);return(!q||`${o.order_number} ${c?.full_name||''} ${o.brand} ${o.model} ${o.imei||''}`.toLowerCase().includes(q))&&(!s||o.status===s)})}
function renderOrders(){const list=filteredOrders();$('ordersTable').innerHTML=list.length?list.map(o=>{const c=customerById(o.customer_id);return`<tr class="clickable-row" data-order-id="${o.id}"><td><span class="row-link">${esc(o.order_number)}</span></td><td>${esc(c?.full_name||'—')}</td><td>${esc(o.brand)} ${esc(o.model)}</td><td><span class="status-pill ${statusClass(o.status)}">${esc(o.status)}</span></td><td>${money(o.estimated_amount)}</td><td>${new Date(o.created_at).toLocaleDateString('pl-PL')}</td><td class="action-cell"><button class="table-action" data-open-order="${o.id}">Otwórz</button></td></tr>`}).join(''):'<tr><td colspan="7" class="empty-row">Brak zleceń.</td></tr>'}
function renderCustomers(){$('customersTable').innerHTML=customers.length?customers.map(c=>{const co=orders.filter(o=>String(o.customer_id)===String(c.id));return`<tr><td>${esc(c.full_name)}</td><td>${esc(c.phone)}</td><td>${esc(c.email||'—')}</td><td>${co.length}</td><td>${money(co.reduce((a,o)=>a+Number(o.estimated_amount||0),0))}</td></tr>`}).join(''):'<tr><td colspan="5" class="empty-row">Brak klientów.</td></tr>'}
function filteredPrices(){const q=$('priceSearch').value.toLowerCase(),v=$('priceVisibilityFilter').value;return prices.filter(p=>(!q||`${p.brand} ${p.model} ${p.category} ${p.service}`.toLowerCase().includes(q))&&(!v||String(p.is_visible)===v))}
function renderPrices(){$('pricesTable').innerHTML=filteredPrices().map(p=>`<tr><td>${esc(p.brand)}</td><td>${esc(p.model)}</td><td>${esc(p.category)}</td><td>${esc(p.service)}</td><td>${money(p.price)}</td><td><span class="status-pill ${p.is_visible?'ready':'wait'}">${p.is_visible?'Aktywna':'Ukryta'}</span></td></tr>`).join('')||'<tr><td colspan="6" class="empty-row">Brak pozycji cennika.</td></tr>'}
function renderLocations(){$('locationsGrid').innerHTML=locations.length?locations.map(l=>`<article class="location-card"><span class="card-badge">${l.is_active!==false?'Aktywna':'Ukryta'}</span><h3>${esc(l.name)}</h3><p>📍 ${esc(l.address)}</p>${l.opening_hours?`<p>🕒 ${esc(l.opening_hours)}</p>`:''}${l.phone?`<p>☎ ${esc(l.phone)}</p>`:''}</article>`).join(''):'<p class="empty-row">Brak lokalizacji.</p>'}
function roleLabel(role){return ({owner:'Właściciel',admin:'Administrator firmy',manager:'Kierownik',technician:'Serwisant',employee:'Pracownik'})[role]||role||'Pracownik'}
function renderStaff(){
  const entries=demoMode?staffEntries:staffEntries;
  $('staffGrid').innerHTML=entries.length?entries.map(s=>`<article class="staff-card ${s.entry_type==='invitation'?'staff-pending':'staff-active'}">
    <span class="card-badge">${s.entry_type==='invitation'?'Oczekuje na rejestrację':'Aktywny'}</span>
    <h3>${esc(s.display_name||s.email||'Pracownik')}</h3>
    <div class="staff-meta"><span>${esc(s.email||'—')}</span><span>Rola: <b>${esc(roleLabel(s.role))}</b></span></div>
    ${!demoMode&&currentMember?.role==='owner'&&s.role!=='owner'?`<div class="staff-actions"><button class="mini-btn danger" data-remove-staff="${s.entry_id}" data-staff-type="${s.entry_type}">${s.entry_type==='invitation'?'Anuluj zaproszenie':'Usuń dostęp'}</button></div>`:''}
  </article>`).join(''):'<article class="staff-card"><h3>Brak pracowników</h3><p>Dodaj pierwszą osobę do zespołu.</p></article>';
}
function populateOrderSelects(){$('orderLocation').innerHTML='<option value="">Bez przypisania</option>'+locations.map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('')}



function dateKey(v){const d=v instanceof Date?v:new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function calendarEventClass(o){
  if(o.priority==='urgent')return `${o.event_type||'repair'} urgent`;
  if(o.status==='Oczekuje na część'||o.status==='Oczekuje na akceptację klienta')return 'waiting';
  if(o.status==='Gotowe do odbioru')return 'ready';
  return o.event_type||'repair';
}
function scheduledOrders(){return orders.filter(o=>o.scheduled_start).sort((a,b)=>new Date(a.scheduled_start)-new Date(b.scheduled_start))}
function renderCalendar(){
  if(!$('calendarGrid'))return;
  const year=calendarCursor.getFullYear(),month=calendarCursor.getMonth();
  $('calendarTitle').textContent=new Date(year,month,1).toLocaleDateString('pl-PL',{month:'long',year:'numeric'});
  const first=new Date(year,month,1),offset=(first.getDay()+6)%7,start=new Date(year,month,1-offset);
  const scheduled=scheduledOrders();
  let html='';
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const key=dateKey(d);
    const list=scheduled.filter(o=>dateKey(o.scheduled_start)===key);
    const cls=['calendar-day',d.getMonth()!==month?'outside':'',key===dateKey(new Date())?'today':'',key===dateKey(calendarSelectedDate)?'selected':''].filter(Boolean).join(' ');
    html+=`<div class="${cls}" data-calendar-date="${key}"><div class="calendar-date"><span>${d.getDate()}</span>${list.length?`<span class="calendar-count">${list.length}</span>`:''}</div>${list.slice(0,3).map(o=>`<span class="calendar-event ${calendarEventClass(o)}" data-calendar-order="${o.id}">${new Date(o.scheduled_start).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})} ${esc(o.brand)} ${esc(o.model)}</span>`).join('')}${list.length>3?`<span class="calendar-event">+${list.length-3} więcej</span>`:''}</div>`;
  }
  $('calendarGrid').innerHTML=html;renderCalendarAgenda();
}
function renderCalendarAgenda(){
  const key=dateKey(calendarSelectedDate),list=scheduledOrders().filter(o=>dateKey(o.scheduled_start)===key);
  $('agendaTitle').textContent=`Zlecenia: ${calendarSelectedDate.toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'})}`;
  $('calendarAgenda').innerHTML=list.length?list.map(o=>{const c=customerById(o.customer_id);return`<div class="agenda-row" data-agenda-order="${o.id}"><b class="agenda-time">${new Date(o.scheduled_start).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</b><div class="agenda-main"><b>${esc(o.order_number)} · ${esc(o.brand)} ${esc(o.model)}</b><span>${esc(c?.full_name||'—')} · ${esc(o.status)}</span></div><span class="status-pill ${statusClass(o.status)}">${esc(o.event_type||'Naprawa')}</span></div>`}).join(''):'<p class="empty-row">Brak zaplanowanych zleceń na ten dzień.</p>';
}
function openNewOrderForDate(date){
  if(guardDemo())return;
  fillOrderForm();
  const local=new Date(date);local.setHours(9,0,0,0);
  $('orderScheduledStart').value=toLocalInput(local);
  const end=new Date(local);end.setHours(10,0,0,0);$('orderScheduledEnd').value=toLocalInput(end);
  $('orderDialog').showModal();
}
function toLocalInput(value){if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function fromLocalInput(value){return value?new Date(value).toISOString():null}


function normalizedPhone(v){return String(v||'').replace(/\D/g,'')}
function customerSearchText(c){return `${c.full_name||''} ${c.phone||''} ${c.email||''}`.toLowerCase()}
function renderCustomerSuggestions(){
  const field=$('orderCustomerSearch'),box=$('orderCustomerSuggestions');if(!field||!box)return;
  const q=field.value.trim().toLowerCase(),digits=normalizedPhone(q);
  if(!q||$('orderCustomerId').value){box.classList.add('hidden');box.innerHTML='';return}
  const matches=customers.filter(c=>customerSearchText(c).includes(q)||(digits&&normalizedPhone(c.phone).includes(digits))).slice(0,8);
  if(!matches.length){box.innerHTML='<div class="customer-suggestion"><div><b>Nowy klient</b><span>Uzupełnij telefon i e-mail, a klient zapisze się automatycznie.</span></div></div>';box.classList.remove('hidden');return}
  box.innerHTML=matches.map(c=>`<button class="customer-suggestion" type="button" data-customer-choice="${c.id}"><div><b>${esc(c.full_name)}</b><span>${esc(c.phone||'—')} · ${esc(c.email||'brak e-maila')}</span></div><strong>Wybierz</strong></button>`).join('');
  box.classList.remove('hidden');
}
function selectOrderCustomer(id){
  const c=customerById(id);if(!c)return;
  $('orderCustomerId').value=c.id;$('orderCustomerSearch').value=c.full_name||'';$('orderCustomerPhone').value=c.phone||'';$('orderCustomerEmail').value=c.email||'';$('orderCustomerSuggestions').classList.add('hidden');
}
function clearOrderCustomer(){
  $('orderCustomerId').value='';$('orderCustomerSearch').value='';$('orderCustomerPhone').value='';$('orderCustomerEmail').value='';$('orderCustomerSuggestions').classList.add('hidden');
}
async function resolveOrderCustomer(){
  const existingId=$('orderCustomerId').value;
  const name=$('orderCustomerSearch').value.trim(),phone=$('orderCustomerPhone').value.trim(),email=$('orderCustomerEmail').value.trim();
  if(!name||!phone)throw new Error('Podaj imię i nazwisko oraz telefon klienta.');
  if(existingId){
    const current=customerById(existingId);
    const changed=current&&(current.full_name!==name||String(current.phone||'')!==phone||String(current.email||'')!==email);
    if(changed){
      const {data,error}=await db.from('customers').update({full_name:name,phone,email:email||null}).eq('id',existingId).eq('organization_id',currentOrg.id).select().single();
      if(error)throw error;
      const i=customers.findIndex(c=>String(c.id)===String(existingId));if(i>=0)customers[i]=data;
    }
    return existingId;
  }
  const same=customers.find(c=>(email&&String(c.email||'').toLowerCase()===email.toLowerCase())||(normalizedPhone(c.phone)&&normalizedPhone(c.phone)===normalizedPhone(phone)));
  if(same){selectOrderCustomer(same.id);return same.id}
  const {data,error}=await db.from('customers').insert({organization_id:currentOrg.id,full_name:name,phone,email:email||null}).select().single();
  if(error)throw error;
  customers.unshift(data);return data.id;
}

function locationById(id){return locations.find(x=>String(x.id)===String(id))}
function demoHistoryFor(order){
  return [
    {event_type:'created',description:`Utworzono zlecenie ze statusem: ${order.status==='Wydane'?'Przyjęte':order.status}`,created_at:order.created_at},
    ...(order.status==='Wydane'?[{event_type:'status_changed',description:'Zmieniono status na „Wydane”',created_at:'2026-08-01T14:00:00Z'}]:[])
  ];
}
async function openOrderDetails(id){
  const order=orders.find(x=>String(x.id)===String(id));if(!order)return;
  selectedOrderId=order.id;
  const c=customerById(order.customer_id),l=locationById(order.location_id);
  $('detailsOrderNumber').textContent=order.order_number;setTimeout(()=>{if(window.JsBarcode)JsBarcode('#detailsBarcode',order.order_number,{format:'CODE128',height:48,width:2,displayValue:true,fontSize:13,margin:4})},0);
  $('detailsStatus').textContent=order.status;$('detailsStatus').className=`status-pill ${statusClass(order.status)}`;
  $('detailsCustomer').textContent=c?.full_name||'Brak klienta';$('detailsContact').textContent=[c?.phone,c?.email].filter(Boolean).join(' · ')||'—';
  $('detailsDevice').textContent=`${order.brand} ${order.model}`;$('detailsImei').textContent=order.imei?`IMEI/SN: ${order.imei}`:'Brak IMEI / numeru seryjnego';
  $('detailsAmount').textContent=money(order.estimated_amount);$('detailsDue').textContent=order.due_date?`Termin: ${new Date(order.due_date).toLocaleDateString('pl-PL')}`:'Bez ustalonego terminu';
  $('detailsLocation').textContent=l?.name||'Bez przypisania';$('detailsWarranty').textContent=`Gwarancja: ${Number(order.warranty_months||0)} mies.`;
  $('detailsIssue').textContent=order.issue_description||'—';$('detailsCondition').textContent=order.device_condition||'Nie podano';$('detailsInternalNotes').textContent=order.internal_notes||'Brak notatki';
  let history=demoMode?demoHistoryFor(order):orderHistory.filter(h=>String(h.order_id)===String(order.id));
  if(!demoMode&&history.length===0){
    const {data}=await db.from('order_history').select('*').eq('order_id',order.id).order('created_at',{ascending:false});
    history=data||[];
  }
  renderOrderParts(order.id);$('detailsHistory').innerHTML=history.length?history.map(h=>`<div class="timeline-item"><strong>${esc(h.description)}</strong><span>${new Date(h.created_at).toLocaleString('pl-PL')}</span></div>`).join(''):'<p class="empty-row">Brak zapisanej historii.</p>';
  $('orderDetailsDialog').showModal();
}
function fillOrderForm(order=null){
  $('orderForm').reset();$('orderError').textContent='';populateOrderSelects();
  $('orderId').value=order?.id||'';$('orderFormTitle').textContent=order?'Edytuj zlecenie':'Nowe zlecenie';$('orderSubmitButton').textContent=order?'Zapisz zmiany':'Utwórz zlecenie';
  if(order){
    const selectedCustomer=customerById(order.customer_id);$('orderCustomerId').value=order.customer_id||'';$('orderCustomerSearch').value=selectedCustomer?.full_name||'';$('orderCustomerPhone').value=selectedCustomer?.phone||'';$('orderCustomerEmail').value=selectedCustomer?.email||'';$('orderLocation').value=order.location_id||'';$('orderBrand').value=order.brand||'';$('orderModel').value=order.model||'';$('orderImei').value=order.imei||'';$('orderStatus').value=order.status||'Przyjęte';$('orderIssue').value=order.issue_description||'';$('orderCondition').value=order.device_condition||'';$('orderInternalNotes').value=order.internal_notes||'';$('orderAmount').value=Number(order.estimated_amount||0);$('orderDueDate').value=order.due_date||'';$('orderWarranty').value=Number(order.warranty_months??3);$('orderAcceptedDate').value=order.accepted_date||'';$('orderScheduledStart').value=toLocalInput(order.scheduled_start);$('orderScheduledEnd').value=toLocalInput(order.scheduled_end);$('orderPriority').value=order.priority||'normal';$('orderEventType').value=order.event_type||'repair';
  }else{
    clearOrderCustomer();$('orderWarranty').value=3;$('orderAcceptedDate').value=new Date().toISOString().slice(0,10);$('orderPriority').value='normal';$('orderEventType').value='repair';
  }
}
function editSelectedOrder(){
  if(guardDemo())return;
  const order=orders.find(x=>String(x.id)===String(selectedOrderId));if(!order)return;
  $('orderDetailsDialog').close();fillOrderForm(order);$('orderDialog').showModal();
}
function printSelectedOrder(){
  const order=orders.find(x=>String(x.id)===String(selectedOrderId));if(!order)return;
  const c=customerById(order.customer_id),l=locationById(order.location_id);
  const sheet=document.createElement('section');sheet.id='printSheet';
  sheet.innerHTML=`<h1>Potwierdzenie przyjęcia urządzenia</h1><h2>${esc(order.order_number)}</h2><hr><p><b>Serwis:</b> ${esc(currentOrg?.name||'SerwisoweTele')}</p><p><b>Lokalizacja:</b> ${esc(l?.name||'—')} ${l?.address?`— ${esc(l.address)}`:''}</p><h3>Klient</h3><p>${esc(c?.full_name||'—')}<br>${esc(c?.phone||'')} ${c?.email?`<br>${esc(c.email)}`:''}</p><h3>Urządzenie</h3><p><b>${esc(order.brand)} ${esc(order.model)}</b><br>IMEI/SN: ${esc(order.imei||'—')}</p><h3>Opis usterki</h3><p>${esc(order.issue_description||'—')}</p><h3>Stan urządzenia</h3><p>${esc(order.device_condition||'Nie podano')}</p><p><b>Wstępna wycena:</b> ${money(order.estimated_amount)}<br><b>Status:</b> ${esc(order.status)}<br><b>Termin:</b> ${order.due_date?new Date(order.due_date).toLocaleDateString('pl-PL'):'do ustalenia'}<br><b>Gwarancja:</b> ${Number(order.warranty_months||0)} mies.</p><div style="margin-top:55px;display:flex;justify-content:space-between;gap:50px"><span>____________________<br>Podpis klienta</span><span>____________________<br>Podpis serwisu</span></div>`;
  document.body.appendChild(sheet);window.print();sheet.remove();
}


function inventoryAvailable(p){return Number(p.quantity||0)-Number(p.reserved_quantity||0)}
function filteredInventory(){const q=$('inventorySearch').value.toLowerCase(),f=$('inventoryStockFilter').value;return inventoryProducts.filter(p=>{const available=inventoryAvailable(p);const text=`${p.name} ${p.supplier_sku||''} ${p.ean||''} ${p.supplier_name||''} ${p.shelf_location||''}`.toLowerCase();return(!q||text.includes(q))&&(!f||(f==='low'&&available<=Number(p.min_stock||0))||(f==='available'&&available>0)||(f==='zero'&&available<=0))})}
function renderInventory(){const list=filteredInventory();$('inventoryProductCount').textContent=inventoryProducts.length;$('inventoryValue').textContent=money(inventoryProducts.reduce((a,p)=>a+Number(p.quantity||0)*Number(p.average_purchase_price||p.last_purchase_price||0),0));$('inventoryLowCount').textContent=inventoryProducts.filter(p=>inventoryAvailable(p)<=Number(p.min_stock||0)).length;$('inventoryReservedCount').textContent=inventoryProducts.reduce((a,p)=>a+Number(p.reserved_quantity||0),0);$('inventoryTable').innerHTML=list.length?list.map(p=>{const av=inventoryAvailable(p),cls=av<=0?'stock-zero':av<=Number(p.min_stock||0)?'stock-low':'stock-ok';return`<tr><td><b>${esc(p.name)}</b><br><small>${esc(p.category||'')}</small></td><td>${esc(p.supplier_sku||'—')}<br><small>${esc(p.ean||'')}</small></td><td class="${cls}">${av}</td><td>${Number(p.reserved_quantity||0)}</td><td>${money(p.last_purchase_price)}</td><td>${money(p.sale_price)}</td><td>${esc(p.shelf_location||'—')}</td><td><button class="table-action" data-edit-inventory="${p.id}">Edytuj</button></td></tr>`}).join(''):'<tr><td colspan="8" class="empty-row">Brak produktów.</td></tr>';$('inventoryMovements').innerHTML=inventoryMovements.slice(0,15).map(m=>{const p=inventoryProducts.find(x=>String(x.id)===String(m.product_id));const incoming=Number(m.quantity)>0;return`<div class="movement-row"><b class="${incoming?'movement-in':'movement-out'}">${incoming?'+':''}${m.quantity}</b><span>${esc(p?.name||'Produkt')}</span><span>${esc(m.movement_type)}</span><span>${esc(m.reference_number||new Date(m.created_at).toLocaleDateString('pl-PL'))}</span></div>`}).join('')||'<p class="empty-row">Brak ruchów magazynowych.</p>'}
function openInventoryForm(p=null){if(guardDemo())return;$('inventoryForm').reset();$('inventoryId').value=p?.id||'';$('inventoryFormTitle').textContent=p?'Edytuj produkt':'Dodaj produkt';$('inventoryName').value=p?.name||'';$('inventoryCategory').value=p?.category||'';$('inventorySku').value=p?.supplier_sku||'';$('inventoryEan').value=p?.ean||'';$('inventorySupplier').value=p?.supplier_name||'';$('inventoryShelf').value=p?.shelf_location||'';$('inventoryQuantity').value=p?.quantity||0;$('inventoryQuantity').disabled=!!p;$('inventoryMinStock').value=p?.min_stock||0;$('inventoryPurchasePrice').value=p?.last_purchase_price||0;$('inventorySalePrice').value=p?.sale_price||0;$('inventoryError').textContent='';$('inventoryDialog').showModal()}
function addInvoiceLine(line={name:'',supplier_sku:'',quantity:1,unit_price_net:0,vat_rate:23}){invoiceLines.push(line);renderInvoiceLines()}
function renderInvoiceLines(){$('invoicePreviewBody').innerHTML=invoiceLines.map((x,i)=>`<tr><td><input class="invoice-name" data-invoice-field="name" data-i="${i}" value="${esc(x.name)}"></td><td><input data-invoice-field="supplier_sku" data-i="${i}" value="${esc(x.supplier_sku||'')}"></td><td><input type="number" min="0" step="0.001" data-invoice-field="quantity" data-i="${i}" value="${Number(x.quantity||0)}"></td><td><input type="number" min="0" step="0.01" data-invoice-field="unit_price_net" data-i="${i}" value="${Number(x.unit_price_net||0)}"></td><td><input type="number" min="0" step="1" data-invoice-field="vat_rate" data-i="${i}" value="${Number(x.vat_rate??23)}"></td><td><button class="remove-line" data-remove-invoice="${i}">×</button></td></tr>`).join('');$('confirmInvoiceButton').disabled=!invoiceLines.length}
function parsePolishNumber(s){return Number(String(s||'').replace(/\s/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0}
function guessInvoiceMetadata(text){const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);const inv=(text.match(/(?:faktura|fv|invoice)[\s\w]*[:\s]+([A-Z0-9\/\-_.]+)/i)||[])[1];const date=(text.match(/\b(20\d{2})[-.\/]([01]?\d)[-.\/]([0-3]?\d)\b/)||[]);if(inv)$('invoiceNumber').value=inv;if(date)$('invoiceDate').value=`${date[1]}-${String(date[2]).padStart(2,'0')}-${String(date[3]).padStart(2,'0')}`;if(!$('invoiceSupplier').value)$('invoiceSupplier').value=lines.slice(0,8).find(x=>x.length>3&&x.length<80&&!/faktura|invoice|nip|data|sprzedawca/i.test(x))||''}
function parseInvoiceLines(text){const lines=text.split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);const out=[];const rx=/^(.{4,}?)\s+(\d+(?:[,.]\d+)?)\s+(?:szt\.?|pcs|kpl\.?|op\.?|kg)?\s*(\d+[\s\d]*[,.]\d{2})(?:\s+(\d{1,2}))?(?:\s+\d+[\s\d]*[,.]\d{2})?$/i;for(const line of lines){if(/razem|suma|netto|brutto|podatek|do zapłaty/i.test(line))continue;const m=line.match(rx);if(m){const name=m[1].replace(/^\d+[.)]?\s*/,'').trim();const quantity=parsePolishNumber(m[2]);const unit=parsePolishNumber(m[3]);if(name.length>3&&quantity>0&&unit>=0)out.push({name,supplier_sku:'',quantity,unit_price_net:unit,vat_rate:Number(m[4]||23)})}}return out.slice(0,200)}
async function extractPdfText(file){const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';const bytes=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjs.getDocument({data:bytes}).promise;let text='';for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const content=await page.getTextContent();let y=null,line='';for(const it of content.items){const iy=Math.round(it.transform?.[5]||0);if(y!==null&&Math.abs(iy-y)>3){text+=line.trim()+'\n';line=''}line+=it.str+' ';y=iy}text+=line.trim()+'\n'}return text}
function renderOrderParts(orderId){const parts=orderParts.filter(x=>String(x.order_id)===String(orderId));$('detailsOrderParts').innerHTML=parts.length?`<div class="order-parts-list">${parts.map(x=>{const p=inventoryProducts.find(y=>String(y.id)===String(x.product_id));return`<div class="order-part-row"><b>${esc(p?.name||'Część')}</b><span>${x.quantity} szt.</span><span class="part-${x.status}">${x.status==='reserved'?'Zarezerwowana':'Zużyta'}</span><span>${money(Number(x.unit_cost)*Number(x.quantity))}</span></div>`}).join('')}</div>`:'<p class="muted-note">Brak części przypisanych do zlecenia.</p>'}
function populateOrderPartProducts(){$('orderPartProduct').innerHTML=inventoryProducts.filter(p=>inventoryAvailable(p)>0).map(p=>`<option value="${p.id}">${esc(p.name)} — dostępne ${inventoryAvailable(p)}</option>`).join('');updatePartAvailability()}
function updatePartAvailability(){const p=inventoryProducts.find(x=>String(x.id)===String($('orderPartProduct').value));$('orderPartAvailability').textContent=p?`Dostępne: ${inventoryAvailable(p)} · koszt: ${money(p.last_purchase_price)}`:'Brak dostępnych produktów.'}
function printOrderLabel(){const order=orders.find(x=>String(x.id)===String(selectedOrderId));if(!order)return;const c=customerById(order.customer_id);const w=window.open('','_blank','width=500,height=400');w.document.write(`<html><head><title>Etykieta ${esc(order.order_number)}</title><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script><style>@page{size:50mm 30mm;margin:1.5mm}body{margin:0;font-family:Arial;font-size:8px}.label{width:47mm;height:27mm;overflow:hidden}svg{width:100%;height:13mm}.line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold}</style></head><body><div class="label"><svg id="bc"></svg><div class="line">${esc(order.brand)} ${esc(order.model)}</div><div class="line">${esc(c?.full_name||'')}</div><div>${esc(order.status)}</div></div><script>JsBarcode('#bc','${esc(order.order_number)}',{format:'CODE128',displayValue:true,height:35,width:1.5,fontSize:10,margin:0});setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close()}
function openScanner(){$('scannerInput').value='';$('scannerMessage').textContent='';$('scannerDialog').showModal();setTimeout(()=>$('scannerInput').focus(),50)}
function scanLookup(value){const q=value.trim().toLowerCase();const order=orders.find(o=>String(o.order_number).toLowerCase()===q);if(order){$('scannerDialog').close();showTab('orders');openOrderDetails(order.id)}else $('scannerMessage').textContent='Nie znaleziono zlecenia o takim kodzie.'}

function guardDemo(){if(demoMode){alert('Tryb demo jest tylko do podglądu. Dane nie są zapisywane.');return true}return false}
$('customerForm').onsubmit=async e=>{e.preventDefault();if(guardDemo())return;const p={organization_id:currentOrg.id,full_name:$('customerName').value.trim(),phone:$('customerPhone').value.trim(),email:$('customerEmail').value.trim()||null,notes:$('customerNotes').value.trim()||null};const {error}=await db.from('customers').insert(p);if(error)return $('customerError').textContent=error.message;$('customerDialog').close();e.target.reset();await loadAll()}
$('locationForm').onsubmit=async e=>{e.preventDefault();if(guardDemo())return;const p={organization_id:currentOrg.id,name:$('locationName').value.trim(),address:$('locationAddress').value.trim(),phone:$('locationPhone').value.trim()||null,opening_hours:$('locationHours').value.trim()||null,maps_url:$('locationMaps').value.trim()||null};const {error}=await db.from('service_locations').insert(p);if(error)return $('locationError').textContent=error.message;$('locationDialog').close();e.target.reset();await loadAll()}
$('priceForm').onsubmit=async e=>{e.preventDefault();if(guardDemo())return;const p={organization_id:currentOrg.id,brand:$('priceBrand').value.trim(),model:$('priceModel').value.trim(),category:$('priceCategory').value.trim(),service:$('priceService').value.trim(),price:Number($('priceAmount').value),is_visible:$('priceVisible').checked};const {error}=await db.from('price_items').insert(p);if(error)return $('priceError').textContent=error.message;$('priceDialog').close();e.target.reset();await loadAll()}
$('inventoryForm').onsubmit=async e=>{e.preventDefault();if(guardDemo())return;const id=$('inventoryId').value;const p={organization_id:currentOrg.id,name:$('inventoryName').value.trim(),category:$('inventoryCategory').value.trim()||null,supplier_sku:$('inventorySku').value.trim()||null,ean:$('inventoryEan').value.trim()||null,supplier_name:$('inventorySupplier').value.trim()||null,shelf_location:$('inventoryShelf').value.trim()||null,min_stock:Number($('inventoryMinStock').value||0),last_purchase_price:Number($('inventoryPurchasePrice').value||0),sale_price:Number($('inventorySalePrice').value||0)};if(!id){p.quantity=Number($('inventoryQuantity').value||0);p.average_purchase_price=p.last_purchase_price}const {data,error}=id?await db.from('inventory_products').update(p).eq('id',id).eq('organization_id',currentOrg.id).select().single():await db.from('inventory_products').insert(p).select().single();if(error)return $('inventoryError').textContent=error.message;if(!id&&Number(p.quantity)>0)await db.from('inventory_movements').insert({organization_id:currentOrg.id,product_id:data.id,movement_type:'opening',quantity:p.quantity,unit_cost:p.last_purchase_price,notes:'Stan początkowy'});$('inventoryDialog').close();await loadAll()}
$('orderPartForm').onsubmit=async e=>{e.preventDefault();if(guardDemo())return;const {error}=await db.rpc('add_part_to_order',{p_order_id:selectedOrderId,p_product_id:$('orderPartProduct').value,p_quantity:Number($('orderPartQuantity').value),p_mode:$('orderPartMode').value});if(error)return $('orderPartError').textContent=error.message;$('orderPartDialog').close();await loadAll();await openOrderDetails(selectedOrderId)}
$('orderForm').onsubmit=async e=>{e.preventDefault();if(guardDemo())return;$('orderError').textContent='';$('orderSubmitButton').disabled=true;try{const customerId=await resolveOrderCustomer();const id=$('orderId').value;let orderNumber=null;if(!id){const {data,error}=await db.rpc('next_order_number');if(error)throw error;orderNumber=data}const p={organization_id:currentOrg.id,customer_id:customerId,location_id:$('orderLocation').value||null,brand:$('orderBrand').value.trim(),model:$('orderModel').value.trim(),imei:$('orderImei').value.trim()||null,issue_description:$('orderIssue').value.trim(),device_condition:$('orderCondition').value.trim()||null,internal_notes:$('orderInternalNotes').value.trim()||null,status:$('orderStatus').value,estimated_amount:Number($('orderAmount').value||0),due_date:$('orderDueDate').value||null,warranty_months:Number($('orderWarranty').value||0),accepted_date:$('orderAcceptedDate').value||new Date().toISOString().slice(0,10),scheduled_start:fromLocalInput($('orderScheduledStart').value),scheduled_end:fromLocalInput($('orderScheduledEnd').value),priority:$('orderPriority').value,event_type:$('orderEventType').value};if(!id)p.order_number=orderNumber;const {error}=id?await db.from('service_orders').update(p).eq('id',id).eq('organization_id',currentOrg.id):await db.from('service_orders').insert(p);if(error)throw error;$('orderDialog').close();e.target.reset();clearOrderCustomer();await loadAll()}catch(err){$('orderError').textContent=err.message||'Nie udało się zapisać zlecenia.'}finally{$('orderSubmitButton').disabled=false}}
$('saveSettingsButton').onclick=async()=>{if(guardDemo())return;const p={organization_id:currentOrg.id,public_name:$('settingsPublicName').value.trim(),phone:$('settingsPhone').value.trim()||null,email:$('settingsEmail').value.trim()||null,public_description:$('settingsDescription').value.trim()||null};const {error}=await db.from('organization_settings').upsert(p);alert(error?error.message:'Ustawienia zapisane.')}


function passwordResetRedirectUrl(){
  return `${window.location.origin}${window.location.pathname}`;
}
function openForgotPassword(){
  $('forgotPasswordForm').reset();
  $('forgotPasswordMessage').textContent='';
  const loginEmail=$('email').value.trim();
  if(loginEmail)$('forgotEmail').value=loginEmail;
  $('authDialog').close();
  $('forgotPasswordDialog').showModal();
}
async function sendPasswordReset(e){
  e.preventDefault();
  const email=$('forgotEmail').value.trim();
  $('forgotPasswordMessage').className='message';
  $('forgotPasswordMessage').textContent='Wysyłanie wiadomości…';
  $('sendResetButton').disabled=true;
  try{
    const {error}=await db.auth.resetPasswordForEmail(email,{
      redirectTo:passwordResetRedirectUrl()
    });
    if(error)throw error;
    $('forgotPasswordMessage').className='message success';
    $('forgotPasswordMessage').textContent='Link został wysłany. Sprawdź skrzynkę e-mail i folder SPAM.';
  }catch(err){
    $('forgotPasswordMessage').textContent=err.message||'Nie udało się wysłać linku.';
  }finally{
    $('sendResetButton').disabled=false;
  }
}
async function saveNewPassword(e){
  e.preventDefault();
  const password=$('newPassword').value;
  const repeat=$('newPasswordRepeat').value;
  $('newPasswordMessage').className='message';
  if(password!==repeat){
    $('newPasswordMessage').textContent='Hasła nie są identyczne.';
    return;
  }
  if(password.length<8){
    $('newPasswordMessage').textContent='Hasło musi mieć co najmniej 8 znaków.';
    return;
  }
  $('newPasswordMessage').textContent='Zapisywanie…';
  $('saveNewPasswordButton').disabled=true;
  try{
    const {error}=await db.auth.updateUser({password});
    if(error)throw error;
    $('newPasswordMessage').className='message success';
    $('newPasswordMessage').textContent='Hasło zostało zmienione. Za chwilę przejdziesz do panelu.';
    setTimeout(async()=>{
      $('newPasswordDialog').close();
      await loadCompany();
    },1200);
  }catch(err){
    $('newPasswordMessage').textContent=err.message||'Nie udało się zmienić hasła.';
  }finally{
    $('saveNewPasswordButton').disabled=false;
  }
}

$('authForm').addEventListener('submit',async e=>{e.preventDefault();$('authMessage').textContent='Proszę czekać…';$('submitAuth').disabled=true;try{const email=$('email').value.trim(),password=$('password').value;if(mode==='login'){const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;$('authDialog').close();await loadCompany()}else{const displayName=$('displayName').value.trim(),companyName=$('companyName').value.trim(),companyPhone=$('companyPhone').value.trim(),companyTaxId=$('companyTaxId').value.trim(),companySlug=$('companySlug').value.trim(),planCode=$('companyPlan').value;if(!displayName||!companyName||!companyPhone||!companySlug)throw new Error('Uzupełnij właściciela, nazwę firmy, telefon i adres firmy.');const metadata={display_name:displayName,pending_company_name:companyName,pending_company_slug:companySlug,pending_company_phone:companyPhone,pending_company_tax_id:companyTaxId,pending_plan_code:planCode};const {data,error}=await db.auth.signUp({email,password,options:{data:metadata}});if(error)throw error;if(!data.session){$('authMessage').textContent='Konto utworzone. Sprawdź pocztę, potwierdź adres e-mail, a następnie zaloguj się.';return}const {error:rpcError}=await db.rpc('register_my_organization',{company_name:companyName,company_slug:companySlug,owner_display_name:displayName,company_phone:companyPhone,company_tax_id:companyTaxId,plan_code:planCode});if(rpcError)throw rpcError;$('authDialog').close();await loadCompany()}}catch(err){$('authMessage').textContent=err.message||'Wystąpił błąd.'}finally{$('submitAuth').disabled=false}})


async function loadPlatformCompanies(){
  if(!isPlatformAdmin)return;
  const {data,error}=await db.rpc('platform_list_organizations');
  if(error){console.error(error);$('platformCompaniesTable').innerHTML=`<tr><td colspan="7" class="empty-row">${esc(error.message)}</td></tr>`;return}
  platformCompanies=data||[];renderPlatformCompanies();
}
function filteredPlatformCompanies(){
  const q=($('platformSearch')?.value||'').toLowerCase(),s=$('platformStatusFilter')?.value||'';
  return platformCompanies.filter(x=>(!q||`${x.company_name} ${x.owner_name} ${x.owner_email}`.toLowerCase().includes(q))&&(!s||x.company_status===s));
}
function renderPlatformCompanies(){
  $('platformAll').textContent=platformCompanies.length;
  $('platformPending').textContent=platformCompanies.filter(x=>x.company_status==='pending').length;
  $('platformActive').textContent=platformCompanies.filter(x=>['active','trial'].includes(x.company_status)).length;
  $('platformSuspended').textContent=platformCompanies.filter(x=>x.company_status==='suspended').length;
  const list=filteredPlatformCompanies();
  $('platformCompaniesTable').innerHTML=list.length?list.map(x=>`<tr>
    <td><b>${esc(x.company_name)}</b><br><small>${esc(x.company_slug)}</small></td>
    <td>${esc(x.owner_name)}<br><small>${esc(x.owner_email)}</small></td>
    <td><select class="platform-plan" data-plan-org="${x.organization_id}"><option value="start" ${x.plan_code==='start'?'selected':''}>Starter</option><option value="pro" ${x.plan_code==='pro'?'selected':''}>Pro</option><option value="business" ${x.plan_code==='business'?'selected':''}>Business</option></select></td>
    <td><span class="status-pill status-${esc(x.company_status)}">${esc(organizationStatusLabel(x.company_status))}</span></td>
    <td>${new Date(x.created_at).toLocaleDateString('pl-PL')}</td>
    <td>${x.orders_count}</td>
    <td><div class="platform-actions">
      <button class="mini-btn activate" data-org-action="active" data-org-id="${x.organization_id}">Aktywuj</button>
      <button class="mini-btn" data-org-action="trial" data-org-id="${x.organization_id}">Trial</button>
      <button class="mini-btn suspend" data-org-action="suspended" data-org-id="${x.organization_id}">Zawieś</button>
      <button class="mini-btn danger" data-org-action="cancelled" data-org-id="${x.organization_id}">Anuluj</button>
    </div></td>
  </tr>`).join(''):'<tr><td colspan="7" class="empty-row">Brak firm.</td></tr>';
}
async function setPlatformOrganizationStatus(id,status){
  const reason=status==='suspended'?prompt('Powód zawieszenia (opcjonalnie):','')||'':null;
  const {error}=await db.rpc('platform_set_organization_status',{target_organization_id:id,new_status:status,reason});
  if(error)return alert(error.message);
  await loadPlatformCompanies();
}
async function setPlatformOrganizationPlan(id,plan){
  const {error}=await db.rpc('platform_set_organization_plan',{target_organization_id:id,new_plan_code:plan});
  if(error)return alert(error.message);
  await loadPlatformCompanies();
}

document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{showTab(b.dataset.tab);if(b.dataset.tab==='platform')loadPlatformCompanies();if(b.dataset.tab==='calendar')renderCalendar()});
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close)?.close());
$('newCustomerButton').onclick=()=>guardDemo()||$('customerDialog').showModal();
$('newOrderButton').onclick=()=>{if(guardDemo())return;fillOrderForm();$('orderDialog').showModal()};
$('newPriceButton').onclick=()=>guardDemo()||$('priceDialog').showModal();$('newInventoryButton').onclick=()=>openInventoryForm();$('importInvoiceButton').onclick=()=>{if(guardDemo())return;invoiceLines=[];renderInvoiceLines();$('invoiceFile').value='';$('invoiceStatus').textContent='';$('invoiceNumber').value='';$('invoiceSupplier').value='';$('invoiceDate').value=new Date().toISOString().slice(0,10);$('invoiceDialog').showModal()};
$('newLocationButton').onclick=()=>guardDemo()||$('locationDialog').showModal();
$('ordersTable').onclick=e=>{const id=e.target.dataset.openOrder||e.target.closest('tr')?.dataset.orderId;if(id)openOrderDetails(id)};$('editOrderButton').onclick=editSelectedOrder;$('printOrderButton').onclick=printSelectedOrder;$('inventoryTable').onclick=e=>{const id=e.target.dataset.editInventory;if(id)openInventoryForm(inventoryProducts.find(x=>String(x.id)===String(id)))};$('inventorySearch').oninput=renderInventory;$('inventoryStockFilter').onchange=renderInventory;$('addInvoiceLineButton').onclick=()=>addInvoiceLine();$('invoicePreviewBody').oninput=e=>{const i=Number(e.target.dataset.i),field=e.target.dataset.invoiceField;if(field&&invoiceLines[i])invoiceLines[i][field]=['quantity','unit_price_net','vat_rate'].includes(field)?Number(e.target.value):e.target.value};$('invoicePreviewBody').onclick=e=>{if(e.target.dataset.removeInvoice!==undefined){invoiceLines.splice(Number(e.target.dataset.removeInvoice),1);renderInvoiceLines()}};$('parseInvoiceButton').onclick=async()=>{const file=$('invoiceFile').files[0];if(!file)return $('invoiceStatus').textContent='Wybierz plik PDF.';$('invoiceStatus').textContent='Odczytywanie faktury…';try{const text=await extractPdfText(file);if(text.trim().length<30){invoiceLines=[];renderInvoiceLines();$('invoiceStatus').textContent='PDF nie zawiera czytelnego tekstu. To prawdopodobnie skan — dodaj wiersze ręcznie.';return}guessInvoiceMetadata(text);invoiceLines=parseInvoiceLines(text);renderInvoiceLines();$('invoiceStatus').textContent=invoiceLines.length?`Rozpoznano ${invoiceLines.length} pozycji. Sprawdź dane przed importem.`:'Nie udało się pewnie rozpoznać pozycji. Dodaj je ręcznie.'}catch(err){$('invoiceStatus').textContent='Błąd odczytu PDF: '+err.message}};$('confirmInvoiceButton').onclick=async()=>{if(!invoiceLines.length)return;if(!$('invoiceNumber').value.trim())return $('invoiceStatus').textContent='Podaj numer faktury.';const items=invoiceLines.filter(x=>x.name.trim()&&Number(x.quantity)>0).map(x=>({name:x.name.trim(),supplier_sku:x.supplier_sku?.trim()||'',quantity:Number(x.quantity),unit_price_net:Number(x.unit_price_net),vat_rate:Number(x.vat_rate||23)}));const {error}=await db.rpc('import_inventory_invoice',{p_supplier:$('invoiceSupplier').value.trim(),p_invoice_number:$('invoiceNumber').value.trim(),p_invoice_date:$('invoiceDate').value||null,p_filename:$('invoiceFile').files[0]?.name||null,p_items:items});if(error)return $('invoiceStatus').textContent=error.message;$('invoiceDialog').close();await loadAll();alert('Faktura została przyjęta do magazynu.')};$('addOrderPartButton').onclick=()=>{if(guardDemo())return;populateOrderPartProducts();$('orderPartDialog').showModal()};$('orderPartProduct').onchange=updatePartAvailability;$('printLabelButton').onclick=printOrderLabel;$('scanOrderButton').onclick=openScanner;$('scannerInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();scanLookup(e.target.value)}};document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openScanner()}});$('refreshActivationButton').onclick=loadCompany;$('pendingLogoutButton').onclick=async()=>{await db.auth.signOut();showLanding()};$('refreshPlatformButton').onclick=loadPlatformCompanies;$('platformSearch').oninput=renderPlatformCompanies;$('platformStatusFilter').onchange=renderPlatformCompanies;$('platformCompaniesTable').onclick=e=>{const action=e.target.dataset.orgAction,id=e.target.dataset.orgId;if(action&&id)setPlatformOrganizationStatus(id,action)};$('platformCompaniesTable').onchange=e=>{const id=e.target.dataset.planOrg;if(id)setPlatformOrganizationPlan(id,e.target.value)};$('orderSearch').oninput=renderOrders;$('orderStatusFilter').onchange=renderOrders;$('priceSearch').oninput=renderPrices;$('priceVisibilityFilter').onchange=renderPrices;
$('showLogin').onclick=()=>openAuth('login');$('showRegister').onclick=()=>openAuth('register');$('forgotPasswordButton').onclick=openForgotPassword;$('forgotPasswordForm').onsubmit=sendPasswordReset;$('newPasswordForm').onsubmit=saveNewPassword;$('switchMode').onclick=()=>setMode(mode==='login'?'register':'login');$('closeDialog').onclick=()=>$('authDialog').close();
$('logout').onclick=async()=>{if(!demoMode)await db.auth.signOut();demoMode=false;currentOrg=null;isPlatformAdmin=false;showLanding()};
$('enterDemoButton').onclick=enterDemo;
function openDemo(){$('demoDialog').showModal()}
$('topDemo').onclick=openDemo;$('heroDemo').onclick=openDemo;$('bottomDemo').onclick=openDemo;
document.querySelectorAll('[data-billing]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-billing]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const y=btn.dataset.billing==='year';document.querySelectorAll('.monthly').forEach(x=>x.classList.toggle('hidden',y));document.querySelectorAll('.yearly').forEach(x=>x.classList.toggle('hidden',!y))});
document.querySelectorAll('.buy-plan').forEach(btn=>btn.onclick=()=>{$('purchaseTitle').textContent=`Pakiet ${btn.dataset.plan}`;$('purchaseDialog').showModal()});


async function inviteStaffMember(e){
  e.preventDefault();if(guardDemo())return;
  $('staffError').textContent='';$('staffSubmitButton').disabled=true;
  try{
    const {error}=await db.rpc('staff_invite',{target_organization_id:currentOrg.id,employee_email:$('staffEmail').value.trim(),employee_name:$('staffName').value.trim(),employee_role:$('staffRole').value});
    if(error)throw error;
    $('staffDialog').close();$('staffForm').reset();await loadAll();
  }catch(err){$('staffError').textContent=err.message||'Nie udało się dodać pracownika.'}
  finally{$('staffSubmitButton').disabled=false}
}
async function removeStaffEntry(id,type){
  if(!confirm(type==='invitation'?'Anulować to zaproszenie?':'Usunąć dostęp temu pracownikowi?'))return;
  const {error}=await db.rpc('staff_remove',{target_organization_id:currentOrg.id,target_entry_id:id,entry_type:type});
  if(error)return alert(error.message);await loadAll();
}

$('orderCustomerSearch').oninput=()=>{$('orderCustomerId').value='';renderCustomerSuggestions()};$('orderCustomerSearch').onfocus=renderCustomerSuggestions;$('orderCustomerSuggestions').onclick=e=>{const id=e.target.closest('[data-customer-choice]')?.dataset.customerChoice;if(id)selectOrderCustomer(id)};$('clearOrderCustomerButton').onclick=clearOrderCustomer;
$('newStaffButton').onclick=()=>{if(guardDemo())return;$('staffForm').reset();$('staffError').textContent='';$('staffDialog').showModal()};$('staffForm').onsubmit=inviteStaffMember;$('staffGrid').onclick=e=>{const b=e.target.closest('[data-remove-staff]');if(b)removeStaffEntry(b.dataset.removeStaff,b.dataset.staffType)};
$('dashboardPeriod').onchange=renderMetrics;
$('calendarTodayButton').onclick=()=>{calendarCursor=new Date();calendarSelectedDate=new Date();renderCalendar()};
$('calendarPrevButton').onclick=()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);renderCalendar()};
$('calendarNextButton').onclick=()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);renderCalendar()};
$('calendarNewOrderButton').onclick=()=>openNewOrderForDate(calendarSelectedDate);
$('calendarGrid').onclick=e=>{
  const orderId=e.target.dataset.calendarOrder;
  if(orderId){openOrderDetails(orderId);return}
  const day=e.target.closest('[data-calendar-date]');
  if(day){calendarSelectedDate=new Date(`${day.dataset.calendarDate}T12:00:00`);renderCalendar()}
};
$('calendarAgenda').onclick=e=>{const id=e.target.closest('[data-agenda-order]')?.dataset.agendaOrder;if(id)openOrderDetails(id)};
$('upcomingSchedule').onclick=e=>{const id=e.target.closest('[data-dashboard-order]')?.dataset.dashboardOrder;if(id)openOrderDetails(id)};
document.querySelector('[data-go-calendar]').onclick=()=>showTab('calendar');

db.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY'){
    setTimeout(()=>{
      showLanding();
      $('newPasswordForm').reset();
      $('newPasswordMessage').textContent='';
      $('newPasswordDialog').showModal();
    },0);
    return;
  }
  setTimeout(loadCompany,0);
});
loadCompany();
