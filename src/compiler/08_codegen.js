export function createColumns(numColumn) {
  return Array.from({ length: numColumn }, () => []);
}

export function inject(values, columns) {
  for (let i = 0; i < values.length; i++) {
    // If the value is null (empty slot), we inject 0 for now (R31)
    const val = values[i] === null ? 0 : values[i];
    columns[i].push(val);
  }
}
