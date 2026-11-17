(function(){
'use strict';
var MARCA='DOCUMENTO DE DEMOSTRACIÓN · NO VÁLIDO ANTE LA DGII · Generado por StackRD';
var WA='18293390257',TASA=1.18;
var TIPOS={'31':'Factura de Crédito Fiscal Electrónica','32':'Factura de Consumo Electrónica'};

var memoria={};
function leeSeq(clave){
  try{var v=parseInt(localStorage.getItem(clave),10);if(v>0)return v}catch(e){}
  return memoria[clave]||0;
}
function guardaSeq(clave,n){
  memoria[clave]=n;
  try{localStorage.setItem(clave,String(n))}catch(e){}
}
function siguienteSeq(demo,tipo){
  var clave='ecf-demo:'+demo+':'+tipo,n=Math.max(leeSeq(clave),memoria[clave]||0)+1;
  guardaSeq(clave,n);
  return n;
}
function pad(n,l){n=String(n);while(n.length<l)n='0'+n;return n}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(c){
  var neg=c<0;c=Math.abs(c);
  var e=Math.floor(c/100),d=pad(c%100,2);
  return (neg?'-':'')+String(e).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+d;
}
function dec(c){return (c/100).toFixed(2)}

/* documento del comprador: solo cantidad de dígitos y formato */
function evaluaDocumento(txt){
  var t=String(txt||'').trim();
  if(!t)return {ok:true,tipo:'32',doc:''};
  if(!/^[\d\s-]+$/.test(t))return {ok:false,error:'Usa solo números. Déjalo vacío para factura de consumo.'};
  var d=t.replace(/\D/g,'');
  if(d.length===9||d.length===11)return {ok:true,tipo:'31',doc:d};
  return {ok:false,error:'Debe tener 9 dígitos (RNC) u 11 (cédula). Déjalo vacío para factura de consumo.'};
}

/* montos en centavos enteros; los precios ya incluyen ITBIS */
function calcula(lines){
  var it=lines.map(function(l){
    var amt=Math.round(l.qty*l.price*100);
    var base=l.gravado?Math.round(amt/TASA):amt;
    return {desc:l.desc,qty:l.qty,price:l.price,gravado:!!l.gravado,monto:amt,base:base,itbis:amt-base};
  });
  var exento=0,grav=0;
  it.forEach(function(x){if(x.gravado)grav+=x.monto;else exento+=x.monto});
  var base=Math.round(grav/TASA),itbis=grav-base;
  var gl=it.filter(function(x){return x.gravado});
  if(gl.length){
    var s=gl.reduce(function(a,x){return a+x.base},0),df=base-s,u=gl[gl.length-1];
    u.base+=df;u.itbis-=df;
  }
  return {items:it,exento:exento,gravado:base,itbis:itbis,total:exento+base+itbis};
}

function fechaCorta(d){return pad(d.getDate(),2)+'-'+pad(d.getMonth()+1,2)+'-'+d.getFullYear()}
function fechaHora(d){return fechaCorta(d)+' '+pad(d.getHours(),2)+':'+pad(d.getMinutes(),2)+':'+pad(d.getSeconds(),2)}

function hashSimple(s){
  var h1=0xdeadbeef,h2=0x41c6ce57;
  for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return ((h2>>>0).toString(16)+(h1>>>0).toString(16)).toUpperCase();
}
function codigoSeguridad(texto){
  try{
    if(window.crypto&&crypto.subtle){
      return crypto.subtle.digest('SHA-256',new TextEncoder().encode(texto)).then(function(b){
        return Array.prototype.map.call(new Uint8Array(b),function(x){return pad(x.toString(16),2)}).join('').slice(0,6).toUpperCase();
      },function(){return hashSimple(texto).slice(0,6)});
    }
  }catch(e){}
  return Promise.resolve(hashSimple(texto).slice(0,6));
}

function qrSvg(texto){
  try{
    var q=qrcode(0,'M');q.addData(texto);q.make();
    var n=q.getModuleCount(),m=2,p='';
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(q.isDark(r,c))p+='M'+(c+m)+' '+(r+m)+'h1v1h-1z';
    var s=n+m*2;
    return '<svg class="ecf-qr-svg" viewBox="0 0 '+s+' '+s+'" role="img" aria-label="Código QR de la factura de demostración" shape-rendering="crispEdges"><rect width="'+s+'" height="'+s+'" fill="#fff"/><path d="'+p+'" fill="#000"/></svg>';
  }catch(e){return '<span class="ecf-qr-fallo">QR no disponible</span>'}
}

function xmlDoc(f){
  var t=f.calculo,L=[];
  L.push('<?xml version="1.0" encoding="UTF-8"?>');
  L.push('<!-- '+MARCA+' -->');
  L.push('<ECF>');
  L.push('  <Encabezado>');
  L.push('    <Version>1.0</Version>');
  L.push('    <IdDoc>');
  L.push('      <TipoeCF>'+f.tipo+'</TipoeCF>');
  L.push('      <eNCF>'+f.encf+'</eNCF>');
  L.push('      <TipoIngresos>01</TipoIngresos>');
  L.push('      <TipoPago>1</TipoPago>');
  L.push('    </IdDoc>');
  L.push('    <Emisor>');
  L.push('      <RNCEmisor>'+esc(f.emisor.rnc)+'</RNCEmisor>');
  L.push('      <RazonSocialEmisor>'+esc(f.emisor.nombre)+'</RazonSocialEmisor>');
  L.push('      <DireccionEmisor>'+esc(f.emisor.direccion)+'</DireccionEmisor>');
  L.push('      <FechaEmision>'+f.fecha+'</FechaEmision>');
  L.push('    </Emisor>');
  L.push('    <Comprador>');
  if(f.doc)L.push('      <RNCComprador>'+esc(f.doc)+'</RNCComprador>');
  L.push('      <RazonSocialComprador>'+esc(f.comprador)+'</RazonSocialComprador>');
  L.push('    </Comprador>');
  L.push('    <Totales>');
  L.push('      <MontoGravadoTotal>'+dec(t.gravado)+'</MontoGravadoTotal>');
  L.push('      <MontoGravadoI1>'+dec(t.gravado)+'</MontoGravadoI1>');
  L.push('      <MontoExento>'+dec(t.exento)+'</MontoExento>');
  L.push('      <ITBIS1>18</ITBIS1>');
  L.push('      <TotalITBIS>'+dec(t.itbis)+'</TotalITBIS>');
  L.push('      <TotalITBIS1>'+dec(t.itbis)+'</TotalITBIS1>');
  L.push('      <MontoTotal>'+dec(t.total)+'</MontoTotal>');
  L.push('    </Totales>');
  L.push('  </Encabezado>');
  L.push('  <DetallesItems>');
  t.items.forEach(function(x,i){
    L.push('    <Item>');
    L.push('      <NumeroLinea>'+(i+1)+'</NumeroLinea>');
    L.push('      <IndicadorFacturacion>'+(x.gravado?'1':'4')+'</IndicadorFacturacion>');
    L.push('      <NombreItem>'+esc(x.desc)+'</NombreItem>');
    L.push('      <CantidadItem>'+x.qty+'</CantidadItem>');
    L.push('      <PrecioUnitarioItem>'+dec(Math.round(x.base/x.qty))+'</PrecioUnitarioItem>');
    L.push('      <MontoItem>'+dec(x.base)+'</MontoItem>');
    L.push('    </Item>');
  });
  L.push('  </DetallesItems>');
  L.push('  <InformacionAdicional>');
  L.push('    <Observacion>'+esc(MARCA)+'</Observacion>');
  L.push('    <FechaHoraFirma>'+f.firma+'</FechaHoraFirma>');
  L.push('    <CodigoSeguridad>'+f.codigo+'</CodigoSeguridad>');
  L.push('  </InformacionAdicional>');
  L.push('</ECF>');
  return L.join('\n')+'\n';
}

function facturaHtml(f){
  var t=f.calculo;
  var filas=t.items.map(function(x){
    return '<tr><td class="c">'+x.qty+'</td><td>'+esc(x.desc)+(x.gravado?'':' <em>(exento)</em>')+'</td><td class="n">'+money(Math.round(x.monto/x.qty))+'</td><td class="n">'+money(x.itbis)+'</td><td class="n">'+money(x.monto)+'</td></tr>';
  }).join('');
  return ''+
  '<div class="ecf-marca" aria-hidden="true">DEMOSTRACIÓN</div>'+
  '<div class="ecf-aviso">'+esc(MARCA)+'</div>'+
  '<div class="ecf-cab">'+
    '<div class="ecf-emisor"><h2 id="ecf-titulo-emisor">'+esc(f.emisor.nombre)+'</h2><p>RNC '+esc(f.emisor.rnc)+' (ficticio)</p><p>'+esc(f.emisor.direccion)+'</p></div>'+
    '<div class="ecf-ident"><b>'+TIPOS[f.tipo]+'</b><span>Tipo '+f.tipo+'</span><span class="ecf-encf">e-NCF '+f.encf+'</span></div>'+
  '</div>'+
  '<dl class="ecf-datos">'+
    '<div><dt>Fecha de emisión</dt><dd>'+f.fecha+'</dd></div>'+
    '<div><dt>Fecha y hora de firma</dt><dd>'+f.firma+'</dd></div>'+
    '<div><dt>Cliente</dt><dd>'+esc(f.comprador)+'</dd></div>'+
    '<div><dt>'+(f.doc?(f.doc.length===9?'RNC':'Cédula'):'Documento')+'</dt><dd>'+(f.doc?esc(f.doc):'Consumidor final')+'</dd></div>'+
    (f.direccionCliente?'<div class="ecf-ancho"><dt>Dirección</dt><dd>'+esc(f.direccionCliente)+'</dd></div>':'')+
  '</dl>'+
  '<table class="ecf-tabla"><thead><tr><th class="c">Cant.</th><th>Descripción</th><th class="n">Precio</th><th class="n">ITBIS</th><th class="n">Importe</th></tr></thead><tbody>'+filas+'</tbody></table>'+
  '<p class="ecf-nota">Precios con ITBIS incluido. Importes en RD$.</p>'+
  '<div class="ecf-pie">'+
    '<div class="ecf-qr">'+f.qr+'<span>Código de seguridad</span><b>'+f.codigo+'</b></div>'+
    '<table class="ecf-totales"><tbody>'+
      '<tr><td>Subtotal exento</td><td class="n">'+money(t.exento)+'</td></tr>'+
      '<tr><td>Subtotal gravado</td><td class="n">'+money(t.gravado)+'</td></tr>'+
      '<tr><td>ITBIS 18%</td><td class="n">'+money(t.itbis)+'</td></tr>'+
      '<tr class="ecf-total"><td>Total</td><td class="n">RD$ '+money(t.total)+'</td></tr>'+
    '</tbody></table>'+
  '</div>'+
  '<div class="ecf-aviso ecf-aviso-pie">'+esc(MARCA)+'</div>';
}

var overlay,dialog,paper,btnPdf,btnXml,btnWa,btnCerrar,lastFocus,actual=null;
function focusables(){
  return Array.prototype.filter.call(dialog.querySelectorAll('a[href],button:not([disabled])'),function(x){return x.offsetParent!==null});
}
function construye(){
  overlay=document.createElement('div');
  overlay.className='ecf-overlay';overlay.hidden=true;
  overlay.innerHTML=
    '<div class="ecf-dialog" role="dialog" aria-modal="true" aria-labelledby="ecf-titulo-emisor" tabindex="-1">'+
      '<div class="ecf-papel" id="ecf-papel"></div>'+
      '<div class="ecf-acciones">'+
        '<button type="button" class="ecf-b ecf-b-p" data-a="pdf">Descargar PDF</button>'+
        '<button type="button" class="ecf-b" data-a="xml">Descargar XML</button>'+
        '<a class="ecf-b ecf-b-wa" data-a="wa" target="_blank" rel="noopener">Enviar por WhatsApp</a>'+
        '<button type="button" class="ecf-b ecf-b-c" data-a="cerrar">Cerrar</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  dialog=overlay.firstChild;paper=overlay.querySelector('#ecf-papel');
  btnWa=overlay.querySelector('[data-a=wa]');
  overlay.addEventListener('click',function(e){
    if(e.target===overlay){cierra();return}
    var b=e.target.closest('[data-a]');if(!b)return;
    if(b.dataset.a==='cerrar')cierra();
    if(b.dataset.a==='pdf')imprime();
    if(b.dataset.a==='xml')bajaXml();
  });
  document.addEventListener('keydown',function(e){
    if(overlay.hidden)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cierra();return}
    if(e.key==='Tab'){
      var f=focusables();if(!f.length)return;
      var i=f.indexOf(document.activeElement);
      if(e.shiftKey&&(i<=0)){e.preventDefault();f[f.length-1].focus()}
      else if(!e.shiftKey&&(i===f.length-1||i===-1)){e.preventDefault();f[0].focus()}
    }
  },true);
  document.addEventListener('focusin',function(e){
    if(!overlay.hidden&&!dialog.contains(e.target)){var f=focusables();if(f.length)f[0].focus()}
  });
}
function abre(f){
  if(!overlay)construye();
  actual=f;lastFocus=document.activeElement;
  paper.innerHTML=facturaHtml(f);
  btnWa.href='https://wa.me/'+WA+'?text='+encodeURIComponent('Factura e-CF de demostración '+f.encf+' por RD$ '+money(f.calculo.total)+'\nHola, vi la demo de factura electrónica de '+f.emisor.nombre+' y quiero esto para mi negocio.');
  overlay.hidden=false;
  document.documentElement.classList.add('ecf-abierto');
  dialog.scrollTop=0;paper.scrollTop=0;
  var b=overlay.querySelector('[data-a=pdf]');b.focus();
}
function cierra(){
  if(!overlay||overlay.hidden)return;
  overlay.hidden=true;
  document.documentElement.classList.remove('ecf-abierto');
  if(lastFocus&&lastFocus.focus)lastFocus.focus();
}
function imprime(){
  if(!actual)return;
  var previo=document.title;document.title=actual.encf;
  var fin=function(){document.title=previo;window.removeEventListener('afterprint',fin)};
  window.addEventListener('afterprint',fin);
  window.print();
}
function bajaXml(){
  if(!actual)return;
  var blob=new Blob([xmlDoc(actual)],{type:'application/xml;charset=utf-8'});
  var u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=actual.encf+'.xml';document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(u);a.remove()},500);
}

