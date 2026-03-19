# Click-Man Dashboard - Iteration 5 Final Fixes

## Context
You are working on the Click-Man dashboard project (Next.js + React + TripleWhale API integration). This is the final comprehensive fix iteration based on Jordan's detailed feedback.

## CRITICAL ITEMS TO FIX (22 total)

### Final Items Tab Updates (6 items)
7. **P&L Google Sheets link update** - Update to note that link will change and a live read-only link is needed
8. **Meta access system user token** - Update Final Items to note Jordan needs to provide system user token (not manual pulls)
9. **Remove completed items** - Remove "set real monthly targets" and "deploy to Vercel" from Final Items (both done)
10. **Customer.io info update** - Add all provided credentials and note data must flow via API
11. **TikTok data confirmation** - Update to reflect TripleWhale has all data, no direct TikTok ad account needed
12. **TikTok Events API token** - Add the provided token for event quality/match scores
13. **Google Ads developer token** - Add the provided token for read access

### Production & Slugging Issues (2 items)
14. **Platform filter fix** - Fix non-working platform filter
15. **Remove attribution dropdowns** - Remove attribution model and window dropdowns (not relevant for this tab)

### Pareto Chart (1 item)
16. **Y-axis labels** - Label both Y-axis columns, one should say "number of creatives"

### Ad Churn (1 item)
17. **Remove attribution dropdowns** - Remove attribution model and window dropdowns (not relevant for age-based analysis)

### Info Icons & Tooltips (1 item)
18. **Complete tooltip audit** - Check EVERY info icon across ALL pages, ensure proper formula + explanation (use Cash Flow > Peak Deficit as example)

### Data Source Communication (1 item)  
19. **Data source labels** - Under ALL charts/dashboards/metrics, show data source (Triple Whale, GA, Medusa, Customer.io, etc.)

### AI Summaries (2 items)
20. **Attribution model disclosure** - Every AI analysis must state which attribution model(s) were used
21. **AI prompt edit button** - Add "Prompt" button next to "Refresh Analysis" buttons for custom prompt editing

### UI Cleanup (3 items)
22. **Remove export XLSX buttons** - They don't work and are unnecessary  
23. **Menu bar button placement** - Move sidebar collapse button from bottom to top (currently covered by "Report to Alfred")
24. **Report to Alfred functionality** - Investigate and fix why Jordan's chat got no reply (localStorage-based feature)

## REQUIREMENTS
- NO em dashes or en dashes in any new text
- npm run build must pass
- All fixes must be production-ready
- Maintain existing functionality while adding improvements

## CURRENT PROJECT STRUCTURE
- Next.js app in /app directory
- Components in /components directory  
- API integrations in /lib directory
- TripleWhale integration active
- Deployed on Vercel via clawd-bots team

## SUCCESS CRITERIA
All 22 items completed, build passes, deployed successfully to https://clickman.andyou.ph

When completely finished, run: openclaw system event --text "Done: Click-Man Iteration 5 - All 22 final fixes completed and deployed" --mode now