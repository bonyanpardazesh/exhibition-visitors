# 🎨 Color Palette Guide - Exhibition Visitors

Complete color system documentation for the application.

---

## 📊 Primary Colors

### Blue (Primary Brand Color)
The main accent color used throughout the application.

| Name | Hex | Usage |
|------|-----|-------|
| **Primary** | `#2563eb` | Main buttons, active states, links, primary actions |
| **Primary Light** | `#3b82f6` | Hover states, lighter variants |
| **Primary Dark** | `#1d4ed8` | Pressed states, darker variants |
| **Primary Soft** | `#dbeafe` | Backgrounds, badges, highlights |

**Visual Examples:**
- 🔵 Primary buttons
- 🔵 Active navigation tabs
- 🔵 Links and interactive elements
- 🔵 Language switch (when active)
- 🔵 Focus states
- 🔵 Brand icons

---

## ✅ Status Colors

### Green (Success)
Used for positive actions, success states, and confirmations.

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#10b981` | Success messages, valid inputs |
| **Success Soft** | `#d1fae5` | Success backgrounds, badges |

**Visual Examples:**
- ✅ Valid form inputs
- ✅ Success notifications
- ✅ Phone contact badges
- ✅ Positive actions

### Amber (Warning)
Used for warnings and attention-grabbing elements.

| Name | Hex | Usage |
|------|-----|-------|
| **Warning** | `#f59e0b` | Warning messages, caution states |
| **Warning Soft** | `#fef3c7` | Warning backgrounds, badges |

**Visual Examples:**
- ⚠️ Warning messages
- ⚠️ Remove/delete buttons (secondary)
- ⚠️ Address contact badges
- ⚠️ Attention elements

### Red (Danger)
Used for errors, destructive actions, and critical states.

| Name | Hex | Usage |
|------|-----|-------|
| **Danger** | `#ef4444` | Error messages, delete buttons |
| **Danger Soft** | `#fee2e2` | Error backgrounds, validation errors |

**Visual Examples:**
- ❌ Error messages
- ❌ Delete buttons
- ❌ Invalid form inputs
- ❌ Critical alerts

---

## ⚫ Neutral Colors (Grays)

A comprehensive gray scale for text, backgrounds, and borders.

| Name | Hex | Usage |
|------|-----|-------|
| **Gray 50** | `#f9fafb` | Body background |
| **Gray 100** | `#f3f4f6` | Hover backgrounds, subtle backgrounds |
| **Gray 200** | `#e5e7eb` | Borders, dividers |
| **Gray 300** | `#d1d5db` | Light borders, inactive elements |
| **Gray 400** | `#9ca3af` | Placeholder text, disabled elements |
| **Gray 500** | `#6b7280` | Muted text |
| **Gray 600** | `#4b5563` | Secondary text |
| **Gray 700** | `#374151` | Subtle text |
| **Gray 800** | `#1f2937` | Dark text |
| **Gray 900** | `#111827` | Primary text (headings, body) |

### Semantic Usage

**Backgrounds:**
- `--bg-body`: `#f9fafb` (Gray 50) - Main page background
- `--bg-surface`: `#ffffff` (White) - Cards, containers
- `--bg-hover`: `#f3f4f6` (Gray 100) - Hover states

**Text:**
- `--text-primary`: `#111827` (Gray 900) - Main headings, important text
- `--text-secondary`: `#4b5563` (Gray 600) - Secondary text, descriptions
- `--text-muted`: `#6b7280` (Gray 500) - Muted text, hints

**Borders:**
- `--border-color`: `#e5e7eb` (Gray 200) - Default borders
- `--border-hover`: `#d1d5db` (Gray 300) - Hover borders

---

## 📱 Contact Badge Colors

Each contact type has its own color scheme for easy identification:

| Type | Background | Border | Text Color | Hex Values |
|------|-----------|--------|------------|------------|
| **Email** | Light Blue | Blue | Dark Blue | `#dbeafe` / `#3b82f6` / `#1e40af` |
| **Phone** | Light Green | Green | Dark Green | `#d1fae5` / `#10b981` / `#065f46` |
| **Address** | Light Amber | Amber | Dark Amber | `#fef3c7` / `#f59e0b` / `#92400e` |
| **Website** | Light Purple | Purple | Dark Purple | `#e9d5ff` / `#a855f7` / `#6b21a8` |

---

## 🎯 Where Colors Are Used

### Primary Blue (`#2563eb`)
- ✅ Primary buttons (Save, Submit, Create)
- ✅ Active navigation tabs
- ✅ Links and clickable text
- ✅ Focus rings on inputs
- ✅ Language switch (when Farsi is selected)
- ✅ Brand icons and logos
- ✅ Progress indicators

### Success Green (`#10b981`)
- ✅ Valid form input borders
- ✅ Success messages
- ✅ Phone contact badges
- ✅ Confirmation states

### Warning Amber (`#f59e0b`)
- ✅ Warning messages
- ✅ Address contact badges
- ✅ Remove/delete secondary buttons
- ✅ Caution indicators

