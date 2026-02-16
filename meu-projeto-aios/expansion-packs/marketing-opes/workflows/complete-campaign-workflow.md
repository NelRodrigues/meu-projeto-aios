---
workflow: Complete Campaign Workflow
orchestrator: "@marketing-manager"
orchestrator_type: agent
steps: 5
elicit: true
---

# 🎯 Complete Campaign Workflow

End-to-end workflow for executing a complete marketing campaign from planning to optimization.

## Workflow Overview

```
Planning Phase
    ↓
[1] *plan-campaign
    ↓
Creation Phase
    ├─ [2] *create-content
    ↓
Execution Phase
    ├─ [3] *schedule-posting
    ↓
Monitoring Phase
    ├─ [4] *analyze-performance
    ├─ [5] Optimization & Repeat
```

---

## Step 1: Plan Campaign

**Duration:** 30-60 minutes

```bash
@marketing-manager
*plan-campaign
```

**What happens:**
- Answer questions about campaign
- Define objectives and KPIs
- Identify target audience
- Select channels
- Create campaign brief

**Output:** Campaign Brief (saved)

**Deliverables:**
- ✅ Campaign objectives
- ✅ Target audience definition
- ✅ Key messages
- ✅ Channel strategy
- ✅ Timeline and milestones

**Go/No-Go Decision:**
- Review campaign brief
- Confirm budget alignment
- Approve messaging
- ✅ **Proceed to Step 2**

---

## Step 2: Create Content

**Duration:** 2-4 hours (AI-assisted)

```bash
*create-content --campaign {name}
```

**What happens:**
- AI generates content for each channel
- Creates email sequences
- Generates social media posts
- Writes blog articles
- Produces ad copy

**Output:** Content Assets (all channels)

**Deliverables:**
- ✅ LinkedIn posts (5-10)
- ✅ Twitter threads (5-10)
- ✅ Email sequence (5-7 emails)
- ✅ Blog articles (1-3)
- ✅ Landing page copy

**Review & Customize:**
- Review all content
- Customize for your voice
- Add brand-specific elements
- Get team approval
- ✅ **Proceed to Step 3**

---

## Step 3: Schedule Posting

**Duration:** 1-2 hours

```bash
*schedule-posting --campaign {name}
```

**What happens:**
- Determine posting schedule
- Set optimal posting times
- Configure platforms
- Schedule all content
- Set up automation

**Output:** Posting Schedule & Automation

**Deliverables:**
- ✅ Social posting schedule (4 weeks)
- ✅ Email sending schedule
- ✅ Blog publication dates
- ✅ Platform integrations
- ✅ Automation rules

**Platform Setup:**
- Connect Buffer/Later (social)
- Connect email platform
- Verify all posts scheduled
- Test posts going out correctly
- ✅ **Proceed to Step 4**

---

## Step 4: Analyze Performance

**Duration:** Ongoing (weekly reviews)

```bash
*analyze-performance --campaign {name}
```

**What happens:**
- Collect metrics from all channels
- Analyze engagement and conversions
- Identify top performers
- Find underperformers
- Generate recommendations

**Output:** Performance Report (weekly)

**Metrics Tracked:**
- Reach and impressions
- Engagement rate
- Click-through rate
- Conversion rate
- Cost per acquisition
- ROI by channel

**Weekly Review (30 minutes):**
1. Review performance report
2. Identify top performers
3. Spot underperformers
4. Note opportunities
5. Make adjustments
6. ✅ **Plan optimizations**

---

## Step 5: Optimize & Repeat

**Duration:** 1-2 hours (weekly)

**Optimizations:**

### Quick Wins (Implement Immediately)
- [ ] Increase budget to top performers (+20%)
- [ ] Pause underperformers (-50% spend)
- [ ] Create more top-performing content
- [ ] Test different headlines/CTAs
- [ ] Adjust posting times based on data

### Medium-term (This Week)
- [ ] A/B test variations
- [ ] Expand successful angles
- [ ] Add new channels if metrics support
- [ ] Create content series
- [ ] Improve CTAs across channels

### Long-term (Next Month)
- [ ] Build on successful angles
- [ ] Create case studies
- [ ] Develop content calendar for next month
- [ ] Plan next campaign
- [ ] Document lessons learned

**Decision Point:**
- Campaign performing well? → Continue optimization
- Campaign needs major changes? → Plan new campaign
- Campaign complete? → ✅ Wrap up & analyze

---

## Timeline Example: 30-Day Campaign