function genera(opts,orden,docTxt){
  var ev=evaluaDocumento(docTxt);
  if(!ev.ok)return Promise.reject(new Error(ev.error));
  var calculo=calcula(orden.lines),tipo=ev.tipo;
  var n=siguienteSeq(opts.demo,tipo),encf='E'+tipo+pad(n,10);
  var ahora=new Date(),fecha=fechaCorta(ahora),firma=fechaHora(ahora);
  var cli=(orden.cliente&&orden.cliente.nombre)||'';
  var comprador=cli||(tipo==='31'?'Cliente con crédito fiscal':'Consumidor final');
  var contenido=[encf,opts.rnc,dec(calculo.total),firma].concat(calculo.items.map(function(x){return x.desc+'x'+x.qty+'='+x.monto})).join('|');
  return Promise.resolve(codigoSeguridad(contenido)).then(function(codigo){
    var qr=qrSvg(['e-NCF '+encf,'RNC emisor '+opts.rnc,'Total RD$ '+dec(calculo.total),'Fecha '+fecha,'DEMO'].join(' | '));
    return {tipo:tipo,encf:encf,doc:ev.doc,comprador:comprador,direccionCliente:(orden.cliente&&orden.cliente.direccion)||'',
      emisor:{nombre:opts.negocio,rnc:opts.rnc,direccion:opts.direccion},fecha:fecha,firma:firma,codigo:codigo,qr:qr,calculo:calculo};
  });
}

