---
task: Analyze Performance
responsavel: "@marketing-manager"
responsavel_type: agent
atomic_layer: task
elicit: true
---

# *analyze-performance

Track metrics and get insights to optimize your campaign.

## Uso

```bash
*analyze-performance --campaign my-campaign
# Get full performance report

*analyze-performance --metric engagement
# Focus on specific metric

*analyze-performance --compare previous
# Compare to previous campaign
```

## Elicitação

```
? Campaign to analyze:
Product Launch Q1

? Reporting period:
- Weekly
- Bi-weekly
- Monthly
- Custom dates

? Metrics to include:
✓ Reach & impressions
✓ Engagement rate
✓ Click-through rate
✓ Conversion rate
✓ Cost per acquisition
✓ Return on investment

? Compare to:
- Previous campaign
- Industry benchmark
- Your goal
```

## Output

Performance report with:
- Campaign overview
- Key metrics dashboard
- Channel performance breakdown
- Audience insights
- Optimization recommendations
- ROI analysis

## Example Report

```
📊 PERFORMANCE REPORT
Campaign: Product Launch Q1
Period: Week 1-4
Status: On Track ✅

OVERVIEW
Total reach: 45,000 people
Total engagement: 2,250
Campaign conversion rate: 8.5%

KEY METRICS
- Email signups: 450 (90% of goal) ✅
- Trial signups: 48 (96% of goal) ✅
- Cost per signup: $11.11
- ROI: 3.2x ✅

CHANNEL BREAKDOWN
LinkedIn
- Reach: 25,000
- Engagement rate: 4.2%
- Clicks: 850
- Signups: 180

Email
- Opens: 65%
- Clicks: 12%
- Signups: 180

Twitter
- Impressions: 15,000
- Engagement: 450
- Clicks: 150

AUDIENCE INSIGHTS
- Top referrer: LinkedIn
- Best time to post: 9am EST
- Top interests: Automation, AI
- Engagement peak: Tuesday-Thursday

RECOMMENDATIONS
1. ✅ Increase LinkedIn posting (best performer)
2. ✅ Test email subject line variations
3. ✅ Improve Twitter click-through (currently 2%)
4. ✅ Create more audience-focused content

NEXT STEPS
- Implement recommendations
- A/B test variations
- Increase budget to top performers
- Report back next week
```

## Metrics Explained

**Awareness Metrics:**
- Reach - Total people who saw content
- Impressions - Total times seen
- Share of voice - vs. competitors

**Engagement Metrics:**
- Engagement rate - Likes + comments + shares / reach
- Click-through rate - Clicks / impressions
- Time on page - How long people stay

**Conversion Metrics:**
- Conversion rate - Signups / clicks
- Cost per acquisition - Ad spend / conversions
- Customer lifetime value - Revenue per customer

**ROI Metrics:**
- Return on investment - Revenue / cost
- Payback period - Time to recoup spend
- Profit margin - Revenue - cost / revenue

## Tips

✅ Track metrics weekly
✅ Compare to baselines
✅ Look for trends
✅ Act on insights
✅ A/B test changes

❌ Don't trust vanity metrics
❌ Don't ignore underperformers
❌ Don't set and forget
❌ Don't forget context

## Optimization Recommendations

Based on analysis, I recommend:
- Double down on top performers
- Fix bottom performers
- A/B test variations
- Expand successful angles
- Try new channels if metrics support

## Next Steps

1. Review performance report
2. Implement top recommendations
3. Set up A/B tests
4. Increase budget to winners
5. Report back weekly

---

*Task created for marketing-opes pack*
