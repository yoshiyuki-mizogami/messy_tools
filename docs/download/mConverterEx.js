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
  var converted = extractNNum(txt.split(/\r?\n/));
  var tmpfile = writeTmpFileText(converted);
  openWithExcel(tmpfile);
}

main();

function extractNNum(lines){
  lines[0] = 'Nno,' + lines[0];
  for(var i = 1; i < lines.length;i++){
    var line = lines[i]
    var m = line.match(/\bN\d{9}/)
    var n = ''
    if(m){
      n = m[0]
    }
    lines[i] = n +',' + line
  }
  return lines.join('\r\n');
}

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