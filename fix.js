(function(){
  'use strict';

  function getBills(){
    try{
      const raw=localStorage.getItem('skb_bills');
      const data=raw?JSON.parse(raw):[];
      return Array.isArray(data)?data:[];
    }catch(e){
      console.error('SKB storage read failed',e);
      return [];
    }
  }

  function persistCurrentBill(){
    try{
      if(!Array.isArray(window.items) || !window.items.length) return false;
      const $=id=>document.getElementById(id);
      const d={
        no: $('billNo') ? $('billNo').value : '',
        date: $('date') ? $('date').value : '',
        customer: $('customer') ? $('customer').value : '',
        mobile: $('mobile') ? $('mobile').value : '',
        items: window.items,
        discount: $('discount') ? (Number($('discount').value)||0) : 0,
        paid: Array.isArray(window.payments) ? window.payments.reduce((a,p)=>a+(Number(p.amount)||0),0) : 0,
        payments: Array.isArray(window.payments) ? window.payments : []
      };
      let all=getBills();
      const idx=all.findIndex(b=>String(b.no)===String(d.no));
      if(idx>=0) all[idx]=d; else all.unshift(d);
      localStorage.setItem('skb_bills',JSON.stringify(all));
      const n=Number(d.no);
      if(Number.isFinite(n)){
        const next=Math.max(Number(localStorage.getItem('skb_next')||1),n+1);
        localStorage.setItem('skb_next',String(next));
      }
      if(typeof window.refreshDashboard==='function') window.refreshDashboard();
      return true;
    }catch(e){
      console.error('SKB automatic save failed',e);
      return false;
    }
  }

  if(typeof window.addItem==='function'){
    const originalAddItem=window.addItem;
    window.addItem=function(){
      const before=Array.isArray(window.items)?window.items.length:0;
      originalAddItem.apply(this,arguments);
      const after=Array.isArray(window.items)?window.items.length:0;
      if(after>before) persistCurrentBill();
    };
  }

  if(typeof window.addPayment==='function'){
    const originalAddPayment=window.addPayment;
    window.addPayment=function(){
      const before=Array.isArray(window.payments)?window.payments.length:0;
      originalAddPayment.apply(this,arguments);
      const after=Array.isArray(window.payments)?window.payments.length:0;
      if(after>before) persistCurrentBill();
    };
  }

  ['customer','mobile','date','discount'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change',()=>persistCurrentBill());
  });

  if(typeof window.showSaved==='function'){
    const originalShowSaved=window.showSaved;
    window.showSaved=function(){
      persistCurrentBill();
      originalShowSaved.apply(this,arguments);
    };
  }

  console.log('SKB billing persistence fix loaded');
})();
