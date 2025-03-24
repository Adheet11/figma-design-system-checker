(()=>{"use strict";var e={56:(e,n,t)=>{e.exports=function(e){var n=t.nc;n&&e.setAttribute("nonce",n)}},72:e=>{var n=[];function t(e){for(var t=-1,o=0;o<n.length;o++)if(n[o].identifier===e){t=o;break}return t}function o(e,o){for(var s={},r=[],i=0;i<e.length;i++){var d=e[i],l=o.base?d[0]+o.base:d[0],c=s[l]||0,p="".concat(l," ").concat(c);s[l]=c+1;var u=t(p),g={css:d[1],media:d[2],sourceMap:d[3],supports:d[4],layer:d[5]};if(-1!==u)n[u].references++,n[u].updater(g);else{var m=a(g,o);o.byIndex=i,n.splice(i,0,{identifier:p,updater:m,references:1})}r.push(p)}return r}function a(e,n){var t=n.domAPI(n);return t.update(e),function(n){if(n){if(n.css===e.css&&n.media===e.media&&n.sourceMap===e.sourceMap&&n.supports===e.supports&&n.layer===e.layer)return;t.update(e=n)}else t.remove()}}e.exports=function(e,a){var s=o(e=e||[],a=a||{});return function(e){e=e||[];for(var r=0;r<s.length;r++){var i=t(s[r]);n[i].references--}for(var d=o(e,a),l=0;l<s.length;l++){var c=t(s[l]);0===n[c].references&&(n[c].updater(),n.splice(c,1))}s=d}}},113:e=>{e.exports=function(e,n){if(n.styleSheet)n.styleSheet.cssText=e;else{for(;n.firstChild;)n.removeChild(n.firstChild);n.appendChild(document.createTextNode(e))}}},314:e=>{e.exports=function(e){var n=[];return n.toString=function(){return this.map((function(n){var t="",o=void 0!==n[5];return n[4]&&(t+="@supports (".concat(n[4],") {")),n[2]&&(t+="@media ".concat(n[2]," {")),o&&(t+="@layer".concat(n[5].length>0?" ".concat(n[5]):""," {")),t+=e(n),o&&(t+="}"),n[2]&&(t+="}"),n[4]&&(t+="}"),t})).join("")},n.i=function(e,t,o,a,s){"string"==typeof e&&(e=[[null,e,void 0]]);var r={};if(o)for(var i=0;i<this.length;i++){var d=this[i][0];null!=d&&(r[d]=!0)}for(var l=0;l<e.length;l++){var c=[].concat(e[l]);o&&r[c[0]]||(void 0!==s&&(void 0===c[5]||(c[1]="@layer".concat(c[5].length>0?" ".concat(c[5]):""," {").concat(c[1],"}")),c[5]=s),t&&(c[2]?(c[1]="@media ".concat(c[2]," {").concat(c[1],"}"),c[2]=t):c[2]=t),a&&(c[4]?(c[1]="@supports (".concat(c[4],") {").concat(c[1],"}"),c[4]=a):c[4]="".concat(a)),n.push(c))}},n}},330:(e,n,t)=>{t.d(n,{A:()=>i});var o=t(601),a=t.n(o),s=t(314),r=t.n(s)()(a());r.push([e.id,'/* Base Styles */\nbody {\n    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\n    margin: 0;\n    padding: 0;\n    color: #333;\n    font-size: 12px;\n    background-color: #f8f8f8;\n    overflow: hidden;\n    height: 100vh;\n  }\n  \n  * {\n    box-sizing: border-box;\n  }\n  \n  /* Layout */\n  .container {\n    display: flex;\n    flex-direction: column;\n    height: 100%;\n  }\n  \n  .header {\n    padding: 16px;\n    background-color: #fff;\n    border-bottom: 1px solid #e5e5e5;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n  }\n  \n  .tabs {\n    display: flex;\n    border-bottom: 1px solid #e5e5e5;\n    background-color: #fff;\n  }\n  \n  .tab {\n    padding: 10px 16px;\n    cursor: pointer;\n    border-bottom: 2px solid transparent;\n    font-weight: 500;\n  }\n  \n  .tab.active {\n    border-bottom-color: #18a0fb;\n    color: #18a0fb;\n  }\n  \n  .content {\n    flex: 1;\n    overflow-y: auto;\n    padding: 16px;\n  }\n  \n  .footer {\n    padding: 12px 16px;\n    background-color: #fff;\n    border-top: 1px solid #e5e5e5;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n  }\n  \n  /* Components */\n  .card {\n    background-color: #fff;\n    border-radius: 6px;\n    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);\n    margin-bottom: 16px;\n    overflow: hidden;\n  }\n  \n  .card-header {\n    padding: 12px 16px;\n    border-bottom: 1px solid #eaeaea;\n    font-weight: 500;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n  }\n  \n  .card-content {\n    padding: 16px;\n  }\n  \n  .summary-grid {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    gap: 12px;\n  }\n  \n  .summary-card {\n    background-color: #f1f5f9;\n    border-radius: 4px;\n    padding: 12px;\n  }\n  \n  .summary-title {\n    font-size: 11px;\n    font-weight: 500;\n    margin-bottom: 4px;\n    color: #666;\n  }\n  \n  .summary-value {\n    font-size: 20px;\n    font-weight: 600;\n  }\n  \n  .progress-bar {\n    height: 8px;\n    background-color: #eaeaea;\n    border-radius: 4px;\n    margin-top: 8px;\n    overflow: hidden;\n  }\n  \n  .progress-value {\n    height: 100%;\n    background-color: #18a0fb;\n    border-radius: 4px;\n  }\n  \n  .low { background-color: #ef4444; }\n  .medium { background-color: #f59e0b; }\n  .high { background-color: #10b981; }\n  \n  .table {\n    width: 100%;\n    border-collapse: collapse;\n  }\n  \n  .table th,\n  .table td {\n    text-align: left;\n    padding: 8px 12px;\n    border-bottom: 1px solid #eaeaea;\n  }\n  \n  .table th {\n    font-weight: 500;\n    color: #666;\n  }\n  \n  .table td {\n    font-size: 11px;\n  }\n  \n  .issue-row {\n    cursor: pointer;\n  }\n  \n  .issue-row:hover {\n    background-color: #f5f5f5;\n  }\n  \n  .tag {\n    display: inline-block;\n    padding: 2px 6px;\n    border-radius: 4px;\n    font-size: 10px;\n    font-weight: 500;\n    background-color: #e5e5e5;\n  }\n  \n  .tag.error { background-color: #fee2e2; color: #b91c1c; }\n  .tag.warning { background-color: #fef3c7; color: #92400e; }\n  .tag.info { background-color: #e0f2fe; color: #0369a1; }\n  \n  /* Buttons */\n  .button {\n    border: none;\n    border-radius: 6px;\n    padding: 8px 12px;\n    font-weight: 500;\n    cursor: pointer;\n    font-size: 12px;\n    transition: all 0.2s;\n  }\n  \n  .button-primary {\n    background-color: #18a0fb;\n    color: white;\n  }\n  \n  .button-primary:hover {\n    background-color: #0d8ecf;\n  }\n  \n  .button-secondary {\n    background-color: #f1f5f9;\n    color: #333;\n  }\n  \n  .button-secondary:hover {\n    background-color: #e2e8f0;\n  }\n  \n  .button-small {\n    padding: 4px 8px;\n    font-size: 11px;\n  }\n  \n  /* Empty state */\n  .empty-state {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    padding: 48px 24px;\n    text-align: center;\n    color: #666;\n  }\n  \n  .empty-state-icon {\n    font-size: 32px;\n    margin-bottom: 16px;\n    color: #ccc;\n  }\n  \n  /* Loading state */\n  .loading {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    padding: 48px 24px;\n    text-align: center;\n    color: #666;\n  }\n  \n  .loader {\n    border: 3px solid #f3f3f3;\n    border-top: 3px solid #18a0fb;\n    border-radius: 50%;\n    width: 24px;\n    height: 24px;\n    animation: spin 1s linear infinite;\n    margin-bottom: 16px;\n  }\n  \n  @keyframes spin {\n    0% { transform: rotate(0deg); }\n    100% { transform: rotate(360deg); }\n  }\n  \n  /* Fix suggestions */\n  .fix-suggestion {\n    background-color: #f8fafc;\n    border: 1px solid #e2e8f0;\n    border-radius: 4px;\n    padding: 8px 12px;\n    margin-top: 8px;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n  }\n  \n  .suggestion-info {\n    flex: 1;\n  }\n  \n  .suggestion-name {\n    font-weight: 500;\n    font-size: 11px;\n  }\n  \n  .suggestion-detail {\n    font-size: 10px;\n    color: #666;\n    margin-top: 2px;\n  }\n  \n  .expanded-details {\n    margin-top: 8px;\n    padding-top: 8px;\n    border-top: 1px solid #eaeaea;\n    font-size: 11px;\n  }\n  \n  /* Settings form */\n  .form-group {\n    margin-bottom: 16px;\n  }\n  \n  .form-label {\n    display: block;\n    margin-bottom: 4px;\n    font-weight: 500;\n  }\n  \n  .form-input, .form-select {\n    width: 100%;\n    padding: 8px;\n    border: 1px solid #e5e5e5;\n    border-radius: 4px;\n    font-size: 12px;\n  }\n  \n  .checkbox-group {\n    display: flex;\n    align-items: center;\n    margin-bottom: 8px;\n  }\n  \n  .checkbox-group input {\n    margin-right: 8px;\n  }',""]);const i=r},540:e=>{e.exports=function(e){var n=document.createElement("style");return e.setAttributes(n,e.attributes),e.insert(n,e.options),n}},601:e=>{e.exports=function(e){return e[1]}},659:e=>{var n={};e.exports=function(e,t){var o=function(e){if(void 0===n[e]){var t=document.querySelector(e);if(window.HTMLIFrameElement&&t instanceof window.HTMLIFrameElement)try{t=t.contentDocument.head}catch(e){t=null}n[e]=t}return n[e]}(e);if(!o)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");o.appendChild(t)}},825:e=>{e.exports=function(e){if("undefined"==typeof document)return{update:function(){},remove:function(){}};var n=e.insertStyleElement(e);return{update:function(t){!function(e,n,t){var o="";t.supports&&(o+="@supports (".concat(t.supports,") {")),t.media&&(o+="@media ".concat(t.media," {"));var a=void 0!==t.layer;a&&(o+="@layer".concat(t.layer.length>0?" ".concat(t.layer):""," {")),o+=t.css,a&&(o+="}"),t.media&&(o+="}"),t.supports&&(o+="}");var s=t.sourceMap;s&&"undefined"!=typeof btoa&&(o+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(s))))," */")),n.styleTagTransform(o,e,n.options)}(n,e,t)},remove:function(){!function(e){if(null===e.parentNode)return!1;e.parentNode.removeChild(e)}(n)}}}}},n={};function t(o){var a=n[o];if(void 0!==a)return a.exports;var s=n[o]={id:o,exports:{}};return e[o](s,s.exports,t),s.exports}t.n=e=>{var n=e&&e.__esModule?()=>e.default:()=>e;return t.d(n,{a:n}),n},t.d=(e,n)=>{for(var o in n)t.o(n,o)&&!t.o(e,o)&&Object.defineProperty(e,o,{enumerable:!0,get:n[o]})},t.o=(e,n)=>Object.prototype.hasOwnProperty.call(e,n),t.nc=void 0;var o=t(72),a=t.n(o),s=t(825),r=t.n(s),i=t(659),d=t.n(i),l=t(56),c=t.n(l),p=t(540),u=t.n(p),g=t(113),m=t.n(g),f=t(330),y={};y.styleTagTransform=m(),y.setAttributes=c(),y.insert=d().bind(null,"head"),y.domAPI=r(),y.insertStyleElement=u(),a()(f.A,y),f.A&&f.A.locals&&f.A.locals;const b=document.querySelectorAll(".tab"),v=document.querySelectorAll(".tab-content"),x=document.getElementById("runCheckBtn"),h=document.getElementById("closeBtn"),E=document.getElementById("exportReportBtn"),I=document.getElementById("loadingState"),C=document.getElementById("emptyState");function w(e,n){e.classList.remove("low","medium","high"),n<50?e.classList.add("low"):n<80?e.classList.add("medium"):e.classList.add("high")}function k(e,n){const t=document.getElementById(e);t&&(t.textContent=n)}function B(e,n){e.querySelectorAll(".locate-btn").forEach((e=>{e.addEventListener("click",(e=>{const n=e.target.closest(".issue-row");if(n){const e=n.dataset.nodeId;e&&parent.postMessage({pluginMessage:{type:"highlightNode",payload:{nodeId:e}}},"*")}}))})),e.querySelectorAll(".fix-btn").forEach((e=>{e.addEventListener("click",(e=>{const t=e.target,o=t.closest(".issue-row");if(o){const e=o.dataset.nodeId,a=t.dataset.fix;if(e){const t=n.find((n=>n.node.id===e));if(t&&t.suggestions&&t.suggestions.length>0){const n=t.suggestions[0];let o={nodeId:e,type:a};"style"===a?(o.styleType=t.type,o.style=n):"variable"===a&&(o.property="missingVariable"===t.type?t.message.includes("color")?"fills":"cornerRadius":"fills",o.variable=n),parent.postMessage({pluginMessage:{type:"applyFix",payload:{fix:o}}},"*")}}}}))}))}b.forEach((e=>{e.addEventListener("click",(()=>{b.forEach((e=>e.classList.remove("active"))),e.classList.add("active"),v.forEach((e=>{e.style.display="none"}));const n=e.getAttribute("data-tab");if(n){const e=document.getElementById(`${n}Tab`);e&&(e.style.display="block")}}))})),document.addEventListener("DOMContentLoaded",(()=>{I.style.display="flex",C.style.display="none",v.forEach((e=>{e.style.display="none"}))})),x.addEventListener("click",(()=>{var e,n,t;I.style.display="flex",C.style.display="none",v.forEach((e=>{e.style.display="none"}));const o={visualize:null===(e=document.getElementById("visualizeIssues"))||void 0===e?void 0:e.checked,generateReport:null===(n=document.getElementById("generateReport"))||void 0===n?void 0:n.checked,includeHidden:null===(t=document.getElementById("includeHidden"))||void 0===t?void 0:t.checked};parent.postMessage({pluginMessage:{type:"checkDesignSystem",payload:{options:o}}},"*")})),h.addEventListener("click",(()=>{parent.postMessage({pluginMessage:{type:"close"}},"*")})),E.addEventListener("click",(()=>{var e,n,t,o,a,s,r,i,d;const l={overallCoverage:null===(e=document.getElementById("overallCoverage"))||void 0===e?void 0:e.textContent,componentCoverage:null===(n=document.getElementById("componentCoverage"))||void 0===n?void 0:n.textContent,styleCoverage:null===(t=document.getElementById("styleCoverage"))||void 0===t?void 0:t.textContent,variableCoverage:null===(o=document.getElementById("variableCoverage"))||void 0===o?void 0:o.textContent,totalNodes:null===(a=document.getElementById("totalNodes"))||void 0===a?void 0:a.textContent,componentIssues:null===(s=document.getElementById("componentIssues"))||void 0===s?void 0:s.textContent,styleIssues:null===(r=document.getElementById("styleIssues"))||void 0===r?void 0:r.textContent,variableIssues:null===(i=document.getElementById("variableIssues"))||void 0===i?void 0:i.textContent,totalIssues:null===(d=document.getElementById("totalIssues"))||void 0===d?void 0:d.textContent};parent.postMessage({pluginMessage:{type:"exportReport",payload:{metrics:l}}},"*")})),window.onmessage=e=>{const n=e.data.pluginMessage;if(n)if("checkResults"===n.type){I.style.display="none";const e=n.payload;!function(e){k("overallCoverage",`${e.overallCoverage.toFixed(1)}%`),k("componentCoverage",`${e.componentCoverage.toFixed(1)}%`),k("styleCoverage",`${e.styleCoverage.toFixed(1)}%`),k("variableCoverage",`${e.variableCoverage.toFixed(1)}%`),k("totalNodes",e.totalNodes.toString());const n=document.getElementById("overallProgress"),t=document.getElementById("componentProgress"),o=document.getElementById("styleProgress"),a=document.getElementById("variableProgress");n&&(n.style.width=`${e.overallCoverage}%`,w(n,e.overallCoverage)),t&&(t.style.width=`${e.componentCoverage}%`,w(t,e.componentCoverage)),o&&(o.style.width=`${e.styleCoverage}%`,w(o,e.styleCoverage)),a&&(a.style.width=`${e.variableCoverage}%`,w(a,e.variableCoverage))}(e.metrics),function(e,n,t){const o=e+n+t;k("componentIssues",e.toString()),k("styleIssues",n.toString()),k("variableIssues",t.toString()),k("totalIssues",o.toString())}(e.componentResults.length,e.styleResults.length,e.tokenResults.length),function(e){const n=document.getElementById("componentsTableBody"),t=document.getElementById("componentsEmpty");n&&t&&(n.innerHTML="",0!==e.length?(t.style.display="none",e.forEach((e=>{const t=document.createElement("tr");t.classList.add("issue-row"),t.dataset.nodeId=e.node.id,t.innerHTML=`\n      <td>${e.node.name}</td>\n      <td>${e.message}</td>\n      <td>\n        <button class="button button-small button-secondary locate-btn">Locate</button>\n        ${e.type.startsWith("modified")?'<button class="button button-small button-secondary fix-btn" data-fix="reset">Reset</button>':""}\n        ${"detached"===e.type&&e.mainComponentId?'<button class="button button-small button-secondary fix-btn" data-fix="swap">Swap</button>':""}\n      </td>\n    `,n.appendChild(t)})),n.querySelectorAll(".locate-btn").forEach((e=>{e.addEventListener("click",(e=>{const n=e.target.closest(".issue-row");if(n){const e=n.dataset.nodeId;e&&parent.postMessage({pluginMessage:{type:"highlightNode",payload:{nodeId:e}}},"*")}}))})),n.querySelectorAll(".fix-btn").forEach((n=>{n.addEventListener("click",(n=>{const t=n.target,o=t.closest(".issue-row");if(o){const n=o.dataset.nodeId,a=t.dataset.fix;if(n&&a){const t={nodeId:n,type:"component",fixType:a};if("swap"===a){const o=e.find((e=>e.node.id===n));o&&o.mainComponentId&&(t.componentKey=o.mainComponentKey)}parent.postMessage({pluginMessage:{type:"applyFix",payload:{fix:t}}},"*")}}}))}))):t.style.display="block")}(e.componentResults),function(e){const n=document.getElementById("stylesTableBody"),t=document.getElementById("stylesEmpty");n&&t&&(n.innerHTML="",0!==e.length?(t.style.display="none",e.forEach((e=>{const t=document.createElement("tr");t.classList.add("issue-row"),t.dataset.nodeId=e.node.id;let o='<button class="button button-small button-secondary locate-btn">Locate</button>';e.suggestions&&e.suggestions.length>0&&(o+=`\n        <button class="button button-small button-secondary fix-btn" data-fix="style">Apply ${e.suggestions[0].name}</button>\n      `),t.innerHTML=`\n      <td>${e.node.name}</td>\n      <td>${e.message}</td>\n      <td>${e.value}</td>\n      <td>${o}</td>\n    `,n.appendChild(t)})),B(n,e)):t.style.display="block")}(e.styleResults),function(e){const n=document.getElementById("variablesTableBody"),t=document.getElementById("variablesEmpty");n&&t&&(n.innerHTML="",0!==e.length?(t.style.display="none",e.forEach((e=>{const t=document.createElement("tr");t.classList.add("issue-row"),t.dataset.nodeId=e.node.id;let o='<button class="button button-small button-secondary locate-btn">Locate</button>';e.suggestions&&e.suggestions.length>0&&(o+=`\n        <button class="button button-small button-secondary fix-btn" data-fix="variable">Apply ${e.suggestions[0].name}</button>\n      `),t.innerHTML=`\n      <td>${e.node.name}</td>\n      <td>${e.message}</td>\n      <td>${e.value}</td>\n      <td>${o}</td>\n    `,n.appendChild(t)})),B(n,e)):t.style.display="block")}(e.tokenResults),function(e){const n=document.getElementById("librarySelect");n&&(n.innerHTML="",e.forEach((e=>{const t=document.createElement("option");t.value=e.id,t.textContent=`${e.name} (${e.components.length} components, ${e.styles.length} styles)`,t.selected=!0,n.appendChild(t)})))}(e.libraries),b.forEach((e=>e.classList.remove("active")));const t=document.querySelector('[data-tab="summary"]');t&&t.classList.add("active"),v.forEach((e=>{e.style.display="none"}));const o=document.getElementById("summaryTab");o&&(o.style.display="block")}else if("exportReportData"===n.type){const e="data:text/json;charset=utf-8,"+encodeURIComponent(n.payload),t=document.createElement("a");t.setAttribute("href",e),t.setAttribute("download","design-system-report.json"),document.body.appendChild(t),t.click(),t.remove()}}})();