import{initializeApp}from"https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import{getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut}from"https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import{getFirestore,collection,doc,onSnapshot,setDoc,serverTimestamp}from"https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import{firebaseConfig}from"./firebase-config.js";import{TOTAL_TOMBOS,TOMBOS,TOMBO_SET}from"./base.js";
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=s=>document.querySelector(s),loginView=$("#loginView"),mainView=$("#mainView"),loginForm=$("#loginForm"),
loginMessage=$("#loginMessage"),logoutBtn=$("#logoutBtn"),userEmail=$("#userEmail"),counter=$("#counter"),
checkForm=$("#checkForm"),tomboInput=$("#tomboInput"),checkMessage=$("#checkMessage"),confirmBtn=$("#confirmBtn"),listPanel=$("#listPanel"),
listTitle=$("#listTitle"),listCount=$("#listCount"),itemsList=$("#itemsList"),cameraBtn=$("#cameraBtn"),scanner=$("#scanner"),
scannerVideo=$("#scannerVideo"),scannerMessage=$("#scannerMessage"),closeScannerBtn=$("#closeScannerBtn");
let conferidos=new Set(),unsub=null,currentView="check",scannerControls=null,scannerReader=null;
loginForm.addEventListener("submit",async e=>{e.preventDefault();loginMessage.textContent="Entrando...";loginMessage.className="message info";
try{await signInWithEmailAndPassword(auth,$("#email").value.trim(),$("#password").value);loginForm.reset()}catch(err){loginMessage.textContent=authError(err);loginMessage.className="message error"}});
logoutBtn.onclick=()=>{fecharScanner();signOut(auth)};
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("active",x===b));render()});
let tomboEncontrado = null;

// Leitor de código de barras. A câmera apenas localiza o tombo; a gravação
// continua dependendo do botão "Confirmar encontrado".
async function abrirScanner() {
  if (scannerControls) return;

  scanner.classList.remove("hidden");
  scanner.setAttribute("aria-hidden", "false");
  scannerMessage.textContent = "Iniciando câmera...";
  scannerMessage.className = "message info";

  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    scannerMessage.textContent = "A câmera precisa de HTTPS. Abra o projeto pelo endereço https:// do GitHub Pages.";
    scannerMessage.className = "message error";
    return;
  }

  try {
    const ZXing = await import("https://cdn.jsdelivr.net/npm/@zxing/browser@0.2.1/+esm");
    const { BrowserMultiFormatReader } = ZXing;
    scannerReader = new BrowserMultiFormatReader();

    scannerMessage.textContent = "Câmera ativa. Aponte para o código de barras.";

    // Sem informar um deviceId, o ZXing usa facingMode="environment"
    // quando disponível, evitando problemas de enumerateDevices antes da permissão.
    scannerControls = await scannerReader.decodeFromVideoDevice(undefined, scannerVideo, (result, error) => {
      if (!result) return;
      processarCodigoCamera(result.getText());
    });
  } catch (err) {
    console.error("Erro ao iniciar leitor:", err);
    scannerMessage.className = "message error";
    if (err?.name === "NotAllowedError") {
      scannerMessage.textContent = "Permissão da câmera negada. Autorize a câmera no navegador e tente novamente.";
    } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
      scannerMessage.textContent = "Nenhuma câmera disponível neste dispositivo.";
    } else {
      scannerMessage.textContent = "Não foi possível iniciar a câmera. Verifique a permissão e tente novamente.";
    }
  }
}

function processarCodigoCamera(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  let candidatos = [];

  if (/^520000\d{4}$/.test(digits)) {
    candidatos = TOMBOS.filter(t => t === digits);
  } else if (/^\d{4}$/.test(digits)) {
    candidatos = TOMBOS.filter(t => t.endsWith(digits));
  }

  if (candidatos.length === 0) {
    scannerMessage.textContent = `Código lido: ${digits || raw}. Não corresponde a um tombo da base.`;
    scannerMessage.className = "message error";
    return;
  }

  if (candidatos.length > 1) {
    scannerMessage.textContent = `Código lido, mas há ${candidatos.length} tombos com esses dígitos finais. Use a pesquisa manual.`;
    scannerMessage.className = "message error";
    return;
  }

  const t = candidatos[0];
  fecharScanner();
  tomboInput.value = t.slice(-4);
  tomboEncontrado = null;
  confirmBtn.classList.add("hidden");

  if (conferidos.has(t)) {
    checkMessage.textContent = `Tombo ${t} já foi conferido anteriormente.`;
    checkMessage.className = "message info";
    return;
  }

  tomboEncontrado = t;
  checkMessage.textContent = `Tombo encontrado pela câmera: ${t}. Confirme abaixo para registrar a conferência.`;
  checkMessage.className = "message success";
  confirmBtn.classList.remove("hidden");
}

