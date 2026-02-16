---
task: Plan Campaign
responsavel: "@marketing-manager"
responsavel_type: agent
atomic_layer: task
elicit: true
---

# *plan-campaign

Design a complete marketing campaign from scratch.

## Uso

```bash
*plan-campaign
# Interactive: Answer questions to design campaign

*plan-campaign --type product-launch
# Specific campaign type

*plan-campaign --type lead-generation --duration 30days
# With specific parameters
```

## Elicitação Interativa

```
? Campaign name:
Product Launch Q1 2026

? Campaign type:
- Product Launch
- Lead Generation
- Re-engagement
- Thought Leadership
- Sales
- Event Promotion
- Content Building

? Campaign goal:
Launch new product and get 500 signups

? Target audience:
Solo entrepreneurs earning $10k-50k/month

? Main channels:
- LinkedIn (primary)
- Email (secondary)
- Twitter (tertiary)

? Budget:
$5,000

? Duration:
30 days

? Key messages:
(3-5 main points)

? Success metrics:
- 500 email signups
- 10% conversion rate
- 50+ trial signups
```

## Output

Campaign Brief with:
- Campaign overview
- Objectives and KPIs
- Target audience definition
- Key messages
- Channel strategy
- Content calendar (outline)
- Timeline and milestones
- Budget allocation
- Success metrics

## Example Output

```
📊 CAMPAIGN BRIEF

Campaign: Product Launch Q1 2026
Type: Product Launch
Duration: 30 days
Budget: $5,000

OBJECTIVES
- Reach 10,000 interested entrepreneurs
- Generate 500 email signups
- Get 50+ trial users
- Establish thought leadership

TARGET AUDIENCE
- Solo entrepreneurs
- Revenue: $10k-50k/month
- Pain: Time management
- Goal: Scale efficiently

KEY MESSAGES
1. "Work smarter, not harder"
2. "5-minute setup, instant results"
3. "Built for solopreneurs"
4. "80% less work, same results"

CHANNELS
- LinkedIn: Thought leadership content
- Email: Nurture sequence
- Twitter: Real-time engagement
- Blog: In-depth guides

TIMELINE
- Week 1: Content creation
- Week 2: Email setup
- Week 3: Launch promotion
- Week 4: Optimization

SUCCESS METRICS
- Email signups: 500
- Conversion rate: 10%+
- Trial signups: 50+
- Engagement rate: 5%+
```

## Next Steps

1. Review campaign brief
2. Run `*create-content` to generate content
3. Run `*schedule-posting` to schedule posts
4. Monitor with `*analyze-performance`

## Related Commands

- `*create-content` - Generate marketing content
- `*schedule-posting` - Schedule posts
- `*analyze-performance` - Track results
- `*list-campaigns` - See all campaigns

---

*Task created for marketing-opes pack*
