# 🌐 Language Switching Guide (English/Farsi)

## How It Works

The application supports **two languages**:
- 🇬🇧 **English (en)** - Left-to-Right (LTR)
- 🇮🇷 **Farsi/Persian (fa)** - Right-to-Left (RTL)

---

## 📍 Where to Find the Language Switch

### 1. **In Navigation Bar** (when logged in)
- Top right corner of the page
- Toggle switch labeled "EN" or "فا"
- Only visible after login

### 2. **On Login Page**
- Bottom of the login form
- Centered toggle switch

---

## 🔄 How Language Switching Works

### Step-by-Step Flow:

#### 1. **Initial Load** (`i18n.js`)
```javascript
// Loads saved language preference from browser localStorage
let currentLang = localStorage.getItem('lang') || 'en'; // Default: English

// Loads translation file
loadTranslations(currentLang); // Fetches /i18n/en.json or /i18n/fa.json
```

#### 2. **Translation Loading** (`i18n.js`)
```javascript
async function loadTranslations(lang) {
    // 1. Fetch translation JSON file
    const response = await fetch(`/i18n/${lang}.json`);
    translations = await response.json();
    
    // 2. Save to localStorage
    localStorage.setItem('lang', lang);
    
    // 3. Set document direction (RTL for Farsi, LTR for English)
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    
    // 4. Trigger translation event
    document.dispatchEvent(new CustomEvent('langChanged'));
}
```

#### 3. **Applying Translations**
All text elements with `data-i18n` attribute are translated:
```html
<!-- HTML -->
<h2 data-i18n="app.welcome">Welcome</h2>

<!-- JavaScript finds and translates -->
el.textContent = window.t('app.welcome');
// Result: "Welcome" (EN) or "به سامانه بازدیدکنندگان نمایشگاه خوش آمدید" (FA)
```

#### 4. **Language Toggle** (`layout.js`)
When user clicks the switch:
```javascript
langSwitch.addEventListener('change', (e) => {
    const lang = e.target.checked ? 'fa' : 'en'; // true = Farsi, false = English
    
    // Update localStorage
    localStorage.setItem('lang', lang);
    
    // Update UI direction
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    
    // Reload page to apply all changes
    location.reload();
});
```

---

## 📂 File Structure

```
public/
├── i18n.js              # Main translation logic
├── layout.js            # Language switch initialization
└── i18n/
    ├── en.json          # English translations
    └── fa.json          # Farsi translations
```

---

## 🎯 Translation Keys

Translations are organized by section:

```json
{
  "app": {          // Main app labels
    "title": "...",
    "home": "...",
    "visitors": "..."
  },
  "visitor": {      // Visitor form labels
    "title": "...",
    "firstName": "..."
  },
  "table": {        // Table column headers
    "name": "...",
    "edit": "..."
  },
  "login": {        // Login page labels
    "title": "...",
    "username": "..."
  }
}
```

**Usage in HTML:**
```html
<h2 data-i18n="app.welcome">Welcome</h2>
<!-- This will show: "Welcome" (EN) or translated text (FA) -->
```

---

## 🔧 How to Add New Translations

### Step 1: Add to `public/i18n/en.json`
```json
{
  "app": {
    "newKey": "English Text"
  }
}
```

### Step 2: Add to `public/i18n/fa.json`
```json
{
  "app": {
    "newKey": "متن فارسی"
  }
}
```

### Step 3: Use in HTML
```html
<span data-i18n="app.newKey">Fallback Text</span>
```

---

## 💾 Storage & Persistence

### Browser LocalStorage
- **Key:** `lang`
- **Values:** `"en"` or `"fa"`
- **Persistence:** Saved across browser sessions
- **Default:** `"en"` (English)

### Where It's Saved:
```javascript
localStorage.setItem('lang', 'fa'); // Save Farsi preference
localStorage.getItem('lang');       // Retrieve: "fa"
```

---

## 🌍 RTL Support (Right-to-Left)

When Farsi is selected:

### Automatic Changes:
1. **Document Direction:** `dir="rtl"` on `<html>`
2. **Text Alignment:** Right-aligned by default
3. **Layout Flow:** Elements flow right-to-left
4. **CSS Support:** RTL-aware styles applied

### CSS Handling:
```css
/* RTL-aware styles */
[dir="rtl"] .table thead th { text-align: right; }
[dir="ltr"] .table thead th { text-align: left; }
```

---

## 🔄 Current Implementation Flow

```
User clicks language switch
    ↓
Toggle checked state changes
    ↓
Determine language (fa or en)
    ↓
Save to localStorage
    ↓
Update HTML dir attribute (rtl/ltr)
    ↓
Reload page
    ↓
On reload:
    ↓
i18n.js loads translations from localStorage
    ↓
Fetches /i18n/{lang}.json
    ↓
Translates all [data-i18n] elements
    ↓
Page displays in selected language
```

---

## 🎨 Visual Indicator

**Language Switch Display:**
- **English Mode:** Shows "EN" label
- **Farsi Mode:** Shows "فا" label
- **Toggle State:** Switch position indicates language

---

## 🐛 Troubleshooting

### Issue: Language doesn't change
**Solution:** 
1. Check browser console for errors
2. Verify `/i18n/en.json` and `/i18n/fa.json` exist
3. Clear localStorage: `localStorage.clear()` in console

### Issue: Some text not translating
**Solution:**
1. Ensure element has `data-i18n` attribute
2. Check translation key exists in JSON files
3. Verify key path matches (e.g., `app.welcome`)

### Issue: RTL not working
**Solution:**
1. Check `<html dir="rtl">` attribute is set
2. Verify CSS has RTL support
3. Clear cache and reload

---

## 📝 Code Example

### Adding a New Translatable Element:

**1. HTML:**
```html
<button data-i18n="button.submit">Submit</button>
```

**2. English (`en.json`):**
```json
{
  "button": {
    "submit": "Submit"
  }
}
```

**3. Farsi (`fa.json`):**
```json
{
  "button": {
    "submit": "ارسال"
  }
}
```

**Result:**
- English: "Submit"
- Farsi: "ارسال"

---

## 🔍 Current Status

✅ **Working Features:**
- Language persistence (localStorage)
- RTL/LTR direction switching
- Automatic translation on page load
- Toggle switch in navbar and login page
- JSON-based translation files

⚠️ **Note:**
- Page reloads when language changes (to ensure all content translates)
- Translations must exist in both JSON files
- Navbar language switch only visible when logged in

---

## 🚀 Quick Test

1. **Login** to the application
2. **Look for language switch** in top-right (shows "EN" or "فا")
3. **Click the toggle** to switch languages
4. **Page reloads** with new language
5. **Check localStorage:**
   ```javascript
   // In browser console:
   localStorage.getItem('lang') // Returns "en" or "fa"
   ```

---

## 📚 Files Involved

| File | Purpose |
|------|---------|
| `public/i18n.js` | Loads translations, manages language state |
| `public/layout.js` | Initializes language switch toggle |
| `public/i18n/en.json` | English translations |
| `public/i18n/fa.json` | Farsi translations |

---

**Current Implementation:** ✅ Fully Functional

The language switching works seamlessly with persistence, RTL support, and automatic translations!

