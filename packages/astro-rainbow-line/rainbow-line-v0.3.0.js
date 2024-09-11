/*!
@file rainbow-line - A custom element that displays a cut line animated with rainbow colors
@author Wolfger Schramm <wolfger@spearwolf.de>
@version 0.3.0+vanilla.20240911

Copyright 2024 Wolfger Schramm

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
var h=class c extends HTMLElement{static InitialHTML=`
    <style>
      :host {
        display: block;
        width: 320px;
        height: 240px;
      }
      .frame {
        position: relative;
        height: 100%;
      }
      canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    </style>
    <div class="frame">
      <canvas></canvas>
    </div>
  `;#e=0;#t=0;#i=0;constructor(e=c.InitialHTML){super(),this.shadow=this.attachShadow({mode:"open"}),this.shadow.innerHTML=e,this.worker=void 0}queryCanvasElement(){return this.shadow.querySelector("canvas")}createWorker(){throw new Error("createWorker() must be implemented by subclass")}getContextAttributes(){return this.hasAttribute("no-alpha")?{alpha:!1}:{alpha:!0}}#r(){let e=this.canvas.getBoundingClientRect();return this.#e=e.width,this.#t=e.height,{width:e.width,height:e.height}}#n(e){let t=this.canvas.getBoundingClientRect();(this.#e!==t.width||this.#t!==t.height)&&(this.#e=t.width,this.#t=t.height,e(t.width,t.height))}#a=()=>{this.#n((e,t)=>{this.worker.postMessage({resize:{width:e,height:t}})}),this.#s()};#s(){this.#i=requestAnimationFrame(this.#a)}#l(){cancelAnimationFrame(this.#i)}#o(){this.canvas=this.queryCanvasElement();let e=this.canvas.transferControlToOffscreen();this.worker=this.createWorker(),this.worker.postMessage({canvas:e,contextAttributes:this.getContextAttributes(),...this.getInitialWorkerAttributes()},[e])}getInitialWorkerAttributes(){return{}}asNumberValue(e,t){if(this.hasAttribute(e)){let s=parseFloat(this.getAttribute(e));return isNaN(s)?t:s}return t}connectedCallback(){this.worker||this.#o(),this.worker.postMessage({isConnected:!0,resize:this.#r()}),this.#s()}disconnectedCallback(){this.worker.postMessage({isConnected:!1}),this.#l()}};var u=i=>i==="left"?1:-1,d=i=>typeof i=="string"&&i.trim()||void 0,r=class extends h{static observedAttributes=["color-slice-width","slice-cycle-time","cycle-direction","cycle-colors"];constructor(){super(`
      <style>
        :host {
          display: block;
          width: 100%;
          height: 3px;
        }
        .rainbow {
          position: relative;
          height: 100%;
          background: linear-gradient(in hsl longer hue 45deg, #f00 0 0);
        }
        canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      </style>
      <div class="rainbow">
        <canvas></canvas>
      </div>`)}createWorker(){return new Worker(new URL("rainbow-line.worker.js",import.meta.url),{type:"module"})}getContextAttributes(){return{alpha:!1}}getInitialWorkerAttributes(){return{"color-slice-width":this.asNumberValue("color-slice-width",10),"slice-cycle-time":this.asNumberValue("slice-cycle-time",7),"cycle-direction":u(this.getAttribute("cycle-direction")||"right"),"cycle-colors":this.hasAttribute("cycle-colors")?d(this.getAttribute("cycle-colors")):void 0,"cycle-colors-repeat":this.asNumberValue("cycle-colors-repeat",1)}}attributeChangedCallback(e,t,s){if(!this.worker)return;if(e==="cycle-colors"){this.worker.postMessage({"cycle-colors":d(s)});return}let n=e==="cycle-direction"?u(s):parseFloat(s);typeof n=="number"&&(isNaN(n)||this.worker.postMessage({[e]:n}))}};function a(i){let e=new Blob([i],{type:"text/javascript"}),t=URL.createObjectURL(e),s=new Worker(t);return URL.revokeObjectURL(t),s}function l(){return a(`var Be=Object.defineProperty;var Ee=e=>{throw TypeError(e)};var He=(e,t,i)=>t in e?Be(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var h=(e,t,i)=>He(e,typeof t!="symbol"?t+"":t,i),ie=(e,t,i)=>t.has(e)||Ee("Cannot "+i);var a=(e,t,i)=>(ie(e,t,"read from private field"),i?i.call(e):t.get(e)),d=(e,t,i)=>t.has(e)?Ee("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(e):t.set(e,i),u=(e,t,i,r)=>(ie(e,t,"write to private field"),r?r.call(e,i):t.set(e,i),i),M=(e,t,i)=>(ie(e,t,"access private method"),i);var ge=(e,t,i,r)=>({set _(n){u(e,t,n,i)},get _(){return a(e,t,r)}});var Ue=Object.defineProperty,je=(e,t,i)=>t in e?Ue(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i,m=(e,t,i)=>(je(e,typeof t!="symbol"?t+"":t,i),i),Ke=(e,t,i)=>{if(!t.has(e))throw TypeError("Cannot "+i)},Ye=(e,t,i)=>(Ke(e,t,"read from private field"),i?i.call(e):t.get(e)),Je=(e,t,i)=>{if(t.has(e))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(e):t.set(e,i)},se={Max:Number.POSITIVE_INFINITY,AAA:1e9,BB:1e6,C:1e3,Default:0,Low:-1e4,Min:Number.NEGATIVE_INFINITY},b="*",Le=1,le=2,ae=4,we=(Symbol.eventize||(Symbol.eventize=Symbol("eventize")),Symbol.eventize),Xe="[eventize]",H=e=>e===b,Fe=e=>{switch(typeof e){case"string":case"symbol":return!0;default:return!1}},ze=typeof console!="undefined",Ze=ze?console[console.warn?"warn":"log"].bind(console,Xe):()=>{},Ve=(e,t,i)=>(Object.defineProperty(e,t,{value:i,configurable:!0}),e),et=0,Re=class{constructor(){m(this,"events",new Map),m(this,"eventNames",new Set)}static publish(e){e.sort((t,i)=>t.order-i.order).forEach(t=>t.emit())}add(e){Array.isArray(e)?e.forEach(t=>this.eventNames.add(t)):this.eventNames.add(e)}remove(e){Array.isArray(e)?e.forEach(t=>this.eventNames.delete(t)):this.eventNames.delete(e),this.clear(e)}clear(e){Array.isArray(e)?e.forEach(t=>this.events.delete(t)):this.events.delete(e)}retain(e,t){this.eventNames.has(e)&&this.events.set(e,{args:t,order:et++})}isKnown(e){return this.eventNames.has(e)}emit(e,t,i=[]){if(H(e))this.eventNames.forEach(r=>this.emit(r,t,i));else if(this.events.has(e)){let{order:r,args:n}=this.events.get(e);i.push({order:r,emit:()=>t.apply(e,n)})}return i}},ne=(e,t,i,r)=>{if(typeof t=="function"){let n=t.apply(e,i);n!=null&&(r==null||r(n))}},tt=(e,t,i,r)=>ne(t,t.emit,[e].concat(i),r),it=e=>{switch(typeof e){case"function":return Le;case"string":case"symbol":return le;case"object":return ae}},rt=0,st=()=>++rt,Ie=class{constructor(e,t,i,r=null){m(this,"id"),m(this,"eventName"),m(this,"isCatchEmAll"),m(this,"priority"),m(this,"listener"),m(this,"listenerObject"),m(this,"listenerType"),m(this,"callAfterApply"),m(this,"isRemoved"),m(this,"refCount"),this.id=st(),this.eventName=e,this.isCatchEmAll=H(e),this.listener=i,this.listenerObject=r,this.priority=t,this.listenerType=it(i),this.callAfterApply=void 0,this.isRemoved=!1,this.refCount=1}isEqual(e,t=null){if(e===this)return!0;let i=typeof e;return i==="number"&&e===this.id?!0:t===null&&(i==="string"||i==="symbol")?e===b||e===this.eventName:this.listener===e&&this.listenerObject===t}apply(e,t,i){if(this.isRemoved)return;let{listener:r,listenerObject:n}=this;switch(this.listenerType){case Le:ne(n,r,t,i),this.callAfterApply&&this.callAfterApply();break;case le:ne(n,n[r],t,i),this.callAfterApply&&this.callAfterApply();break;case ae:{let f=r[e];if(this.isCatchEmAll||this.eventName===e){if(typeof f=="function"){let s=f.apply(r,t);s!=null&&(i==null||i(s))}else tt(e,r,t,i);this.callAfterApply&&this.callAfterApply()}break}}}},nt=(e,t)=>e.priority!==t.priority?t.priority-e.priority:e.id-t.id,Ae=e=>e==null?void 0:e.slice(0),Ce=(e,t)=>{let i=e.indexOf(t);i>-1&&e.splice(i,1)},ot=e=>e===ae||e===le,oe=(e,t,i)=>{let r=e.findIndex(n=>n.isEqual(t,i));r>-1&&(e[r].isRemoved=!0,e.splice(r,1))},G=(e,t,i)=>{let r=[];for(let n of e)(t==null&&n.listenerObject===i||n.eventName===t&&n.listener===i)&&r.push(n);for(let n of r)oe(e,n,void 0)},re=e=>{e&&(e.forEach(t=>{t.isRemoved=!0}),e.length=0)},ct=(e,t)=>e.listenerType===t.listenerType?e.priority===t.priority&&e.eventName===t.eventName&&e.listenerObject===t.listenerObject&&e.listener===t.listener:!1,lt=(e,t)=>{if(ot(e.listenerType))return t.find(i=>ct(e,i))},at=(e,t)=>{let i=lt(e,t);return i?(i.refCount+=1,i):(t.push(e),t.sort(nt),e)},ce,ft=class{constructor(){m(this,"namedListeners"),m(this,"catchEmAllListeners"),Je(this,ce,e=>{let t=this.namedListeners.get(e);return t||(t=[],this.namedListeners.set(e,t)),t}),this.namedListeners=new Map,this.catchEmAllListeners=[]}add(e){return at(e,e.isCatchEmAll?this.catchEmAllListeners:Ye(this,ce).call(this,e.eventName))}remove(e,t,i=!1){t==null&&Array.isArray(e)?e.forEach(r=>this.remove(r,null,i)):e==null||t==null&&H(e)?this.removeAllListeners():t==null&&Fe(e)?re(this.namedListeners.get(e)):e instanceof Ie?e.isRemoved||(e.refCount-=1,e.refCount<1&&(e.isRemoved=!0,this.namedListeners.forEach(r=>Ce(r,e)),Ce(this.catchEmAllListeners,e))):i?H(e)?G(this.catchEmAllListeners,b,e):this.namedListeners.forEach(r=>G(r,e,t)):(this.namedListeners.forEach(r=>{oe(r,e,t),G(r,void 0,e)}),oe(this.catchEmAllListeners,e,t),G(this.catchEmAllListeners,void 0,e))}removeAllListeners(){this.namedListeners.forEach(e=>re(e)),this.namedListeners.clear(),re(this.catchEmAllListeners)}forEach(e,t){let i=Ae(this.catchEmAllListeners),r=Ae(this.namedListeners.get(e));if(e===b||!r||r.length===0)i.forEach(t);else if(i.length===0)r.forEach(t);else{let n=r.length,f=i.length,s=0,o=0;for(;s<n||o<f;){if(s<n){let l=r[s];if(o>=f||l.priority>=i[o].priority){t(l),++s;continue}}o<f&&(t(i[o]),++o)}}}getSubscriptionCount(){let e=this.catchEmAllListeners.length;for(let t of this.namedListeners.values())e+=t.length;return e}};ce=new WeakMap;var Te=e=>!!(e&&e[we]),ht=(e,t,i,r,n,f,s)=>{let o=e.add(new Ie(i,r,n,f));return t.emit(i,o,s),o},ut=(e,t,i,r)=>{let n=i.length,f=typeof i[0],s,o,l,c;if(n>=2&&n<=3&&f==="number"?(s=b,[o,l,c]=i):n>=3&&n<=4&&typeof i[1]=="number"?[s,o,l,c]=i:(o=se.Default,f==="string"||f==="symbol"||Array.isArray(i[0])?[s,l,c]=i:(s=b,[l,c]=i)),!l&&ze)throw Ze("called with insufficient arguments!",i),"subscribeTo() called with insufficient arguments!";let p=C=>Ge=>ht(e,t,Ge,C,l,c,r);return Array.isArray(s)?s.map(C=>Array.isArray(C)?p(C[1])(C[0]):p(o)(C)):p(o)(s)},be=(e,t,i)=>{let r=[],n=ut(e,t,i,r);return Re.publish(r),n},Se=e=>t=>{t.callAfterApply=()=>{e==null||e()}},xe=(e,t)=>Object.assign(()=>e.off(t),Array.isArray(t)?{listeners:t}:{listener:t});function B(e){if(Te(e))return e;let t=new ft,i=new Re;Ve(e,we,{keeper:i,store:t});let r=s=>{let o=be(t,i,s),l=xe(f,o),c=!1,p=()=>{c||(l(),c=!0)};return Array.isArray(o)?o.forEach(Se(p)):Se(p)(o),p},n=(s,o,l)=>{Array.isArray(s)?s.forEach(c=>{t.forEach(c,p=>p.apply(c,o,l)),i.retain(c,o)}):s!==b&&(t.forEach(s,c=>{c.apply(s,o,l)}),i.retain(s,o))},f=Object.assign(e,{on(...s){return xe(f,be(t,i,s))},once(...s){return r(s)},onceAsync(s){return new Promise(o=>{r([s,o])})},off(s,o){let l=typeof s,c=o!=null&&(l==="string"||l==="symbol");t.remove(s,o,c),Array.isArray(s)?i.remove(s.filter(p=>typeof p=="string")):Fe(s)&&i.remove(s)},emit(s,...o){n(s,o)},emitAsync(s,...o){let l=[];return n(s,o,c=>{l.push(c)}),l=l.map(c=>Array.isArray(c)?Promise.all(c):Promise.resolve(c)),l.length>0?Promise.all(l):Promise.resolve()},retain(s){i.add(s)},retainClear(s){i.clear(s)}});return f}var R=(()=>{let e=(t={})=>B(t);return e.inject=B,e.extend=t=>B(Object.create(t)),e.create=t=>{let i=B({});return i.on(b,se.Default,t),i},e.is=Te,e.Priority=se,e})();var P,_,I=class{constructor(t="id",i=1){d(this,P);d(this,_);u(this,P,t),u(this,_,i)}make(){return Symbol(\`\${a(this,P)}\${ge(this,_)._++}\`)}};P=new WeakMap,_=new WeakMap;var dt=0;function De(){return dt>0}var U=Symbol("signal"),fe=Symbol("destroySignal"),he=Symbol("createEffect"),Oe=Symbol("destroyEffect");var T=R({}),j=R({}),S=R({});var $,x=class{constructor(){d(this,$,new Set)}batch(t){a(this,$).add(t)}run(){S.emit(Array.from(a(this,$)))}};$=new WeakMap,h(x,"current");var Me=()=>x.current;function ue(e){let t=x.current;t?t=void 0:t=x.current=new x;try{e()}finally{t&&(x.current=void 0,t.run())}}var de=[],K=()=>de.at(-1),Pe=(e,t)=>{de.push(e);try{return t()}finally{de.pop()}};var yt=e=>e!=null&&typeof e.then=="function",L,w,F,z,D,g=class g{constructor(t,i){h(this,"id");h(this,"callback");d(this,L);d(this,w,new Set);d(this,F,new Set);h(this,"parentEffect");h(this,"childEffects",[]);h(this,"curChildEffectSlot",0);h(this,"autorun",!0);h(this,"shouldRun",!0);d(this,z);d(this,D,!1);var r;this.callback=t,this.autorun=(r=i==null?void 0:i.autorun)!=null?r:!0,u(this,z,i==null?void 0:i.dependencies),this.id=g.idGen.make(),S.on(this.id,"recall",this),++g.count}hasStaticDeps(){return a(this,z)!=null&&a(this,z).length>0}saveSignalsFromDeps(){for(let t of a(this,z))this.whenSignalIsRead(ye(t).id)}static createEffect(t,i,r){let n=Array.isArray(i)?i:void 0,f=n?r!=null?r:{dependencies:n}:i;f&&n&&(f.dependencies=n);let s,o=K();return o!=null?(s=o.getCurrentChildEffect(),s==null&&(s=new g(t,f),o.attachChildEffect(s),S.emit(he,s)),o.curChildEffectSlot++):(s=new g(t,f),S.emit(he,s)),s.hasStaticDeps()?s.saveSignalsFromDeps():s.autorun&&s.run(),[s.run.bind(s),s.destroy.bind(s)]}getCurrentChildEffect(){return this.childEffects[this.curChildEffectSlot]}attachChildEffect(t){this.childEffects.push(t),this.parentEffect=this}run(){if(a(this,D)||!this.shouldRun)return;let t=Me();t?t.batch(this.id):(this.runCleanupCallback(),this.curChildEffectSlot=0,this.shouldRun=!1,this.hasStaticDeps()?u(this,L,this.callback()):u(this,L,Pe(this,this.callback)))}recall(){this.shouldRun=!0,this.autorun&&this.run()}whenSignalIsRead(t){a(this,w).has(t)||(a(this,w).add(t),T.on(t,"recall",this),j.once(t,fe,this))}[fe](t){!a(this,F).has(t)&&a(this,w).has(t)&&(a(this,F).add(t),T.off(t,this),a(this,F).size===a(this,w).size&&this.destroy())}runCleanupCallback(){if(a(this,L)!=null){let t=a(this,L);u(this,L,void 0),yt(t)?Promise.resolve(t).then(i=>{typeof i=="function"&&i()}):t()}}destroy(){a(this,D)||(S.emit(Oe,this),this.runCleanupCallback(),T.off(this),S.off(this),j.off(this),u(this,D,!0),a(this,w).clear(),a(this,F).clear(),this.childEffects.forEach(t=>{t.destroy()}),this.childEffects.length=0,--g.count)}};L=new WeakMap,w=new WeakMap,F=new WeakMap,z=new WeakMap,D=new WeakMap,h(g,"idGen",new I("ef")),h(g,"count",0);var Y=g;var O=(...e)=>Y.createEffect(...e);var mt=new I("si");function _e(e){var t;De()||(t=K())==null||t.whenSignalIsRead(e)}function $e(e,t,i){T.emit(e,t,i)}var pt=e=>typeof e=="function"&&U in e,vt=e=>{let t=i=>{var r;return i?O(()=>(e.destroyed||_e(e.id),i(e.value)),[t]):e.destroyed||((r=e.beforeReadFn)==null||r.call(e),_e(e.id)),e.value};return Object.defineProperty(t,U,{value:e}),t},v,J=class J{constructor(t,i){h(this,"id");h(this,"lazy");h(this,"compareFn");h(this,"beforeReadFn");h(this,"muted",!1);h(this,"destroyed",!1);d(this,v);h(this,"valueFn");h(this,"reader");h(this,"writer",(t,i)=>{var o,l,c;let r=(o=i==null?void 0:i.lazy)!=null?o:!1,n=(l=i==null?void 0:i.compareFn)!=null?l:this.compareFn,f=n!=null?n:(p,C)=>p===C;if((r!==this.lazy||r&&t!==this.valueFn||!r&&!f(t,a(this,v)))&&(r?(u(this,v,void 0),this.valueFn=t,this.lazy=!0):(u(this,v,t),this.valueFn=void 0,this.lazy=!1),!this.muted&&!this.destroyed)){$e(this.id,a(this,v));return}((c=i==null?void 0:i.touch)!=null?c:!1)&&$e(this.id,a(this,v),{touch:!0})});this.id=mt.make(),++J.instanceCount,this.lazy=t,this.lazy?(this.value=void 0,this.valueFn=i):(this.value=i,this.valueFn=void 0),this.reader=vt(this)}get value(){return this.lazy&&(u(this,v,this.valueFn()),this.valueFn=void 0,this.lazy=!1),a(this,v)}set value(t){u(this,v,t)}};v=new WeakMap,h(J,"instanceCount",0);var me=J,ye=e=>e==null?void 0:e[U];function N(e=void 0,t){var r;let i;if(pt(e))i=ye(e);else{let n=(r=t==null?void 0:t.lazy)!=null?r:!1;i=new me(n,e),i.beforeReadFn=t==null?void 0:t.beforeReadFn,i.compareFn=t==null?void 0:t.compareFn}return[i.reader,i.writer]}var y,W,k,A,pe,We,ke,Ne=(y=class{constructor(){d(this,A);d(this,W,0);d(this,k);R(this);let[t,i]=N(null),[r,n]=N(!1),[f,s]=N(0),[o,l]=N(0);Object.defineProperties(this,{canvas:{get:()=>t(),set:c=>{i(c)},enumerable:!0},isConnected:{get:()=>r(),set:c=>{n(c)},enumerable:!0},canvasWidth:{get:()=>f(),set:c=>{s(c)},enumerable:!0},canvasHeight:{get:()=>o(),set:c=>{l(c)},enumerable:!0}}),this.now=0,this.retain([y.Canvas,y.Init,y.Resize]),O(()=>{this.canvas&&this.emit(y.Canvas,this,a(this,k))},[t]),O(()=>{this.ready&&this.emit(y.Init,this)},[t,r]),O(()=>{this.emit(y.Resize,this)},[f,o])}get ready(){return this.canvas&&this.isConnected}parseMessageData(t){t&&(t.canvas&&(u(this,k,t.contextAttributes||void 0),this.canvas=t.canvas),t.isConnected&&this.isConnected!==t.isConnected&&(this.isConnected=t.isConnected,this.isConnected?M(this,A,pe).call(this):M(this,A,We).call(this)),t.resize&&this.canvas&&(this.canvas.width=Math.floor(t.resize.width),this.canvas.height=Math.floor(t.resize.height)))}},W=new WeakMap,k=new WeakMap,A=new WeakSet,pe=function(){u(this,W,requestAnimationFrame(t=>M(this,A,ke).call(this,t)))},We=function(){cancelAnimationFrame(a(this,W))},ke=function(t){this.ready&&(ue(()=>{this.canvasWidth=this.canvas.width,this.canvasHeight=this.canvas.height}),this.now=t/1e3,this.canvasWidth>0&&this.canvasHeight>0&&this.emit(y.Frame,this)),M(this,A,pe).call(this)},h(y,"Canvas","onCanvas"),h(y,"Init","onInit"),h(y,"Resize","onResize"),h(y,"Frame","onFrame"),y);var Qe=new Ne,Z=10,Q=7,ve=-1,V,ee=1,q=null,Et=1024,E=null,X=null,te=null;Qe.on({onCanvas({canvas:e},t){q=e.getContext("2d",t)},onFrame({now:e,canvasWidth:t,canvasHeight:i}){let r=Z<1?Math.round(Z*t):Z,n=0;for(;n<t;){let f=n/t;if(V===void 0){let s=e%Q*ve*360/Q;q.fillStyle=\`hsl(\${f*360+s}, 100%, 50%)\`}else{let s=ee<1?t/(ee*t):ee,o=e%Q*ve/Q,l=(f+o)*s%1;l<0&&(l+=1),q.fillStyle=gt(l)}q.fillRect(n,0,r,i),n+=r}}});function qe(e){if(Qe.parseMessageData(e),"color-slice-width"in e&&(Z=e["color-slice-width"]),"slice-cycle-time"in e&&(Q=e["slice-cycle-time"]),"cycle-direction"in e&&(ve=e["cycle-direction"]),"cycle-colors"in e){let t=e["cycle-colors"];t===void 0?V=void 0:(V=[...t.toLowerCase().matchAll(/(#[a-f0-9]+|[a-z]+\\([^)]+\\)|[a-z]+([^(]|$))( |$)+/g)].map(i=>i[0].trim()),At(V))}"cycle-colors-repeat"in e&&(ee=e["cycle-colors-repeat"])}function gt(e){let t=Math.max(Math.min(Math.floor(e*E.width),E.width-1),0)*4,i=te.data[t],r=te.data[t+1],n=te.data[t+2];return\`rgb(\${i},\${r},\${n})\`}function At(e){E==null&&(E=new OffscreenCanvas(Et,1),X=E.getContext("2d"));let t=q.createLinearGradient(0,0,E.width,E.height),i=0,r=1/e.length;for(let n=0;n<e.length;n++)t.addColorStop(i,e[n]),i+=r;t.addColorStop(1,e[0]),X.fillStyle=t,X.fillRect(0,0,E.width,E.height),te=X.getImageData(0,0,E.width,E.height)}self.addEventListener("message",e=>{qe(e.data)});
/*! Bundled license information:

@spearwolf/eventize/lib/index.mjs:
  (*!
  =============================================================================
  @spearwolf/eventize 3.4.1+build.20231031
  \u2014 https://github.com/spearwolf/eventize.git
  =============================================================================
  
  Copyright 2015-2023 Wolfger Schramm
  
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  
     http://www.apache.org/licenses/LICENSE-2.0
  
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
  *)
*/
`)}var o=class extends r{createWorker(){return l()}};customElements.define("rainbow-line",o);