```
WEEK 1: Planning & Creation
├─ Mon: *plan-campaign (1 hour)
├─ Tue-Wed: *create-content (2 hours)
├─ Thu: Review & customize (1 hour)
└─ Fri: *schedule-posting (1 hour)

WEEK 2: Launch & Monitor
├─ Mon: Campaign goes live ✅
├─ Tue-Thu: Monitor first posts
├─ Fri: *analyze-performance (Week 1 report)
└─ Weekend: Quick optimizations

WEEK 3: Optimize & Scale
├─ Mon-Fri: Monitor & optimize daily
├─ Wed: Test A/B variations
├─ Fri: *analyze-performance (Week 2 report)
└─ Weekend: Increase budget to winners

WEEK 4: Final Push
├─ Mon-Fri: Maximize top performers
├─ Wed: Special promotion/offer
├─ Fri: Final *analyze-performance
└─ Weekend: Document results & lessons
```

---

## Success Checklist

**Planning Phase ✅**
- [ ] Campaign brief complete
- [ ] Budget approved
- [ ] Team aligned
- [ ] Objectives clear

**Creation Phase ✅**
- [ ] All content reviewed
- [ ] Brand voice consistent
- [ ] CTAs clear
- [ ] Approvals obtained

**Execution Phase ✅**
- [ ] All posts scheduled
- [ ] Platforms configured
- [ ] Automation tested
- [ ] Team notified

**Monitoring Phase ✅**
- [ ] Metrics tracking properly
- [ ] Reports generated weekly
- [ ] Team reviews metrics
- [ ] Quick optimizations made

**Optimization Phase ✅**
- [ ] Budget reallocated to winners
- [ ] New content created
- [ ] A/B tests running
- [ ] Lessons documented

---

## Typical Results (30-Day Campaign)

For a solo entrepreneur with $5,000 budget:

| Metric | Realistic Target | How to Achieve |
|--------|------------------|----------------|
| Reach | 50,000 people | Consistent posting + paid boost |
| Email Signups | 500 | Strong CTA + email focus |
| Trial Signups | 50 | Email nurture + retargeting |
| Customers | 10 | Nurture sequence + follow-up |
| Revenue | $15,000+ | At $1,500 customer value |
| ROI | 3x+ | Efficient budget allocation |

---

## Budget Allocation Example

**$5,000 Budget Across 4 Weeks:**

```
Content Creation: $1,000 (20%)
  ├─ AI content generation
  ├─ Graphic design
  └─ Video editing

Paid Promotion: $2,000 (40%)
  ├─ LinkedIn ads: $800
  ├─ Facebook/Instagram: $600
  └─ Twitter ads: $600

Email Platform: $500 (10%)
  ├─ Mailchimp/ConvertKit
  ├─ Template design
  └─ Automation setup

Tools & Automation: $800 (16%)
  ├─ Buffer/Later scheduling
  ├─ Analytics tools
  └─ CRM integration

Contingency: $700 (14%)
  ├─ Unexpected needs
  ├─ High performers to boost
  └─ Emergency adjustments
```

---

## Common Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Low email signups | Improve landing page + add retargeting |
| Poor social engagement | Test new content angles + optimal times |
| Low conversion rate | Improve nurture sequence + follow-up |
| Budget not enough | Double down on highest ROI channels |
| Time consuming | Use automation + templates |

---

## Next Campaign Planning

**After campaign ends:**

1. ✅ Complete performance report
2. ✅ Document lessons learned
3. ✅ Identify winning angles
4. ✅ Plan next campaign
5. ✅ Allocate budget based on results
6. ✅ *plan-campaign for next cycle

---

## Resources

- **Campaign Brief Template:** `templates/campaign-brief-template.md`
- **Content Calendar Template:** `templates/content-calendar-template.md`
- **Performance Report:** `templates/performance-report-template.md`
- **Agents:** @marketing-manager, @content-strategist, @analytics-expert

---

## Summary

**This workflow takes you from zero to launch in 4-6 weeks:**

1. ✅ Plan campaign (1 hour)
2. ✅ Create content (2-4 hours)
3. ✅ Schedule posts (1-2 hours)
4. ✅ Analyze performance (Ongoing)
5. ✅ Optimize & repeat (Weekly)

**Total setup time:** ~5-7 hours
**Monthly commitment:** 2-3 hours/week for optimization

---

**Complete Campaign Workflow** — From idea to profitable campaign in 30 days 🎯
