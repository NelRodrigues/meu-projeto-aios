// Manual da Lia — Identidade Visual Natacha António
// Cores: Vermelho #A90F1C | Dourado #C4962A | Creme #C9A96E | Branco #F1F1EF
// Fontes: Argesta (títulos) | Bellefair (corpo)

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  ExternalHyperlink
} = require('docx');
const fs = require('fs');

// ─── PALETA ───────────────────────────────────────────────────────────────────
const VERMELHO  = "A90F1C";
const DOURADO   = "C4962A";
const CREME     = "C9A96E";
const CREME_BG  = "F5EFE6";
const BRANCO    = "FFFFFF";
const CINZA_SUB = "6B6B6B";
const PRETO     = "1A1A1A";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function separador() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DOURADO, space: 6 } },
    spacing: { before: 200, after: 200 },
    children: []
  });
}

function espacoP(before = 100, after = 100) {
  return new Paragraph({ spacing: { before, after }, children: [] });
}

function titulo(texto, nivel = HeadingLevel.HEADING_1) {
  const isBig = nivel === HeadingLevel.HEADING_1;
  return new Paragraph({
    heading: nivel,
    spacing: { before: isBig ? 480 : 320, after: 160 },
    children: [new TextRun({
      text: texto,
      font: "Argesta",
      size: isBig ? 40 : 30,
      color: isBig ? VERMELHO : DOURADO,
      bold: false,
    })]
  });
}

function subtitulo(texto) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({
      text: texto,
      font: "Bellefair",
      size: 24,
      color: VERMELHO,
      bold: true,
    })]
  });
}

function corpo(texto, { bold = false, italic = false, cor = PRETO, extra = {} } = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({
      text: texto,
      font: "Bellefair",
      size: 22,
      color: cor,
      bold,
      italics: italic,
      ...extra
    })]
  });
}

function citacao(texto) {
  return new Paragraph({
    indent: { left: 600, right: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 8, color: DOURADO, space: 12 } },
    spacing: { before: 160, after: 160 },
    children: [new TextRun({
      text: texto,
      font: "Bellefair",
      size: 21,
      color: CINZA_SUB,
      italics: true,
    })]
  });
}

function bullet(texto, { negrito = "" } = {}) {
  const runs = [];
  if (negrito) {
    runs.push(new TextRun({ text: negrito, font: "Bellefair", size: 22, color: PRETO, bold: true }));
    runs.push(new TextRun({ text: texto, font: "Bellefair", size: 22, color: PRETO }));
  } else {
    runs.push(new TextRun({ text: texto, font: "Bellefair", size: 22, color: PRETO }));
  }
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 60, after: 60 },
    children: runs,
  });
}

function comando(texto) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({
      text: texto,
      font: "Courier New",
      size: 20,
      color: VERMELHO,
      shading: { type: ShadingType.CLEAR, fill: CREME_BG },
    })]
  });
}

// ─── CABEÇALHO (header) ───────────────────────────────────────────────────────
function makeHeader() {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: VERMELHO, space: 4 } },
        spacing: { before: 0, after: 160 },
        children: [
          new TextRun({ text: "NATACHA ANTÓNIO  ·  ", font: "Argesta", size: 18, color: VERMELHO }),
          new TextRun({ text: "Manual da Lia — Assistente Digital", font: "Bellefair", size: 18, color: CINZA_SUB }),
        ]
      })
    ]
  });
}

// ─── RODAPÉ (footer) ─────────────────────────────────────────────────────────
function makeFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: CREME, space: 4 } },
        spacing: { before: 120, after: 0 },
        children: [
          new TextRun({ text: "Lia v1.0  ·  Maio 2026  ·  ", font: "Bellefair", size: 16, color: CINZA_SUB }),
          new TextRun({ text: "Página ", font: "Bellefair", size: 16, color: CINZA_SUB }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Bellefair", size: 16, color: VERMELHO }),
        ]
      })
    ]
  });
}

