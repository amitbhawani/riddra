## Import Template Alignment Checklist

Use this checklist whenever a CMS editor changes for any import-supported family.

Whenever a family gets new editable frontend or editor fields:

1. Update the import template so the sample CSV still matches the real editor fields.
2. Update the parser so the imported value lands in the real editor-backed section key.
3. Update validation for any new, renamed, or removed fields.
4. Update the sample CSV examples, field-mapping help, and repeated-field examples on the import page.
5. Re-test the family with a real draft import in the normal editor.
6. Re-test the editor approval flow, including bulk approval if that family supports editor imports.
7. Re-test the final draft to approval to publish workflow before calling the family complete.
8. Confirm the activity log still records the import and approval actions clearly.

This prevents the import system from drifting away from the actual CMS editor.