var uid=0;
function mount(el,opts){
  var id='ecf-doc-'+(++uid);
  el.classList.add('ecf-bloque');el.hidden=true;
  el.innerHTML=
    '<label class="ecf-label" for="'+id+'">RNC o cédula para crédito fiscal <span>(opcional)</span></label>'+
    '<input class="ecf-input" id="'+id+'" type="text" inputmode="numeric" autocomplete="off" placeholder="Déjalo vacío para factura de consumo" aria-describedby="'+id+'-m">'+
    '<p class="ecf-msg" id="'+id+'-m" role="status"></p>'+
    '<button type="button" class="ecf-gen">Generar factura electrónica</button>'+
    '<p class="ecf-peq">Demostración: no se consulta ningún registro ni se envía nada a la DGII.</p>';
  var inp=el.querySelector('input'),msg=el.querySelector('.ecf-msg'),btn=el.querySelector('.ecf-gen');
  inp.addEventListener('input',function(){
    var ev=evaluaDocumento(inp.value);
    msg.textContent=!ev.ok?ev.error:(ev.tipo==='31'?'Se emitirá Factura de Crédito Fiscal (tipo 31).':'');
    msg.classList.toggle('ecf-err',!ev.ok);
    inp.setAttribute('aria-invalid',ev.ok?'false':'true');
  });
  btn.addEventListener('click',function(){
    var orden=opts.getOrder();if(!orden||!orden.lines||!orden.lines.length)return;
    var ev=evaluaDocumento(inp.value);
    if(!ev.ok){msg.textContent=ev.error;msg.classList.add('ecf-err');inp.setAttribute('aria-invalid','true');inp.focus();return}
    genera(opts,orden,inp.value).then(abre);
  });
  return {refresh:function(){var o=opts.getOrder();el.hidden=!(o&&o.lines&&o.lines.length)}};
}

window.EcfDemo={mount:mount,calcula:calcula,evaluaDocumento:evaluaDocumento,generar:function(opts,orden,doc){return genera(opts,orden,doc).then(function(f){abre(f);return f})},xml:xmlDoc,MARCA:MARCA};
})();
