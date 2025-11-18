// Servicio para obtener y guardar datos de la grilla.
// Intenta usar VITE_API_URL si está definido, si no, devuelve un mock local.
export async function fetchInitialGrid(rows = 10) {
  const base = import.meta?.env?.VITE_API_URL;
  if (base) {
    try {
      const url = `${base.replace(/\/$/, '')}/grid?rows=${rows}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json;
    } catch (err) {
      // Si falla la llamada real, caemos al mock local
      // eslint-disable-next-line no-console
      console.warn('fetchInitialGrid: fallo el fetch, usando mock local', err);
    }
  }

  // Mock por defecto
  return Array.from({ length: rows }, (_, index) => ({
    id: index,
    col_A: '',
    col_B: '',
    col_C: '',
    col_D: '',
  }));
}

export async function saveGrid(grid) {
  const base = import.meta?.env?.VITE_API_URL;
  if (base) {
    try {
      const url = `${base.replace(/\/$/, '')}/grid`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('saveGrid: fallo al guardar en la API', err);
      return null;
    }
  }

  // Mock: simplemente resolvemos
  // eslint-disable-next-line no-console
  console.info('saveGrid: mock save (no VITE_API_URL)');
  return { ok: true };
}