// ─── TABELA DE COMANDOS RÁPIDOS ───────────────────────────────────────────────
function tabelaComandos() {
  const thStyle = (txt) => new TableCell({
    borders: noBorders,
    shading: { type: ShadingType.CLEAR, fill: VERMELHO },
    width: { size: 4500, type: WidthType.DXA },
    margins: { top: 120, bottom: 120, left: 180, right: 180 },
    children: [new Paragraph({
      children: [new TextRun({ text: txt, font: "Bellefair", size: 20, color: BRANCO, bold: true })]
    })]
  });

  const tdStyle = (txt, bg = BRANCO) => new TableCell({
    borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 2, color: CREME }, left: noBorder, right: noBorder },
    shading: { type: ShadingType.CLEAR, fill: bg },
    width: { size: 4500, type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    children: [new Paragraph({
      children: [new TextRun({ text: txt, font: "Bellefair", size: 20, color: PRETO })]
    })]
  });

  const rows = [
    new TableRow({ children: [thStyle("O que escreves"), thStyle("O que a Lia faz")] }),
    new TableRow({ children: [tdStyle("Briefing do dia", CREME_BG), tdStyle("Resume prioridades e leads pendentes", CREME_BG)] }),
    new TableRow({ children: [tdStyle("O que está pendente?"), tdStyle("Lista tarefas por concluir")] }),
    new TableRow({ children: [tdStyle("Estado do pipeline", CREME_BG), tdStyle("Resumo de leads activas", CREME_BG)] }),
    new TableRow({ children: [tdStyle("Nova tarefa: [descrição]"), tdStyle("Regista tarefa imediatamente")] }),
    new TableRow({ children: [tdStyle("Novo lead: [nome, contacto]", CREME_BG), tdStyle("Entra no pipeline", CREME_BG)] }),
    new TableRow({ children: [tdStyle("Agenda para hoje"), tdStyle("Organiza as prioridades do dia")] }),
    new TableRow({ children: [tdStyle("Ajuda-me a responder a [situação]", CREME_BG), tdStyle("Rascunho de resposta", CREME_BG)] }),
  ];

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [4500, 4500],
    rows,
  });
}

// ─── TABELA DE LIMITES ────────────────────────────────────────────────────────
function tabelaLimites() {
  const th = (txt) => new TableCell({
    borders: noBorders,
    shading: { type: ShadingType.CLEAR, fill: VERMELHO },
    width: { size: 4500, type: WidthType.DXA },
    margins: { top: 120, bottom: 120, left: 180, right: 180 },
    children: [new Paragraph({
      children: [new TextRun({ text: txt, font: "Bellefair", size: 20, color: BRANCO, bold: true })]
    })]
  });

  const td = (txt, bg = BRANCO, cor = PRETO) => new TableCell({
    borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 2, color: CREME }, left: noBorder, right: noBorder },
    shading: { type: ShadingType.CLEAR, fill: bg },
    width: { size: 4500, type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 180, right: 180 },
    children: [new Paragraph({
      children: [new TextRun({ text: txt, font: "Bellefair", size: 20, color: cor })]
    })]
  });

  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [4500, 4500],
    rows: [
      new TableRow({ children: [th("A Lia FAZ"), th("A Lia NUNCA faz")] }),
      new TableRow({ children: [td("Regista e organiza as tuas tarefas", CREME_BG), td("Tomar decisões por ti", CREME_BG)] }),
      new TableRow({ children: [td("Acompanha o teu pipeline"), td("Contactar leads ou clientes")] }),
      new TableRow({ children: [td("Ajuda a redigir mensagens", CREME_BG), td("Enviar mensagens a ninguém", CREME_BG)] }),
      new TableRow({ children: [td("Resume e prioriza o teu dia"), td("Decidir sobre preços ou condições")] }),
      new TableRow({ children: [td("Guarda notas e contexto", CREME_BG), td("Dar aconselhamento espiritual", CREME_BG)] }),
      new TableRow({ children: [td("Sugere opções para decidires"), td("Pressionar em contextos emocionais")] }),
    ],
  });
}

