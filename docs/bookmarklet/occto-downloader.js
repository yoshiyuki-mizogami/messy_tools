javascript:void((()=>{
  const doc = document.documentElement;
  const dForm = `<form class="dform" method="post" action="/sw_web/blc201/blc201g003" target="dframe">
  <input type="hidden" name="kyokyuKanriNum" value=""/>
  <input type="hidden" name="callback" value="blc101/blc101g001/setValueFromSession'"/>
  <input type="hidden" name="chitenId" value=""/>
  <input type="hidden" name="keiyakuSeqNo" value="1"/>
  <input type="hidden" name="kouriCd" value=""/>
  <input type="hidden" name="buttonId" value="usageInfoInquiryBusinessButton1"/>
</form>`;
  doc.innerHTML = `<div style="vertical-align:top;display:inline-block;width:45%">OCCTO Auto downloader Console
  ${dForm}
  <div style="text-align:center">
    <textarea class="input" style="display:block;resize:none;width:80%;height:70vh" placeholder="地点番号リスト"></textarea>
    <button class="start">取得開始</button>
    <div class="progress"></div>
  </div>
  </div><iframe name="dframe" style="width:50%;height:80vh;display:inline-block;" src="${location.href}"></iframe>`;
  const form = doc.querySelector('.dform');
  const btn = doc.querySelector('.start');
  async function switchPage(n){
    form.querySelector('[name=kyokyuKanriNum]').value = 
    form.querySelector('[name=chitenId]').value = n;
    form.submit();
    while(true){
      if(getNo() === n){
        return;
      }
      await wait(1000);
    }
  }
  function wait(n){
    return new Promise(r=>setTimeout(r, n));
  }
  function getNo(){
    try{
      const ifdoc = document.querySelector('iframe').contentWindow.document;
      const td = Array.from(ifdoc.querySelector('.main-table').querySelectorAll('td'))[2];
      return td.textContent;
    }catch(e){
       return ''
    }
  }
  function getInfo(){
    const ifdoc = document.querySelector('iframe').contentWindow.document;
    const tdAndTh= Array.from(ifdoc.querySelector('.main-table').querySelectorAll('th,td'));
    const dataset = {};
    let lastProp = '';
    tdAndTh.forEach(el=>{
      if(el.tagName ==='TH'){
        lastProp = el.textContent.replace(/\s/g, '');
      }
      if(el.tagName === 'TD'){
        if(!dataset[lastProp]){
          dataset[lastProp] = [];
        }
        dataset[lastProp].push(el.textContent.replace(/\s/g, ''));
      }
    });
    dataset['供給地点特定番号'] = [`="${dataset['供給地点特定番号'][0]}"`];
    return dataset;
  }
  function createCsv(data){
     const header = Object.keys(data[0]);
     const headerLine = header.join(',');
     const csvLines = data.map(d=>{
       return header.map(h=>{
         return d[h].map(d=>d.trim()).filter(Boolean).join(' ')
       }).join(',');
     });
     csvLines.unshift(headerLine);
     download(csvLines);
  }
  function download(lines){
    const blob = new Blob(['\uFEFF', lines.join('\r\n')],{type:'application/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OCCTO地点データ.csv';
    a.click();
    setTimeout(()=>{
      URL.revokeObjectURL(url);
    }, 3000)
  }
  const ta = doc.querySelector('.input');
  btn.addEventListener('click', async()=>{
    ta.setAttribute('disabled', true);
    btn.setAttribute('disabled', true);
    const progress = doc.querySelector('.progress');
    const results = [];
    const lines = ta.value.split(/\r?\n/).filter(l=>/^\d{22}$/.test(l));
    const total = lines.length;
    progress.textContent = `0/${total}`;
    await lines.reduce(async (before, l, ind)=>{
      await before;
      await switchPage(l);
      results.push(getInfo());
      progress.textContent = `${ind+1}/${total}`;
    }, Promise.resolve());
    await createCsv(results);
    ta.removeAttribute('disabled');
    btn.removeAttribute('disabled');
  });
  
})())