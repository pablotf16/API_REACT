import React, { useState, useEffect } from 'react';
import './index.css'
import { fetchInitialGrid, saveGrid } from './services/gridService'

export const COLUMNS = ["col_A", "col_B", "col_C", "col_D"];

const ExcelGrid = () => {
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const filas = await fetchInitialGrid(10);
        if (mounted) setGridData(filas);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error cargando datos iniciales', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCellChange = (rowIndex, colKey, value) => {
    setGridData((prev) => {
      const copy = prev.map((r) => ({ ...r }));
      copy[rowIndex][colKey] = value;
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveGrid(gridData);
      // eslint-disable-next-line no-console
      console.info('saveGrid result', res);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error guardando', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="excel-container">Cargando hoja de cálculo...</div>;

  return (
    <div className="excel-container">
      <h2 className="excel-title">Tabla de Anotaciones (React Hooks)</h2>

      <table className="excel-table">
        <thead>
          <tr>
            <th className="excel-th">#</th>
            {COLUMNS.map((col) => (
              <th key={col} className="excel-th">{col.replace('col_', 'Columna ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gridData.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex}>
              <td className="excel-index-cell">{rowIndex + 1}</td>
              {COLUMNS.map((colKey) => (
                <td key={`${row.id ?? rowIndex}-${colKey}`} className="excel-td">
                  <input
                    className="excel-input"
                    type="text"
                    value={row[colKey]}
                    onChange={(e) => handleCellChange(rowIndex, colKey, e.target.value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <pre className="excel-debug">Último cambio: {JSON.stringify(gridData[0])}</pre>
    </div>
  );
};

export default ExcelGrid;