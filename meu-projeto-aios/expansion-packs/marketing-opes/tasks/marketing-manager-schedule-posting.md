---
task: Schedule Posting
responsavel: "@marketing-manager"
responsavel_type: agent
atomic_layer: task
elicit: true
---

# *schedule-posting

Schedule content to all your channels automatically.

## Uso

```bash
*schedule-posting --campaign my-campaign
# Schedule all content

*schedule-posting --platform linkedin
# Schedule to specific platform

*schedule-posting --schedule daily
# Set posting frequency
```

## Elicitação

```
? Campaign:
Product Launch Q1

? Platforms to post:
✓ LinkedIn
✓ Twitter
✓ Email
✓ Newsletter

? Posting frequency:
- Daily (1 post/day)
- Multiple daily (2-3 posts/day)
- Alternate days
- Custom schedule

? Best posting times:
(Auto-optimized or custom)

? Time zone:
America/New_York
```

## Output

Posting schedule with:
- LinkedIn post schedule
- Twitter posting times
- Email sending schedule
- Optimal posting windows
- Calendar view
- Integration instructions

## Example Schedule

```
WEEK 1: AWARENESS
Mon  9:00am - LinkedIn: "5 Ways to..."
Wed  2:00pm - Twitter: Thread on automation
Thu 10:00am - Email: Welcome sequence #1
Fri  9:00am - LinkedIn: Case study

WEEK 2: ENGAGEMENT
Mon  9:00am - LinkedIn: Customer story
Tue  2:00pm - Twitter: Live update
Wed 10:00am - Email: Value-add content
Thu  9:00am - LinkedIn: How-to guide

WEEK 3: CONVERSION
Mon  9:00am - LinkedIn: Feature announcement
Wed  2:00pm - Twitter: Limited time offer
Thu 10:00am - Email: Trial signup push
Fri  9:00am - LinkedIn: Social proof
```

## Platforms Supported

- **LinkedIn** - Professional network (primary)
- **Twitter** - Real-time updates
- **Email** - Newsletter/sequences
- **Facebook** - Community building
- **Instagram** - Visual content
- **Blog** - Long-form content
- **Newsletter** - Substack, etc.

## Best Practices

✅ Post consistently
✅ Use optimal posting times
✅ Mix content types
✅ Include CTAs
✅ Test different schedules

❌ Don't spam
❌ Don't post same content everywhere
❌ Don't ignore engagement
❌ Don't set and forget

## Integration

Schedule integrates with:
- Buffer / Later (social scheduling)
- ConvertKit / Substack (email)
- Zapier (automation)
- Notion (management)

## Next Steps

1. Review posting schedule
2. Approve posting times
3. Connect platforms
4. Start scheduling
5. Monitor results

---

*Task created for marketing-opes pack*
