//#region WebSocket
var webSocket;
var conectarWebSocket = function () {
  webSocket = new WebSocket("wss://winbr.lanrose.com.br");
  webSocket.onmessage = function (e) {
    var ual = JSON.parse(e.data);
    document.querySelector("#resultado").innerHTML += ual.Resultado;
    document.querySelector("#resultado").innerText = document.querySelector("#resultado").innerText.replace(/^\s*=+\s*Win32 port: Fernando Machado \(fm@fmachado\.com\) Iniciando o interpretador UAL\.\.\.\s*=+\s*/, "");
    ExibirOcultarResultado(true);
  };
  return new Promise(function (resolver, rejeitar) {
    webSocket.onopen = resolver;
    var erro = false;
    webSocket.onclose = function(evento) {
      if (erro)
        rejeitar(new Error("Ocorreu um erro ao conectar no interpretador. Informe o código de erro " + evento.code + " no chat acessível pelos ícones de WhatsApp e Telegram abaixo."));
    };
    webSocket.onerror = function() {
      erro = true;
    };
  });
};
//#endregion

//#region Editor
var editor = ace.edit("editor");
AplicarTema();
editor.session.setMode("ace/mode/javascript");
editor.setOptions({
  autoScrollEditorIntoView: true,
  copyWithEmptySelection: true,
  useSoftTabs: false,
  useWorker: false,
  fontSize: 16,
  showPrintMargin: false,
  dragEnabled: false
});
editor.session.setTabSize(2);
editor.commands.addCommand({
  name: "abrir",
  bindKey: { win: "Ctrl-o", mac: "Command-o" },
  exec: function() {
    document.querySelector("#arquivoUAL").click();
  }
});
editor.commands.addCommand({
  name: "salvar",
  bindKey: { win: "Ctrl-s", mac: "Command-s" },
  exec: Salvar
});
editor.commands.addCommand({
  name: "interpretarUAL",
  bindKey: { win: "F9", mac: "F9" },
  exec: InterpretarUAL
});
editor.commands.addCommand({
  name: "imprimir",
  bindKey: { win: "Ctrl-p", mac: "Command-p" },
  exec: Imprimir
});
editor.getSession().on("change", SalvarSession);
editor.getSession().selection.on("changeSelection", SalvarSession);
editor.getSession().selection.on("changeCursor", SalvarSession);
editor.getSession().on("changeFold", SalvarSession);
editor.getSession().on("changeScrollLeft", SalvarSession);
editor.getSession().on("changeScrollTop", SalvarSession);
localStorage.editorSession ? JsonParaSession(JSON.parse(localStorage.editorSession)) : NovoCódigo();
document.getElementById("editor").style.opacity = "1";
editor.focus();
function AplicarTema() {
  var darkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  editor.setTheme(darkMode ? "ace/theme/monokai" : "ace/theme/chrome");
}
function FiltroHistórico(deltas) {
  return deltas.filter(function (d) {
    return d.group != "fold";
  });
}
function JsonParaSession(state) {
  editor.session.setValue(state.content);
  editor.selection.fromJSON(state.selection);
  editor.session.setMode(state.mode);
  editor.session.setScrollTop(state.scrollTop);
  editor.session.setScrollLeft(state.scrollLeft);
  editor.session.$undoManager.$undoStack = state.history.undo;
  editor.session.$undoManager.$redoStack = state.history.redo;
  state.folds.forEach(function (fold) {
    editor.session.addFold(fold.placeholder, Range.fromPoints(fold.start, fold.end));
  });
}
function SalvarSession() {
  localStorage.editorSession = JSON.stringify(SessionParaJson());
}
function SessionParaJson() {
  return {
    content: editor.getSession().getValue(),
    selection: editor.getSelection().toJSON(),
    mode: editor.session.getMode().$id,
    scrollTop: editor.session.getScrollTop(),
    scrollLeft: editor.session.getScrollLeft(),
    history: {
      undo: editor.session.getUndoManager().$undoStack.map(FiltroHistórico),
      redo: editor.session.getUndoManager().$undoStack.map(FiltroHistórico)
    },
    folds: editor.session.getAllFolds().map(function (fold) {
      return {
        start: fold.start,
        end: fold.end,
        placeholder: fold.placeholder
      };
    })
  }
}
//#endregion

window.onload = function() {
  conectarWebSocket().catch(TratarErro);
  AplicarTema();
  window.matchMedia("(prefers-color-scheme: dark)").addListener(function() {
    AplicarTema();
  });
};

function Abrir(arquivoUAL) {
  if (arquivoUAL) {
    var fr = new FileReader();
    fr.onload = function () {
      editor.setValue(fr.result);
    };
    fr.readAsText(arquivoUAL);
  }
}
function ExibirOcultarResultado(exibir) {
  var opacidade = exibir ? "1" : "0";
  if (document.querySelector("#resultado").style.opacity === opacidade)
    return Promise.resolve();
  document.querySelector("#resultado").style.opacity = opacidade;
  document.querySelector("button").disabled = !(exibir || false);
  document.querySelector("#editor").disabled = !(exibir || false);
  return new Promise(function (resolver) {
    document.querySelector("#resultado").addEventListener("webkitTransitionEnd", resolver);
    return resolver;
  }).then(function (resolver) {
    document.querySelector("#resultado").removeEventListener("webkitTransitionEnd", resolver);
  });
}
function Imprimir() {
  document.querySelector(".quadro").style.height = (editor.renderer.lineHeight * editor.session.getLength() + 20) + "px";
  editor.resize();
  setTimeout(function() {
    window.print();
    document.querySelector(".quadro").style.height = null;
    editor.resize();
    editor.focus();
  });
}
function InterpretarUAL() {
  var aguardarWebSocket = Promise.resolve();
  if (webSocket.readyState !== WebSocket.OPEN)
    aguardarWebSocket = conectarWebSocket().catch(TratarErro);
  aguardarWebSocket.then(function () {
    editor.focus();
    return ExibirOcultarResultado(false).then(function () {
      //Para evitar o movimento dos divs do editor e resultado em telas pequenas (por conta de falta de conteúdo no div de resultado - talvez seja possível resolver esse problema por css).
      document.querySelector("#resultado").innerHTML = "&nbsp;";
      try {
        webSocket.send(JSON.stringify({
          Código: editor.getValue()
        }));
      } catch (error) {
        ExibirOcultarResultado(true);
        throw error;
      }
    });
  }).catch(TratarErro);
}
function NovoCódigo() {
  editor.setValue(`prog olaMundo
  string ola;
  ola <- "Olá Mundo!!!";
  imprima ola;
fimprog`);
}
function Salvar() {
  var nomeArquivo = prompt("Informe um nome para o arquivo:", "Sem nome.ual");
  if (!nomeArquivo)
    return;
  if (!/\.ual/i.exec(nomeArquivo))
    nomeArquivo += ".ual";
  var url = window.URL.createObjectURL(new Blob([editor.getValue()]));
  var a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function TratarErro(erro) {
  document.querySelector("#resultado").innerHTML = "<span class=\"erro\">" + erro.message + "</span>";
  console.error(erro);
}