# TODO: Engineer Review Required

## Recent Changes Requiring Functional Testing

### 1. S3/R2 API Routes Security & Validation
**Files Modified:**
- `src/app/api/content/delete/route.ts`
- `src/app/api/content/list/route.ts`

**Changes:**
- Added environment variable validation for R2 credentials
- Implemented bearer token authentication
- Added ID validation and path traversal protection
- Fixed limit parsing with clamping (1-1000)
- Removed invalid Metadata access from ListObjectsV2 responses
- Reduced logging noise (now behind DEBUG_LIST_API flag)

**Testing Required:**
- [ ] Test DELETE endpoint with valid/invalid bearer tokens
- [ ] Test DELETE with malicious IDs (../, ./, null bytes)
- [ ] Test LIST with various limit values (negative, NaN, >1000)
- [ ] Verify R2 operations work with validated credentials
- [ ] Confirm error responses return correct HTTP status codes

### 2. Workflow Execution Dialog Input Mode Sync
**File Modified:**
- `src/components/workflows/WorkflowExecutionDialog.tsx`

**Changes:**
- Fixed input mode defaulting logic (simple vs JSON)
- Replaced useEffect with useMemo + ref pattern for workflow changes
- Implemented manual override pattern for user edits
- Synchronous state reset when workflow changes

**Testing Required:**
- [ ] Open dialog with workflow that has no schema → should default to simple mode
- [ ] Open dialog with workflow that has object schema → should default to JSON mode
- [ ] Switch between workflows with different schemas → verify input resets correctly
- [ ] Edit input, then switch workflows → verify previous edits don't leak
- [ ] Toggle between simple/JSON modes → verify data conversion works
- [ ] Execute workflows with both input modes → verify correct payload sent

**Performance Testing:**
- [ ] Monitor for unnecessary re-renders when workflow prop changes
- [ ] Verify no useEffect-related performance issues

---

**Priority:** High  
**Assigned To:** _[Engineer Name]_  
**Due Date:** _[Date]_
