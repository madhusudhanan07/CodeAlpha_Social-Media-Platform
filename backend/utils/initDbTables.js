// Firestore is schemaless — no table initialization needed.
// This file is kept as a no-op for backward compatibility with any scripts that call it.

async function initDbTables() {
  console.log('✅ Using Firebase Firestore (schemaless) — no table initialization required.');
}

module.exports = initDbTables;
