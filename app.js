import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { TOTAL_TOMBOS, TOMBOS, TOMBO_SET } from "./base.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = s => document.querySelector(s);

const loginView = $("#loginView");
const mainView = $("#mainView");
const loginForm = $("#loginForm");
const loginMessage = $("#loginMessage");
const logoutBtn = $("#logoutBtn");
const userEmail = $("#userEmail");
const counter = $("#counter");
const newCounter = $("#newCounter");
const checkForm = $("#checkForm");
const tomboInput = $("#tomboInput");
const checkMessage = $("#checkMessage");
const confirmBtn = $("#confirmBtn");
const listPanel = $("#listPanel");
const listTitle = $("#listTitle");
const listCount = $("#listCount");
const itemsList = $("#itemsList");
const registerPanel = $("#registerPanel");
const localInput = $("#localInput");
const tipoInput = $("#tipoInput");
const marcaInput = $("#marcaInput");
const modeloInput = $("#modeloInput");
const saveConfigBtn = $("#saveConfigBtn");
const clearConfigBtn = $("#clearConfigBtn");
const configList = $("#configList");
const configCount = $("#configCount");
const activeConfig = $("#activeConfig");
const novoTomboInput = $("#novoTomboInput");
const serialInput = $("#serialInput");
const registerBtn = $("#registerBtn");
const registerMessage = $("#registerMessage");
const recentList = $("#recentList");
const recentCount = $("#recentCount");
const newItemsPanel = $("#newItemsPanel");
const newItemsList = $("#newItemsList");
const newItemsListCount = $("#newItemsListCount");
const exportPanel = $("#exportPanel");
const exportBtn = $("#exportBtn");
const exportMessage = $("#exportMessage");

let conferidos = new Set();
let novosEquipamentos = [];
let configuracoes = [];
let recentes = [];
let unsubConferencias = null;
let unsubNovos = null;
let unsubConfigs = null;
let currentView = "check";
let tomboEncontrado = null;
let configSelecionada = null;

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginMessage.textContent = "Entrando...";
  loginMessage.className = "message info";
  try {
    await signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#password").value);
    loginForm.reset();
  } catch (error) {
    console.error(error);
    loginMessage.textContent = authError(error);
    loginMessage.className = "message error";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

document.querySelectorAll("nav button").forEach(button => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;
    document.querySelectorAll("nav button").forEach(item => item.classList.toggle("active", item === button));
    render();
  });
});

checkForm.addEventListener("submit", event => {
  event.preventDefault();
  const entrada = String(tomboInput.value).trim();
  tomboEncontrado = null;
  confirmBtn.classList.add("hidden");
  checkMessage.className = "message";

  if (!/^\d{4}$/.test(entrada)) {
    msg(checkMessage, "Digite exatamente os 4 últimos dígitos do tombo.", "error");
    tomboInput.select();
    return;
  }

  const candidatos = TOMBOS.filter(t => t.endsWith(entrada));
  if (candidatos.length === 0) {
    msg(checkMessage, "Tombo não encontrado na base.", "error");
    tomboInput.select();
    return;
  }

  if (candidatos.length > 1) {
    msg(checkMessage, `Atenção: existem ${candidatos.length} tombos com esses 4 últimos dígitos.`, "error");
    tomboInput.select();
    return;
  }

  const tombo = candidatos[0];
  if (conferidos.has(tombo)) {
    msg(checkMessage, `Tombo ${tombo} já foi conferido anteriormente.`, "info");
    tomboInput.select();
    return;
  }

  tomboEncontrado = tombo;
  msg(checkMessage, `Tombo encontrado: ${tombo}. Confirme abaixo para registrar a conferência.`, "success");
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
    msg(checkMessage, "Conferência confirmada e salva.", "success");
    tomboEncontrado = null;
    confirmBtn.classList.add("hidden");
    tomboInput.value = "";
    tomboInput.focus();
  } catch (error) {
    console.error(error);
    msg(checkMessage, "Não foi possível salvar a conferência.", "error");
  } finally {
    confirmBtn.disabled = false;
  }
});

