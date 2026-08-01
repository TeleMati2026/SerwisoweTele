
const cfg=window.SERWISOWETELE_CONFIG||{};
const db=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let mode='login';

function setMode(next){
  mode=next;
  const reg=mode==='register';
  $('registerFields').classList.toggle('hidden',!reg);
  $('formEyebrow').textContent=reg?'Utwórz swój serwis':'Witaj ponownie';
  $('formTitle').textContent=reg?'Załóż firmę':'Logowanie';
  $('submitAuth').textContent=reg?'Utwórz konto i firmę':'Zaloguj się';
  $('switchMode').textContent=reg?'Masz już konto? Zaloguj się':'Nie masz konta? Załóż serwis';
  $('password').autocomplete=reg?'new-password':'current-password';
  $('authMessage').textContent='';
}
function openAuth(next){setMode(next);$('authDialog').showModal()}
function slugify(v){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
$('companyName').addEventListener('input',()=>{if(!$('companySlug').dataset.edited)$('companySlug').value=slugify($('companyName').value)});
$('companySlug').addEventListener('input',()=>{$('companySlug').dataset.edited='1'});

async function loadCompany(){
  const {data:sessionData}=await db.auth.getSession();
  const session=sessionData.session;
  if(!session){showLanding();return}
  const {data:members,error}=await db.from('organization_members').select('organization_id,role,organizations(name,status,trial_ends_at)').eq('user_id',session.user.id).eq('active',true).limit(1);
  if(error){console.error(error);showLanding();return}
  const m=members?.[0];
  if(!m){showLanding();openAuth('register');$('authMessage').textContent='Konto istnieje, ale firma nie została jeszcze utworzona.';return}
  $('companyTitle').textContent=m.organizations?.name||'Twoja firma';
  $('trialBadge').textContent=m.organizations?.status==='trial'?'Okres próbny':'Aktywne';
  $('landing').classList.add('hidden');document.querySelector('.topbar').classList.add('hidden');$('dashboard').classList.remove('hidden');
}
function showLanding(){$('dashboard').classList.add('hidden');$('landing').classList.remove('hidden');document.querySelector('.topbar').classList.remove('hidden')}

$('authForm').addEventListener('submit',async e=>{
  e.preventDefault();$('authMessage').textContent='Proszę czekać…';$('submitAuth').disabled=true;
  try{
    const email=$('email').value.trim(),password=$('password').value;
    if(mode==='login'){
      const {error}=await db.auth.signInWithPassword({email,password});
      if(error)throw error;
      $('authDialog').close();await loadCompany();
    }else{
      const displayName=$('displayName').value.trim(),companyName=$('companyName').value.trim(),companySlug=$('companySlug').value.trim();
      if(!displayName||!companyName||!companySlug)throw new Error('Uzupełnij dane właściciela i firmy.');
      const {data,error}=await db.auth.signUp({email,password,options:{data:{display_name:displayName}}});
      if(error)throw error;
      if(!data.session){
        $('authMessage').textContent='Sprawdź pocztę i potwierdź adres e-mail. Potem zaloguj się.';
        return;
      }
      const {error:rpcError}=await db.rpc('create_my_organization',{company_name:companyName,company_slug:companySlug,owner_display_name:displayName});
      if(rpcError)throw rpcError;
      $('authDialog').close();await loadCompany();
    }
  }catch(err){$('authMessage').textContent=err.message||'Wystąpił błąd.'}
  finally{$('submitAuth').disabled=false}
});
$('showLogin').onclick=()=>openAuth('login');$('heroLogin').onclick=()=>openAuth('login');
$('showRegister').onclick=()=>openAuth('register');$('heroRegister').onclick=()=>openAuth('register');
$('switchMode').onclick=()=>setMode(mode==='login'?'register':'login');
$('closeDialog').onclick=()=>$('authDialog').close();
$('logout').onclick=async()=>{await db.auth.signOut();showLanding()};
db.auth.onAuthStateChange(()=>setTimeout(loadCompany,0));
loadCompany();
