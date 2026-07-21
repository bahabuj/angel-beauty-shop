# Task 4: Transformations Management Component

## Summary
Created `/home/z/my-project/src/components/admin/transformations-management.tsx` — a standalone admin management component for "Before and After Images" (transformation entries).

## Key Details

### Component Structure
- **Self-contained**: Fetches its own data from `/api/transformations` internally (no props needed from parent)
- **Exports**: Default export `TransformationsManagement` + named export `TransformationsManagement` + type exports `Transformation`, `TransformationFormData`

### Features Implemented
1. **Data fetching** — `useEffect` + `fetch` to load transformations from `/api/transformations` on mount
2. **Add Transformation** — Dialog with fields: Name*, Duration*, Result*, Before Image upload*, After Image upload*, Order, Active toggle
3. **Edit Transformation** — Pre-populated dialog with existing values
4. **Delete Transformation** — AlertDialog confirmation before deletion
5. **Toggle Active** — Switch component to toggle active/inactive status per transformation
6. **Loading state** — Spinner shown while fetching data
7. **Empty state** — Shown when no transformations exist, with CTA to add first entry

### Design Patterns (matching auth-slides-management.tsx)
- Same `cardVariants` animation variants with framer-motion `AnimatePresence` + `motion.div`
- Same card layout with `border-l-4` indicator (gold for active, muted for inactive)
- Same header structure: icon + title + count badge + "Add" button
- Same `ImageUploadDropzone` pattern for uploading images (upload to `/api/upload` with folder `uploads/transformations`)
- Same Dialog/AlertDialog patterns for CRUD operations
- Same gold/blush color scheme and styling patterns

### Before/After Image Display
- Side-by-side layout with Before image (left) and After image (right)
- Arrow divider (`ArrowRight` icon) between the two images
- "Before" badge (dark overlay) and "After" badge (gold) overlaid on images
- Fallback placeholder when no image URL exists

### Upload Dropzone
- `ImageUploadDropzone` inline component with label prop ("Before Image" / "After Image")
- Drag-and-drop + click-to-upload
- File validation: JPEG, PNG, GIF, WebP, SVG only, max 50MB
- Preview with Change/Remove overlay on hover
- Uploads to `/api/upload` with folder `uploads/transformations`
- OR divider with manual URL input fallback

### Lint Status
- Zero lint errors in the new file