saveConfigBtn.addEventListener("click", async () => {
  const cfg = lerConfigFormulario();
  if (!cfg.tipo || !cfg.marca || !cfg.modelo) {
    msg(registerMessage, "Informe Equipamento, Marca e Modelo para salvar uma configuração.", "error");
    return;
  }

  saveConfigBtn.disabled = true;
  try {
    const existente = configuracoes.find(item => sameConfig(item, cfg));
    if (existente) {
      configSelecionada = existente;
      renderConfigs();
      msg(registerMessage, "Essa configuração já existe e foi selecionada.", "info");
      return;
    }

    const ref = await addDoc(collection(db, "configuracoesCadastro"), {
      ...cfg,
      criadaEm: serverTimestamp(),
      criadaPor: auth.currentUser.uid,
      email: auth.currentUser.email || ""
    });

    configSelecionada = { id: ref.id, ...cfg };
    renderConfigs();
    msg(registerMessage, "Configuração salva e selecionada.", "success");
  } catch (error) {
    console.error(error);
    msg(registerMessage, "Não foi possível salvar a configuração.", "error");
  } finally {
    saveConfigBtn.disabled = false;
  }
});

clearConfigBtn.addEventListener("click", () => {
  configSelecionada = null;
  tipoInput.value = "";
  marcaInput.value = "";
  modeloInput.value = "";
  renderConfigs();
  updateActiveConfig();
  msg(registerMessage, "Configuração limpa. Informe uma nova configuração.", "info");
});

registerBtn.addEventListener("click", async () => {
  const cfg = lerConfigFormulario();
  const tombo = normalizarTombo(novoTomboInput.value);
  const serial = normalizarSerial(serialInput.value);

  if (!cfg.tipo || !cfg.marca || !cfg.modelo) {
    msg(registerMessage, "Selecione ou informe uma configuração de Equipamento, Marca e Modelo.", "error");
    return;
  }
  if (!tombo.ok) {
    msg(registerMessage, "O Tombo deve conter somente números ou N/A.", "error");
    novoTomboInput.focus();
    return;
  }
  if (!serial.ok) {
    msg(registerMessage, "O Serial deve ser alfanumérico ou N/A.", "error");
    serialInput.focus();
    return;
  }
  if (tombo.value === "N/A" && serial.value === "N/A") {
    msg(registerMessage, "Informe pelo menos o Tombo ou o Serial para cadastrar o equipamento.", "error");
    novoTomboInput.focus();
    return;
  }
  if (tombo.value !== "N/A" && TOMBO_SET.has(tombo.value)) {
    msg(registerMessage, "Este Tombo pertence à base original de 177 itens. Faça a conferência na tela principal.", "error");
    novoTomboInput.focus();
    return;
  }
  if (tombo.value !== "N/A" && novosEquipamentos.some(item => item.tombo === tombo.value)) {
    msg(registerMessage, "Este Tombo já foi cadastrado entre os novos equipamentos.", "error");
    novoTomboInput.focus();
    return;
  }

  registerBtn.disabled = true;
  try {
    await addDoc(collection(db, "novosEquipamentos"), {
      local: localInput.value.trim(),
      tipo: cfg.tipo,
      marca: cfg.marca,
      modelo: cfg.modelo,
      tombo: tombo.value,
      serial: serial.value,
      cadastradoEm: serverTimestamp(),
      cadastradoPor: auth.currentUser.uid,
      email: auth.currentUser.email || ""
    });
    msg(registerMessage, "Equipamento cadastrado com sucesso.", "success");
    novoTomboInput.value = "N/A";
    serialInput.value = "N/A";
    novoTomboInput.focus();
  } catch (error) {
    console.error(error);
    msg(registerMessage, "Não foi possível cadastrar o equipamento.", "error");
  } finally {
    registerBtn.disabled = false;
  }
});

exportBtn.addEventListener("click", exportarExcel);

function lerConfigFormulario() {
  return {
    local: localInput.value.trim(),
    tipo: tipoInput.value.trim(),
    marca: marcaInput.value.trim(),
    modelo: modeloInput.value.trim()
  };
}

function sameConfig(a, b) {
  return norm(a.tipo) === norm(b.tipo) && norm(a.marca) === norm(b.marca) && norm(a.modelo) === norm(b.modelo);
}

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizarTombo(value) {
  const text = String(value ?? "").trim();
  if (!text || text.toUpperCase() === "N/A") return { ok: true, value: "N/A" };
  return /^\d+$/.test(text) ? { ok: true, value: text } : { ok: false, value: text };
}

function normalizarSerial(value) {
  const text = String(value ?? "").trim();
  if (!text || text.toUpperCase() === "N/A") return { ok: true, value: "N/A" };
  return /^[a-z0-9]+$/i.test(text) ? { ok: true, value: text } : { ok: false, value: text };
}

