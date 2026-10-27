# JobTrail

**Live demo:** [https://nanashir1105.github.io/JobTrail/](https://nanashir1105.github.io/JobTrail/)

Open the demo and click **Load sample data** in the sidebar to explore the board, calendar and insights.

A job application tracker built with vanilla HTML, CSS and JavaScript. No framework, no backend, no database: data is stored in the browser with `localStorage`, with JSON export and import for backups.

## Features
- **Board:** drag and drop cards between Wishlist, Applied, Interview, Offer and Rejected
- **List:** sortable table of every application
- **Calendar:** interviews and follow-up dates by month
- **Insights:** funnel (applied → interview → offer), applications per week, overdue follow-ups, upcoming interviews
- Add and edit form with notes, salary, job link, and dates
- Priority, work type and recruiter contact per application
- One-click "Move to next stage" on cards, undo after delete
- Filters (priority, overdue only), CSV export, light/dark theme switch
- Keyboard shortcuts: `n` new, `/` search, `1`-`4` switch views
- Insight KPIs: response rate, interview rate, average days to interview
- Stage history recorded on every move
- Overdue follow-up warnings
- Search across company, role, location and notes
- JSON backup export and import with validation
- Sample data, dark mode, responsive layout, keyboard access (Enter opens a card)

## Screenshots
_Add a screenshot of the board and the insights view here._

## Run locally
Open `index.html`, or run `npx serve .`

## Deploy
Push to GitHub, then Settings → Pages → Deploy from branch (`main`, root).

## What it demonstrates
- Multi-view single-page UI without a framework
- HTML5 drag and drop plus form-based fallback for accessibility
- Derived data: funnel conversion from stage history, weekly aggregation, overdue logic
- Local-date handling that avoids time zone bugs
- Input escaping, URL scheme validation, and validated file import

## Known limits
Data lives in one browser. Use Export backup to move it between devices.