function fecharScanner() {
  try { scannerControls?.stop(); } catch {}
  scannerControls = null;
  try { scannerReader?.reset(); } catch {}
  scannerReader = null;
  if (scannerVideo.srcObject) {
    scannerVideo.srcObject.getTracks().forEach(track => track.stop());
    scannerVideo.srcObject = null;
  }
  scanner.classList.add("hidden");
  scanner.setAttribute("aria-hidden", "true");
}

cameraBtn.addEventListener("click", abrirScanner);
closeScannerBtn.addEventListener("click", fecharScanner);

checkForm.addEventListener("submit", async e => {
  e.preventDefault();
  const entrada = String(tomboInput.value).trim();
  tomboEncontrado = null;
  confirmBtn.classList.add("hidden");
  checkMessage.className = "message";

  if (!/^\d{4}$/.test(entrada)) {
    checkMessage.textContent = "Digite exatamente os 4 últimos dígitos do tombo.";
    checkMessage.className = "message error";
    tomboInput.select();
    return;
  }

  const candidatos = TOMBOS.filter(t => t.endsWith(entrada));

  if (candidatos.length === 0) {
    checkMessage.textContent = "Tombo não encontrado na base.";
    checkMessage.className = "message error";
    tomboInput.select();
    return;
  }

  if (candidatos.length > 1) {
    checkMessage.textContent = `Atenção: existem ${candidatos.length} tombos com esses 4 últimos dígitos.`;
    checkMessage.className = "message error";
    tomboInput.select();
    return;
  }

  const t = candidatos[0];

  if (conferidos.has(t)) {
    checkMessage.textContent = `Tombo ${t} já foi conferido anteriormente.`;
    checkMessage.className = "message info";
    tomboInput.select();
    return;
  }

  tomboEncontrado = t;
  checkMessage.textContent = `Tombo encontrado: ${t}. Confirme abaixo para registrar a conferência.`;
  checkMessage.className = "message success";
  confirmBtn.classList.remove("hidden");
});

confirmBtn.addEventListener("click", async () => {
  if (!tomboEncontrado || conferidos.has(tomboEncontrado)) return;

  confirmBtn.disabled = true;
  try {
    await setDoc(doc(db, "conferencias", tomboEncontrado), {
      tombo: tomboEncontrado,
      conferidoEm: serverTimestamp(),
      conferidoPor: auth.currentUser.uid,
      email: auth.currentUser.email || ""
    });

    checkMessage.textContent = "Conferência confirmada e salva.";
    checkMessage.className = "message success";
    tomboEncontrado = null;
    confirmBtn.classList.add("hidden");
    tomboInput.value = "";
    tomboInput.focus();
  } catch (err) {
    console.error(err);
    checkMessage.textContent = "Não foi possível salvar a conferência.";
    checkMessage.className = "message error";
  } finally {
    confirmBtn.disabled = false;
  }
});
onAuthStateChanged(auth,user=>{if(unsub){unsub();unsub=null}if(!user){tomboEncontrado=null;confirmBtn.classList.add("hidden");loginView.classList.remove("hidden");mainView.classList.add("hidden");return}
loginView.classList.add("hidden");mainView.classList.remove("hidden");userEmail.textContent=user.email||"";unsub=onSnapshot(collection(db,"conferencias"),snap=>{
conferidos=new Set(snap.docs.map(d=>d.id.trim()).filter(t=>TOMBO_SET.has(t)));counter.textContent=`${conferidos.size}/${TOTAL_TOMBOS}`;render()});
setTimeout(()=>tomboInput.focus(),50)});
function render(){if(currentView==="check"){listPanel.classList.add("hidden");return}listPanel.classList.remove("hidden");
const a=currentView==="done"?TOMBOS.filter(t=>conferidos.has(t)):TOMBOS.filter(t=>!conferidos.has(t));
listTitle.textContent=currentView==="done"?"Conferidos":"Pendentes";listCount.textContent=a.length;itemsList.innerHTML=a.length?a.map(t=>`<li>${esc(t)}</li>`).join(""):"<li>Nenhum item nesta lista.</li>"}
function esc(v){return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function authError(e){if((e.code||"").includes("invalid-credential"))return"E-mail ou senha inválidos.";if((e.code||"").includes("too-many-requests"))return"Muitas tentativas. Tente novamente mais tarde.";return"Não foi possível entrar. Verifique os dados."}
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