function msg(element, text, type) {
  element.textContent = text;
  element.className = `message ${type || ""}`;
}

function render() {
  registerPanel.classList.toggle("hidden", currentView !== "register");
  exportPanel.classList.toggle("hidden", currentView !== "export");
  newItemsPanel.classList.toggle("hidden", currentView !== "newItems");

  const listView = currentView === "done" || currentView === "pending";
  listPanel.classList.toggle("hidden", !listView);

  if (listView) {
    const items = currentView === "done"
      ? TOMBOS.filter(t => conferidos.has(t))
      : TOMBOS.filter(t => !conferidos.has(t));
    listTitle.textContent = currentView === "done" ? "Conferidos" : "Pendentes";
    listCount.textContent = items.length;
    itemsList.innerHTML = items.length
      ? items.map(t => `<li>${esc(t)}</li>`).join("")
      : "<li>Nenhum item nesta lista.</li>";
  }

  if (currentView === "newItems") renderNewItems();
  if (currentView === "register") renderConfigs();
}

function renderConfigs() {
  configCount.textContent = configuracoes.length;
  updateActiveConfig();

  if (!configuracoes.length) {
    configList.innerHTML = '<div class="empty">Nenhuma configuração salva.</div>';
    return;
  }

  configList.innerHTML = configuracoes.map(config => {
    const active = configSelecionada?.id === config.id ? "active" : "";
    return `<div class="config-item ${active}" data-id="${escAttr(config.id)}"><div class="config-text"><strong>${esc(config.tipo)} · ${esc(config.marca)} · ${esc(config.modelo)}</strong><small>Configuração reutilizável</small></div><button type="button" data-delete-config="${escAttr(config.id)}">Excluir</button></div>`;
  }).join("");

  configList.querySelectorAll(".config-item").forEach(element => {
    element.addEventListener("click", event => {
      if (event.target.closest("[data-delete-config]")) return;
      const config = configuracoes.find(item => item.id === element.dataset.id);
      if (!config) return;
      configSelecionada = config;
      tipoInput.value = config.tipo;
      marcaInput.value = config.marca;
      modeloInput.value = config.modelo;
      localInput.value = config.local || localInput.value;
      renderConfigs();
      msg(registerMessage, "Configuração selecionada. Agora informe Tombo e Serial.", "info");
      novoTomboInput.focus();
    });
  });

  configList.querySelectorAll("[data-delete-config]").forEach(button => {
    button.addEventListener("click", async event => {
      event.stopPropagation();
      if (!confirm("Excluir esta configuração salva? Os equipamentos já cadastrados não serão apagados.")) return;
      try {
        await deleteDoc(doc(db, "configuracoesCadastro", button.dataset.deleteConfig));
        if (configSelecionada?.id === button.dataset.deleteConfig) configSelecionada = null;
        msg(registerMessage, "Configuração excluída.", "info");
      } catch (error) {
        console.error(error);
        msg(registerMessage, "Não foi possível excluir a configuração.", "error");
      }
    });
  });
}

function updateActiveConfig() {
  if (!configSelecionada) {
    activeConfig.textContent = "Nenhuma configuração selecionada.";
    return;
  }
  const local = configSelecionada.local ? ` · ${configSelecionada.local}` : "";
  activeConfig.textContent = `Configuração ativa: ${configSelecionada.tipo} · ${configSelecionada.marca} · ${configSelecionada.modelo}${local}`;
}