// ─── CAPA ─────────────────────────────────────────────────────────────────────
function makeCapa() {
  return [
    // Bloco vermelho de topo — simulado com parágrafo com fundo
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 80 },
      children: [new TextRun({ text: "NATACHA ANTÓNIO", font: "Argesta", size: 52, color: VERMELHO, bold: false })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: "T R E I N A M E N T O S", font: "Bellefair", size: 22, color: CREME, characterSpacing: 200 })]
    }),
    separador(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 120 },
      children: [new TextRun({ text: "Manual de Utilizador", font: "Bellefair", size: 28, color: CINZA_SUB, italics: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: "LIA", font: "Argesta", size: 96, color: VERMELHO })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 400 },
      children: [new TextRun({ text: "A tua Assistente Executiva Digital", font: "Bellefair", size: 26, color: DOURADO })]
    }),
    separador(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 120 },
      children: [new TextRun({ text: "Para: Natacha António Miguel", font: "Bellefair", size: 22, color: PRETO })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: "Versão 1.0  ·  Maio 2026", font: "Bellefair", size: 20, color: CINZA_SUB })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [new TextRun({ text: "Elaborado por Marca Digital", font: "Bellefair", size: 20, color: CINZA_SUB })]
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── CONTEÚDO PRINCIPAL ───────────────────────────────────────────────────────
function makeConteudo() {
  return [
    // INTRODUÇÃO
    titulo("Antes de tudo: o que é a Lia?"),
    corpo("A Lia é a tua assistente executiva digital. Ela vive no teu Telegram e está disponível 24 horas por dia, 7 dias por semana, sem pausas, sem dias maus, sem \"já te respondo mais tarde\"."),
    espacoP(),
    corpo("Pensa nela como a COO (Directora de Operações) que nunca conseguiste ter: alguém que conhece o teu negócio, os teus programas, os teus leads, e que está sempre pronta para te ajudar a organizar o caos do dia a dia."),
    espacoP(),
    citacao("A Lia não substitui o teu julgamento. Ela amplifica a tua capacidade de agir. Tu decides — ela organiza, regista e lembra."),
    separador(),

    // PARTE 1
    titulo("PARTE 1 — Primeiros Passos"),
    subtitulo("Como aceder à Lia"),
    corpo("Segue estes passos simples para começar:"),
    bullet("Abre o Telegram no teu telemóvel"),
    bullet("Na barra de pesquisa, escreve: @natacha_coo_bot"),
    bullet("Carrega em Iniciar ou envia qualquer mensagem"),
    bullet("A Lia vai responder e apresentar-se"),
    espacoP(120),
    citacao("Guarda o bot nos favoritos ou fixa a conversa no topo do Telegram para aceder rapidamente."),
    espacoP(),
    subtitulo("A primeira mensagem"),
    corpo("Podes começar com qualquer coisa. Por exemplo:"),
    bullet("\"Olá Lia\""),
    bullet("\"Boa tarde\""),
    bullet("\"Preciso de ajuda\""),
    espacoP(),
    corpo("A Lia vai responder, perguntar o que precisas, e começar a trabalhar."),
    espacoP(),
    subtitulo("Uma coisa importante"),
    corpo("A Lia só responde a ti. Mais ninguém consegue falar com ela — está configurada exclusivamente para o teu número de Telegram. Se alguém tentar, não vai receber resposta."),
    separador(),

    // PARTE 2
    titulo("PARTE 2 — O Que Podes Pedir à Lia"),
    subtitulo("2.1  Gestão de Tarefas"),
    corpo("A Lia regista as tuas tarefas na base de dados e ajuda-te a não perder nada."),
    espacoP(),
    corpo("Como criar uma tarefa — escreve de forma natural:", { bold: true }),
    citacao("\"Lia, preciso de enviar o contrato para a Maria até sexta\""),
    citacao("\"Lembra-me de confirmar o pagamento da Ana amanhã\""),
    citacao("\"Nova tarefa: preparar os materiais da sessão de quinta\""),
    espacoP(),
    corpo("Como ver o que está pendente:", { bold: true }),
    citacao("\"O que está pendente?\""),
    citacao("\"O que tenho para fazer hoje?\""),
    citacao("\"Lista as minhas tarefas\""),
    espacoP(),
    corpo("Como marcar uma tarefa como feita:", { bold: true }),
    citacao("\"Já enviei o contrato da Maria, podes marcar como feito\""),
    citacao("\"A tarefa do pagamento da Ana está concluída\""),
    separador(),

    subtitulo("2.2  Briefing Diário"),
    corpo("O briefing é o teu resumo do dia — o que está pendente, o que precisas de fazer, e o estado do teu pipeline."),
    espacoP(),
    corpo("Como pedir:", { bold: true }),
    citacao("\"Briefing do dia\""),
    citacao("\"Como está o meu dia?\""),
    citacao("\"Resume-me o que tenho hoje\""),
    espacoP(),
    corpo("A Lia vai apresentar:"),
    bullet("Tarefas urgentes pendentes"),
    bullet("Leads que precisam de atenção"),
    bullet("Follow-ups em atraso"),
    bullet("Qualquer nota importante"),
    separador(),

    subtitulo("2.3  Gestão de Leads"),
    corpo("Sempre que alguém mostrar interesse no VF-18 ou no MAPE, podes registar na Lia imediatamente — mesmo que estejas no meio de outra coisa."),
    espacoP(),
    corpo("Como registar um novo lead:", { bold: true }),
    citacao("\"Nova lead: Joana Silva, WhatsApp +244 923 000 000, interessada no VF-18\""),
    citacao("\"Registar lead: Paulo, Instagram @paulo_angola, perguntou sobre o MAPE\""),
    citacao("\"Entrou uma lead — chama-se Carla, falou comigo no evento, quer saber mais sobre mentoria\""),
    espacoP(),
    corpo("Como ver o estado do pipeline:", { bold: true }),
    citacao("\"Estado do pipeline\""),
    citacao("\"Quantas leads tenho activas?\""),
    citacao("\"Quem está quente no pipeline?\""),
    espacoP(),
    corpo("Como actualizar uma lead:", { bold: true }),
    citacao("\"A Joana Silva confirmou inscrição no VF-18\""),
    citacao("\"O Paulo não respondeu mais — marca como frio\""),
    citacao("\"A Carla pagou, já é cliente\""),
    separador(),

    subtitulo("2.4  Ajuda para Responder"),
    corpo("A Lia pode ajudar-te a redigir respostas para situações difíceis ou repetitivas. Tu aproves e envias — ela nunca contacta ninguém por ti."),
    espacoP(),
    corpo("Como usar:", { bold: true }),
    citacao("\"Ajuda-me a responder a uma lead que perguntou o preço do VF-18 mas acho que está com medo do investimento\""),
    citacao("\"Como posso responder a alguém que disse que não tem tempo?\""),
    citacao("\"Preciso de uma mensagem de follow-up para alguém que ficou em silêncio há 3 dias\""),
    espacoP(),
    corpo("A Lia vai redigir uma resposta alinhada com o teu tom e os teus valores. Tu lês, ajustas se precisar, e envias."),
    separador(),

    subtitulo("2.5  Organização e Planeamento"),
    corpo("Para organizar a semana:", { bold: true }),
    citacao("\"Ajuda-me a organizar a minha semana\""),
    citacao("\"O que é prioritário esta semana?\""),
    citacao("\"Tenho muito para fazer — ajuda-me a priorizar\""),
    espacoP(),
    corpo("Para preparar uma sessão:", { bold: true }),
    citacao("\"Tenho uma sessão com a [nome] amanhã. O que preciso de preparar?\""),
    citacao("\"Que perguntas devo fazer numa primeira sessão com uma lead do VF-18?\""),
    espacoP(),
    corpo("Para tomar decisões:", { bold: true }),
    citacao("\"Tenho de escolher entre fazer um evento ao vivo ou um webinar. Ajuda-me a pensar\""),
    citacao("\"Devo aceitar este convite para falar no evento X? Aqui estão os detalhes...\""),
    separador(),

    subtitulo("2.6  Notas Rápidas"),
    corpo("Quando estás no meio de algo e não queres perder uma ideia:"),
    citacao("\"Nota: ideia para o próximo live — falar sobre identidade vs papel social\""),
    citacao("\"Guarda isto: lembrar de perguntar à Sofia sobre o testemunho\""),
    citacao("\"Quero lembrar: rever o preço do MAPE em Junho\""),
    separador(),

    // PARTE 3
    new Paragraph({ children: [new PageBreak()] }),
    titulo("PARTE 3 — Comandos Rápidos"),
    corpo("Estes são atalhos que a Lia reconhece imediatamente:"),
    espacoP(120),
    tabelaComandos(),
    espacoP(200),
    citacao("Dica: Não precisas de usar os comandos exactos. Podes falar naturalmente — a Lia entende o contexto."),
    separador(),

    // PARTE 4
    titulo("PARTE 4 — Como Falar com a Lia"),
    subtitulo("Fala como falavas com uma assistente de confiança"),
    corpo("A Lia não precisa de linguagem técnica nem de formatos especiais. Fala como falaras normalmente:"),
    espacoP(),
    corpo("Funciona assim:", { bold: true }),
    citacao("\"Lia, estou a ficar sem tempo, ajuda-me a organizar o que tenho para hoje\""),
    citacao("\"Tenho uma reunião a seguir, diz-me rapidamente o que está urgente\""),
    citacao("\"Esqueci-me de registar — ontem falei com a Ana, ela está interessada no VF-18\""),
    espacoP(),
    corpo("Também funciona assim (mais curto):", { bold: true }),
    citacao("\"Nova tarefa: contrato\" (curto e directo)"),
    citacao("\"Pipeline\" (a Lia percebe que queres o resumo)"),
    citacao("\"Urgente?\" (vai mostrar o que está crítico)"),
    espacoP(),
    subtitulo("A Lia faz uma pergunta de cada vez"),
    corpo("Se precisar de mais informação, a Lia pergunta uma coisa de cada vez — não te bombarda com 10 perguntas. Se não quiseres responder a algo, podes dizer \"deixa estar\" ou \"não importa\" e ela avança."),
    espacoP(),
    subtitulo("A Lia não inventa"),
    corpo("Se não souber algo, diz. Nunca vai inventar informações sobre os teus leads, tarefas ou negócio. Se perguntas algo que ela não sabe, vai dizer-te claramente."),
    espacoP(),
    subtitulo("Palavras que param tudo"),
    corpo("Se disseres \"para\", \"cancela\", \"esquece\" ou \"não\" — a Lia para imediatamente o que estava a fazer e confirma contigo."),
    separador(),

    // PARTE 5
    new Paragraph({ children: [new PageBreak()] }),
    titulo("PARTE 5 — Limites da Lia"),
    corpo("É importante saberes o que está fora do alcance da Lia:"),
    espacoP(120),
    tabelaLimites(),
    espacoP(200),
    corpo("A Lia respeita os teus valores cristãos em tudo o que faz. Nunca vai sugerir nada que vá contra a tua fé ou integridade.", { italic: true, cor: CINZA_SUB }),
    separador(),

    // PARTE 6
    titulo("PARTE 6 — Dicas para Tirar o Máximo Proveito"),
    subtitulo("Dica 1 — Usa a Lia como segundo cérebro"),
    corpo("Sempre que tens um pensamento, uma ideia, ou uma informação que não queres perder — manda para a Lia. É mais rápido do que abrir uma app de notas, e a Lia organiza tudo automaticamente."),
    espacoP(),
    subtitulo("Dica 2 — Regista leads em tempo real"),
    corpo("Quando falares com alguém interessado no VF-18 ou MAPE — mesmo que seja num evento, numa chamada, ou num encontro casual — regista na Lia imediatamente. Em 10 segundos está guardado e não perdes o contacto."),
    espacoP(),
    subtitulo("Dica 3 — Pede o briefing todas as manhãs"),
    corpo("Cria o hábito de enviar \"Briefing do dia\" logo de manhã, antes de começares o trabalho. A Lia dá-te uma visão clara do que te espera e ajuda-te a entrar em foco rapidamente."),
    espacoP(),
    subtitulo("Dica 4 — Não te preocupes com o formato"),
    corpo("Não precisas de escrever de forma perfeita. A Lia entende \"lia tou a preparar sessao tmrn\" da mesma forma que entende \"Lia, estou a preparar a sessão de amanhã\"."),
    espacoP(),
    subtitulo("Dica 5 — Diz à Lia quando algo mudou"),
    corpo("Se um lead desistiu, se uma tarefa já não é relevante, se mudaste de ideias sobre algo — diz à Lia. Ela actualiza tudo e mantém o registo correcto."),
    espacoP(),
    subtitulo("Dica 6 — Usa para pensar em voz alta"),
    corpo("Quando estás a tomar uma decisão difícil, podes usar a Lia para organizar o pensamento:"),
    citacao("\"Estou a pensar em abrir mais uma turma do VF-18 em Julho. Aqui está o meu dilema: [explica]. O que achas?\""),
    corpo("A Lia não decide por ti — mas ajuda-te a ver as opções com mais clareza."),
    separador(),

    // PARTE 7
    new Paragraph({ children: [new PageBreak()] }),
    titulo("PARTE 7 — Perguntas Frequentes"),

    subtitulo("A Lia funciona quando não tenho internet?"),
    corpo("Não. A Lia precisa de ligação à internet para responder — mas está disponível 24/7 quando tens conexão."),
    espacoP(),

    subtitulo("Posso usar a Lia de madrugada?"),
    corpo("Sim. A Lia não tem horário — está sempre disponível. Podes enviar mensagens a qualquer hora e ela responde."),
    espacoP(),

    subtitulo("A Lia guarda o histórico das nossas conversas?"),
    corpo("Sim. A Lia tem memória — lembra-se do que conversaram nas sessões anteriores e do contexto do teu negócio. Não precisas de te repetir de sessão para sessão."),
    espacoP(),

    subtitulo("E se a Lia não perceber o que eu quero?"),
    corpo("Ela vai pedir esclarecimento. Se sentires que ela não está a perceber, podes reformular ou dizer \"não era isso, quero dizer...\" e ela ajusta."),
    espacoP(),

    subtitulo("A Lia pode responder às minhas clientes?"),
    corpo("Não. A Lia só fala contigo. Nunca vai contactar clientes, leads ou terceiros sem a tua autorização explícita."),
    espacoP(),

    subtitulo("O que faço se a Lia não responder?"),
    corpo("Aguarda 1-2 minutos e tenta novamente. Se continuar sem resposta, podes contactar o Nelson para verificar o sistema."),
    espacoP(),

    subtitulo("Posso confiar nela com informações sensíveis das minhas clientes?"),
    corpo("A Lia guarda informações de forma segura. Ainda assim, evita partilhar dados bancários ou documentos confidenciais — usa-a para gerir nomes, contactos, estados de pipeline e notas operacionais."),
    separador(),

    // PARTE 8
    new Paragraph({ children: [new PageBreak()] }),
    titulo("PARTE 8 — Exemplo de um Dia com a Lia"),
    corpo("Para perceberes melhor como usar, aqui está um exemplo de como pode ser o teu dia:"),
    espacoP(160),

    subtitulo("De manhã (07:30)"),
    corpo("Natacha envia:", { bold: true }),
    citacao("\"Briefing do dia\""),
    corpo("Lia responde:", { bold: true }),
    citacao("\"Bom dia Natacha. Tens 3 tarefas pendentes para hoje: enviar proposta à Beatriz (urgente), confirmar horário da sessão de quinta, e responder à lead da semana passada — a Joana, que perguntou sobre o VF-18. No pipeline tens 2 leads activas: Joana (quente) e Paulo (morno). Que queres tratar primeiro?\""),
    espacoP(),

    subtitulo("A meio da manhã (10:15)"),
    corpo("Natacha envia:", { bold: true }),
    citacao("\"Falei com a Beatriz, aceita a proposta. Já não preciso de enviar nada.\""),
    corpo("Lia responde:", { bold: true }),
    citacao("\"Entendido — proposta da Beatriz concluída. Fica como cliente activa. Queres que eu registe a data de início da mentoria?\""),
    espacoP(),

    subtitulo("Ao almoço (13:00)"),
    corpo("Natacha envia:", { bold: true }),
    citacao("\"Preciso de uma mensagem para a Joana, ela perguntou o preço e ficou em silêncio há 2 dias\""),
    corpo("Lia responde:", { bold: true }),
    citacao("\"Aqui vai uma sugestão: 'Joana, boa tarde. Sei que o investimento é uma decisão importante e merece reflexão. Se tiveres alguma dúvida que te esteja a travar, estou aqui para conversar — sem pressão. O VF-18 não é para toda a gente, e se for para ti, vais saber. Quando estiveres pronta, é só dizer.' Queres ajustar algo antes de enviar?\""),
    espacoP(),

    subtitulo("À tarde (16:45)"),
    corpo("Natacha envia:", { bold: true }),
    citacao("\"Nova lead — conheci a Sandra hoje no ginásio, está a passar por uma fase difícil no trabalho. Número dela é +244 912 345 678\""),
    corpo("Lia responde:", { bold: true }),
    citacao("\"Sandra registada — contacto +244 912 345 678, origem: encontro pessoal, interesse: mentoria (fase de exploração). Queres que eu note mais algum contexto sobre ela?\""),
    espacoP(),

    subtitulo("Ao fim do dia (19:00)"),
    corpo("Natacha envia:", { bold: true }),
    citacao("\"Fecha o dia — o que ficou por fazer?\""),
    corpo("Lia responde:", { bold: true }),
    citacao("\"Do que estava planeado para hoje, ficou pendente: confirmar horário da sessão de quinta. As restantes tarefas foram concluídas. Para amanhã tens: follow-up com Paulo (morno há 5 dias). Boa noite, Natacha.\""),
    separador(),

    // CONTACTO
    titulo("Contacto de Suporte"),
    corpo("Se a Lia apresentar algum problema ou comportamento estranho, contacta:"),
    espacoP(120),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [new TextRun({ text: "Nelson Rodrigues — Marca Digital", font: "Argesta", size: 28, color: VERMELHO })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: "Responsável técnico pelo sistema", font: "Bellefair", size: 22, color: CINZA_SUB })]
    }),
    separador(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 80 },
      children: [new TextRun({ text: "Sistema Lia v1.0 — AI COO para Natacha António Miguel", font: "Bellefair", size: 20, color: CINZA_SUB, italics: true })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: "Elaborado por Marca Digital — Maio 2026", font: "Bellefair", size: 18, color: CREME })]
    }),
  ];
}

// ─── DOCUMENTO ────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "›",
          alignment: AlignmentType.LEFT,
          style: {
            run: { font: "Bellefair", size: 22, color: DOURADO },
            paragraph: { indent: { left: 480, hanging: 240 } }
          }
        }]
      }
    ]
  },
  styles: {
    default: {
      document: {
        run: { font: "Bellefair", size: 22, color: PRETO }
      }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Argesta", size: 40, color: VERMELHO, bold: false },
        paragraph: { spacing: { before: 480, after: 160 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Bellefair", size: 24, color: DOURADO, bold: true },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 }
      }
    },
    headers: { default: makeHeader() },
    footers: { default: makeFooter() },
    children: [
      ...makeCapa(),
      ...makeConteudo(),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/Users/admin/PROJECTOS/Natacha/Manual-Lia-COO-Natacha.docx", buffer);
  console.log("DOCX criado com sucesso!");
}).catch(err => {
  console.error("Erro:", err);
  process.exit(1);
});
