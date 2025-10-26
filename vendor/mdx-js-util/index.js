const EMPTY_NEWLINE = '\n\n';

const IMPORT_EXPORT_RE = /^(?:import|export)\s/m;

function isImportOrExport(value = '') {
  if (typeof value !== 'string') return false;
  return IMPORT_EXPORT_RE.test(value.trimStart());
}

module.exports = {
  EMPTY_NEWLINE,
  isImportOrExport,
};