function renderNewItems() {
  newItemsListCount.textContent = novosEquipamentos.length;
  if (!novosEquipamentos.length) {
    newItemsList.innerHTML = '<div class="empty">Nenhum equipamento cadastrado ainda.</div>';
    return;
  }

  const rows = novosEquipamentos.map(item => `<tr><td>${esc(item.local || "N/A")}</td><td>${esc(item.tipo)}</td><td>${esc(item.marca)}</td><td>${esc(item.modelo)}</td><td>${esc(item.tombo)}</td><td>${esc(item.serial)}</td><td>${esc(item.email || "")}</td></tr>`).join("");
  newItemsList.innerHTML = `<table class="data-table"><thead><tr><th>Local</th><th>Equipamento</th><th>Marca</th><th>Modelo</th><th>Tombo</th><th>Serial</th><th>Cadastrado por</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function exportarExcel() {
  exportBtn.disabled = true;
  msg(exportMessage, "Preparando arquivo...", "info");
  try {
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
    const original = TOMBOS.map(t => ({ "Tombo Legado": t, "Situação": conferidos.has(t) ? "Conferido" : "Pendente" }));
    const novos = novosEquipamentos.map(item => ({
      "Local": item.local || "N/A",
      "Equipamento": item.tipo,
      "Marca": item.marca,
      "Modelo": item.modelo,
      "Tombo": item.tombo,
      "Serial": item.serial,
      "Data do cadastro": formatTimestamp(item.cadastradoEm),
      "Cadastrado por": item.email || item.cadastradoPor || ""
    }));
    const resumo = [
      { "Indicador": "Itens da relação original", "Quantidade": TOTAL_TOMBOS },
      { "Indicador": "Itens originais conferidos", "Quantidade": conferidos.size },
      { "Indicador": "Itens originais pendentes", "Quantidade": TOTAL_TOMBOS - conferidos.size },
      { "Indicador": "Novos equipamentos cadastrados", "Quantidade": novosEquipamentos.length },
      { "Indicador": "Total de equipamentos identificados", "Quantidade": conferidos.size + novosEquipamentos.length }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resumo), "Resumo");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(original), "Conferencia Original");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(novos), "Novos Equipamentos");
    XLSX.writeFile(workbook, `conferencia-patrimonial-${dataArquivo()}.xlsx`);
    msg(exportMessage, "Excel gerado com sucesso.", "success");
  } catch (error) {
    console.error(error);
    msg(exportMessage, "Não foi possível gerar o Excel. Verifique a conexão e tente novamente.", "error");
  } finally {
    exportBtn.disabled = false;
  }
}

function formatTimestamp(value) {
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toLocaleString("pt-BR");
  return String(value);
}

function dataArquivo() {
  return new Date().toISOString().slice(0, 10);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escAttr(value) {
  return esc(value);
}

function authError(error) {
  if ((error.code || "").includes("invalid-credential")) return "E-mail ou senha inválidos.";
  if ((error.code || "").includes("too-many-requests")) return "Muitas tentativas. Tente novamente mais tarde.";
  return "Não foi possível entrar. Verifique os dados.";
}

onAuthStateChanged(auth, user => {
  [unsubConferencias, unsubNovos, unsubConfigs].forEach(unsubscribe => {
    try { unsubscribe?.(); } catch (error) { console.warn(error); }
  });
  unsubConferencias = null;
  unsubNovos = null;
  unsubConfigs = null;

  if (!user) {
    conferidos = new Set();
    novosEquipamentos = [];
    configuracoes = [];
    configSelecionada = null;
    loginView.classList.remove("hidden");
    mainView.classList.add("hidden");
    return;
  }

  loginView.classList.add("hidden");
  mainView.classList.remove("hidden");
  userEmail.textContent = user.email || "";

  unsubConferencias = onSnapshot(collection(db, "conferencias"), snapshot => {
    conferidos = new Set(snapshot.docs.map(item => item.id.trim()).filter(t => TOMBO_SET.has(t)));
    counter.textContent = `${conferidos.size}/${TOTAL_TOMBOS}`;
    render();
  }, error => console.error("Erro em conferencias:", error));

  unsubNovos = onSnapshot(query(collection(db, "novosEquipamentos"), orderBy("cadastradoEm", "desc")), snapshot => {
    novosEquipamentos = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    newCounter.textContent = novosEquipamentos.length;
    recentes = novosEquipamentos.slice(0, 8);
    recentCount.textContent = recentes.length;

    if (!recentes.length) {
      recentList.innerHTML = '<div class="empty">Nenhum equipamento cadastrado.</div>';
    } else {
      recentList.innerHTML = recentes.map(item => {
        const local = item.local ? ` · ${esc(item.local)}` : "";
        return `<div class="recent-item"><strong>${esc(item.tombo)} · ${esc(item.serial)}</strong><small>${esc(item.tipo)} · ${esc(item.marca)} · ${esc(item.modelo)}${local}</small></div>`;
      }).join("");
    }
    render();
  }, error => console.error("Erro em novos equipamentos:", error));

  unsubConfigs = onSnapshot(query(collection(db, "configuracoesCadastro"), orderBy("criadaEm", "desc")), snapshot => {
    configuracoes = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    if (configSelecionada) {
      configSelecionada = configuracoes.find(item => item.id === configSelecionada.id) || null;
    }
    renderConfigs();
  }, error => console.error("Erro em configurações:", error));

  setTimeout(() => tomboInput.focus(), 100);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
}
