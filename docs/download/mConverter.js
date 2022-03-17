var sign = 'Add BOM and openexcel converter ver 1.0.0 auther yoshiyuki-mizogami';
var fs = new ActiveXObject('Scripting.FileSystemObject');
var ado = new ActiveXObject('ADODB.Stream');
var arg = WScript.arguments
function main(){
  if(arg.count() === 0){
   alert('csvファイルをドロップしてください')
   return
  }
  var csvFile = arg(0);
  if(!/\.csv$/i.test(csvFile)){
     return alert('csvファイルではありません');
  }
  var txt  = readFileText(csvFile);
  var tmpfile = writeTmpFileText(txt);
  openWithExcel(tmpfile);
}

main();

function openWithExcel(filepath){
  var ex = new ActiveXObject('Excel.Application');
  ex.visible = true
  ex.workBooks.open(filepath);
}
var adTypeText = 2
function readFileText(filepath){
  ado.charset = 'utf-8';
  ado.type = 2
  ado.open();
  ado.loadFromFile(filepath);
  var txt = ado.readText(-1);
  ado.close();
  return txt
}
function writeTmpFileText(content){
  var tmpdir = fs.getSpecialFolder(2);//tmpdir
  var filename = fs.getTempName() + '.csv';
  var filepath = fs.buildPath(tmpdir, filename);
  ado.charset = 'utf-8';
  ado.type = 2
  ado.open();
  ado.writeText(content);
  ado.saveToFile(filepath, 2);
  ado.close();
  return filepath
}

function alert(s){
  WScript.echo(s);
}