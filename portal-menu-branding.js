// This presentation policy applies only to systems served inside the portal.
export function installPortalMenuBranding(root=document,host=location.hostname) {
 if(host!=='semed-integrado.vercel.app')return;
 root.querySelectorAll('.sidebar,[data-workspace-sidebar]').forEach(menu=>{
  if(!menu.querySelector('[data-portal-menu-logo]')){
   const box=document.createElement('div');box.dataset.portalMenuLogo='1';
   box.style.cssText='flex-shrink:0;background:#fff;margin:12px;padding:8px;border-radius:12px;text-align:center';
   const image=document.createElement('img');image.src='/modules/logo-educacao-uberaba.png';image.alt='Secretaria de Educação · Prefeitura de Uberaba';image.style.cssText='display:block;width:100%;height:auto;object-fit:contain';
   box.append(image);menu.prepend(box);
  }
  menu.querySelectorAll('button,a').forEach(button=>{
   if((button.textContent||'').trim().replace(/^[^\p{L}]+/u,'')==='Sair'){button.hidden=true;button.style.setProperty('display','none','important');}
  });
 });
}
