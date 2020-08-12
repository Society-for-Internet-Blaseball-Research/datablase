function rowToIdMap(row, keyAccessor = 'id', valueAccessor = 'count') {
  return row.reduce((acc, item) => ({
    ...acc,
    [item[keyAccessor]]: item[valueAccessor],
  }), {});
}

function idMapToRows(idMap, keyName = 'id', valueName = 'value') {
  return Object.entries(idMap).reduce((acc, [key, value]) => [
    ...acc,
    { [keyName]: key, [valueName]: value },
  ], []);
}

function calculateSet(formula, ...statsById) {
  const sharedKeys = new Set(statsById.reduce((acc, item) => [...acc, ...Object.keys(item)], []));

  return idMapToRows(Array.from(sharedKeys).reduce((acc, key) => ({
    ...acc,
    [key]: formula(...statsById.reduce((statsAcc, statsItem) => [...statsAcc, statsItem[key] || 0], [])),
  }), {}));
}

function resultsWithCount(results) {
  return {
    count: results.length,
    results,
  };
}

function normalizeCommaSeparatedParam(value) {
  return value ? value.split(',').map(item => item.trim()) : undefined;
}

module.exports = {
  rowToIdMap,
  idMapToRows,
  calculateSet,
  resultsWithCount,
  normalizeCommaSeparatedParam
}