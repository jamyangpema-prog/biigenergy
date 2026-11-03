let dirty = false;

export const setUnsaved = (v) => { dirty = v; };
export const confirmLeave = () => !dirty || window.confirm('You have unsaved changes in Costing. Leave without saving?');

window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
