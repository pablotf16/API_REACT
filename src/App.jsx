import React, { useState, useEffect } from 'react';

const ExcelGrid = () => {
  // 1. USESTATE: Manejamos el estado de los datos de la grilla
  // Inicializamos como un array vacío esperando la "carga" de datos
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Configuración simple de columnas (A, B, C, D)
  const columns = ["col_A", "col_B", "col_C", "col_D"];

  // 2. USEEFFECT: Simulamos la llamada a una API o base de datos inicial
  useEffect(() => {
    // Simulación de una petición asíncrona
    const cargarDatosIniciales = () => {
      // Generamos 10 filas vacías por defecto
      const filasIniciales = Array.from({ length: 10 }, (_, index) => ({
        id: index,
        col_A: "",
        col_B: "",
        col_C: "",
        col_D: ""
      }));

      // Simulamos un retraso de red de 500ms
      setTimeout(() => {
        setGridData(filasIniciales);
        setLoading(false);
        console.log("Datos cargados (Simulación de API completada)");
      }, 500);
    };

    cargarDatosIniciales();
  }, []); // El array vacío [] asegura que esto solo corra una vez al montar el componente

  // Función para manejar cambios en las celdas (Two-way binding)
  const handleCellChange = (rowIndex, colKey, value) => {
    const updatedData = [...gridData]; // Copiamos el array para no mutar estado directamente
    updatedData[rowIndex][colKey] = value;
    setGridData(updatedData);
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Cargando hoja de cálculo...</div>;
  }

  return (
    <div style={styles.container}>
      <h2>Tabla de Anotaciones (React Hooks)</h2>
      
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.headerCell}>#</th>
            {columns.map((col) => (
              <th key={col} style={styles.headerCell}>
                {col.replace("col_", "Columna ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gridData.map((row, rowIndex) => (
            <tr key={row.id}>
              {/* Indice de fila (no editable) */}
              <td style={styles.indexCell}>{rowIndex + 1}</td>
              
              {/* Celdas Editables */}
              {columns.map((colKey) => (
                <td key={`${row.id}-${colKey}`} style={styles.cell}>
                  <input
                    type="text"
                    value={row[colKey]}
                    onChange={(e) => handleCellChange(rowIndex, colKey, e.target.value)}
                    style={styles.input}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Visualización temporal para ver que el estado funciona */}
      <pre style={styles.debug}>
        Último cambio: {JSON.stringify(gridData[0], null, 2)} ...
      </pre>
    </div>
  );
};
export default ExcelGrid;