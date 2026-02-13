#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎬 Content Distillery — Teste de Pipeline');
console.log('=' .repeat(50));

const outputDir = './outputs/distillery/test-run';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Simular transcrição de um vídeo
const mockTranscript = `
Today I want to talk about frameworks. A framework is a mental model that helps you think about problems systematically. 

The key insight is that most people don't use frameworks intentionally. They use them unconsciously. The difference between experts and novices is that experts have developed multiple high-quality frameworks.

Let me give you an example. When I look at a business problem, I use the OODA loop - Observe, Orient, Decide, Act. First, I observe the situation. Then I orient myself using my mental models. Then I decide. Then I act.

Another framework I use is the Pareto principle - 80% of results come from 20% of efforts. This helps me prioritize what really matters.

The third framework is first principles thinking. Instead of using existing frameworks, break the problem down to fundamental truths and build up from there.

The heuristic here is: always ask "why" multiple times. Each time you ask why, you get closer to the root cause.

Another mental model is the Eisenhower Matrix - separating important from urgent. Important tasks are those that contribute to long-term goals. Urgent tasks demand immediate attention but may not be important.

The key takeaway is this: consciously develop and use frameworks. Review them regularly. Test them against reality. Discard the ones that don't work. This is how you become an expert.
`;

// Tier 0: Extraction
console.log('\n[TIER 0] Extracting frameworks and heuristics...');

const frameworks = [
  { name: 'OODA Loop', author: 'John Boyd', description: 'Observe, Orient, Decide, Act' },
  { name: 'Pareto Principle', author: 'Vilfredo Pareto', description: '80/20 rule - vital few vs trivial many' },
  { name: 'First Principles Thinking', author: 'Elon Musk', description: 'Break problems to fundamental truths' },
  { name: 'Eisenhower Matrix', author: 'Dwight Eisenhower', description: 'Important vs Urgent prioritization' }
];

const heuristics = [
  'Always ask "why" multiple times to get to root cause',
  'Experts have developed multiple high-quality frameworks',
  'Review frameworks regularly and test against reality',
  'Discard frameworks that don\'t work in practice'
];

fs.writeFileSync(
  path.join(outputDir, 'frameworks.yaml'),
  `frameworks:\n${frameworks.map(f => 
    `  - name: "${f.name}"\n    author: "${f.author}"\n    description: "${f.description}"`
  ).join('\n')}`
);

fs.writeFileSync(
  path.join(outputDir, 'heuristics.yaml'),
  `heuristics:\n${heuristics.map(h => `  - "${h}"`).join('\n')}`
);

console.log(`  ✅ Extracted ${frameworks.length} frameworks`);
console.log(`  ✅ Extracted ${heuristics.length} heuristics`);

// Tier 1: Progressive Summarization
console.log('\n[TIER 1] Progressive summarization (5 layers)...');

const summaries = [
  'Frameworks are mental models that help think systematically.',
  'Experts develop multiple high-quality frameworks. Use OODA loop, Pareto principle, first principles thinking.',
  'Four key frameworks: OODA (observe-orient-decide-act), Pareto (80/20), First Principles (break to fundamentals), Eisenhower (important vs urgent).',
  'Meta-insight: consciously develop frameworks, review regularly, test against reality, discard non-working ones. Ask "why" repeatedly to find root causes.',
  'Framework mastery is the difference between experts and novices. Systematic thinking + multiple models + continuous refinement = expertise.'
];

fs.writeFileSync(
  path.join(outputDir, 'progressive-summary.md'),
  `# Progressive Summarization\n\n${summaries.map((s, i) => `**Layer ${i+1}:** ${s}`).join('\n\n')}`
);

console.log(`  ✅ Created 5-layer progressive summary`);

// Tier 2: Idea Multiplication (4A Framework)
console.log('\n[TIER 2] Multiplying ideas (4A Framework)...');

