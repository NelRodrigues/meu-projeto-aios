---
task: Create Content
responsavel: "@marketing-manager"
responsavel_type: agent
atomic_layer: task
elicit: true
---

# *create-content

Generate marketing content for your campaign at scale.

## Uso

```bash
*create-content --campaign my-campaign
# Generate all content for campaign

*create-content --type email-sequence --count 5
# Generate specific content type

*create-content --platform linkedin --tone professional
# Generate for specific platform
```

## Elicitação

```
? Which campaign?
Product Launch Q1

? Content types to generate:
✓ LinkedIn posts (5)
✓ Email sequence (5 emails)
✓ Twitter threads (10)
✓ Blog article (1)

? Tone:
- Professional
- Friendly
- Conversational
- Technical
- Inspiring

? Key points to include:
(Copy from campaign brief)

? Call-to-action:
Free trial signup
```

## Output

Generated content:
- LinkedIn posts (with hashtags)
- Email sequence (5+ emails)
- Twitter threads
- Blog article outline
- Meta descriptions
- Headlines and variations

## Example Email in Sequence

```
Subject: [#1] Struggling to manage everything?

Hi {first_name},

You're running a $10k-50k business.

But you're doing the work of 3 people.

Marketing. Operations. Sales. Support.

Sound familiar?

I struggled with this too. Until I automated 80% of my marketing.

Now I spend 5 hours/week on marketing instead of 30.

And get 3x the results.

This is possible for you too.

Tomorrow, I'm sharing how to do this (even if you have zero marketing experience).

Stay tuned →

{signature}
```

## Content Types

- **LinkedIn Posts** - Thought leadership, tips, stories
- **Email Sequences** - Nurture, educational, promotional
- **Twitter Threads** - Insights, tips, behind-the-scenes
- **Blog Articles** - Deep dives, guides, case studies
- **Landing Pages** - Product pages, signup pages
- **Ad Copy** - Short, punchy, benefit-driven

## Tips

✅ All content is customizable
✅ Use as-is or modify
✅ Test different variations
✅ Personalize with your voice
❌ Don't just copy and paste

## Next Steps

1. Review generated content
2. Customize as needed
3. Run `*schedule-posting` to schedule
4. Monitor performance

---

*Task created for marketing-opes pack*
