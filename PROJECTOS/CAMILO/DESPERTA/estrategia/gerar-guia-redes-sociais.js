const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  ExternalHyperlink
} = require('docx');
const fs = require('fs');

// ─── PALETA DE CORES DESPERTA ─────────────────────────────────────────────
const NAVY   = '0A2540';  // Azul navy (primário)
const TEAL   = '007A87';  // Teal (secundário)
const GOLD   = 'C4A053';  // Gold (acento)
const LIGHT  = 'F4F7FA';  // Fundo claro
const WHITE  = 'FFFFFF';
const DARK   = '1A1A2E';
const GRAY   = '6B7280';
const LGRAY  = 'E8EDF2';

// ─── HELPERS ──────────────────────────────────────────────────────────────
const border = (color = LGRAY, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: WHITE });
const allBorders = (color, size) => ({ top: border(color, size), bottom: border(color, size), left: border(color, size), right: border(color, size) });
const noBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() });

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 6 } },
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: NAVY })]
  });
}

function heading2(text, color = TEAL) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 26, bold: true, color })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 22, bold: true, color: NAVY })]
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text, font: 'Arial', size: 22, color: DARK, ...opts })]
  });
}

function italic(text) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text, font: 'Arial', size: 22, italics: true, color: GRAY })]
  });
}

function spacer(lines = 1) {
  return new Paragraph({ spacing: { before: lines * 60, after: 0 }, children: [new TextRun('')] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function bullet(text, level = 0) {
  const indent = level === 0 ? { left: 600, hanging: 300 } : { left: 960, hanging: 300 };
  return new Paragraph({
    spacing: { before: 40, after: 60 },
    indent,
    numbering: { reference: 'bullets', level },
    children: [new TextRun({ text, font: 'Arial', size: 22, color: DARK })]
  });
}

function bulletBold(label, text) {
  return new Paragraph({
    spacing: { before: 40, after: 60 },
    indent: { left: 600, hanging: 300 },
    numbering: { reference: 'bullets', level: 0 },
    children: [
      new TextRun({ text: label + ' ', font: 'Arial', size: 22, bold: true, color: NAVY }),
      new TextRun({ text, font: 'Arial', size: 22, color: DARK })
    ]
  });
}

// Caixa de destaque colorida
function calloutBox(title, lines, bgColor = LIGHT, borderColor = TEAL) {
  const rows = [];

  if (title) {
    rows.push(new TableRow({
      children: [new TableCell({
        borders: noBorders(),
        shading: { fill: borderColor, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [new Paragraph({
          children: [new TextRun({ text: title, font: 'Arial', size: 22, bold: true, color: WHITE })]
        })]
      })]
    }));
  }

  rows.push(new TableRow({
    children: [new TableCell({
      borders: allBorders(borderColor, 8),
      shading: { fill: bgColor, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: lines.map(l => new Paragraph({
        spacing: { before: 40, after: 60 },
        children: [new TextRun({ text: l, font: 'Arial', size: 22, color: DARK })]
      }))
    })]
  }));

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows,
    margins: { top: 120, bottom: 120 }
  });
}

// Tabela com cabeçalho navy
function namedTable(headers, rows, widths) {
  const totalW = widths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders: allBorders(NAVY, 6),
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      width: { size: widths[i], type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({ text: h, font: 'Arial', size: 20, bold: true, color: WHITE })]
      })]
    }))
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      borders: allBorders(LGRAY, 4),
      shading: { fill: ri % 2 === 0 ? WHITE : LIGHT, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      width: { size: widths[ci], type: WidthType.DXA },
      children: [new Paragraph({
        children: [new TextRun({ text: cell, font: 'Arial', size: 20, color: DARK })]
      })]
    }))
  }));

  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows]
  });
}

// Tabela com cabeçalho teal
function tealTable(headers, rows, widths) {
  const totalW = widths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders: allBorders(TEAL, 6),
      shading: { fill: TEAL, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      width: { size: widths[i], type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        children: [new TextRun({ text: h, font: 'Arial', size: 20, bold: true, color: WHITE })]
      })]
    }))
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => {
      const isBold = cell.startsWith('**') && cell.endsWith('**');
      const displayText = isBold ? cell.slice(2, -2) : cell;
      return new TableCell({
        borders: allBorders(LGRAY, 4),
        shading: { fill: ri % 2 === 0 ? WHITE : LIGHT, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        width: { size: widths[ci], type: WidthType.DXA },
        children: [new Paragraph({
          children: [new TextRun({ text: displayText, font: 'Arial', size: 20, bold: isBold, color: isBold ? NAVY : DARK })]
        })]
      });
    })
  }));

  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...dataRows]
  });
}

// Separador visual
function goldDivider() {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } },
    children: [new TextRun('')]
  });
}

// Tag badge (pilar)
function pillarTag(number, title, percent, color = TEAL) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 6660, 1500],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders(),
          shading: { fill: color, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `P${number}`, font: 'Arial', size: 28, bold: true, color: WHITE })]
          })]
        }),
        new TableCell({
          borders: allBorders(LGRAY, 4),
          shading: { fill: LIGHT, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 180, right: 120 },
          children: [new Paragraph({
            children: [new TextRun({ text: title, font: 'Arial', size: 24, bold: true, color: NAVY })]
          })]
        }),
        new TableCell({
          borders: noBorders(),
          shading: { fill: GOLD, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 80, right: 80 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: percent, font: 'Arial', size: 24, bold: true, color: WHITE })]
          })]
        }),
      ]
    })]
  });
}

// ─── CONSTRUÇÃO DO DOCUMENTO ──────────────────────────────────────────────

