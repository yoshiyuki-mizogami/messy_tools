void(!function(){
  const version = '0.5.0';
  const spnName = '供給地点特定番号';
  const FAILED_LIMIT = 25;

  class BaseDownloader{
    host = '';
    name = '';
    constructor(code){
      const def = config[code];
      this.host = def.host;
      this.name = def.name;
    }
    createCsv(data){
      const header = Object.keys(data[0]);
      const headerLine = header.join(',');
      const csvLines = data.map(d=>{
        return header.map(h=>{
          const field = d[h];
          if(!field){
            return '';
          }
          return field.map(d=>d.trim()).filter(Boolean).join(' ');
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
      a.download = `${now()}_OCCTO地点データ_${this.name}.csv`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 3000);
    }
    createCustomUI(formText){
      document.documentElement.innerHTML = `<div style="vertical-align:top;display:inline-block;width:25%"><div>OCCTO Auto downloader Console ver ${version}</div>
        ${formText}
        <div style="text-align:center">
          <textarea class="input" style="text-align:center;font-family:meiryo;font-size:1.2rem;display:block;resize:none;width:300px;margin:auto;height:80vh" placeholder="地点番号リスト"></textarea>
          <button class="start" style="padding:0.5rem;border-radius:5px;background-color:white;border:solid 1px gray;">取得開始</button>
          <div class="progress"></div>
        </div>
        </div><iframe name="dframe" style="width:70%;height:80vh;display:inline-block;" src="${location.href}"></iframe>`;
        return document.querySelector('#form'); 
    }
    async waitPage(n){
      let count = 0;
      while(count < FAILED_LIMIT){
        const no = this.getNo();
        console.log('current', no);
        if(no === n){
          return;
        }
        if(this.detectError()){
          throw 'Not found';
        }
        await wait(1000);
      }
      throw 'Timeout';
    }
    detectError(){return false;}
    updateKey(){}
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
          await instance.updateKey();
          try{
            await instance.switchPage(l);
            await instance.waitPage(l);
            results.push(instance.getInfo());
          }catch(e){
            console.error(e);
            results.push({[spnName]:[`${l} ${e}`]});
          }
          await wait(1000);
          progress.textContent = `${ind+1}/${total}`;
        }, Promise.resolve());
        await instance.createCsv(results);
        ta.removeAttribute('disabled');
        btn.removeAttribute('disabled');
      });
    }
  }
  class Den03 extends BaseDownloader{
    constructor(){
      super('Tokyo');
    }
    createForm(){
      const orgForm = document.querySelector('#form');
      if(!orgForm){
        throw '元フォームが存在しません、東京の支援トップ画面で実行してください';
      }
      const dForm = `<form id="form" method="post" action="https://ap00.www6.tepco.co.jp/sw_web/LVA1RA/LVA1RA00101.faces" target="dframe">
      <input type="hidden" name="form" value="form"/>
      <input type="hidden" name="FW_TOKEN" value="${orgForm.querySelector('[name=FW_TOKEN]').value}"/>
      <input type="hidden" name="FW_SESWIN_ID" value="${orgForm.querySelector('[name=FW_SESWIN_ID]').value}"/>
      <input type="hidden" name="SENIMOTO_PAGE_ID" value="LVA1RA001G01"/>
      <input type="hidden" name="DTO-CTN_ID" value="1"/>
      <input type="hidden" name="javax.faces.ViewState" value="${orgForm.querySelector('[name="javax.faces.ViewState"]').value}"/>
      <input type="hidden" name="DTO-APFW_BUSINESS_FUNCTION_ID" value="LVA1RZ002"/>
      <input type="hidden" name="j_idt33" value=""/>
    </form>`;
      this.form = this.createCustomUI(dForm);
    }
    getInfo(){
      const ifdoc = document.querySelector('iframe').contentWindow.document;
      const tdAndTh= Array.from(ifdoc.querySelectorAll('table.style2 :is(td,th)'));
      const dataset = {};
      let lastProp = '';
      let isNextZip = false;
      const beforeZipTh = '供給地点住所';
      const zipName = '郵便番号';
      tdAndTh.forEach(el=>{
        if(el.tagName ==='TH'){
          if(isNextZip){
            dataset[zipName] = [el.textContent.replace(/\s/g, '')];
            isNextZip = false;
            return;
          }
          lastProp = el.textContent.replace(/\s/g, '');
          if(lastProp === beforeZipTh){
            isNextZip = true;
          }
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
        const td = Array.from(ifdoc.querySelector('table.style2').querySelectorAll('td'))[2];
        return td.textContent.trim();
      }catch(e){
        return '';
      }
    }
    async switchPage(n){
      this.form.querySelector('[name=DTO-CTN_ID]').value = n;
      this.form.submit();
    }
    updateKey(){
      this.form.querySelector('[name="javax.faces.ViewState"]').value = 
      document.querySelector('iframe').contentWindow.document.querySelector('[name="javax.faces.ViewState"]').value;
      this.form.querySelector('[name=FW_TOKEN]').value = 
      document.querySelector('iframe').contentWindow.document.querySelector('[name=FW_TOKEN]').value;
    }
  }
  class Den06 extends BaseDownloader{
    constructor(){
      super('Kansai');
    }
    createForm(){
      const dForm = `<form id="form" method="post" action="/sw_web/SW3TCAreaMainMenuController/clickKyokyuChiten.do" target="dframe" enctype="multipart/form-data">
      <input type="hidden" name="kyokyuChitenTokuteiNo" value=""/>
      <input type="hidden" name="flgJushoKeiyu" value="false"/>
      <input type="hidden" name="token" value="${document.querySelector('[name=token]').value}"/>
    </form>`;
      this.form = this.createCustomUI(dForm);
    }
    getInfo(){
      const ifdoc = document.querySelector('iframe').contentWindow.document;
      const tdAndTh= Array.from(ifdoc.querySelectorAll('table.style2 :is(td,th)'));
      const dataset = {};
      let lastProp = '';
      let isNextZip = false;
      const beforeZipTh = '供給地点住所';
      const zipName = '郵便番号';
      tdAndTh.forEach(el=>{
        if(el.tagName ==='TH'){
          if(isNextZip){
            dataset[zipName] = [el.textContent.replace(/\s/g, '')];
            isNextZip = false;
            return;
          }
          lastProp = el.textContent.replace(/\s/g, '');
          if(lastProp === beforeZipTh){
            isNextZip = true;
          }
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
    switchPage(n){
      this.form.querySelector('[name=kyokyuChitenTokuteiNo]').value = n;
      this.form.submit();
    }
    getNo(){
      try{
        const ifdoc = document.querySelector('iframe').contentWindow.document;
        const td = Array.from(ifdoc.querySelector('table.style2').querySelectorAll('td'))[2];
        return td.textContent.trim();
      }catch(e){
        return '';
      }
    }
    async updateKey(){
      const cw = document.querySelector('iframe').contentWindow;
      document.querySelector('[name=token]').value = cw.document.querySelector('[name=token]').value;
      try{
        cw.onClickBack();
        while( true ){
          const h = cw.document && cw.document.querySelector('#SCR_C_11_0010_form');
          if(h){
            document.querySelector('[name=token]').value = cw.document.querySelector('[name=token]').value;
            return;
          }
          await wait(1000);
        }
      }catch(e){console.error('onclickBack not found');}
    }
  }
  class Den09 extends BaseDownloader {
    constructor(){
      super('Kyushu');
    }
    createForm(){
      const dForm = `<form id="form" method="post" action="/sw_web/blc201/blc201g003" target="dframe">
      <input type="hidden" name="kyokyuKanriNum" value=""/>
      <input type="hidden" name="callback" value="blc101/blc101g001/setValueFromSession'"/>
      <input type="hidden" name="chitenId" value=""/>
      <input type="hidden" name="keiyakuSeqNo" value="1"/>
      <input type="hidden" name="kouriCd" value=""/>
      <input type="hidden" name="buttonId" value="usageInfoInquiryBusinessButton1"/>
    </form>`;
      this.form = this.createCustomUI(dForm);
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
        return td.textContent.trim();
      }catch(e){
        return '';
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
    }
  }
  const config = {
    Tokyo:{
      name:'東京電力',
      host:'ap00.www6.tepco.co.jp',
      class:Den03,
    },
    Kansai:{
      name:'関西電力',
      host:'sw-www4.kepco.co.jp',
      class:Den06,
    },
    KyuShu:{
      name:'九州電力',
      host:'sw-www.network.kyuden.co.jp',
      class:Den09,
    },
  };
  let instance = null;
  const currentUrl = location.href;
  Object.keys(config).some((key)=>{
    const conf = config[key];
    if(currentUrl.includes(conf.host)){
      instance = new conf.class();
      return true;
    }
  });
  if(instance === null){
    alert('OCCTOの各エリア別ページで実行してください。');
    return;
  }
  instance.start();
  /*util funcs*/
  function wait(n){
    return new Promise(r=>setTimeout(r, n));
  }
  function now(){
    const d = new Date();
    return `${d.getFullYear()}-${pad0(d.getMonth() + 1)}-${pad0(d.getDate())}_${pad0(d.getHours())}${pad0(d.getMinutes())}}${pad0(d.getSeconds())}}`;
  }
  function pad0(n){
    return ('' + n).padStart(2, '0');
  }
}());