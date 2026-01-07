# Arcane Trading Dashboard Design Guidelines

## Design Approach
**Reference-Based**: Drawing from mobile-first fintech leaders (Robinhood, Webull, TradingView) combined with Material Design principles for data-heavy applications. Focus: clarity, hierarchy, rapid information scanning.

## Typography System
- **Primary Font**: Inter (via Google Fonts CDN)
- **Hierarchy**:
  - Profit/Loss Values: `text-2xl md:text-3xl font-bold tabular-nums`
  - Account Names: `text-lg font-semibold`
  - Labels: `text-xs uppercase tracking-wide font-medium opacity-60`
  - Body/Metrics: `text-sm md:text-base tabular-nums`
  - Navigation: `text-base font-medium`

## Layout System
**Spacing Primitives**: Use Tailwind units 2, 4, 6, 8, 12, 16, 24
- Mobile padding: `p-4`
- Section spacing: `space-y-6 md:space-y-8`
- Card internal padding: `p-4 md:p-6`
- Tight metric groups: `gap-2`

## Component Library

### Navigation
**Mobile Hamburger Menu** (overlay, slide-in from left):
- Full-height drawer (`h-screen w-80`)
- Menu items with icons (Heroicons CDN)
- Current page indicator with accent border-left
- Close button top-right

**Desktop**: Persistent sidebar (`w-64`) or top nav bar

### Dashboard Overview (Main Page)

**Profit Metrics Card** (hero element):
- Large P&L display with percentage change
- Trend indicator (up/down arrow icon)
- Time period selector (24H/7D/30D as pill buttons)
- Padding: `p-6 md:p-8`
- Margin bottom: `mb-6`

**Account List**:
- Stack layout (`space-y-4`)
- Each account card shows:
  - Account name (left)
  - Current profit value (right, green/red based on performance)
  - Mini sparkline (small line chart, 40px height)
- Tap to view details
- Card padding: `p-4`

### Individual Account Page

**Header**:
- Back button (left)
- Account name (center)
- Hamburger menu (right) on mobile

**Equity Curve Chart**:
- Full-width container (`w-full`)
- Height: `h-64 md:h-96`
- Margin: `my-6`
- Use Chart.js or Recharts library
- Clean line chart, single line, minimal gridlines
- Tooltip on hover/touch

### API Connection Box (Mobile-Optimized)

**Layout**:
- Full-width on mobile (`w-full`)
- Stacked input fields (`space-y-4`)
- API Key input: `w-full text-sm p-3`
- Secret input: `w-full text-sm p-3`
- Connect button: `w-full py-3 text-base font-semibold`
- Status indicator with icon (connected/disconnected)
- Card padding: `p-6`

### Core UI Elements

**Cards**: 
- Border radius: `rounded-lg`
- Subtle shadow: `shadow-sm`
- Background separation from page

**Buttons**:
- Primary CTA: `px-6 py-3 rounded-lg font-semibold`
- Secondary/Pills: `px-4 py-2 rounded-full text-sm`
- Icons from Heroicons (outline variant)

**Data Display**:
- Use `tabular-nums` for all numerical values
- Positive values: green accent
- Negative values: red accent
- Percentage changes in parentheses next to values

## Mobile-First Breakpoints
- Mobile base: Single column, full-width cards
- Tablet (md:768px): Two-column account grid optional
- Desktop (lg:1024px): Sidebar navigation + wider charts

## Animations
**Minimal usage**:
- Menu slide-in transition (300ms ease-out)
- Number count-up on profit metrics (subtle)
- Chart line draw-in on page load (500ms)
- No scroll animations, no decorative effects

## Key Principles
1. **Data First**: Metrics > decoration
2. **Thumb-Friendly**: Touch targets minimum 44px
3. **Scan-Optimized**: Clear hierarchy, ample spacing between elements
4. **Performance Focus**: Fast load times, responsive charts
5. **No Clutter**: Only profit metrics visible, everything else on-demand

## Images
**No images required** - This is a pure data dashboard. All visual interest comes from charts, typography hierarchy, and metric cards.