const children = [

  // ── CAPA ──
  spacer(4),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: 'DESPERTA ACADEMY', font: 'Arial', size: 52, bold: true, color: NAVY })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: 'Dr. Camilo Ortet', font: 'Arial', size: 30, color: TEAL, italics: true })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 8 } },
    children: [new TextRun('')]
  }),
  spacer(1),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: 'GUIA DE REDES SOCIAIS', font: 'Arial', size: 36, bold: true, color: TEAL })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 400 },
    children: [new TextRun({ text: 'Linha Editorial, Bios, Posicionamento e Tipos de Conteudo', font: 'Arial', size: 26, color: GRAY, italics: true })]
  }),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders(),
          shading: { fill: LIGHT, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Preparado por:', font: 'Arial', size: 18, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: 'Marca Digital', font: 'Arial', size: 20, bold: true, color: NAVY })] }),
          ]
        }),
        new TableCell({
          borders: noBorders(),
          shading: { fill: LIGHT, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Data:', font: 'Arial', size: 18, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: 'Maio de 2026', font: 'Arial', size: 20, bold: true, color: NAVY })] }),
          ]
        }),
      ]
    })]
  }),
  spacer(2),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 0 },
    children: [new TextRun({ text: 'CONFIDENCIAL', font: 'Arial', size: 18, bold: true, color: GRAY })]
  }),

  pageBreak(),

  // ── SECÇÃO 1: POSICIONAMENTO ──
  heading1('1. POSICIONAMENTO ESTRATEGICO'),
  spacer(1),

  heading2('1.1 A Frase-Ancora da Marca'),
  spacer(1),
  calloutBox('A FRASE QUE DEFINE TUDO', [
    '"A Desperta e a unica academia angolana fundada por quem viveu a lideranca por dentro',
    '— da banca ao governo, da KPMG ao palco — com 16 anos a transformar pessoas',
    'e organizacoes de dentro para fora."',
  ], 'E8F4F8', TEAL),
  spacer(1),
  body('Esta frase serve de filtro para TODA a decisao de conteudo. Se um post nao reforca esta frase, nao foi escrito. E o teste final antes de publicar qualquer peca.'),
  spacer(2),

  heading2('1.2 Territorios Exclusivos da Desperta'),
  spacer(1),
  body('A Desperta ocupa 5 territorios que nenhum concorrente consegue replicar. Cada peca de conteudo deve reforcar pelo menos um destes territorios:'),
  spacer(1),
  tealTable(
    ['TERRITORIO', 'PORQUE E NOSSO', 'O QUE FAZER NA PRATICA'],
    [
      ['"De dentro para fora"', 'Modelo Saber-Ser proprietario. Nenhum concorrente ocupa o interior.', 'Cada post sobre o modelo reforca que a Desperta vai onde os outros nao vao'],
      ['"Viveu a banca por dentro"', 'Ninguem em Angola tem o CV bancario do Camilo.', 'Historias do BAI, BFA, KPMG, CMC — usadas com frequencia'],
      ['"Voz angolana genuina"', '80% dos concorrentes sao portugueses (CEGOC, HighSkills, KEY, Vantagem+).', 'Escrever SEMPRE "Na nossa realidade", "Aqui em Luanda", "o nosso contexto"'],
      ['"16 anos, 40+ organizacoes"', 'Prova social acumulada que ninguem com menos tempo consegue copiar.', 'NUNCA dizer "muito tempo" — sempre com numero concreto'],
      ['"Tecnica + Humano"', 'Ninguem combina hard skills bancarias com desenvolvimento emocional.', 'Combinar insights de banca com desenvolvimento emocional — e o que ninguem faz'],
    ],
    [2400, 3480, 3480]
  ),
  spacer(2),

  heading2('1.3 O Que NUNCA Fazer — Blacklist de Posicionamento'),
  spacer(1),
  bullet('Motivacao generica sem substancia real ("Acredita!", "Vai em frente!", "Seja o seu melhor eu")'),
  bullet('Conteudo Angocaju no perfil @camiloortet — e outra marca, outra pagina'),
  bullet('Conteudo religioso explicito — dilui o publico corporativo'),
  bullet('Estrangeirismos: "mindset", "hack", "disruptivo", "unlock", "unleash"'),
  bullet('Competir por preco — sempre competir por profundidade'),
  bullet('Posts que podiam ter sido escritos por qualquer coach do mundo'),
  spacer(2),

  heading2('1.4 A Voz do Camilo — Como Escrever'),
  spacer(1),
  tealTable(
    ['TRACO', 'ESCREVE ASSIM', 'NUNCA ASSIM'],
    [
      ['**Experiente**', '"Nos meus anos no BAI, aprendi que lideranca nao se ensina — desperta-se."', '"Os experts dizem que..."'],
      ['**Reflexivo**','Perguntas abertas: "Fica ai a pergunta." / "O que achas?"', 'Certezas absolutas: "E assim que funciona."'],
      ['**Angolano**', '"Na nossa realidade angolana, as equipas precisam de mais do que tecnica."', '"Em Portugal/Brasil fazem assim..."'],
      ['**Humilde mas firme**', '"Posso estar errado, mas em 25 anos nunca vi uma equipa falhar por falta de conhecimento."', '"Eu sei que tenho razao."'],
      ['**Concreto**', '"3 anos no BFA ensinaram-me mais sobre lideranca do que qualquer MBA."', 'Abstracoes vagas sem contexto real'],
      ['**Humano**', '"Errei quando..." / "Levei 10 anos a perceber que..."', 'Perfeccionismo de guru sem falhas'],
      ['**Professoral**', 'Ensina, estrutura, nomeia frameworks com clareza', 'Motivacional barato sem substancia'],
    ],
    [2000, 3680, 3680]
  ),
  spacer(2),

  heading2('1.5 Lexico — Palavras que o Camilo Usa (e nao usa)'),
  spacer(1),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: allBorders(TEAL, 6),
            shading: { fill: TEAL, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: 'USA — Vocabulario da Desperta', font: 'Arial', size: 22, bold: true, color: WHITE })] })]
          }),
          new TableCell({
            borders: allBorders('CC0000', 6),
            shading: { fill: 'CC0000', type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            children: [new Paragraph({ children: [new TextRun({ text: 'NAO USA — Blacklist de Palavras', font: 'Arial', size: 22, bold: true, color: WHITE })] })]
          }),
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: allBorders(LGRAY, 4),
            shading: { fill: 'E8F4F8', type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              'Despertar / Desperta / Desperto',
              'Lider, lideranca consciente, de dentro para fora',
              'Saber-Saber, Saber-Fazer, Saber-Ser',
              'Trajectoria, percurso, caminho',
              'Transformacao (nunca "mudanca" sozinho)',
              'Pessoas, equipas, organizacoes',
              'Consciencia, intencao, proposito',
              '"No meu tempo de banca...", "Quando estava na KPMG..."',
              'Angola, angolano, nosso contexto, a nossa realidade',
            ].map(t => new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: '\u2713  ' + t, font: 'Arial', size: 20, color: DARK })] }))
          }),
          new TableCell({
            borders: allBorders(LGRAY, 4),
            shading: { fill: 'FFF0F0', type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              '"Mindset" (excepto ironicamente)',
              '"Vencedor", "mente vencedora"',
              '"Ser o teu melhor eu"',
              '"Unleash your potential"',
              '"Disruptivo", "inovador", "revolucionario"',
              '"Hack", "hacks de produtividade"',
              'Estrangeirismos desnecessarios em ingles',
              '"Acredita!" (ponto de exclamacao motivacional)',
              '"Sucesso", "abundancia", "manifestar"',
            ].map(t => new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: '\u2717  ' + t, font: 'Arial', size: 20, color: DARK })] }))
          }),
        ]
      })
    ]
  }),

  pageBreak(),

  // ── SECÇÃO 2: BIOS ──
  heading1('2. BIOS OPTIMIZADAS — TEXTOS PRONTOS'),
  spacer(1),

  heading2('2.1 Instagram @camiloortet — Perfil Pessoal'),
  spacer(1),
  body('PROBLEMA ACTUAL: Bio dispersa, nao diz quem e o Camilo em 3 segundos. Nao tem proposta de valor clara nem CTA.', { color: 'CC0000' }),
  spacer(1),
  calloutBox('BIO NOVA — COPIAR E COLAR', [
    'Dr. Camilo Ortet',
    'Ex-Banca · KPMG · CMC · Ministerios',
    'Formo lideres de dentro para fora ha 16 anos',
    '\uD83D\uDCCD Luanda · Angola',
    '\u25B8 Desperta Academy | Eu, o Lider',
    '\uD83D\uDC47 Comeca aqui',
    '\uD83D\uDD17 despertaacademy.com',
  ], 'E8F4F8', TEAL),
  spacer(1),
  heading3('Porque funciona — cada linha tem uma funcao:'),
  bullet('Linha 1: nome com titulo (autoridade instantanea)'),
  bullet('Linha 2: credenciais em telegrama — BAI/KPMG/CMC sao ancoras de confianca corporativa'),
  bullet('Linha 3: proposta de valor com numero concreto (16 anos — nao "varios anos")'),
  bullet('Linha 4: localizacao + territorio (Angola, nao "global")'),
  bullet('Linha 5: a academia + o programa flagship'),
  bullet('Linha 6: CTA directo e simples'),
  bullet('Linha 7: link unico para o website'),
  spacer(2),

  heading2('2.2 Instagram @desperta.co — Perfil Institucional'),
  spacer(1),
  body('PROBLEMA CRITICO: Bio vazia e sem link. E o problema mais urgente — um perfil sem bio e invisivel.', { color: 'CC0000' }),
  spacer(1),
  calloutBox('BIO NOVA — COPIAR E COLAR', [
    'DESPERTA ACADEMY',
    'Formacao · Treinamento · Desenvolvimento',
    '16 anos a formar lideres angolanos',
    '\uD83C\uDFC6 40+ organizacoes transformadas',
    '\u25B8 Eu, o Lider | Eu, o Team | Eu, o Dream',
    '\uD83D\uDCCD Patriota, Luanda',
    '\uD83D\uDC47 Conhece os programas',
    '\uD83D\uDD17 despertaacademy.com',
  ], 'E8F4F8', NAVY),
  spacer(2),

  heading2('2.3 Destaques do Instagram @desperta.co'),
  spacer(1),
  body('Criar 6 destaques, por esta ordem (a sequencia e intencional — guia o novo seguidor pela jornada certa):'),
  spacer(1),
  namedTable(
    ['N.', 'NOME DO DESTAQUE', 'CONTEUDO A INCLUIR', 'PRIORIDADE'],
    [
      ['1', '\uD83D\uDCD6 Sobre', 'Quem e a Desperta, missao, fundador, 16 anos, metodologia', 'URGENTE'],
      ['2', '\uD83C\uDFAF Programas', 'Eu, o Lider / Eu, o Team / Eu, o Dream Building — 1 slide por programa', 'URGENTE'],
      ['3', '\uD83C\uDFE2 Clientes', 'Logos das organizacoes (BAI, BFA, BCI, INSS, Ministerios, etc.)', 'URGENTE'],
      ['4', '\uD83D\uDCAC Testemunhos', 'Videos 30-60s e citacoes de ex-participantes', 'ALTA'],
      ['5', '\uD83D\uDCF8 Bastidores', 'Fotos autenticas de formacoes reais, eventos, palestras', 'MEDIA'],
      ['6', '\uD83D\uDCDE Contacto', 'Email, WhatsApp, website, localizacao — todos os canais', 'ALTA'],
    ],
    [400, 2000, 4560, 1400]
  ),
  spacer(2),

  heading2('2.4 LinkedIn — Headline do Camilo Ortet'),
  spacer(1),
  body('PROBLEMA ACTUAL: Lista de cargos. Funcional mas nao narrativo — nao diz o que faz hoje.'),
  spacer(1),
  calloutBox('HEADLINE NOVA — COPIAR E COLAR', [
    'Formo lideres de dentro para fora | Fundador Desperta Academy |',
    'Ex-BAI · BFA · KPMG · CMC · INSS | Master Coach FEBRACIS/IBC |',
    '25 anos em Banca, Governo e Formacao Executiva em Angola',
  ], 'E8F4F8', NAVY),
  spacer(2),

  heading2('2.5 LinkedIn — Summary / About do Camilo Ortet'),
  spacer(1),
  calloutBox('TEXTO ABOUT — COPIAR E COLAR', [
    'De professor de Matematica em Luanda a Director no BAI, da KPMG',
    'ao Ministerio das Financas — em 25 anos descobri que a verdadeira',
    'recuperacao nao e a do credito. E a das pessoas.',
    '',
    'Comecei a ensinar aos 18 anos. Passei pela banca comercial, pela',
    'consultoria financeira, pela regulacao de mercados, pela gestao',
    'publica e pela agro-industria. Em cada lugar, a mesma pergunta',
    'voltava: porque e que tantas organizacoes tecnicamente competentes',
    'falham humanamente?',
    '',
    'Foi essa pergunta que fundou a DESPERTA.',
    '',
    '\u25B8 16 anos a formar lideres em Angola',
    '\u25B8 40+ organizacoes transformadas (banca, governo, empresas)',
    '\u25B8 3 programas-assinatura: Eu, o Lider | Eu, o Team | Eu, o Dream Building',
    '\u25B8 Metodologia propria: Saber-Saber · Saber-Fazer · Saber-Ser',
    '',
    'Se lideras uma equipa, um departamento ou uma organizacao em',
    'Angola e sentes que ha algo que nao se resolve so com estrategia',
    'ou tecnologia — vamos conversar.',
  ], 'F0F4F0', TEAL),

  pageBreak(),

  // ── SECÇÃO 3: PILARES DE CONTEUDO ──
  heading1('3. OS 5 PILARES DE CONTEUDO'),
  spacer(1),
  body('Esta e a matriz que rege TODA a publicacao. Cada peca de conteudo tem de ser classificada num destes pilares ANTES de ser produzida. Sem pilar definido, nao publica.'),
  spacer(2),

  pillarTag(1, 'AUTORIDADE VIVIDA', '35%', NAVY),
  spacer(1),
  body('O que so o Camilo pode dizer porque viveu. Nao e teoria — e memoria. E o pilar mais diferenciador.', { italics: true }),
  spacer(1),
  heading3('Formulas que funcionam:'),
  bullet('"O que o BAI me ensinou sobre [X]"'),
  bullet('"3 anos a recuperar credito no BFA — aprendi mais sobre lideranca do que em qualquer MBA"'),
  bullet('"Quando estava na KPMG, percebi que o problema nunca era tecnico"'),
  bullet('"Na CMC regulavamos mercados. Mas quem regula as emocoes de quem decide?"'),
  spacer(1),
  heading3('Banco de Titulos Prontos — Pilar 1:'),
  bullet('"Passei 3 anos a recuperar credito no BFA. O que aprendi sobre lideranca nao estava em nenhum manual."'),
  bullet('"Na CMC, regulavamos mercados. Mas quem regula as emocoes de quem decide?"'),
  bullet('"25 anos de carreira num resumo: comecei a ensinar Matematica, acabei a ensinar Lideranca."'),
  bullet('"O que a KPMG me ensinou sobre recuperacao — de credito e de pessoas"'),
  bullet('"Porque e que os bancos angolanos precisam de inteligencia emocional (e nao de mais tecnica)"'),
  bullet('"Eu, o Lider: a formacao que comeca por dentro"'),
  bullet('"O que 40 organizacoes me ensinaram sobre equipas"'),
  bullet('"Saber-Saber, Saber-Fazer, Saber-Ser — as 3 dimensoes que faltam na formacao angolana"'),
  spacer(2),

  pillarTag(2, 'PROVA SOCIAL', '25%', TEAL),
  spacer(1),
  body('Mostrar quem confiou na Desperta, o que aconteceu, o que disseram. Constroi credibilidade sem dizer "confie em mim".', { italics: true }),
  spacer(1),
  heading3('Formatos prioritarios:'),
  bulletBold('Testemunho em video', '30-60 segundos — prioridade maxima. Meta: 5+ videos ate fim de Maio.'),
  bulletBold('Logos das organizacoes', 'BAI, BFA, BCI, INSS, Ministerios — sempre com legenda que conta a historia.'),
  bulletBold('"Caso real"', '"Uma equipa de 12 gestores de uma instituicao bancaria angolana..." (sem nomear, se sensivel)'),
  bulletBold('Fotos de formacoes antigas', 'Legenda narrativa — nao "boa tarde", mas conta o que aconteceu naquele dia.'),
  spacer(1),
  calloutBox('REGRA DE OURO — PROVA SOCIAL', [
    'Nunca inventar. 40+ organizacoes = diz "mais de 40". 5 testemunhos = usa os 5 muito bem.',
    'Um testemunho real e especifico vale 10 frases genericas de autoridade.',
  ], 'FFF8E8', GOLD),
  spacer(2),

  pillarTag(3, 'STORYTELLING PESSOAL', '20%', '2E6B5E'),
  spacer(1),
  body('A trajectoria humana. O que faz publico frio parar o scroll. E o conteudo que converte seguidores em fas.', { italics: true }),
  spacer(1),
  heading3('Os 7 temas-ancora da historia do Camilo:'),
  bullet('De professor de Matematica em Luanda → Director do BAI'),
  bullet('O salto BFA → KPMG → aprender consultoria depois da banca'),
  bullet('A CMC e a regulacao → o poder que ensina humildade'),
  bullet('Angocaju → 7 anos de agro-industria, a fabrica, a terra (apenas @camiloortet pessoal)'),
  bullet('FEBRACIS Brasil → a decisao de se formar coach aos 40+'),
  bullet('A fundacao da Desperta → porque nao chegava so ser tecnico'),
  bullet('A origem — professor aos 17 anos, Angola dos anos 80'),
  spacer(1),
  heading3('Estrutura narrativa para posts longos:'),
  calloutBox('FORMULA STORYTELLING', [
    '1. GANCHOS (1 frase que faz parar o scroll)',
    '2. CONTEXTO (onde, quando, quem)',
    '3. CONFLITO / MOMENTO DE VIRAGEM',
    '4. LICAO (em 1-2 frases memoraveis)',
    '5. PERGUNTA AO LEITOR (gera comentario — algoritmo premia)',
  ], 'F0F4F0', '2E6B5E'),
  spacer(1),
  heading3('Exemplo de gancho forte:'),
  italic('"Aos 18 anos ensinava Matematica numa escola em Luanda. Aos 40, dirigia uma divisao do BAI. Mas so aos 50 percebi o que realmente fazia."'),
  spacer(2),

  pillarTag(4, 'EDUCACAO & FRAMEWORK', '15%', GOLD),
  spacer(1),
  body('Ensinar de graca. Dar estrutura. Mostrar o cerebro. Quem ensina bem, vende sem precisar de vender.', { italics: true }),
  spacer(1),
  heading3('Frameworks proprietarios a explicar repetidamente:'),
  bulletBold('Saber-Saber / Saber-Fazer / Saber-Ser:', 'O modelo central. Explicar em carrosseis, reels, artigos. E a metodologia diferenciadora.'),
  bulletBold('Eu, o Lider / Eu, o Team / Eu, o Dream Building:', 'Os 3 programas em linguagem simples — o que e, para quem, o que muda.'),
  bulletBold('Transformacao de dentro para fora:', 'O que significa na pratica, com exemplos concretos de empresas angolanas.'),
  spacer(1),
  heading3('Formatos preferidos:'),
  bullet('Carrosseis de 8-10 slides Instagram (mais partilhados)'),
  bullet('Artigos longos LinkedIn (1500-2500 caracteres)'),
  bullet('Reels de 60s explicando 1 unico conceito'),
  spacer(2),

  pillarTag(5, 'CHAMADA A ACCAO', '5%', 'CC0000'),
  spacer(1),
  body('A peca comercial directa. Maximo 1-2 por semana. Nunca agressiva — sempre com contrapartida de valor.', { italics: true }),
  spacer(1),
  heading3('Formulas que funcionam:'),
  bullet('"Marca uma conversa de 20 minutos e sais com 1 insight aplicavel amanha."'),
  bullet('"Uma Hora com Camilo Ortet — 4 vagas em Maio. Link na bio."'),
  bullet('"Se lideras uma equipa em Angola e sentes que falta algo — vamos conversar."'),
  spacer(1),
  calloutBox('REGRA DO CTA', [
    'NUNCA agressiva: "Compra ja!", "Ultimas vagas!", "Nao percas!"',
    'SEMPRE com contrapartida: o lead ganha algo antes de se comprometer.',
    'MAXIMO 1-2 CTAs por semana. Mais do que isso, parece vendedor ambulante.',
  ], 'FFF0F0', 'CC0000'),

  pageBreak(),

  // ── SECÇÃO 4: FREQUÊNCIA POR CANAL ──
  heading1('4. FREQUENCIA E CALENDARIO POR CANAL'),
  spacer(1),

  namedTable(
    ['CANAL', 'FREQUENCIA', 'MELHOR HORARIO', 'FORMATOS PRIORITARIOS'],
    [
      ['LinkedIn @camiloortet', '2-3x / semana', 'Terca e Quinta 8h-9h', 'Texto longo (1500-2500 car.) + imagem'],
      ['Instagram @camiloortet', '4-5x / semana', 'Terca-Quinta 19h / Sabado 10h', 'Reels 40%, Carrosseis 30%, Estatico 20%, Stories diario'],
      ['Instagram @desperta.co', '2-3x / semana', 'Quarta e Sexta 12h', 'Institucional, elegante, curto (200-400 car.)'],
      ['WhatsApp (CRM)', 'Conforme pipeline', 'Horario comercial', 'Pessoal, directo, 1-para-1, muito curto'],
    ],
    [2400, 1800, 2160, 3000]
  ),
  spacer(2),

  heading2('4.1 Tom por Canal'),
  spacer(1),
  body('O Camilo e o mesmo em todos os canais, mas o tom adapta-se ao contexto. Como um medico que fala diferente numa conferencia, num cafe e numa mensagem ao amigo.'),
  spacer(1),
  tealTable(
    ['CANAL', 'TOM', 'EXTENSAO', 'EXEMPLO'],
    [
      ['LinkedIn', 'Reflexivo, professoral, narrativo', 'Longo (1500-2500 car.)', '"Passei 3 anos a recuperar credito..."'],
      ['Instagram @camiloortet', 'Humano, proximo, storytelling visual', 'Medio (400-800 car.)', '"Naquele dia no BAI, percebi..."'],
      ['Instagram @desperta.co', 'Institucional, frio mas elegante', 'Curto (200-400 car.)', '"16 anos a transformar lideres."'],
      ['Website', 'Autoridade serena, sem vender', 'Equilibrado', '"Formamos lideres de dentro para fora."'],
      ['WhatsApp CRM', 'Pessoal, directo, um-para-um', 'Muito curto', '"Ola [nome], tenho algo para ti."'],
    ],
    [2200, 2500, 2000, 2660]
  ),
  spacer(2),

  heading2('4.2 Calendario de Maio — Semana a Semana'),
  spacer(1),

  heading3('SEMANA 1 — "A Desperta esta de volta"'),
  tealTable(
    ['DIA', 'CANAL', 'PILAR', 'CONTEUDO'],
    [
      ['Ter 5', 'LinkedIn', 'P3', '"1 de Maio — novo capitulo. 16 anos depois, a Desperta renasce diferente."'],
      ['Qua 6', 'IG @desperta.co', 'P1', 'Manifesto visual: "Desperta. Transforma. Lidera."'],
      ['Qui 7', 'LinkedIn', 'P1', '"25 anos de carreira: o que descobri sobre lideranca" (artigo inaugural)'],
      ['Sex 8', 'IG @camiloortet', 'P3', 'Reel: "Comecei a ensinar Matematica aos 18. E a mesma coisa."'],
      ['Sab 9', 'IG @camiloortet', 'P2', 'Carrossel: logos das organizacoes + "Mais de 40 organizacoes confiaram"'],
    ],
    [900, 2100, 700, 5660]
  ),
  spacer(1),

  heading3('SEMANA 2 — "Autoridade Vivida"'),
  tealTable(
    ['DIA', 'CANAL', 'PILAR', 'CONTEUDO'],
    [
      ['Ter 12', 'LinkedIn', 'P1', '"O que a KPMG me ensinou sobre recuperacao — de credito e de pessoas"'],
      ['Qua 13', 'IG @desperta.co', 'P4', 'Carrossel: "Saber-Saber, Saber-Fazer, Saber-Ser — as 3 dimensoes"'],
      ['Qui 14', 'LinkedIn', 'P1', '"Porque e que os bancos angolanos precisam de inteligencia emocional"'],
      ['Sex 15', 'IG @camiloortet', 'P2', 'Testemunho em video (ex-cliente — 30-60s)'],
      ['Sab 16', 'IG @camiloortet', 'P3', 'Reel: historia da FEBRACIS — "a decisao de me formar coach aos 40"'],
    ],
    [900, 2100, 700, 5660]
  ),
  spacer(1),

  heading3('SEMANA 3 — "Prova Social + Educacao"'),
  tealTable(
    ['DIA', 'CANAL', 'PILAR', 'CONTEUDO'],
    [
      ['Ter 19', 'LinkedIn', 'P4', 'Artigo: "Eu, o Lider: a formacao que comeca por dentro"'],
      ['Qua 20', 'IG @camiloortet', 'P2', 'Foto formacao antiga + legenda narrativa (nao so "boa tarde")'],
      ['Qui 21', 'LinkedIn', 'P2', '"O que 40 organizacoes me ensinaram sobre equipas"'],
      ['Sex 22', 'IG @desperta.co', 'P4', 'Carrossel: "Eu, o Lider / Eu, o Team / Eu, o Dream — qual e o teu?"'],
      ['Sab 23', 'IG @camiloortet', 'P3', 'Reel: "Na CMC, regulavamos mercados. Mas quem regula as emocoes?"'],
    ],
    [900, 2100, 700, 5660]
  ),
  spacer(1),

  heading3('SEMANA 4 — "Conversao + Comunidade"'),
  tealTable(
    ['DIA', 'CANAL', 'PILAR', 'CONTEUDO'],
    [
      ['Ter 26', 'LinkedIn', 'P5', 'CTA: "Uma Hora com Camilo Ortet — 4 vagas em Junho."'],
      ['Qua 27', 'IG @camiloortet', 'P1', 'Reel 60s: "O que aprendi no BAI sobre lideranca"'],
      ['Qui 28', 'LinkedIn', 'P3', '"A Desperta nasceu de uma pergunta: porque falham organizacoes?"'],
      ['Sex 29', 'IG @desperta.co', 'P2', 'Logos clientes + "Empresas que confiaram na Desperta"'],
      ['Sab 30', 'IG @camiloortet', 'P5', 'CTA visual: "Queres desenvolver a tua equipa? Comeca aqui."'],
    ],
    [900, 2100, 700, 5660]
  ),

  pageBreak(),

  // ── SECÇÃO 5: TIPOS DE CONTEUDO ──
  heading1('5. TIPOS DE CONTEUDO — GUIA COMPLETO'),
  spacer(1),

  heading2('5.1 Reels (Video Curto) — 40% do Instagram'),
  spacer(1),
  body('O formato com maior alcance organico. Prioridade maxima para crescimento de seguidores novos.'),
  spacer(1),
  namedTable(
    ['TIPO DE REEL', 'DURACAO', 'ESTRUTURA', 'EXEMPLO'],
    [
      ['Historia pessoal', '60-90s', 'Gancho → historia → licao → pergunta', '"Quando estava no BAI em 2012..."'],
      ['Conceito rapido', '30-45s', 'Problema → solucao em 3 passos → CTA', '"3 sinais de que a tua equipa nao te segue"'],
      ['Bastidores', '15-30s', 'Autentico, natural, sem edicao pesada', 'Camilo a preparar uma formacao'],
      ['Testemunho', '30-60s', 'Quem e → desafio → resultado', 'Ex-participante de "Eu, o Lider"'],
      ['Manifesto', '60s', 'Posicionamento forte + frameworkeducativo', '"O que e Saber-Ser em 60 segundos"'],
    ],
    [2200, 1000, 3200, 2960]
  ),
  spacer(1),
  calloutBox('REGRA DO GANCHO — PRIMEIROS 3 SEGUNDOS', [
    'Se nao parou o scroll nos primeiros 3 segundos, perdeu o view.',
    '',
    'Ganchos que funcionam:',
    '"Aos 18 anos ensinava Matematica. Aos 40, dirigia o BAI."',
    '"3 erros que vi repetidos em todos os bancos angolanos."',
    '"A sua equipa nao e ma. E desorientada. Ha diferenca."',
    '',
    'Ganchos que NAO funcionam:',
    '"Bom dia, pessoal!" / "Hoje quero falar sobre..." / "Como vai tudo?"',
  ], 'FFF8E8', GOLD),
  spacer(2),

  heading2('5.2 Carrosseis — 30% do Instagram'),
  spacer(1),
  body('O formato mais partilhado. Ideal para frameworks, listas e educacao. Cada slide deve poder existir sozinho.'),
  spacer(1),
  namedTable(
    ['TIPO', 'NUMERO DE SLIDES', 'ESTRUTURA'],
    [
      ['Framework educativo', '8-10', 'Slide 1: titulo forte → Slides 2-8: cada ponto → Slide final: CTA'],
      ['Lista de insights', '5-7', 'Slide 1: promessa → 1 insight por slide → Slide final: resumo'],
      ['Historia visual', '6-8', 'Slide 1: gancho → contexto → conflito → resolucao → licao → CTA'],
      ['Comparacao', '4-6', 'Slide 1: titulo → lado A vs lado B por topico → conclusao'],
    ],
    [2800, 2000, 4560]
  ),
  spacer(1),
  heading3('Primeiros carrosseis a produzir:'),
  bullet('"Saber-Saber, Saber-Fazer, Saber-Ser" — 10 slides'),
  bullet('"Eu, o Lider / Eu, o Team / Eu, o Dream — qual e o teu?" — 6 slides'),
  bullet('"5 erros que vi em lideres angolanos" — 7 slides'),
  bullet('"A jornada do Camilo: de professor a Director do BAI" — 8 slides'),
  spacer(2),

  heading2('5.3 Posts Estaticos — 20% do Instagram'),
  spacer(1),
  body('Menor alcance mas excelente para prova social e branding visual. Manter sempre template consistente.'),
  spacer(1),
  bullet('Logos de clientes com fundo navy + texto "Empresas que confiaram na Desperta"'),
  bullet('Citacoes do Camilo em template visual consistente (nunca fundo colorido generico)'),
  bullet('Fotos de formacoes reais com legenda narrativa (nao so a foto — conta o que aconteceu)'),
  bullet('Anuncios de programas / workshops com data e CTA claro'),
  spacer(2),

  heading2('5.4 Stories — Publicacao Diaria'),
  spacer(1),
  body('Manter presenca diaria nos stories. Nao precisam ser producoes — autenticidade e o activo.'),
  spacer(1),
  bullet('Bastidores do dia (preparacao de formacao, reuniao, deslocacao)'),
  bullet('Partilha de posts do feed (ampliar alcance)'),
  bullet('Enquetes e perguntas (geram interacao e dados sobre o publico)'),
  bullet('Contagem regressiva para workshops / eventos'),
  bullet('Re-partilha de mencoes e tags de clientes'),
  spacer(2),

  heading2('5.5 LinkedIn — Artigos Longos'),
  spacer(1),
  body('O canal de maior ROI para o Camilo. O publico-alvo (executivos, gestores, banca, sector publico) vive no LinkedIn. Com 500+ conexoes, publicacoes regulares podem alcancar milhares de profissionais angolanos.'),
  spacer(1),
  heading3('Banco de temas para artigos LinkedIn (Jun-Jul):'),
  bullet('"A diferenca entre o lider que recupera credito e o lider que recupera pessoas"'),
  bullet('"IA vai substituir formadores? Nao. Vai substituir os que nao formam pessoas."'),
  bullet('"O que aprendi a regular o mercado de capitais angolano"'),
  bullet('"Gestao publica em Angola: o que falta nao e tecnica"'),
  bullet('"Saber-Ser: a dimensao que as escolas de negocios ignoram"'),
  bullet('"Como formar uma equipa que funciona sem o lider estar presente"'),
  bullet('"O custo invisivel da equipa que nao comunica"'),
  bullet('"25 anos depois: o que mudou na lideranca angolana (e o que nao mudou)"'),

  pageBreak(),

  // ── SECÇÃO 6: FUNIL DE CONVERSÃO ──
  heading1('6. FUNIL DE CONVERSAO — DO FRIO AO CLIENTE'),
  spacer(1),

  body('Regra fundamental: publico frio nunca compra a "Desperta" primeiro. Compra primeiro o Camilo — a historia, a trajectoria, a voz. So depois entra na academia.'),
  spacer(1),

  tealTable(
    ['FASE', 'O QUE SENTE', 'O QUE PRECISA VER', 'ACCAO DA DESPERTA'],
    [
      ['FRIO', 'Nao conhece o Camilo', 'Post de storytelling forte no feed de alguem', 'Pilar 3 — historia que para o scroll'],
      ['CURIOSO', '"Quem e este homem?"', 'Bio impecavel + destaques organizados + 9 posts coerentes', 'Bio nova + primeiros 9 posts do perfil'],
      ['ENVOLVIDO', '"Isto faz-me pensar"', 'Frameworks, insights, prova social regular', 'Pilares 1, 2 e 4 — publicacao consistente'],
      ['QUALIFICADO', '"Preciso de falar com este homem"', 'Website com "Sobre o Fundador" forte + formulario', 'CRM capta — Agente IA qualifica'],
      ['CLIENTE', '"Confio-lhe a minha equipa"', 'Sessao Uma Hora com Camilo → proposta → contrato', 'Camilo fecha pessoalmente'],
    ],
    [1600, 2000, 3000, 2760]
  ),
  spacer(2),

  heading2('6.1 A Regra dos 7 Pontos de Contacto'),
  spacer(1),
  calloutBox('PRINCIPIO FUNDAMENTAL', [
    'Um executivo angolano precisa de ver o Camilo em media 5-7 vezes antes de pegar no telefone.',
    '',
    'Implicacao pratica: consistencia importa mais do que perfeicao.',
    '3 posts bons por semana durante 3 meses valem mais do que 1 post viral e 2 semanas de silencio.',
  ], 'E8F4F8', NAVY),
  spacer(2),

  heading2('6.2 "Uma Hora com Camilo Ortet" — A Isca de Lead Premium'),
  spacer(1),
  body('A forma mais poderosa de converter leads qualificados. Acesso directo ao fundador num formato exclusivo e acessivel.'),
  spacer(1),
  namedTable(
    ['ELEMENTO', 'DETALHE'],
    [
      ['Nome', '"Uma Hora com Camilo Ortet" / "Cafe com o Dr. Camilo"'],
      ['Formato', 'Presencial (cafe / escritorio Patriota) ou Zoom'],
      ['Publico', 'Directores, gestores RH, C-level de empresas angolanas'],
      ['Custo', 'Gratuito (isca de lead) ou valor simbolico (posicionamento premium)'],
      ['Capacidade', '4-6 sessoes/mes — manter exclusividade'],
      ['Objectivo', 'Diagnostico → identificar necessidade → propor programa Desperta'],
    ],
    [3000, 6360]
  ),

  pageBreak(),

  // ── SECÇÃO 7: REGRAS OPERACIONAIS ──
  heading1('7. REGRAS OPERACIONAIS — O QUE FAZER E O QUE NUNCA FAZER'),
  spacer(1),

  heading2('7.1 As 7 Regras de Ouro do Conteudo'),
  spacer(1),
  namedTable(
    ['N.', 'REGRA', 'APLICACAO PRATICA'],
    [
      ['1', 'Uma peca = uma ideia', 'Se tentas dizer tudo, nao dizes nada. 1 conceito por post.'],
      ['2', 'Gancho nos primeiros 7 segundos', 'Reel: 3 primeiros segundos. Post: primeira linha. Se nao parou, perdeu.'],
      ['3', 'Historias antes de conceitos', '"Quando eu estava no BAI..." vence sempre "A lideranca e..."'],
      ['4', 'Nomes e numeros aumentam credibilidade', 'Sempre "40+ organizacoes", "KPMG", "3 anos no BFA" — nunca vagamente.'],
      ['5', 'Vulnerabilidade calculada gera conexao', '"Errei quando..." / "Levei 10 anos a perceber..." Nao e fraqueza — e magnetismo.'],
      ['6', 'Pergunta no fim gera comentarios', 'O algoritmo premia interacao. Sempre terminar com uma pergunta real.'],
      ['7', 'CTA apenas 1x por semana', 'Mais do que isso parece vendedor ambulante. O conteudo de valor vende sozinho.'],
    ],
    [400, 2800, 6160]
  ),
  spacer(2),

  heading2('7.2 Anti-Padroes — O Que NUNCA Fazer'),
  spacer(1),
  calloutBox('PROIBIDO PUBLICAR', [
    '\u2717 Frases motivacionais em fundo colorido sem contexto real',
    '\u2717 Citacoes de autores estrangeiros sem ancoragem na realidade angolana',
    '\u2717 Posts que podiam ter sido escritos por qualquer coach do mundo',
    '\u2717 "Bom dia!" como primeiro frame de reel',
    '\u2717 Emojis a mais (maximo 2 por paragrafo)',
    '\u2717 Hashtags aleatorias (maximo 8, sempre relevantes para o tema)',
    '\u2717 Publicar sem ler em voz alta primeiro',
    '\u2717 Conteudo Angocaju no @camiloortet (e outra marca)',
    '\u2717 Conteudo religioso explicito no perfil corporativo',
  ], 'FFF0F0', 'CC0000'),
  spacer(2),

  heading2('7.3 Checklist Antes de Publicar'),
  spacer(1),
  body('Confirmar TODAS as caixas antes de publicar qualquer peca:'),
  spacer(1),
  namedTable(
    ['', 'VERIFICACAO', 'O QUE VALIDAR'],
    [
      ['\u25A1', 'Pilar definido', 'E o Pilar 1, 2, 3, 4 ou 5? Sem classificacao, nao publica.'],
      ['\u25A1', 'Gancho forte', 'A 1a frase / 3 primeiros segundos fazem parar o scroll?'],
      ['\u25A1', 'Lexico correcto', 'Usa vocabulario da Desperta? Nao usa nenhuma palavra da blacklist?'],
      ['\u25A1', 'Teste "so o Camilo"', 'Este conteudo poderia ter sido escrito por outro coach? Se sim, reescreve.'],
      ['\u25A1', 'Uma ideia', 'Tem uma unica ideia central? Se tem tres, divide em tres posts.'],
      ['\u25A1', 'CTA ou pergunta', 'Termina com pergunta ao leitor OU com CTA coerente com o pilar?'],
      ['\u25A1', 'Portugues de Angola', 'Nao usa expressoes PT-PT nem PT-BR que soem estranhas em Angola?'],
      ['\u25A1', 'Visual consistente', 'Usa template Desperta (Navy + Teal + Gold)? Nao usa cores aleatorias?'],
    ],
    [400, 2600, 6360]
  ),
  spacer(2),

  heading2('7.4 Hashtags Oficiais'),
  spacer(1),
  calloutBox('HASHTAGS CORE — usar sempre 4-5 destas', [
    '#DespertaAcademy   #CamiloOrtet   #LiderancaAngola   #FormacaoExecutiva   #DesenvolvimentoHumano',
  ], 'E8F4F8', TEAL),
  spacer(1),
  calloutBox('HASHTAGS CONTEXTUAIS — usar 2-3 conforme o tema', [
    '#SaberSer   #EuOLider   #EuOTeam   #LiderancaConsciente   #GestaoAngola',
    '#BancaAngola   #CoachingAngola   #Luanda   #Angola',
  ], LIGHT, NAVY),
  spacer(1),
  calloutBox('NUNCA USAR', [
    '#motivacional   #sucesso   #mindset   #vencedor   #godmode   #alpha   #lifestyle',
  ], 'FFF0F0', 'CC0000'),

  pageBreak(),

  // ── SECÇÃO 8: KPIs ──
  heading1('8. INDICADORES DE SUCESSO'),
  spacer(1),

  heading2('8.1 KPIs de Presenca Digital (Mensal)'),
  spacer(1),
  namedTable(
    ['METRICA', 'META MAIO', 'META JUN-JUL', 'COMO MEDIR'],
    [
      ['Seguidores @camiloortet', '+200', '+200/mes', 'Instagram Insights'],
      ['Seguidores @desperta.co', '+100', '+150/mes', 'Instagram Insights'],
      ['Conexoes LinkedIn', '+100', '+100/mes', 'LinkedIn Analytics'],
      ['Alcance medio por post LinkedIn', '1.000+', '2.000+', 'LinkedIn Analytics'],
      ['Taxa de engajamento Instagram', '>3%', '>4%', '(likes+comments+shares) / reach'],
      ['Posts LinkedIn publicados', '8-12', '8-12/mes', 'Contagem manual'],
      ['Posts Instagram (ambos perfis)', '24-32', '24-32/mes', 'Contagem manual'],
      ['Reels produzidos', '4-6', '4-6/mes', 'Contagem manual'],
    ],
    [3400, 1400, 1600, 2960]
  ),
  spacer(2),

  heading2('8.2 KPIs de Pipeline Comercial (Mensal)'),
  spacer(1),
  namedTable(
    ['METRICA', 'META MAIO', 'META JUN-JUL'],
    [
      ['Leads no CRM', '15-20', '20-30'],
      ['Sessoes "Uma Hora com Camilo"', '4-6', '6-8'],
      ['Propostas enviadas', '5-8', '8-10'],
      ['Contratos fechados', '2-3', '3-4'],
      ['Testemunhos recolhidos', '5 (total)', '+2/mes'],
      ['Taxa de conversao pipeline', '>= 20%', '>= 25%'],
      ['Aparicoes midia (Expansao, TPA)', '1-2', '1-2/mes'],
      ['NPS clientes activos', '>= 8/10', '>= 8.5/10'],
    ],
    [4000, 2680, 2680]
  ),
  spacer(2),

  heading2('8.3 Reuniao Mensal de Alinhamento'),
  spacer(1),
  body('Agenda fixa — 60 minutos, primeiro dia util de cada mes:'),
  spacer(1),
  bullet('Revisao dos KPIs do mes anterior (15 min)'),
  bullet('Conteudo que melhor performou — o que aprender (10 min)'),
  bullet('Pipeline — leads, propostas, contratos (15 min)'),
  bullet('Aprovacao do calendario do proximo mes (15 min)'),
  bullet('Ajustes estrategicos se necessario (5 min)'),
  spacer(2),

  goldDivider(),
  spacer(1),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text: 'Desperta. Transforma. Lidera.', font: 'Arial', size: 28, bold: true, color: NAVY, italics: true })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: 'Marca Digital — Luanda, Maio de 2026', font: 'Arial', size: 20, color: GRAY })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: 'Documento confidencial — Marca Digital para Dr. Camilo Ortet', font: 'Arial', size: 18, color: GRAY, italics: true })]
  }),
];

// ─── DOCUMENTO FINAL ─────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 600, hanging: 300 } } }
          },
          {
            level: 1,
            format: LevelFormat.BULLET,
            text: '\u2013',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 960, hanging: 300 } } }
          }
        ]
      }
    ]
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22 } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 }
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: TEAL },
        paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 }
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LGRAY, space: 4 } },
            children: [
              new TextRun({ text: 'DESPERTA ACADEMY  |  Guia de Redes Sociais 2026', font: 'Arial', size: 18, color: GRAY }),
              new TextRun({ text: '        CONFIDENCIAL — Marca Digital', font: 'Arial', size: 18, color: GRAY })
            ]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: LGRAY, space: 4 } },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Pagina ', font: 'Arial', size: 18, color: GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: GRAY }),
              new TextRun({ text: '  |  despertaacademy.com  |  Marca Digital © 2026', font: 'Arial', size: 18, color: GRAY }),
            ]
          })
        ]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const output = '/Users/admin/PROJECTOS/CAMILO/DESPERTA/estrategia/GUIA-REDES-SOCIAIS-DESPERTA-2026.docx';
  fs.writeFileSync(output, buffer);
  console.log('Documento criado: ' + output);
});
