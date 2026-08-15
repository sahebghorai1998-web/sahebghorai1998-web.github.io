(function(){
  'use strict';

  const $ = id => document.getElementById(id);
  const money = x => '₹' + Number(x || 0).toFixed(2);
  const today = () => { const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); };

  function getBills(){
    try{
      const raw=localStorage.getItem('skb_bills');
      const data=raw?JSON.parse(raw):[];
      return Array.isArray(data)?data:[];
    }catch(e){ console.error('SKB storage read failed',e); return []; }
  }

  function currentArrays(){
    try { return { items: Array.isArray(items)?items:null, payments: Array.isArray(payments)?payments:null }; }
    catch(e){ return {items:null,payments:null}; }
  }

  function persistCurrentBill(){
    try{
      const a=currentArrays();
      if(!a.items || !a.items.length) return false;
      const d={
        no: $('billNo')?.value || '', date:$('date')?.value || '',
        customer:$('customer')?.value || '', mobile:$('mobile')?.value || '',
        items:a.items, discount:Number($('discount')?.value)||0,
        paid:(a.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0),
        payments:a.payments||[]
      };
      let all=getBills();
      const idx=all.findIndex(b=>String(b.no)===String(d.no));
      if(idx>=0) all[idx]=d; else all.unshift(d);
      localStorage.setItem('skb_bills',JSON.stringify(all));
      const n=Number(d.no);
      if(Number.isFinite(n)) localStorage.setItem('skb_next',String(Math.max(Number(localStorage.getItem('skb_next')||1),n+1)));
      if(typeof window.refreshDashboard==='function') window.refreshDashboard();
      return true;
    }catch(e){ console.error('SKB automatic save failed',e); return false; }
  }

  function billTotals(b){
    const sub=(b.items||[]).reduce((s,x)=>s+(Number(x.q)||0)*(Number(x.r)||0),0);
    const total=Math.max(0,sub-(Number(b.discount)||0));
    const paid=(b.payments||[]).length ? (b.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0) : (Number(b.paid)||0);
    return {sub,total,paid,due:Math.max(0,total-paid)};
  }

  function hidePanels(){
    ['duePanel','ledgerPanel','saved'].forEach(id=>{const el=$(id);if(el)el.style.display='none';});
  }

  window.showTotalDue=function(){
    persistCurrentBill();
    const box=$('duePanel'); if(!box)return;
    hidePanels(); box.style.display='block';
    const bills=getBills().map((b,i)=>({b,i,t:billTotals(b)})).filter(x=>x.t.due>0);
    const total=bills.reduce((s,x)=>s+x.t.due,0);
    box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><div><h3 style="margin:0">Total Due</h3><div style="color:#64748b;font-size:13px">Outstanding customer balances</div></div><button class="secondary" style="width:auto;padding:7px 12px" onclick="document.getElementById('duePanel').style.display='none'">Close</button></div>`+
      `<div style="padding:14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;margin-bottom:10px"><b style="font-size:22px">${money(total)}</b><div style="color:#92400e;font-size:12px;margin-top:3px">Total outstanding</div></div>`+
      (bills.length?`<table><thead><tr><th>Bill</th><th>Customer</th><th>Grand Total</th><th>Paid</th><th>Due</th></tr></thead><tbody>${bills.map(x=>`<tr><td>#${x.b.no}</td><td>${x.b.customer||'Walk-in Customer'}</td><td>${money(x.t.total)}</td><td>${money(x.t.paid)}</td><td><b>${money(x.t.due)}</b></td></tr>`).join('')}</tbody></table>`:`<div style="padding:15px;color:#64748b">No outstanding due.</div>`);
    box.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.showLedger=function(){
    persistCurrentBill();
    const box=$('ledgerPanel'); if(!box)return;
    hidePanels(); box.style.display='block';
    const map={};
    getBills().forEach(b=>{
      const key=((b.customer||'Walk-in Customer').trim()||'Walk-in Customer')+'|'+(b.mobile||'');
      if(!map[key]) map[key]={customer:b.customer||'Walk-in Customer',mobile:b.mobile||'',bills:0,total:0,paid:0,due:0};
      const t=billTotals(b); map[key].bills++; map[key].total+=t.total; map[key].paid+=t.paid; map[key].due+=t.due;
    });
    const rows=Object.values(map).sort((a,b)=>b.due-a.due);
    box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><div><h3 style="margin:0">Customer Ledger</h3><div style="color:#64748b;font-size:13px">Sales, payments and outstanding balance by customer</div></div><button class="secondary" style="width:auto;padding:7px 12px" onclick="document.getElementById('ledgerPanel').style.display='none'">Close</button></div>`+
      (rows.length?`<table><thead><tr><th>Customer</th><th>Mobile</th><th>Bills</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${r.customer}</b></td><td>${r.mobile||'—'}</td><td>${r.bills}</td><td>${money(r.total)}</td><td>${money(r.paid)}</td><td><b>${money(r.due)}</b></td></tr>`).join('')}</tbody></table>`:`<div style="padding:15px;color:#64748b">No saved bills yet.</div>`);
    box.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.shareWhatsApp=function(){
    const a=currentArrays();
    if(!a.items || !a.items.length){alert('Add at least one item before sharing.');return;}
    const sub=a.items.reduce((s,x)=>s+(Number(x.q)||0)*(Number(x.r)||0),0);
    const total=Math.max(0,sub-(Number($('discount')?.value)||0));
    const paid=(a.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0);
    const due=Math.max(0,total-paid);
    const lines=['*SRI KRISHNA BUILDERS*',`Bill No: ${$('billNo')?.value||''}`,`Customer: ${$('customer')?.value||'—'}`,`Date: ${$('date')?.value||today()}`,'',...a.items.map((x,i)=>`${i+1}. ${x.name} - ${x.q} ${x.unit} × ${money(x.r)} = ${money((Number(x.q)||0)*(Number(x.r)||0))}`),'',`Grand Total: ${money(total)}`,`Paid: ${money(paid)}`,`Due: ${money(due)}`];
    const mobile=String($('mobile')?.value||'').replace(/\D/g,'');
    const url='https://wa.me/'+(mobile?mobile:'')+'?text='+encodeURIComponent(lines.join('\n'));
    window.open(url,'_blank');
  };

  if(typeof window.refreshDashboard==='function'){
    const originalRefresh=window.refreshDashboard;
    window.refreshDashboard=function(){
      originalRefresh.apply(this,arguments);
      const count=getBills().filter(b=>billTotals(b).due>0).length;
      if($('dueBadge')) $('dueBadge').textContent=String(count);
    };
  }

  function updateAddAnotherButton(){
    const a=currentArrays();
    const btn=$('skbAddAnotherItem');
    if(btn) btn.style.display=(a.items && a.items.length)?'block':'none';
  }

  function ensureAddAnotherButton(){
    if($('skbAddAnotherItem')) return;
    const itemInput=$('item');
    if(!itemInput) return;
    const addButton=itemInput.closest('.grid')?.parentElement?.querySelector('button[onclick*="addItem"]') || Array.from(document.querySelectorAll('button')).find(b=>/add item/i.test(b.textContent||''));
    const host=(addButton&&addButton.parentElement) || itemInput.parentElement?.parentElement;
    if(!host) return;
    const wrap=document.createElement('div');
    wrap.style.cssText='margin-top:10px;display:none';
    wrap.innerHTML='<button type="button" id="skbAddAnotherItem" class="secondary" style="width:100%;font-weight:700">＋ Add Another Item</button>';
    host.appendChild(wrap);
    const btn=$('skbAddAnotherItem');
    btn.onclick=function(){
      const item=$('item'), qty=$('qty')||$('quantity'), rate=$('rate');
      if(item) item.value='';
      if(qty) qty.value='1';
      if(rate) rate.value='0';
      if(item){ item.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>item.focus(),250); }
    };
    updateAddAnotherButton();
  }

  if(typeof window.addItem==='function'){
    const original=window.addItem;
    window.addItem=function(){const before=currentArrays().items?.length||0;original.apply(this,arguments);if((currentArrays().items?.length||0)>before)persistCurrentBill();updateAddAnotherButton();};
  }
  if(typeof window.addPayment==='function'){
    const original=window.addPayment;
    window.addPayment=function(){const before=currentArrays().payments?.length||0;original.apply(this,arguments);if((currentArrays().payments?.length||0)>before)persistCurrentBill();};
  }
  if(typeof window.removeItem==='function'){
    const original=window.removeItem;
    window.removeItem=function(){original.apply(this,arguments);persistCurrentBill();updateAddAnotherButton();};
  }
  if(typeof window.deletePayment==='function'){
    const original=window.deletePayment;
    window.deletePayment=function(){original.apply(this,arguments);persistCurrentBill();};
  }
  if(typeof window.editPayment==='function'){
    const original=window.editPayment;
    window.editPayment=function(){original.apply(this,arguments);persistCurrentBill();};
  }
  if(typeof window.addSchedule==='function'){
    const original=window.addSchedule;
    window.addSchedule=function(){original.apply(this,arguments);persistCurrentBill();};
  }
  if(typeof window.editSchedule==='function'){
    const original=window.editSchedule;
    window.editSchedule=function(){original.apply(this,arguments);persistCurrentBill();};
  }
  if(typeof window.deleteSchedule==='function'){
    const original=window.deleteSchedule;
    window.deleteSchedule=function(){original.apply(this,arguments);persistCurrentBill();};
  }
  if(typeof window.saveBill==='function'){
    const original=window.saveBill;
    window.saveBill=function(){original.apply(this,arguments);setTimeout(()=>{if(typeof window.refreshDashboard==='function')window.refreshDashboard();},0);};
  }
  if(typeof window.showSaved==='function'){
    const original=window.showSaved;
    window.showSaved=function(){persistCurrentBill();original.apply(this,arguments);};
  }

  ['customer','mobile','date','discount'].forEach(id=>{
    const el=$(id); if(el) el.addEventListener('change',persistCurrentBill);
  });

  document.addEventListener('DOMContentLoaded',()=>{
    ensureAddAnotherButton();
    setTimeout(ensureAddAnotherButton,300);
    setTimeout(updateAddAnotherButton,500);
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){try{persistCurrentBill();if(typeof window.refreshDashboard==='function')window.refreshDashboard();updateAddAnotherButton();}catch(e){}}});

  console.log('SKB billing functions/persistence fix loaded');
})();
