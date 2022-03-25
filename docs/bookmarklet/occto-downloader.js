void((()=>{
  const version = '0.0.3';
  const spnName = '供給地点特定番号';
  class BaseDownloader{
    host = '';
    createCsv(data){
      const header = Object.keys(data[0]);
      const headerLine = header.join(',');
      const csvLines = data.map(d=>{
        return header.map(h=>{
          const field = d[h];
          if(!field){
            return '';
          }
          return field.map(d=>d.trim()).filter(Boolean).join(' ')
        }).join(',');
      });
      csvLines.unshift(headerLine);
      this.download(csvLines);
    }
    download(lines){
      const blob = new Blob(['\uFEFF', lines.join('\r\n')],{type:'application/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OCCTO地点データ_${this.name}.csv`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 3000);
    }
    createCustomUI(formText){
      document.documentElement.innerHTML = `<div style="vertical-align:top;display:inline-block;width:45%"><div>OCCTO Auto downloader Console ver ${version}</div>
        ${formText}
        <div style="text-align:center">
          <textarea class="input" style="display:block;resize:none;width:80%;height:70vh" placeholder="地点番号リスト"></textarea>
          <button class="start">取得開始</button>
          <div class="progress"></div>
        </div>
        </div><iframe name="dframe" style="width:50%;height:80vh;display:inline-block;" src="${location.href}"></iframe>`;
        return document.querySelector('#form'); 
    }
    start(){
      this.createForm();
      const ta = document.querySelector('.input');
      const btn = document.querySelector('.start');
      btn.addEventListener('click', async()=>{
        const progress = document.querySelector('.progress');
        const results = [];
        const lines = ta.value.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
        const invalids = lines.filter(l=>!/^\d{22}$/.test(l));
        if(invalids.length){
          return alert('22桁の半角数値ではないデータが紛れています\n' + invalids.join('\r\n'));
        }
        ta.setAttribute('disabled', true);
        btn.setAttribute('disabled', true);
        const total = lines.length;
        progress.textContent = `0/${total}`;
        await lines.reduce(async (before, l, ind)=>{
          await before;
          try{
            await instance.switchPage(l)
            results.push(instance.getInfo());
          }catch(e){
            console.error(e);
            results.push({[spnName]:[`${l} ${e}`]});
          }
          progress.textContent = `${ind+1}/${total}`;
        }, Promise.resolve());
        await instance.createCsv(results);
        ta.removeAttribute('disabled');
        btn.removeAttribute('disabled');
      });
    }
  }
  class Den03 extends BaseDownloader{
    name = '東京電力';
    host = 'ap00.www6.tepco.co.jp'
    createForm(){
      const orgForm = document.querySelector('#form');
      if(!orgForm){
        throw '元フォームが存在しません、東京の支援トップ画面で実行してください';
      }
      const orgFormText = orgForm.outerHTML;
      this.form = this.createCustomUI(orgFormText);
    }
    getInfo(){

    }
    async getNo(){

    }
    async switchPage(n){

    }
  };
  class Den09 extends BaseDownloader {
    name = '九州電力';
    host = 'sw-www.network.kyuden.co.jp'
    createForm(){
      const dForm = `<form id="form" method="post" action="/sw_web/blc201/blc201g003" target="dframe">
      <input type="hidden" name="kyokyuKanriNum" value=""/>
      <input type="hidden" name="callback" value="blc101/blc101g001/setValueFromSession'"/>
      <input type="hidden" name="chitenId" value=""/>
      <input type="hidden" name="keiyakuSeqNo" value="1"/>
      <input type="hidden" name="kouriCd" value=""/>
      <input type="hidden" name="buttonId" value="usageInfoInquiryBusinessButton1"/>
    </form>`;
      this.form = this.createCustomUI(dForm)
    }
    getInfo(){
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
      dataset[spnName] = [`="${dataset[spnName][0]}"`];
      return dataset;
    }
    getNo(){
      try{
        const ifdoc = document.querySelector('iframe').contentWindow.document;
        const td = Array.from(ifdoc.querySelector('.main-table').querySelectorAll('td'))[2];
        return td.textContent;
      }catch(e){
         return ''
      }
    }
    detectError(){
      const ifdoc = document.querySelector('iframe').contentWindow.document;
      const errorBox = ifdoc.querySelector('.imui-box-error-inner.inner-error');
      const detect = !!errorBox;
      if(detect){
        errorBox.parentNode.removeChild(errorBox);
      }
      return detect;
    }
    async switchPage(n){
      this.form.querySelector('[name=kyokyuKanriNum]').value = 
      this.form.querySelector('[name=chitenId]').value = n;
      this.form.submit();
      while(true){
        if(this.getNo() === n){
          return;
        }
        if(this.detectError()){
          throw 'Not found';
        }
        await wait(1000);
      }
    }
  };
  let instance = null;
  const currentUrl = location.href
  if(currentUrl.includes('ap00.www6.tepco.co.jp')){
    instance = new Den03()
  }else if(currentUrl.includes('sw-www.network.kyuden.co.jp')){
    instance = new Den09()
  }
  if(instance === null){
    alert('OCCTOの各エリア別ページで実行してください。')
    return;
  }
  instance.start();
  /*util funcs*/
  function wait(n){
    return new Promise(r=>setTimeout(r, n));
  }
})())