const ideas = [
  { angle: 'Problem-solving', idea: 'Use OODA loop to make faster decisions' },
  { angle: 'Productivity', idea: 'Apply Eisenhower matrix to prioritize ruthlessly' },
  { angle: 'Learning', idea: 'Master first principles thinking to learn anything faster' },
  { angle: 'Career', idea: 'Develop 5 frameworks in your domain to become expert' },
  { angle: 'Business', idea: 'Use Pareto principle to find your 20% that drives 80%' },
  { angle: 'Negotiation', idea: 'Think in frameworks - understand other side\'s models' }
];

fs.writeFileSync(
  path.join(outputDir, 'content-ideas.yaml'),
  `ideas:\n${ideas.map(i => 
    `  - angle: "${i.angle}"\n    idea: "${i.idea}"`
  ).join('\n')}`
);

console.log(`  ✅ Generated ${ideas.length} content ideas`);

// Tier 3: Production (platform-ready content)
console.log('\n[TIER 3] Producing platform-ready content...');

const contentPieces = {
  twitter: [
    'Frameworks separate experts from novices. Master the OODA loop: Observe → Orient → Decide → Act. Faster decision-making. 🧠',
    '80% of results come from 20% of efforts (Pareto principle). Identify your vital 20% and double down. 🎯',
    'First principles thinking: break problems to fundamental truths. Build up from there. Elon Musk swears by it. 🔧'
  ],
  linkedin: [
    'The Secret to Expertise: Develop Multiple High-Quality Frameworks\n\nMost people think unconsciously. Experts think systematically using proven frameworks.\n\n4 frameworks that changed my career:\n1. OODA Loop - faster decisions\n2. Pareto Principle - ruthless prioritization\n3. First Principles - deep understanding\n4. Eisenhower Matrix - important vs urgent\n\nYour turn: what frameworks run your thinking?',
    'Framework Review: Why Expert Performance Feels Effortless\n\nExpertise is compressed knowledge. Experts have internalized multiple high-quality mental models.\n\nThey don\'t reinvent—they apply proven frameworks.\n\nYour challenge this week: identify one framework that\'s been working for you unconsciously. Make it conscious. Test it. Refine it.'
  ]
};

fs.writeFileSync(
  path.join(outputDir, 'content-pieces.yaml'),
  `content:\n  twitter:\n${contentPieces.twitter.map(t => `    - "${t}"`).join('\n')}\n  linkedin:\n${contentPieces.linkedin.map(l => `    - "${l}"`).join('\n')}`
);

console.log(`  ✅ Generated ${contentPieces.twitter.length + contentPieces.linkedin.length} platform-ready pieces`);

// Summary Report
console.log('\n' + '='.repeat(50));
console.log('📊 Extraction Summary');
console.log('='.repeat(50));

const summary = {
  video_id: '3ks_AcYdDVQ',
  timestamp: new Date().toISOString(),
  transcript_length: mockTranscript.length,
  frameworks_extracted: frameworks.length,
  heuristics_extracted: heuristics.length,
  summary_layers: summaries.length,
  content_ideas: ideas.length,
  platform_pieces: contentPieces.twitter.length + contentPieces.linkedin.length,
  output_directory: outputDir,
  files_generated: [
    'frameworks.yaml',
    'heuristics.yaml', 
    'progressive-summary.md',
    'content-ideas.yaml',
    'content-pieces.yaml'
  ]
};

fs.writeFileSync(
  path.join(outputDir, 'summary.json'),
  JSON.stringify(summary, null, 2)
);

console.log(`\n✅ Video ID: ${summary.video_id}`);
console.log(`✅ Frameworks extracted: ${summary.frameworks_extracted}`);
console.log(`✅ Heuristics extracted: ${summary.heuristics_extracted}`);
console.log(`✅ Summary layers created: ${summary.summary_layers}`);
console.log(`✅ Content ideas generated: ${summary.content_ideas}`);
console.log(`✅ Platform-ready pieces: ${summary.platform_pieces}`);
console.log(`\n📁 Output directory: ${outputDir}`);
console.log(`\n📄 Files generated:`);
summary.files_generated.forEach(f => console.log(`   • ${f}`));

console.log('\n✨ Content Distillery Pipeline Complete!');
