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

  function getCustomerDues(){
    try{
      const raw=localStorage.getItem('skb_customer_dues');
      const data=raw?JSON.parse(raw):[];
      return Array.isArray(data)?data:[];
    }catch(e){ console.error('SKB customer due read failed',e); return []; }
  }

  function saveCustomerDues(list){
    localStorage.setItem('skb_customer_dues',JSON.stringify(list));
  }

  function manualDueTotal(){
    return getCustomerDues().reduce((s,d)=>s+Math.max(0,Number(d.amount)||0),0);
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

  function escapeHtml(v){
    return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  }

  function openAddCustomerDue(){
    const box=$('duePanel'); if(!box)return;
    const form=document.createElement('div');
    form.id='skbManualDueForm';
    form.style.cssText='margin:12px 0;padding:14px;border:1px solid #bfdbfe;border-radius:14px;background:#f8fbff';
    form.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px">
        <div><b style="font-size:16px">➕ Add Customer Due</b><div style="font-size:12px;color:#64748b;margin-top:3px">Record a due amount even when there is no new bill.</div></div>
        <button type="button" class="secondary" style="width:auto;padding:6px 10px" onclick="document.getElementById('skbManualDueForm')?.remove()">Close</button>
      </div>
      <div class="grid" style="gap:9px">
        <div><label>Customer Name</label><input id="skbDueCustomer" placeholder="Customer name"></div>
        <div><label>Mobile</label><input id="skbDueMobile" inputmode="tel" placeholder="Phone number"></div>
        <div><label>Due Amount</label><input id="skbDueAmount" type="number" min="0.01" step="0.01" placeholder="0.00"></div>
        <div><label>Date</label><input id="skbDueDate" type="date" value="${today()}"></div>
        <div style="grid-column:1/-1"><label>Note (optional)</label><input id="skbDueNote" placeholder="Example: Previous material due"></div>
      </div>
      <button type="button" style="margin-top:10px" onclick="addCustomerDue()">Save Due Amount</button>`;
    box.prepend(form);
    setTimeout(()=>$("skbDueCustomer")?.focus(),100);
  }

  window.addCustomerDue=function(){
    const name=($("skbDueCustomer")?.value||'').trim();
    const mobile=($("skbDueMobile")?.value||'').trim();
    const amount=Number($("skbDueAmount")?.value)||0;
    const date=$("skbDueDate")?.value||today();
    const note=($("skbDueNote")?.value||'').trim();
    if(!name){alert('Enter customer name.');return}
    if(amount<=0){alert('Enter a valid due amount.');return}
    const list=getCustomerDues();
    list.unshift({id:Date.now()+Math.random(),name,mobile,amount,date,note});
    saveCustomerDues(list);
    alert('Customer due added: '+name+' — '+money(amount));
    if(typeof window.refreshDashboard==='function') window.refreshDashboard();
    window.showTotalDue();
  };

  window.editCustomerDue=function(id){
    const list=getCustomerDues();
    const i=list.findIndex(x=>String(x.id)===String(id));
    if(i<0)return;
    const d=list[i];
    const name=prompt('Customer name:',d.name); if(name===null)return;
    const amount=Number(prompt('Due amount:',d.amount)); if(!name.trim()||amount<=0){alert('Invalid customer or amount.');return}
    const mobile=prompt('Mobile number:',d.mobile||''); if(mobile===null)return;
    const date=prompt('Due date (YYYY-MM-DD):',d.date||today()); if(date===null)return;
    const note=prompt('Note:',d.note||''); if(note===null)return;
    list[i]={...d,name:name.trim(),mobile:mobile.trim(),amount,date,note};
    saveCustomerDues(list);
    if(typeof window.refreshDashboard==='function') window.refreshDashboard();
    window.showTotalDue();
  };

  window.deleteCustomerDue=function(id){
    const list=getCustomerDues();
    const d=list.find(x=>String(x.id)===String(id));
    if(!d)return;
    if(!confirm('Delete due of '+d.name+' for '+money(d.amount)+'?'))return;
    saveCustomerDues(list.filter(x=>String(x.id)!==String(id)));
    if(typeof window.refreshDashboard==='function') window.refreshDashboard();
    window.showTotalDue();
  };

  window.showTotalDue=function(){
    persistCurrentBill();
    const box=$('duePanel'); if(!box)return;
    hidePanels(); box.style.display='block';
    const bills=getBills().map((b,i)=>({b,i,t:billTotals(b)})).filter(x=>x.t.due>0);
    const manual=getCustomerDues();
    const billTotal=bills.reduce((s,x)=>s+x.t.due,0);
    const total=billTotal+manualDueTotal();
    box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><div><h3 style="margin:0">Total Due</h3><div style="color:#64748b;font-size:13px">Outstanding balances by customer</div></div><button class="secondary" style="width:auto;padding:7px 12px" onclick="document.getElementById('duePanel').style.display='none'">Close</button></div>`+
      `<div style="padding:14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;margin-bottom:10px"><b style="font-size:22px">${money(total)}</b><div style="color:#92400e;font-size:12px;margin-top:3px">Total outstanding due</div></div>`+
      `<button style="margin-bottom:12px" onclick="addCustomerDue()">➕ Add Due Amount for Customer</button>`+
      (bills.length?`<h4 style="margin:10px 0 6px">Bill Due</h4><div style="overflow:auto"><table><thead><tr><th>Bill</th><th>Customer</th><th>Grand Total</th><th>Paid</th><th>Due</th></tr></thead><tbody>${bills.map(x=>`<tr><td>#${escapeHtml(x.b.no)}</td><td>${escapeHtml(x.b.customer||'Walk-in Customer')}</td><td>${money(x.t.total)}</td><td>${money(x.t.paid)}</td><td><b>${money(x.t.due)}</b></td></tr>`).join('')}</tbody></table></div>`:'')+
      `<h4 style="margin:16px 0 6px">Customer Due Amounts</h4>`+
      (manual.length?`<div style="overflow:auto"><table><thead><tr><th>Customer</th><th>Mobile</th><th>Date</th><th>Due</th><th class="no-print">Action</th></tr></thead><tbody>${manual.map(d=>`<tr><td><b>${escapeHtml(d.name)}</b>${d.note?`<div style="font-size:11px;color:#64748b">${escapeHtml(d.note)}</div>`:''}</td><td>${escapeHtml(d.mobile||'—')}</td><td>${escapeHtml(d.date||'—')}</td><td><b>${money(d.amount)}</b></td><td class="no-print"><button class="secondary" style="width:auto;padding:6px 8px" onclick="editCustomerDue(${JSON.stringify(String(d.id))})">Edit</button> <button class="danger" style="width:auto;padding:6px 8px" onclick="deleteCustomerDue(${JSON.stringify(String(d.id))})">Delete</button></td></tr>`).join('')}</tbody></table></div>`:`<div style="padding:12px;color:#64748b;background:#f8fafc;border-radius:10px">No standalone customer due entries.</div>`);
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
    getCustomerDues().forEach(d=>{
      const key=(d.name.trim()||'Walk-in Customer')+'|'+(d.mobile||'');
      if(!map[key]) map[key]={customer:d.name||'Walk-in Customer',mobile:d.mobile||'',bills:0,total:0,paid:0,due:0};
      map[key].due+=Math.max(0,Number(d.amount)||0);
    });
    const rows=Object.values(map).sort((a,b)=>b.due-a.due);
    box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><div><h3 style="margin:0">Customer Ledger</h3><div style="color:#64748b;font-size:13px">Sales, payments and outstanding balance by customer</div></div><button class="secondary" style="width:auto;padding:7px 12px" onclick="document.getElementById('ledgerPanel').style.display='none'">Close</button></div>`+
      (rows.length?`<div style="overflow:auto"><table><thead><tr><th>Customer</th><th>Mobile</th><th>Bills</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${escapeHtml(r.customer)}</b></td><td>${escapeHtml(r.mobile||'—')}</td><td>${r.bills}</td><td>${money(r.total)}</td><td>${money(r.paid)}</td><td><b>${money(r.due)}</b></td></tr>`).join('')}</tbody></table></div>`:`<div style="padding:15px;color:#64748b">No saved customer records yet.</div>`);
    box.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.shareWhatsApp=function(){
    const a=currentArrays();
    if(!a.items || !a.items.length){alert('Add at least one item before sharing.');return;}
    const sub=a.items.reduce((s,x)=>s+(Number(x.q)||0)*(Number(x.r)||0),0);
    const discount=Number($('discount')?.value)||0;
    const total=Math.max(0,sub-discount);
    const paid=(a.payments||[]).reduce((s,p)=>s+(Number(p.amount)||0),0);
    const due=Math.max(0,total-paid);
    const billNo=$('billNo')?.value||'—';
    const customer=$('customer')?.value||'—';
    const mobile=$('mobile')?.value||'';
    const date=$('date')?.value||today();
    const items=a.items.map((x,i)=>{
      const qty=Number(x.q)||0, rate=Number(x.r)||0, amount=qty*rate;
      return `${i+1}. ${x.name}\n   ${qty} ${x.unit} × ${money(rate)} = *${money(amount)}*`;
    });
    const status=due<=0?'✅ PAID IN FULL':'⏳ BALANCE DUE';
    const lines=['━━━━━━━━━━━━━━━━━━━━','🏗️ *SRI KRISHNA BUILDERS*','━━━━━━━━━━━━━━━━━━━━','🧾 *BILL DETAILS*',`Bill No: *${billNo}*`,`Date: ${date}`,`Customer: *${customer}*`,mobile?`Mobile: ${mobile}`:null,'','📦 *ITEMS*',...items,'','━━━━━━━━━━━━━━━━━━━━',`Subtotal: ${money(sub)}`,discount>0?`Discount: -${money(discount)}`:null,`*GRAND TOTAL: ${money(total)}*`,`Paid: ${money(paid)}`,`*Due: ${money(due)}*`,status,'━━━━━━━━━━━━━━━━━━━━','Thank you for choosing *SRI KRISHNA BUILDERS* 🙏','Vill – Erashal, P.O. – Nandapur, P.S. – Chandipur','PIN – 721625 | 📞 8906762010'].filter(Boolean);
    const cleanMobile=String(mobile).replace(/\D/g,'');
    const url='https://wa.me/'+(cleanMobile||'')+'?text='+encodeURIComponent(lines.join('\n'));
    window.open(url,'_blank');
  };

  if(typeof window.refreshDashboard==='function'){
    const originalRefresh=window.refreshDashboard;
    window.refreshDashboard=function(){
      originalRefresh.apply(this,arguments);
      const billDue=getBills().reduce((s,b)=>s+billTotals(b).due,0);
      const totalDue=billDue+manualDueTotal();
      if($('dashDue')) $('dashDue').textContent=money(totalDue);
      const count=getBills().filter(b=>billTotals(b).due>0).length + getCustomerDues().length;
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
    setTimeout(()=>{if(typeof window.refreshDashboard==='function')window.refreshDashboard();},600);
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){try{persistCurrentBill();if(typeof window.refreshDashboard==='function')window.refreshDashboard();updateAddAnotherButton();}catch(e){}}});

  console.log('SKB billing functions/persistence/customer due fix loaded');
})();