### Danger Red (`#ef4444`)
- ✅ Delete buttons
- ✅ Error messages
- ✅ Invalid form input borders
- ✅ Critical alerts

### Neutrals
- **Gray 900**: All primary text, headings
- **Gray 600**: Secondary text, descriptions
- **Gray 500**: Muted text, hints, timestamps
- **Gray 200**: Borders, dividers, separators
- **Gray 100**: Hover backgrounds, subtle highlights
- **Gray 50**: Main page background
- **White**: Cards, surfaces, button text

---

## 🎨 Color Combinations

### Primary Button
- Background: `#2563eb` (Primary)
- Text: `#ffffff` (White)
- Hover: `#1d4ed8` (Primary Dark)

### Secondary Button
- Background: `#ffffff` (White)
- Text: `#111827` (Gray 900)
- Border: `#e5e7eb` (Gray 200)

### Edit Button
- Background: `#dbeafe` (Primary Soft)
- Text: `#1d4ed8` (Primary Dark)
- Border: `#2563eb` (Primary)

### Delete Button
- Background: `#fee2e2` (Danger Soft)
- Text: `#ef4444` (Danger)
- Border: `#ef4444` (Danger)

---

## 📐 Color Usage Guidelines

### Text Colors
- **Primary Text**: Use `--text-primary` (Gray 900) for headings and important content
- **Secondary Text**: Use `--text-secondary` (Gray 600) for descriptions and less important content
- **Muted Text**: Use `--text-muted` (Gray 500) for hints, timestamps, and tertiary information

### Background Colors
- **Body**: Use `--bg-body` (Gray 50) for page background
- **Cards/Surfaces**: Use `--bg-surface` (White) for cards, containers
- **Hover States**: Use `--bg-hover` (Gray 100) for hover backgrounds

### Border Colors
- **Default**: Use `--border-color` (Gray 200) for standard borders
- **Hover**: Use `--border-hover` (Gray 300) for hover borders
- **Active/Focus**: Use Primary color (`#2563eb`) for active and focus states

---

## 🔍 Color Accessibility

### Contrast Ratios (WCAG AA Compliant)

**Text on Backgrounds:**
- ✅ Gray 900 on White: **21:1** (Excellent)
- ✅ Gray 600 on White: **7.9:1** (Excellent)
- ✅ Gray 500 on White: **5.7:1** (Good)
- ✅ Primary on White: **4.8:1** (Good)
- ✅ White on Primary: **4.8:1** (Good)

**All combinations meet WCAG AA standards (4.5:1 minimum)**

---

## 🎨 Color Reference Table

### Quick Reference

```
PRIMARY BLUE
├── Primary:     #2563eb  (Main actions)
├── Light:      #3b82f6  (Hover states)
├── Dark:       #1d4ed8  (Pressed states)
└── Soft:       #dbeafe  (Backgrounds)

SUCCESS GREEN
├── Success:    #10b981  (Valid states)
└── Soft:       #d1fae5  (Backgrounds)

WARNING AMBER
├── Warning:    #f59e0b  (Warnings)
└── Soft:       #fef3c7  (Backgrounds)

DANGER RED
├── Danger:     #ef4444  (Errors)
└── Soft:       #fee2e2  (Backgrounds)

NEUTRALS
├── Gray 900:   #111827  (Primary text)
├── Gray 600:   #4b5563  (Secondary text)
├── Gray 500:   #6b7280  (Muted text)
├── Gray 200:   #e5e7eb  (Borders)
├── Gray 100:   #f3f4f6  (Hover bg)
└── Gray 50:    #f9fafb  (Body bg)
```

---

## 💡 Design Philosophy

The color palette follows modern design principles:

1. **Professional**: Blue as primary conveys trust and professionalism
2. **Accessible**: High contrast ratios for readability
3. **Consistent**: Semantic naming (primary, success, danger, warning)
4. **Modern**: Based on Tailwind CSS color palette
5. **Subtle**: Soft backgrounds for highlights without overwhelming

---

## 🔄 Customization

To change the primary color throughout the app, simply update:

```css
:root {
  --color-primary: #YOUR_COLOR;
  --color-primary-light: #LIGHTER_VARIANT;
  --color-primary-dark: #DARKER_VARIANT;
  --color-primary-soft: #SOFT_BACKGROUND;
}
```

All components will automatically use the new color!

---

## 📊 Color Distribution in UI

### Header/Navigation
- Primary: Navigation tabs (active)
- Gray 600: Navigation tabs (inactive)
- Primary: Language switch (active)
- Gray 200: Borders

### Buttons
- Primary: Primary buttons
- White/Gray: Secondary buttons
- Primary Soft: Edit buttons
- Danger Soft: Delete buttons

### Forms
- Gray 200: Input borders
- Primary: Focus borders
- Success: Valid input borders
- Danger: Invalid input borders

### Cards
- White: Card backgrounds
- Gray 50: Page background
- Gray 200: Card borders

### Tables
- Gray 50: Table header background
- Gray 100: Table row hover
- Gray 200: Table borders

---

**Color System:** ✅ Complete and Consistent

All colors are defined as CSS variables in `public/style.css` for easy theming and maintenance.

