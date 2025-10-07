# Datetime Validation Test Cases

This document shows how the `validateDatetime()` function handles different input values.

## ✅ Valid Inputs (Accepted)

| Input | Output | Notes |
|-------|--------|-------|
| `"2025-10-07T12:00:00.000Z"` | ✅ Same value | Full ISO timestamp with timezone |
| `"2025-10-07T15:30:00"` | ✅ Same value | ISO timestamp without timezone |
| `"2023-08-16"` | ✅ Same value | Date-only format (valid for PostgreSQL) |
| `"2025-01-15"` | ✅ Same value | Another date-only example |
| `null` | ✅ `null` | Null values are preserved |
| `undefined` | ✅ `null` | Undefined converted to null |
| `""` | ✅ `null` | Empty string converted to null |

## ❌ Invalid Inputs (Converted to null with warning)

| Input | Output | Reason |
|-------|--------|--------|
| `"İki hafta içinde"` | ⚠️ `null` | Natural language (Turkish) |
| `"next week"` | ⚠️ `null` | Natural language (English) |
| `"gelecek hafta"` | ⚠️ `null` | Natural language (Turkish) |
| `"yakında"` | ⚠️ `null` | Natural language (Turkish) |
| `"2025/10/07"` | ⚠️ `null` | Wrong separator (slash instead of dash) |
| `"invalid-date"` | ⚠️ `null` | Not a valid date format |
| `"12:00:00"` | ⚠️ `null` | Time only, no date |
| `123456789` | ⚠️ `null` | Number instead of string |
| `{ date: "2025-10-07" }` | ⚠️ `null` | Object instead of string |

## Console Output Examples

### Valid date
```
// No console output - silently accepted
```

### Invalid date
```javascript
console.warn('Invalid datetime value detected and converted to null: "İki hafta içinde"');
```

## How It Works

```typescript
function validateDatetime(datetime: any): string | null {
  if (!datetime) return null;
  
  if (typeof datetime === 'string') {
    const date = new Date(datetime);
    
    // Check if it's a valid date
    if (!isNaN(date.getTime())) {
      // Accept: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
      if (/^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(datetime)) {
        return datetime;
      }
    }
    
    // Log and convert invalid values to null
    console.warn(`Invalid datetime value detected: "${datetime}"`);
    return null;
  }
  
  return null;
}
```

## PostgreSQL Compatibility

PostgreSQL `timestamp with time zone` columns accept:
- ✅ `2025-10-07T12:00:00.000Z` (ISO 8601 with timezone)
- ✅ `2025-10-07 12:00:00` (PostgreSQL format)
- ✅ `2025-10-07` (Date only - time defaults to 00:00:00)
- ❌ `İki hafta içinde` (Natural language - causes error)

Our validation ensures only compatible formats reach the database.

## Impact

**Before validation:**
```
ERROR: invalid input syntax for type timestamp with time zone: "İki hafta içinde"
```

**After validation:**
```
✅ Task saved successfully with datetime = null
⚠️ Console warning: Invalid datetime value detected and converted to null: "İki hafta içinde"
```

The task is still saved, but without a specific datetime. Users can add a datetime later if needed.
